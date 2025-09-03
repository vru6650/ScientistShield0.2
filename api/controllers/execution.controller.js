import vm from 'vm';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { errorHandler } from '../utils/error.js';

const execFileAsync = promisify(execFile);
const __dirname = path.resolve();
const TEMP_DIR = path.join(__dirname, 'temp');

function instrumentJavaScript(code) {
    const lines = code.split('\n');
    const instrumented = lines
        .map((line, idx) => {
            const ln = idx + 1;
            const sanitized = line.replace(/\b(let|const)\b/g, 'var');
            return `__trace(${ln});\n${sanitized}`;
        })
        .join('\n');
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
