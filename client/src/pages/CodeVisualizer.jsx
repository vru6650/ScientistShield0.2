import React from 'react';
import ExecutionVisualizer from '../components/ExecutionVisualizer';

export default function CodeVisualizer() {
    return (
        <div className="min-h-screen p-6 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">Code Visualizer</h1>
                <p className="mb-4 text-gray-600 dark:text-gray-300">
                    Write code and visualize its execution step by step.
                </p>
                <ExecutionVisualizer />
            </div>
        </div>
    );
}
