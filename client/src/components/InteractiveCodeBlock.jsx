// client/src/components/InteractiveCodeBlock.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from 'flowbite-react';
import { FaPlayCircle, FaCode, FaTimes, FaExternalLinkAlt } from 'react-icons/fa';
import CodeEditor from './CodeEditor';

export default function InteractiveCodeBlock({ initialCode, language }) {
    const [isInteractive, setIsInteractive] = useState(false);

    const handleToggle = () => {
        setIsInteractive(!isInteractive);
    };

    const handleOpenInNewTab = () => {
        const url = `/tryit?code=${encodeURIComponent(initialCode)}&language=${language}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 80, duration: 0.5 }
        }
    };

    const contentVariants = {
        hidden: { opacity: 0, height: 0, y: -20 },
        visible: {
            opacity: 1,
            height: 'auto',
            y: 0,
            transition: { duration: 0.4, ease: 'easeOut' }
        },
        exit: {
            opacity: 0,
            height: 0,
            y: -20,
            transition: { duration: 0.3, ease: 'easeIn' }
        }
    };

    const motionWrapperProps = {
        whileHover: { scale: 1.05 },
        whileTap: { scale: 0.95 },
        transition: { type: "spring", stiffness: 400, damping: 10 },
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
                        onClick={handleToggle}
                        className="flex items-center text-sm font-semibold rounded-lg"
                    >
                        {isInteractive ? (
                            <>
                                <FaTimes className="mr-2" /> Close Editor
                            </>
                        ) : (
                            <>
                                <FaPlayCircle className="mr-2" /> Try it Yourself
                            </>
                        )}
                    </Button>
                </motion.div>
            </div>

            <AnimatePresence mode="wait">
                {isInteractive ? (
                    <motion.div
                        key="interactive"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="pt-6"
                    >
                        <CodeEditor
                            initialCode={{ [language]: initialCode }}
                            language={language}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="static"
                        variants={contentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="pt-6"
                    >
                        <div className="w-full relative group">
                            <pre className={`p-5 rounded-lg bg-gray-900 text-white language-${language} overflow-x-auto text-sm shadow-inner`}>
                                <code dangerouslySetInnerHTML={{ __html: initialCode }} />
                            </pre>
                            <motion.div
                                {...motionWrapperProps}
                                className="absolute bottom-4 right-4 z-10"
                            >
                                <Button size="xs" outline gradientDuoTone="purpleToBlue" onClick={handleOpenInNewTab}>
                                    <FaExternalLinkAlt className="mr-1" />
                                    Open in new tab
                                </Button>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}