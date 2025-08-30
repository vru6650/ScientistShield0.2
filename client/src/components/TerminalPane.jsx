import React, { useEffect, useRef, useState } from 'react';
import { Button, Spinner } from 'flowbite-react';
import { FaTerminal, FaChevronDown, FaChevronRight, FaTrash, FaKeyboard } from 'react-icons/fa';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';

export default function TerminalPane({
    output = '',
    error = '',
    isRunning = false,
    theme = 'light',
    onClear,
}) {
    const containerRef = useRef(null);
    const terminalRef = useRef(null);
    const prevOutputRef = useRef('');
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        terminalRef.current = new Terminal({
            convertEol: true,
            theme: theme === 'dark'
                ? { background: '#1f2937', foreground: '#f3f4f6' }
                : { background: '#ffffff', foreground: '#1f2937' },
        });
        if (containerRef.current) {
            terminalRef.current.open(containerRef.current);
        }
        return () => terminalRef.current.dispose();
    }, []);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.options.theme = theme === 'dark'
                ? { background: '#1f2937', foreground: '#f3f4f6' }
                : { background: '#ffffff', foreground: '#1f2937' };
        }
    }, [theme]);

    useEffect(() => {
        if (!terminalRef.current) return;
        if (!output && !error) {
            terminalRef.current.clear();
            prevOutputRef.current = '';
            return;
        }
        const text = error ? `\x1b[31m${error}\x1b[0m` : output;
        const newText = text.slice(prevOutputRef.current.length);
        if (newText) {
            terminalRef.current.write(newText.replace(/\n/g, '\r\n'));
            prevOutputRef.current = text;
        }
    }, [output, error]);

    const handleClear = () => {
        terminalRef.current?.clear();
        prevOutputRef.current = '';
        onClear && onClear();
    };

    const handleFocus = () => {
        terminalRef.current?.focus();
    };

    const toggleOpen = () => setIsOpen(!isOpen);

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-1">
                <h3 className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <FaTerminal /> Terminal
                </h3>
                <div className="flex items-center gap-2">
                    <Button size="xs" outline gradientDuoTone="purpleToBlue" onClick={handleClear}>
                        <FaTrash />
                    </Button>
                    <Button size="xs" outline gradientDuoTone="purpleToBlue" onClick={handleFocus}>
                        <FaKeyboard />
                    </Button>
                    <Button size="xs" outline gradientDuoTone="purpleToBlue" onClick={toggleOpen}>
                        {isOpen ? <FaChevronDown /> : <FaChevronRight />}
                    </Button>
                </div>
            </div>
            <div
                className={`flex-1 relative rounded-md overflow-hidden bg-white dark:bg-gray-800 ${
                    isOpen ? '' : 'hidden'
                }`}
            >
                <div ref={containerRef} className="absolute inset-0" />
                {isRunning && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <Spinner size="sm" /> <span className="ml-2">Running...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
