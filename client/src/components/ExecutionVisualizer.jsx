// client/src/components/ExecutionVisualizer.jsx
import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as d3 from 'd3';
import LanguageSelector from './LanguageSelector';

export default function ExecutionVisualizer() {
    const [language, setLanguage] = useState('javascript');
    const [code, setCode] = useState('');
    const [events, setEvents] = useState([]);
    const [error, setError] = useState('');
    const svgRef = useRef(null);

    useEffect(() => {
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();
        const width = 600;
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
        try {
            const res = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language, code }),
            });
            const data = await res.json();
            if (data.error) {
                setError(data.message || 'Execution error');
            }
            setEvents(data.events || []);
        } catch (e) {
            setError('Network error');
        }
    };

    return (
        <div className="space-y-4">
            <LanguageSelector selectedLanguage={language} setSelectedLanguage={setLanguage} languages={['javascript','python']} />
            <Editor
                height="40vh"
                language={language}
                value={code}
                onChange={(value) => setCode(value)}
            />
            <button
                onClick={runCode}
                className="px-4 py-2 bg-purple-600 text-white rounded"
            >
                Run
            </button>
            {error && <div className="text-red-500">{error}</div>}
            <svg ref={svgRef}></svg>
        </div>
    );
}
