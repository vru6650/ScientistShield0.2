import vm from 'vm';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { errorHandler } from '../utils/error.js';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import generateModule from '@babel/generator';
import * as t from '@babel/types';

const traverse = traverseModule.default ?? traverseModule;
const generate = generateModule.default ?? generateModule;

const execFileAsync = promisify(execFile);
const __dirname = path.resolve();
const TEMP_DIR = path.join(__dirname, 'temp');

const debugSessions = {};

export function instrumentJavaScript(code) {
    const ast = parse(code, {
        sourceType: 'script',
        allowReturnOutsideFunction: true,
        allowAwaitOutsideFunction: true,
        plugins: [],
    });

    traverse(ast, {
        enter(path) {
            if (path.isVariableDeclaration()) {
                if (path.node.kind === 'let' || path.node.kind === 'const') {
                    path.node.kind = 'var';
                }
            }

            if (path.isStatement() && !path.isBlockStatement()) {
                if (
                    path.isExpressionStatement() &&
                    t.isCallExpression(path.node.expression) &&
                    t.isIdentifier(path.node.expression.callee, { name: '__trace' })
                ) {
                    return;
                }
                const line = path.node.loc?.start?.line ?? 0;
                const traceNode = t.expressionStatement(
                    t.callExpression(t.identifier('__trace'), [t.numericLiteral(line)])
                );
                path.insertBefore(traceNode);
            }
        },
    });

    const { code: instrumented } = generate(ast, { comments: true, retainLines: true });
    return `(async () => { with (sandbox) {\n${instrumented}\n}})()`;
}

export const executeCode = async (req, res, next) => {
    const { language, code } = req.body;
    if (!language || !code) {
        return next(errorHandler(400, 'Language and code are required.'));
    }

    if (language === 'javascript') {
        const sandbox = {};
        const events = [];
        const context = vm.createContext({
            sandbox,
            console: {
                log: (...args) => {
                    events.push({ event: 'log', value: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') });
                },
            },
            __trace: (line) => {
                events.push({ event: 'step', line, locals: { ...sandbox } });
            },
        });

        try {
            const script = new vm.Script(instrumentJavaScript(code));
            await script.runInContext(context, { timeout: 1000 });
            return res.status(200).json({ events, error: false });
        } catch (err) {
            events.push({ event: 'error', message: err.message });
            return res.status(200).json({ events, error: true });
        }
    }

    if (language === 'python') {
        await fs.promises.mkdir(TEMP_DIR, { recursive: true });
        const uniqueId = uuidv4();
        const tracerPath = path.join(__dirname, 'api', 'utils', 'pythonTracer.py');
        const filePath = path.join(TEMP_DIR, `${uniqueId}.py`);
        try {
            await fs.promises.writeFile(filePath, code);
            const { stdout } = await execFileAsync('python3', [tracerPath, filePath], { timeout: 5000 });
            const data = JSON.parse(stdout);
            if (data.status === 'error') {
                return res.status(200).json({ events: data.traces, output: data.stdout, error: true, message: data.error });
            }
            return res.status(200).json({ events: data.traces, output: data.stdout, error: false });
        } catch (err) {
            return res.status(200).json({ events: [], output: '', error: true, message: err.message });
        } finally {
            try { await fs.promises.unlink(filePath); } catch {}
        }
    }

    return next(errorHandler(400, 'Unsupported language.'));
};

export const startDebugSession = async (req, res, next) => {
    const { language, code, breakpoints = [] } = req.body;
    if (language !== 'python') {
        return next(errorHandler(400, 'Only python debugging supported.'));
    }
    await fs.promises.mkdir(TEMP_DIR, { recursive: true });
    const uniqueId = uuidv4();
    const tracerPath = path.join(__dirname, 'api', 'utils', 'pythonTracer.py');
    const filePath = path.join(TEMP_DIR, `${uniqueId}.py`);
    try {
        await fs.promises.writeFile(filePath, code);
        const { stdout } = await execFileAsync('python3', [tracerPath, filePath, JSON.stringify(breakpoints)], { timeout: 5000 });
        const data = JSON.parse(stdout);
        if (data.status === 'error') {
            return res.status(200).json({ error: true, message: data.error });
        }
        const sessionId = uuidv4();
        debugSessions[sessionId] = {
            events: data.traces,
            pointer: -1,
            breakpoints: new Set(breakpoints),
        };
        return res.status(200).json({ sessionId });
    } catch (err) {
        return res.status(200).json({ error: true, message: err.message });
    } finally {
        try { await fs.promises.unlink(filePath); } catch {}
    }
};

export const debuggerCommand = (req, res, next) => {
    const { sessionId, command, line } = req.body;
    const session = debugSessions[sessionId];
    if (!session) {
        return next(errorHandler(404, 'Session not found'));
    }
    const { events, breakpoints } = session;
    let ptr = session.pointer;

    const advance = () => {
        ptr += 1;
        if (ptr >= events.length) {
            session.pointer = events.length - 1;
            return null;
        }
        session.pointer = ptr;
        return events[ptr];
    };

    if (command === 'step') {
        const ev = advance();
        return res.status(200).json({ event: ev, done: ev === null });
    }

    if (command === 'continue') {
        ptr += 1;
        while (ptr < events.length && !breakpoints.has(events[ptr].line)) {
            ptr += 1;
        }
        if (ptr >= events.length) ptr = events.length - 1;
        session.pointer = ptr;
        return res.status(200).json({ event: events[ptr], done: ptr === events.length - 1 });
    }

    if (command === 'next') {
        const depth = events[ptr]?.callStack?.length || 0;
        ptr += 1;
        while (ptr < events.length && (events[ptr].callStack?.length || 0) > depth) {
            ptr += 1;
        }
        if (ptr >= events.length) ptr = events.length - 1;
        session.pointer = ptr;
        return res.status(200).json({ event: events[ptr], done: ptr === events.length - 1 });
    }

    if (command === 'out') {
        const depth = events[ptr]?.callStack?.length || 0;
        ptr += 1;
        while (ptr < events.length && (events[ptr].callStack?.length || 0) >= depth) {
            ptr += 1;
        }
        if (ptr >= events.length) ptr = events.length - 1;
        session.pointer = ptr;
        return res.status(200).json({ event: events[ptr], done: ptr === events.length - 1 });
    }

    if (command === 'setBreakpoint') {
        if (typeof line === 'number') {
            breakpoints.add(line);
        }
        return res.status(200).json({ breakpoints: Array.from(breakpoints) });
    }

    return next(errorHandler(400, 'Unknown debugger command'));
};
