import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';
import { Alert } from 'flowbite-react';

export default function TryItPage() {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const stateCode = location.state?.code;
    const stateLanguage = location.state?.language;
    const stateExpected = location.state?.expectedOutput;
    const queryCode = searchParams.get('code');
    const queryLanguage = searchParams.get('language');
    const queryExpected = searchParams.get('expectedOutput');

    const initialCode = stateCode || (queryCode ? decodeURIComponent(queryCode) : null);
    const initialLanguage = stateLanguage || queryLanguage || 'javascript';
    const initialExpected = stateExpected || (queryExpected ? decodeURIComponent(queryExpected) : '');

    const [editorCode, setEditorCode] = useState(initialCode || '');
    const [editorLanguage, setEditorLanguage] = useState(initialLanguage || 'javascript');
    const [expectedOutput] = useState(initialExpected);

    // Default message when there's no initial code
    const defaultCodeMessage = `// Welcome to the live code editor!
// You can write and run HTML, CSS, or JavaScript here.
// Enjoy experimenting with your code!
`;

    useEffect(() => {
        // Set the initial code based on the language, or a default message if none is provided.
        if (!initialCode) {
            setEditorCode(defaultCodeMessage);
            setEditorLanguage('javascript');
        } else {
            setEditorCode(initialCode);
            setEditorLanguage(initialLanguage || 'javascript');
        }
    }, [initialCode, initialLanguage]);

    return (
        <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl lg:text-5xl font-extrabold text-center my-10 leading-tight text-gray-900 dark:text-white">
                    Try It Yourself!
                </h1>
                <p className="text-lg text-center mb-8 max-w-2xl mx-auto">
                    Edit the code in the editor below and see the live output.
                </p>

                {/* Optional: Add an Alert to explain the page's purpose */}
                <Alert color="info" className="mb-8">
                    <p className="font-semibold">Live Code Editor</p>
                    This is a sandbox environment for testing code snippets. Any changes you make will appear in the "Live Output" window.
                </Alert>

                <CodeEditor
                    initialCode={{ [editorLanguage]: editorCode }}
                    language={editorLanguage}
                    expectedOutput={expectedOutput}
                />
            </div>
        </div>
    );
}