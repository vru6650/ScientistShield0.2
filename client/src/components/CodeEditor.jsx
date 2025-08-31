// client/src/components/CodeEditor.jsx
import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button, ToggleSwitch, Alert, Select } from 'flowbite-react';
import { useSelector } from 'react-redux';
import { FaPlay, FaRedo, FaChevronRight, FaChevronDown, FaTerminal, FaSave, FaEye, FaEyeSlash, FaExpand, FaCompress } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

import LanguageSelector from './LanguageSelector';
import TerminalPane from './TerminalPane';

const defaultCodes = {
    html: `<!DOCTYPE html>\n<html>\n<body>\n\n  <h1>Try It Yourself</h1>\n  <p>Edit the code below and see the output.</p>\n\n</body>\n</html>`,
    css: `body {\n  font-family: sans-serif;\n  background-color: #f0f0f0;\n}\nh1 {\n  color: #333;\n}`,
    javascript: `console.log("This is the JS console output.");`,
    cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, C++ World!";\n    return 0;\n}`,
    python: `print("Hello, Python!")`
};

const registerAutocompletion = (monaco) => {
    const suggestions = {
        javascript: [
            {
                label: 'log',
                insertText: 'console.log(${1});',
                documentation: 'Console log output',
            },
        ],
        html: [
            {
                label: 'html:5',
                insertText:
                    '<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="UTF-8" />\n  <title>Document</title>\n</head>\n<body>\n  $0\n</body>\n</html>',
                documentation: 'HTML5 boilerplate',
            },
        ],
        css: [
            {
                label: 'flex',
                insertText: 'display: flex;\njustify-content: center;\nalign-items: center;',
                documentation: 'Flexbox container',
            },
        ],
        cpp: [
            {
                label: 'main',
                insertText:
                    '#include <iostream>\n\nint main() {\n  std::cout << "$1" << std::endl;\n  return 0;\n}',
                documentation: 'Basic main function',
            },
        ],
        python: [
            {
                label: 'print',
                insertText: 'print("$1")',
                documentation: 'Print to console',
            },
        ],
    };

    Object.entries(suggestions).forEach(([lang, items]) => {
        monaco.languages.registerCompletionItemProvider(lang, {
            provideCompletionItems: () => ({
                suggestions: items.map((s) => ({
                    label: s.label,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: s.insertText,
                    insertTextRules:
                        monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: s.documentation,
                })),
            }),
        });
    });
};

