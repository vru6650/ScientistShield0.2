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
    const [currentStep, setCurrentStep] = useState(-1);
    const [error, setError] = useState('');
    const [isRunning, setIsRunning] = useState(false);

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
        const width = svgRef.current ? svgRef.current.clientWidth : 600;
        const height = events.length * 30 + 20;
        svg.attr('width', width).attr('height', height);
        const g = svg.append('g');
        events.forEach((e, i) => {
            g.append('text')
                .attr('x', 10)
                .attr('y', 20 + i * 30)
                .text(`L${e.line}: ${JSON.stringify(e.locals || {})}`)
                .attr('font-size', '14px');
        });
    }, [events]);

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
        setCurrentStep(-1);
        setIsRunning(true);
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
            setEvents(ev);
            setCurrentStep(ev.length > 0 ? 0 : -1);
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
                <div className="flex space-x-2">
                    <button
                        onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                        disabled={currentStep <= 0}
                        className="px-3 py-1 rounded bg-gray-300 disabled:opacity-50"
                    >
                        Prev
                    </button>
                    <button
                        onClick={() => setCurrentStep((s) => Math.min(events.length - 1, s + 1))}
                        disabled={currentStep >= events.length - 1}
                        className="px-3 py-1 rounded bg-gray-300 disabled:opacity-50"
                    >
                        Next
                    </button>
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
        </div>
    );
}

