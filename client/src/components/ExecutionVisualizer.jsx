// client/src/components/ExecutionVisualizer.jsx
import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as d3 from 'd3';
import LanguageSelector from './LanguageSelector';

const defaultCodeSnippets = {
    javascript: `function greet(name) {
  const message = 'Hello, ' + name;
  return message;
}

const result = greet('World');
console.log(result);`,
    python: `def greet(name):
    message = "Hello, " + name
    return message

result = greet("World")
print(result)`
};

export default function ExecutionVisualizer() {
    const [language, setLanguage] = useState('javascript');
    const [code, setCode] = useState(defaultCodeSnippets['javascript']);
    const [events, setEvents] = useState([]);
    const [logs, setLogs] = useState([]);
    const [output, setOutput] = useState('');
    const [currentStep, setCurrentStep] = useState(-1);
    const [error, setError] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playSpeed, setPlaySpeed] = useState(800);

    const svgRef = useRef(null);
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const decorationsRef = useRef([]);

    useEffect(() => {
        setCode(defaultCodeSnippets[language]);
    }, [language]);

    useEffect(() => {
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        if (events.length === 0) return;
        const stepWidth = 40;
        const width = events.length * stepWidth + 20;
        const height = 60;
        svg.attr('width', width).attr('height', height);
        const g = svg.append('g').attr('transform', `translate(10,${height / 2})`);
        g.selectAll('circle')
            .data(events)
            .enter()
            .append('circle')
            .attr('cx', (_, i) => i * stepWidth)
            .attr('r', 8)
            .attr('fill', (_, i) => (i === currentStep ? '#9333ea' : '#bbb'))
            .attr('stroke', '#333');
        g.selectAll('text')
            .data(events)
            .enter()
            .append('text')
            .attr('x', (_, i) => i * stepWidth)
            .attr('y', 20)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .text((e) => `L${e.line}`);
    }, [events, currentStep]);

    useEffect(() => {
        if (!isPlaying) return;
        if (currentStep >= events.length - 1) {
            setIsPlaying(false);
            return;
        }
        const id = setTimeout(() => {
            setCurrentStep((s) => Math.min(events.length - 1, s + 1));
        }, playSpeed);
        return () => clearTimeout(id);
    }, [isPlaying, currentStep, playSpeed, events.length]);

    useEffect(() => {
        if (!editorRef.current || !monacoRef.current) return;
        const monaco = monacoRef.current;
        const line = events[currentStep]?.line;
        decorationsRef.current = editorRef.current.deltaDecorations(
            decorationsRef.current,
            line
                ? [
                      {
                          range: new monaco.Range(line, 1, line, 1),
                          options: { isWholeLine: true, className: 'highlight-line' },
                      },
                  ]
                : []
        );
    }, [currentStep, events]);

    const runCode = async () => {
        setError('');
        setEvents([]);
        setLogs([]);
        setOutput('');
        setCurrentStep(-1);
        setIsRunning(true);
        setIsPlaying(false);
        try {
            const res = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language, code }),
            });
            const data = await res.json();

            if (!res.ok || data.error) {
                const errorMsg =
                    data.message ||
                    data.events?.find((e) => e.event === 'error')?.message ||
                    'Execution error';
                setError(errorMsg);
                return;
            }

            const ev = data.events || [];
            const stepEvents = ev.filter((e) => e.event !== 'log');
            const logEvents = ev.filter((e) => e.event === 'log');
            setEvents(stepEvents);
            setLogs(logEvents);
            setOutput(data.output || '');
            setCurrentStep(stepEvents.length > 0 ? 0 : -1);
        } catch (e) {
            setError('Network error');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="space-y-4">
            <LanguageSelector
                selectedLanguage={language}
                setSelectedLanguage={setLanguage}
                languages={['javascript', 'python']}
            />
            <Editor
                height="40vh"
                language={language}
                value={code}
                onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    monacoRef.current = monaco;
                }}
                // Monaco may supply `undefined` when clearing the editor; coerce to empty string
                onChange={(value) => setCode(value ?? '')}
            />
            <button
                onClick={runCode}
                disabled={isRunning}
                className={`px-4 py-2 rounded text-white ${
                    isRunning ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                }`}
            >
                {isRunning ? 'Running...' : 'Run'}
            </button>
            {error && <div className="text-red-500">{error}</div>}
            {events.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => {
                                setIsPlaying(false);
                                setCurrentStep((s) => Math.max(0, s - 1));
                            }}
                            disabled={currentStep <= 0}
                            className="px-3 py-1 rounded bg-gray-300 disabled:opacity-50"
                        >
                            Prev
                        </button>
                        <button
                            onClick={() => {
                                setIsPlaying((p) => {
                                    if (!p && currentStep < 0 && events.length > 0) setCurrentStep(0);
                                    return !p;
                                });
                            }}
                            className="px-3 py-1 rounded bg-gray-300"
                        >
                            {isPlaying ? 'Pause' : 'Play'}
                        </button>
                        <button
                            onClick={() => {
                                setIsPlaying(false);
                                setCurrentStep((s) => Math.min(events.length - 1, s + 1));
                            }}
                            disabled={currentStep >= events.length - 1}
                            className="px-3 py-1 rounded bg-gray-300 disabled:opacity-50"
                        >
                            Next
                        </button>
                        <button
                            onClick={() => {
                                setIsPlaying(false);
                                setCurrentStep(0);
                            }}
                            className="px-3 py-1 rounded bg-gray-300"
                        >
                            Reset
                        </button>
                        <div className="flex items-center space-x-1 ml-4">
                            <label className="text-sm">Speed</label>
                            <input
                                type="range"
                                min="100"
                                max="2000"
                                step="100"
                                value={playSpeed}
                                onChange={(e) => setPlaySpeed(Number(e.target.value))}
                                className="w-32"
                            />
                            <span className="text-xs">{playSpeed}ms</span>
                        </div>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={events.length - 1}
                        value={currentStep}
                        onChange={(e) => {
                            setIsPlaying(false);
                            setCurrentStep(Number(e.target.value));
                        }}
                        className="w-full"
                    />
                </div>
            )}
            <div className="relative p-4 bg-white dark:bg-gray-800 rounded shadow min-h-[120px] space-y-2">
                {events.length === 0 && !isRunning && (
                    <p className="text-gray-500">Run the code to see execution steps.</p>
                )}
                {currentStep >= 0 && events[currentStep] && (
                    <div>
                        <p className="font-semibold">
                            Step {currentStep + 1} of {events.length} (line {events[currentStep].line})
                        </p>
                        <pre className="text-sm bg-gray-100 p-2 rounded">
                            <code>{JSON.stringify(events[currentStep].locals || {}, null, 2)}</code>
                        </pre>
                    </div>
                )}
                <svg ref={svgRef} className="w-full"></svg>
            </div>
            {(output || logs.length > 0) && (
                <div className="p-4 bg-white dark:bg-gray-800 rounded shadow space-y-2">
                    {output && (
                        <div>
                            <p className="font-semibold">Output</p>
                            <pre className="text-sm bg-gray-100 p-2 rounded whitespace-pre-wrap">
                                <code>{output}</code>
                            </pre>
                        </div>
                    )}
                    {logs.length > 0 && (
                        <div>
                            <p className="font-semibold">Console</p>
                            <pre className="text-sm bg-gray-100 p-2 rounded whitespace-pre-wrap">
                                {logs.map((l, i) => (
                                    <div key={i}>{l.value}</div>
                                ))}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