export default function CodeEditor({ initialCode = {}, language = 'html', expectedOutput = '' }) {
    const { theme } = useSelector((state) => state.theme);

    // Consolidated state for all code snippets
    const [codes, setCodes] = useState({
        html: initialCode.html || defaultCodes.html,
        css: initialCode.css || defaultCodes.css,
        javascript: initialCode.javascript || defaultCodes.javascript,
        cpp: initialCode.cpp || defaultCodes.cpp,
        python: initialCode.python || defaultCodes.python,
    });

    const [selectedLanguage, setSelectedLanguage] = useState(language);
    const [srcDoc, setSrcDoc] = useState('');
    const [consoleOutput, setConsoleOutput] = useState('');
    // Flag to automatically re-run code on changes
    const [autoRun, setAutoRun] = useState(true);
    const [isRunning, setIsRunning] = useState(false);
    const [runError, setRunError] = useState(null);
    const [showOutputPanel, setShowOutputPanel] = useState(true);
    const [showAnswer, setShowAnswer] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [shareMessage, setShareMessage] = useState('');
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Editor appearance and behavior options
    const [editorOptions, setEditorOptions] = useState({
        fontSize: 14,
        wordWrap: true,
        minimap: false,
        lineNumbers: true,
        theme: theme === 'dark' ? 'vs-dark' : 'vs-light',
    });
    const [showSettings, setShowSettings] = useState(false);
    const [editorWidth, setEditorWidth] = useState(50);

    // Keep the Monaco editor theme in sync with the application theme
    useEffect(() => {
        setEditorOptions((prev) => ({
            ...prev,
            theme: theme === 'dark' ? 'vs-dark' : 'vs-light',
        }));
    }, [theme]);

    useEffect(() => {
        document.body.style.overflow = isFullScreen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isFullScreen]);

    const handleCodeChange = (newCode) => {
        setCodes(prevCodes => ({
            ...prevCodes,
            [selectedLanguage]: newCode
        }));
    };

    const toggleOption = (option) => {
        setEditorOptions(prev => ({ ...prev, [option]: !prev[option] }));
    };

    const runCode = async () => {
        setIsRunning(true);
        setRunError(null);
        setConsoleOutput('');

        if (selectedLanguage === 'cpp') {
            try {
                const res = await fetch('/api/code/run-cpp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: codes.cpp }),
                });
                const data = await res.json();
                if (data.error) {
                    setRunError(data.output);
                } else {
                    setConsoleOutput(data.output);
                }
            } catch (error) {
                setRunError('An error occurred while running the C++ code.');
                console.error(error);
            } finally {
                setIsRunning(false);
            }
        } else if (selectedLanguage === 'python') {
            try {
                const res = await fetch('/api/code/run-python', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: codes.python }),
                });
                const data = await res.json();
                if (data.error) {
                    setRunError(data.output);
                } else {
                    setConsoleOutput(data.output);
                }
            } catch (error) {
                setRunError('An error occurred while running the Python code.');
                console.error(error);
            } finally {
                setIsRunning(false);
            }
        } else {
            const fullSrcDoc = `
                <html>
                    <head>
                        <style>${codes.css}</style>
                    </head>
                    <body>
                        ${codes.html}
                        <script>
                            const originalLog = console.log;
                            let outputBuffer = '';
                            console.log = (...args) => {
                                outputBuffer += args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ') + '\\n';
                            };
                            
                            try {
                                ${codes.javascript}
                                window.parent.postMessage({
                                    type: 'js-output',
                                    output: outputBuffer.trim() || 'Execution complete.',
                                    isError: false
                                }, '*');
                            } catch (e) {
                                window.parent.postMessage({
                                    type: 'js-output',
                                    output: e.message,
                                    isError: true
                                }, '*');
                            } finally {
                                console.log = originalLog;
                            }
                        </script>
                    </body>
                </html>
            `;
            setSrcDoc(fullSrcDoc);
            setIsRunning(false);
        }
    };

    const saveSnippet = async () => {
        setIsSaving(true);
        setShareMessage('');
        try {
            const res = await fetch('/api/code-snippet/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html: codes.html,
                    css: codes.css,
                    js: codes.javascript,
                    cpp: codes.cpp,
                    python: codes.python,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to save snippet');
            }
            const link = `${window.location.origin}/tryit?snippetId=${data._id}&language=${selectedLanguage}`;
            await navigator.clipboard.writeText(link);
            setShareMessage('Link copied to clipboard!');
        } catch (error) {
            console.error(error);
            setShareMessage('Failed to save snippet.');
        } finally {
            setIsSaving(false);
            setTimeout(() => setShareMessage(''), 3000);
        }
    };

    const isLivePreviewLanguage = selectedLanguage === 'html' || selectedLanguage === 'css' || selectedLanguage === 'javascript';

    useEffect(() => {
        if (!autoRun || !isLivePreviewLanguage) return;
        const timeout = setTimeout(() => {
            runCode();
        }, 1000);
        return () => clearTimeout(timeout);
    }, [codes.html, codes.css, codes.javascript, autoRun, selectedLanguage, isLivePreviewLanguage]);

    useEffect(() => {
        if (isLivePreviewLanguage) {
            runCode();
        }
    }, [isLivePreviewLanguage, selectedLanguage]);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'js-output') {
                if (event.data.isError) {
                    setRunError(event.data.output);
                    setConsoleOutput('');
                } else {
                    setRunError(null);
                    setConsoleOutput(event.data.output);
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const resetCode = () => {
        // Reset to initialCode from props, falling back to defaults
        setCodes({
            html: initialCode.html || defaultCodes.html,
            css: initialCode.css || defaultCodes.css,
            javascript: initialCode.javascript || defaultCodes.javascript,
            cpp: initialCode.cpp || defaultCodes.cpp,
            python: initialCode.python || defaultCodes.python,
        });
        setSrcDoc('');
        setConsoleOutput('');
        setRunError(null);
    };

    return (
        <div className={`flex flex-col p-4 bg-gray-50 dark:bg-gray-900 shadow-xl ${isFullScreen ? 'fixed inset-0 z-50 h-screen w-screen rounded-none' : 'h-[90vh] md:h-[800px] rounded-lg'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-center p-2 mb-4 gap-4">
                <LanguageSelector
                    selectedLanguage={selectedLanguage}
                    setSelectedLanguage={setSelectedLanguage}
                />
                <div className="flex items-center gap-4">
                    {isLivePreviewLanguage && (
                        <div className="flex items-center gap-2">
                            <ToggleSwitch checked={autoRun} onChange={() => setAutoRun(!autoRun)} label="Auto-Run" className="text-sm font-medium" />
                        </div>
                    )}
                    <div className="relative">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button outline gradientDuoTone="purpleToBlue" onClick={() => setShowSettings(!showSettings)}>
                                Editor Settings
                            </Button>
                        </motion.div>
                        {showSettings && (
                            <div className="absolute right-0 mt-2 w-56 z-50 p-3 bg-white dark:bg-gray-800 rounded-md shadow-lg space-y-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Font Size</label>
                                    <Select
                                        size="sm"
                                        value={editorOptions.fontSize}
                                        onChange={(e) =>
                                            setEditorOptions({
                                                ...editorOptions,
                                                fontSize: Number(e.target.value),
                                            })
                                        }
                                    >
                                        <option value={12}>12</option>
                                        <option value={14}>14</option>
                                        <option value={16}>16</option>
                                        <option value={18}>18</option>
                                    </Select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Theme</label>
                                    <Select
                                        size="sm"
                                        value={editorOptions.theme}
                                        onChange={(e) =>
                                            setEditorOptions({
                                                ...editorOptions,
                                                theme: e.target.value,
                                            })
                                        }
                                    >
                                        <option value="vs-light">Light</option>
                                        <option value="vs-dark">Dark</option>
                                        <option value="hc-black">High Contrast</option>
                                    </Select>
                                </div>
                                <ToggleSwitch
                                    checked={editorOptions.wordWrap}
                                    onChange={() => toggleOption('wordWrap')}
                                    label="Word Wrap"
                                    className="text-sm"
                                />
                                <ToggleSwitch
                                    checked={editorOptions.minimap}
                                    onChange={() => toggleOption('minimap')}
                                    label="Minimap"
                                    className="text-sm"
                                />
                                <ToggleSwitch
                                    checked={editorOptions.lineNumbers}
                                    onChange={() => toggleOption('lineNumbers')}
                                    label="Line Numbers"
                                    className="text-sm"
                                />
                            </div>
                        )}
                    </div>
                    {isLivePreviewLanguage && showOutputPanel && (
                        <div className="flex items-center gap-2 w-32">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-200">Width</label>
                            <input
                                type="range"
                                min="30"
                                max="70"
                                value={editorWidth}
                                onChange={(e) => setEditorWidth(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    )}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Button
                            gradientDuoTone="purpleToBlue"
                            onClick={runCode}
                            isProcessing={isRunning}
                            disabled={isRunning}
                        >
                            <FaPlay className="mr-2 h-4 w-4" /> Run Code
                        </Button>
                    </motion.div>
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Button outline gradientDuoTone="pinkToOrange" onClick={resetCode}>
                            <FaRedo className="mr-2 h-4 w-4" /> Reset
                        </Button>
                    </motion.div>
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Button outline gradientDuoTone="purpleToBlue" onClick={saveSnippet} isProcessing={isSaving} disabled={isSaving}>
                            <FaSave className="mr-2 h-4 w-4" /> Save & Share
                        </Button>
                    </motion.div>
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Button
                            outline
                            gradientDuoTone="purpleToBlue"
                            onClick={() => setIsFullScreen(!isFullScreen)}
                        >
                            {isFullScreen ? (
                                <FaCompress className="mr-2 h-4 w-4" />
                            ) : (
                                <FaExpand className="mr-2 h-4 w-4" />
                            )}
                            {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                        </Button>
                    </motion.div>
                    {expectedOutput && (
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button outline gradientDuoTone="greenToBlue" onClick={() => setShowAnswer(!showAnswer)}>
                                {showAnswer ? (
                                    <FaEyeSlash className="mr-2 h-4 w-4" />
                                ) : (
                                    <FaEye className="mr-2 h-4 w-4" />
                                )}
                                {showAnswer ? 'Hide Answer' : 'Show Answer'}
                            </Button>
                        </motion.div>
                    )}
                </div>
            </div>
            {shareMessage && (
                <Alert color={shareMessage.includes('Failed') ? 'failure' : 'success'} className="mb-4">
                    {shareMessage}
                </Alert>
            )}
            <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
                <div
                    className="flex-1 flex flex-col rounded-md shadow-inner bg-white dark:bg-gray-800 p-2"
                    style={{ width: showOutputPanel ? `${editorWidth}%` : '100%' }}
                >
                    <div className="flex-1 rounded-md overflow-hidden">
                        <Editor
                            beforeMount={registerAutocompletion}
                            height="100%"
                            language={selectedLanguage}
                            value={codes[selectedLanguage]}
                            theme={editorOptions.theme}
                            onChange={handleCodeChange}
                            options={{
                                minimap: { enabled: editorOptions.minimap },
                                fontSize: editorOptions.fontSize,
                                lineNumbers: editorOptions.lineNumbers ? 'on' : 'off',
                                wordWrap: editorOptions.wordWrap ? 'on' : 'off',
                                smoothScrolling: true,
                                automaticLayout: true,
                                folding: true,
                                scrollbar: { vertical: 'auto', horizontal: 'auto' },
                                padding: { top: 10, bottom: 10 },
                                tabCompletion: 'on',
                                suggestOnTriggerCharacters: true,
                            }}
                        />
                    </div>
                </div>

                <div
                    className={`flex-1 flex flex-col gap-4 transition-all duration-300 ${isLivePreviewLanguage && !showOutputPanel ? 'hidden' : ''}`}
                    style={{ width: showOutputPanel ? `${100 - editorWidth}%` : '100%' }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={isLivePreviewLanguage ? 'live' : 'console'}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col flex-1"
                        >
                            <div className="flex flex-col flex-1 rounded-md shadow-inner bg-white dark:bg-gray-800 p-2">
                                {isLivePreviewLanguage && (
                                    <div className="flex justify-between items-center mb-1">
                                        <h3 className="block text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            <FaTerminal />
                                            {isLivePreviewLanguage ? 'Live Output' : 'Terminal'}
                                        </h3>
                                        <motion.div
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                        >
                                            <Button
                                                size="xs"
                                                outline
                                                gradientDuoTone="purpleToBlue"
                                                onClick={() => isLivePreviewLanguage && setShowOutputPanel(!showOutputPanel)}
                                                disabled={!isLivePreviewLanguage}
                                            >
                                                {showOutputPanel ? <FaChevronDown /> : <FaChevronRight />}
                                            </Button>
                                        </motion.div>
                                    </div>
                                )}
                                <div className="flex-1 rounded-md overflow-hidden bg-white dark:bg-gray-800">
                                    {isLivePreviewLanguage ? (
                                        <div className="flex flex-col h-full">
                                            <iframe
                                                title="live-output"
                                                srcDoc={srcDoc}
                                                sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin"
                                                className="w-full flex-1 bg-white dark:bg-gray-800 border-none"
                                            />
                                            {selectedLanguage === 'javascript' && (
                                                <TerminalPane
                                                    output={consoleOutput || 'Execution complete.'}
                                                    error={runError || ''}
                                                    isRunning={isRunning}
                                                    theme={theme}
                                                    onClear={() => {
                                                        setConsoleOutput('');
                                                        setRunError(null);
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <TerminalPane
                                            output={consoleOutput || 'Execution complete.'}
                                            error={runError || ''}
                                            isRunning={isRunning}
                                            theme={theme}
                                            onClear={() => {
                                                setConsoleOutput('');
                                                setRunError(null);
                                            }}
                                        />
                                    )}
                                </div>
                                {showAnswer && expectedOutput && (
                                    <div className="mt-2 p-2 rounded-md bg-gray-100 dark:bg-gray-700">
                                        <h4 className="text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Expected Output</h4>
                                        <pre className="whitespace-pre-wrap text-xs text-gray-800 dark:text-gray-200">{expectedOutput}</pre>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

CodeEditor.propTypes = {
    initialCode: PropTypes.object,
    language: PropTypes.string,
    expectedOutput: PropTypes.string,
};
