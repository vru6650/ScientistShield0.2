import React from 'react';
import { useLocation } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';
import { Alert } from 'flowbite-react';
import useCodeSnippet from '../hooks/useCodeSnippet';

export default function TryItPage() {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const stateCode = location.state?.code;
    const stateLanguage = location.state?.language;
    const stateExpected = location.state?.expectedOutput;
    const queryCode = searchParams.get('code');
    const queryLanguage = searchParams.get('language');
    const queryExpected = searchParams.get('expectedOutput');
    const snippetId = searchParams.get('snippetId');

    const { snippet, isLoading, error } = useCodeSnippet(snippetId);

    const initialExpected = stateExpected || (queryExpected ? decodeURIComponent(queryExpected) : '');

    // Default message when there's no initial code
    const defaultCodeMessage = `// Welcome to the live code editor!
// You can write and run HTML, CSS, or JavaScript here.
// Enjoy experimenting with your code!
`;

    let initialLanguage;
    let initialCodeObj;

    if (snippetId) {
        if (isLoading || !snippet) {
            return (
                <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                    <div className="max-w-6xl mx-auto">Loading...</div>
                </div>
            );
        }
        if (error) {
            return (
                <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                    <div className="max-w-6xl mx-auto">{error}</div>
                </div>
            );
        }
        initialLanguage = queryLanguage || 'javascript';
        initialCodeObj = {
            html: snippet.html || '',
            css: snippet.css || '',
            javascript: snippet.js || '',
            cpp: snippet.cpp || '',
            python: snippet.python || '',
        };
    } else {
        const initialCode = stateCode || (queryCode ? decodeURIComponent(queryCode) : null);
        initialLanguage = stateLanguage || queryLanguage || 'javascript';
        initialCodeObj = {
            [initialLanguage]: initialCode || defaultCodeMessage,
        };
    }

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
                    key={snippetId || initialLanguage}
                    initialCode={initialCodeObj}
                    language={initialLanguage}
                    expectedOutput={initialExpected}
                />
            </div>
        </div>
    );
}