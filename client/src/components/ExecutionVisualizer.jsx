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
    const [error, setError] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const svgRef = useRef(null);

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

    const runCode = async () => {
        setError('');
        setEvents([]);
        setIsRunning(true);
        try {
            const res = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language, code }),
            });
            const data = await res.json();

            // If the response is not ok or the backend flagged an error,
            // surface a meaningful message to the user and stop processing.
            if (!res.ok || data.error) {
                const errorMsg =
                    data.message ||
                    data.events?.find((e) => e.event === 'error')?.message ||
                    'Execution error';
                setError(errorMsg);
                return;
            }

            setEvents(data.events || []);
        } catch (e) {
            setError('Network error');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="space-y-4">
            <LanguageSelector selectedLanguage={language} setSelectedLanguage={setLanguage} languages={['javascript','python']} />
            <Editor
                height="40vh"
                language={language}
                value={code}
                // Monaco may supply `undefined` when clearing the editor; coerce to empty string
                onChange={(value) => setCode(value ?? '')}
            />
            <button
                onClick={runCode}
                disabled={isRunning}
                className={`px-4 py-2 rounded text-white ${isRunning ? 'bg-purple-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
                {isRunning ? 'Running...' : 'Run'}
            </button>
            {error && <div className="text-red-500">{error}</div>}
            <div className="relative p-4 bg-white dark:bg-gray-800 rounded shadow min-h-[120px]">
                {events.length === 0 && !isRunning && (
                    <p className="text-gray-500">Run the code to see execution steps.</p>
                )}
                <svg ref={svgRef} className="w-full"></svg>
            </div>
        </div>
    );
}
