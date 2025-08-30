// client/src/components/InteractiveCodeBlock.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from 'flowbite-react';
import { FaPlayCircle, FaCode } from 'react-icons/fa';

export default function InteractiveCodeBlock({ initialCode, language, expectedOutput = '' }) {
    const handleOpenInNewTab = () => {
        const url = `/tryit?code=${encodeURIComponent(initialCode)}&language=${language}` +
            (expectedOutput ? `&expectedOutput=${encodeURIComponent(expectedOutput)}` : '');
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: 'spring', stiffness: 80, duration: 0.5 }
        }
    };

    const motionWrapperProps = {
        whileHover: { scale: 1.05 },
        whileTap: { scale: 0.95 },
        transition: { type: 'spring', stiffness: 400, damping: 10 },
        style: { display: 'inline-block' },
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="my-6 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-2xl relative overflow-hidden transition-colors duration-300"
        >
            <div className="flex justify-between items-center pb-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-xl font-bold flex items-center gap-3 text-gray-800 dark:text-gray-100">
                    <FaCode className="text-purple-600 drop-shadow-md" /> Interactive Code
                </h3>
                <motion.div {...motionWrapperProps}>
                    <Button
                        gradientDuoTone="purpleToBlue"
                        size="sm"
                        onClick={handleOpenInNewTab}
                        className="flex items-center text-sm font-semibold rounded-lg"
                    >
                        <FaPlayCircle className="mr-2" /> Try it Yourself
                    </Button>
                </motion.div>
            </div>

            <div className="pt-6">
                <pre className={`p-5 rounded-lg bg-gray-900 text-white language-${language} overflow-x-auto text-sm shadow-inner`}>
                    <code dangerouslySetInnerHTML={{ __html: initialCode }} />
                </pre>
            </div>
        </motion.div>
    );
}

