import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTutorials } from '../services/tutorialService';
import { Spinner, Alert, Button, Progress } from 'flowbite-react';
import DOMPurify from 'dompurify';
import parse from 'html-react-parser';
import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';

// Reusable components
import ReadingProgressBar from '../components/ReadingProgressBar';
import TableOfContents from '../components/TableOfContents';
import SocialShare from '../components/SocialShare';
import { calculateReadingTime } from '../utils/helpers';
import useUser from '../hooks/useUser';
import CommentSection from '../components/CommentSection';
import CodeEditor from '../components/CodeEditor';
import QuizComponent from '../components/QuizComponent';
import InteractiveCodeBlock from '../components/InteractiveCodeBlock.jsx';

import '../Tiptap.css';
import '../pages/Scrollbar.css';

import { FaCode, FaQuestionCircle, FaArrowLeft, FaArrowRight, FaVideo } from 'react-icons/fa';
import { HiCheckCircle, HiExternalLink } from 'react-icons/hi';
import { HiOutlineUserCircle, HiOutlineDocumentText } from 'react-icons/hi2';

// Helper function to generate a valid slug from a string.
const generateSlug = (text) => {
    if (!text) return '';
    return text.toLowerCase().trim().replace(/[\s\W-]+/g, '-').replace(/^-+|-+$/g, '');
};

// Helper function to extract plain text from an HTML node.
const getTextFromNode = (node) => {
    if (node.type === 'text') return node.data;
    if (node.type !== 'tag' || !node.children) return '';
    return node.children.map(getTextFromNode).join('');
};

const TutorialPageSkeleton = () => (
    <main className='p-3 flex flex-col max-w-6xl mx-auto min-h-screen animate-pulse'>
        <div className='bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 p-8 rounded-lg shadow-xl mb-12'>
            <div className='h-12 bg-gray-300 dark:bg-gray-600 rounded-md max-w-xl mx-auto mb-4'></div>
            <div className='h-8 bg-gray-300 dark:bg-gray-600 rounded-md max-w-3xl mx-auto mb-6'></div>
            <div className='h-40 bg-gray-300 dark:bg-gray-600 rounded-lg w-full'></div>
            <div className='flex justify-center items-center mt-6'>
                <div className='w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full mr-3'></div>
                <div className='h-4 w-40 bg-gray-300 dark:bg-gray-600 rounded-full'></div>
            </div>
        </div>
        <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
            <div className='lg:col-span-1 bg-gray-200 dark:bg-gray-700 p-4 rounded-lg h-[400px]'></div>
            <div className='lg:col-span-3 bg-gray-200 dark:bg-gray-700 p-8 rounded-lg min-h-[600px]'>
                <div className='h-8 w-2/3 bg-gray-300 dark:bg-gray-600 rounded-md mb-6'></div>
                <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded-full mb-3'></div>
                <div className='h-4 bg-gray-300 dark:bg-gray-600 rounded-full mb-3'></div>
                <div className='h-4 w-5/6 bg-gray-300 dark:bg-gray-600 rounded-full'></div>
            </div>
        </div>
    </main>
);

// Map tutorial categories to code languages for syntax highlighting.
const categoryToLanguageMap = {
    'Web Development': 'html',
    'JavaScript': 'javascript',
    'Python': 'python',
    'C++': 'cpp',
};

// New sub-component for rendering dynamic chapter content.
// This greatly simplifies the main component and keeps the rendering logic self-contained.
const ChapterContent = ({ activeChapter, sanitizedContent, parserOptions }) => {
    switch (activeChapter.contentType) {
        case 'code-interactive':
            // Renders a code editor, often with a description from the Tiptap editor.
            return (
                <motion.div
                    key="code-interactive"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className='bg-gray-800 p-4 rounded-md text-white my-4 shadow-lg'
                >
                    <h3 className='text-xl font-semibold mb-3 flex items-center gap-2'><FaCode /> Try it yourself!</h3>
                    <div className='post-content tiptap mb-4' dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
                    <CodeEditor
                        initialCode={{ [activeChapter.codeLanguage || 'html']: activeChapter.initialCode || '' }}
                        language={activeChapter.codeLanguage || 'html'}
                        expectedOutput={activeChapter.expectedOutput || ''}
                    />
                </motion.div>
            );
        case 'quiz':
            // Renders a quiz component linked by its ID.
            return (
                <motion.div
                    key="quiz-content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className='my-8 p-4 border border-blue-500 rounded-lg bg-blue-50 dark:bg-blue-900/20'
                >
                    <h3 className='text-xl font-semibold mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-300'><FaQuestionCircle /> Test Your Knowledge!</h3>
                    <div className='post-content tiptap mb-4' dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
                    <QuizComponent quizId={activeChapter.quizId} />
                </motion.div>
            );
        case 'video':
            // Renders video or rich media content embedded via Tiptap.
            return (
                <motion.div
                    key="video-content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className='post-content tiptap p-3 max-w-full mx-auto leading-relaxed text-lg text-gray-700 dark:text-gray-300'
                >
                    {parse(sanitizedContent, parserOptions)}
                </motion.div>
            );
        case 'text':
        default:
            // Renders standard text content from the Tiptap editor.
            return (
                <motion.div
                    key="text-content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className='post-content tiptap p-3 max-w-full mx-auto leading-relaxed text-lg text-gray-700 dark:text-gray-300'
                >
                    {parse(sanitizedContent, parserOptions)}
                </motion.div>
            );
    }
};

const ChapterLink = ({ chapter, tutorial, activeChapterId, currentUser }) => {
    const isCompleted = currentUser && chapter.completedBy?.includes(currentUser._id);
    const isActive = activeChapterId === chapter._id;

    const Icon =
        chapter.contentType === 'code-interactive' ? FaCode :
            chapter.contentType === 'quiz' ? FaQuestionCircle :
                chapter.contentType === 'video' ? FaVideo :
                    HiOutlineDocumentText;

    return (
        <motion.li
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            key={chapter._id}
        >
            <Link
                to={`/tutorials/${tutorial.slug}/${chapter.chapterSlug}`}
                className={`flex items-center p-3 rounded-lg transition-all duration-200 ease-in-out group
                    ${isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold shadow-md'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-700'
                }`}
            >
                <div className="flex items-center w-6">
                    <Icon className={`text-sm ${isActive ? 'text-white' : 'text-blue-500 group-hover:text-blue-600 dark:text-blue-300'}`} />
                </div>
                <span className="flex-1 ml-3 text-sm">{chapter.chapterTitle}</span>
                {isCompleted && (
                    <HiCheckCircle className={`text-lg transition-colors duration-200 ${isActive ? 'text-green-200' : 'text-green-500'}`} />
                )}
            </Link>
        </motion.li>
    );
};

// NEW: A recursive component to render chapters and subchapters
const NestedChapterList = ({ chapters, tutorial, activeChapterId, currentUser }) => {
    if (!chapters || chapters.length === 0) return null;
    const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
    return (
        <ul className="space-y-3 pl-4 border-l border-gray-300 dark:border-gray-700">
            {sortedChapters.map(chapter => (
                <li key={chapter._id}>
                    <ChapterLink
                        chapter={chapter}
                        tutorial={tutorial}
                        activeChapterId={activeChapterId}
                        currentUser={currentUser}
                    />
                    {/* Recursively render subchapters if they exist */}
                    {chapter.subChapters && chapter.subChapters.length > 0 && (
                        <NestedChapterList
                            chapters={chapter.subChapters}
                            tutorial={tutorial}
                            activeChapterId={activeChapterId}
                            currentUser={currentUser}
                        />
                    )}
                </li>
            ))}
        </ul>
    );
};

const SidebarNavigation = ({ tutorial, sortedChapters, activeChapter, currentUser }) => (
    <aside className="md:w-72 w-full p-4 border-r border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 shadow-lg md:h-screen md:sticky md:top-0 overflow-y-auto scrollbar-custom z-10">
        <h3 className="text-2xl font-extrabold mb-5 text-gray-900 dark:text-white border-b pb-3 border-gray-300 dark:border-gray-600">
            {tutorial.title}
        </h3>
        <motion.ul
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
                visible: { transition: { staggerChildren: 0.05 } },
            }}
        >
            <NestedChapterList
                chapters={tutorial?.chapters}
                tutorial={tutorial}
                activeChapterId={activeChapter?._id}
                currentUser={currentUser}
            />
        </motion.ul>
    </aside>
);

export default function SingleTutorialPage() {
    const { tutorialSlug, chapterSlug } = useParams();
    const navigate = useNavigate();

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['tutorial', tutorialSlug],
        queryFn: () => getTutorials(`slug=${tutorialSlug}`),
        staleTime: 1000 * 60 * 10,
    });

    const tutorial = data?.tutorials?.[0];
    const { user: author, isLoading: isAuthorLoading } = useUser(tutorial?.authorId);
    const { currentUser } = useSelector((state) => state.user);
    const [isCompleted, setIsCompleted] = useState(false);
    const [completionPercentage, setCompletionPercentage] = useState(0);

    const findChapterBySlug = (chapters, slug) => {
        for (const chapter of chapters) {
            if (chapter.chapterSlug === slug) {
                return chapter;
            }
            if (chapter.subChapters && chapter.subChapters.length > 0) {
                const foundSubchapter = findChapterBySlug(chapter.subChapters, slug);
                if (foundSubchapter) {
                    return foundSubchapter;
                }
            }
        }
        return null;
    };

    const activeChapter = useMemo(() => {
        if (!tutorial || !tutorial.chapters || tutorial.chapters.length === 0) return null;
        let chapterToUse = chapterSlug ? findChapterBySlug(tutorial.chapters, chapterSlug) : tutorial.chapters.sort((a, b) => a.order - b.order)[0];
        if (chapterToUse && !chapterToUse.chapterSlug) chapterToUse.chapterSlug = generateSlug(chapterToUse.chapterTitle);
        return chapterToUse;
    }, [tutorial, chapterSlug]);

    const sanitizedContent = useMemo(() => activeChapter?.content ? DOMPurify.sanitize(activeChapter.content) : '', [activeChapter?.content]);
    const headings = useMemo(() => {
        if (!sanitizedContent) return [];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sanitizedContent;
        const headingNodes = tempDiv.querySelectorAll('h2, h3');
        return Array.from(headingNodes).map(node => ({
            id: generateSlug(node.innerText),
            text: node.innerText,
            level: node.tagName.toLowerCase(),
        }));
    }, [sanitizedContent]);

    const handleMarkComplete = async () => {
        if (!currentUser) { navigate('/sign-in'); return; }
        if (isCompleted) return;
        try {
            const res = await fetch(`/api/tutorial/complete/${tutorial._id}/${activeChapter._id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (res.ok) { setIsCompleted(true); refetch(); }
            else { const data = await res.json(); console.error(data.message); }
        } catch (error) { console.error(error.message); }
    };

    const countCompletedChapters = (chapters) => {
        if (!chapters) return 0;
        return chapters.reduce((count, chapter) => {
            const isCompleted = chapter.completedBy?.includes(currentUser._id);
            const subChapterCount = chapter.subChapters ? countCompletedChapters(chapter.subChapters) : 0;
            return count + (isCompleted ? 1 : 0) + subChapterCount;
        }, 0);
    };

    const countTotalChapters = (chapters) => {
        if (!chapters) return 0;
        return chapters.reduce((count, chapter) => {
            const subChapterCount = chapter.subChapters ? countTotalChapters(chapter.subChapters) : 0;
            return count + 1 + subChapterCount;
        }, 0);
    };

    useEffect(() => {
        if (activeChapter && currentUser) {
            const completed = activeChapter.completedBy && activeChapter.completedBy.includes(currentUser._id);
            setIsCompleted(completed);
        } else { setIsCompleted(false); }
    }, [activeChapter, currentUser]);

    useEffect(() => {
        if (tutorial && currentUser) {
            const completedChapters = countCompletedChapters(tutorial.chapters);
            const totalChapters = countTotalChapters(tutorial.chapters);
            const newPercentage = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
            setCompletionPercentage(newPercentage);
        } else { setCompletionPercentage(0); }
    }, [tutorial, currentUser]);

    useEffect(() => {
        if (tutorial && tutorial.chapters.length > 0) {
            if (!chapterSlug && activeChapter) {
                navigate(`/tutorials/${tutorial.slug}/${activeChapter.chapterSlug}`, { replace: true });
            } else if (chapterSlug && !activeChapter) {
                navigate('/404', { replace: true });
            }
        }
    }, [tutorial, chapterSlug, navigate, activeChapter]);

    const createMetaDescription = (htmlContent) => {
        if (!htmlContent) return '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        return tempDiv.textContent.trim().slice(0, 155) + '...';
    };

    const parserOptions = {
        replace: domNode => {
            if (domNode.type === 'tag' && (domNode.name === 'h2' || domNode.name === 'h3')) {
                const textContent = getTextFromNode(domNode);
                const id = generateSlug(textContent);
                if (id) domNode.attribs.id = id;
                return;
            }
            if (domNode.type === 'tag' && domNode.name === 'pre' && domNode.children[0]?.name === 'code') {
                const codeNode = domNode.children[0];
                const codeText = getTextFromNode(codeNode);
                const languageFromClass = codeNode.attribs['class']?.replace('language-', '');
                const defaultLanguage = categoryToLanguageMap[tutorial.category];
                const language = languageFromClass || defaultLanguage || 'javascript';
                return <InteractiveCodeBlock initialCode={codeText} language={language} />;
            }
            if (domNode.type === 'tag' && domNode.name === 'img') {
                return (
                    <img
                        src={domNode.attribs.src}
                        alt={domNode.attribs.alt || 'tutorial image'}
                        className="my-4 rounded-lg shadow-lg max-w-full h-auto object-contain mx-auto"
                    />
                );
            }
            if (domNode.type === 'tag' && domNode.name === 'video') {
                return (
                    <video
                        src={domNode.attribs.src}
                        controls
                        className="my-4 rounded-lg shadow-lg max-w-full h-auto object-contain mx-auto"
                    />
                );
            }
            if (domNode.type === 'tag' && domNode.name === 'div' && domNode.attribs['data-snippet-id']) {
                const snippetId = domNode.attribs['data-snippet-id'];
                return <CodeEditor snippetId={snippetId} />;
            }
        }
    };

    const findFlatChapterIndex = (chapters, slug) => {
        const flatChapters = flattenChapters(chapters);
        return flatChapters.findIndex(chap => chap.chapterSlug === slug);
    };

    const flattenChapters = (chapters) => {
        if (!chapters) return [];
        return chapters.reduce((acc, chap) => {
            acc.push(chap);
            if (chap.subChapters && chap.subChapters.length > 0) {
                acc = acc.concat(flattenChapters(chap.subChapters));
            }
            return acc;
        }, []);
    };

    const flatChapters = useMemo(() => flattenChapters(tutorial?.chapters), [tutorial?.chapters]);
    const currentChapterIndex = findFlatChapterIndex(tutorial?.chapters, chapterSlug);
    const prevChapter = currentChapterIndex > 0 ? flatChapters[currentChapterIndex - 1] : null;
    const nextChapter = currentChapterIndex < flatChapters.length - 1 ? flatChapters[currentChapterIndex + 1] : null;

    if (!activeChapter) {
        return (
            <div className='text-center my-20 text-gray-700 dark:text-gray-300'>
                Tutorial content not found or is still loading.
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{activeChapter.chapterTitle} - {tutorial.title}</title>
                <meta name="description" content={createMetaDescription(activeChapter.content)} />
                <meta property="og:title" content={`${activeChapter.chapterTitle} - ${tutorial.title}`} />
                <meta property="og:description" content={createMetaDescription(activeChapter.content)} />
                <meta property="og:image" content={tutorial.thumbnail} />
                <meta property="og:url" content={window.location.href} />
                <meta property="og:type" content="article" />
            </Helmet>

            <ReadingProgressBar />
            <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">

                <SidebarNavigation
                    tutorial={tutorial}
                    activeChapter={activeChapter}
                    currentUser={currentUser}
                />

                <main className="flex-1 p-8 overflow-x-hidden">
                    <h1 className='text-4xl lg:text-5xl font-extrabold text-center my-8 leading-tight text-gray-900 dark:text-white'>{tutorial.title}</h1>
                    <p className='text-xl text-gray-600 dark:text-gray-400 text-center max-w-4xl mx-auto mb-12 font-light'>{tutorial.description}</p>

                    <div className='flex justify-center items-center text-sm text-gray-500 dark:text-gray-400 max-w-3xl mx-auto border-b border-t py-4 mb-10 transition-all duration-300 ease-in-out'>
                        <div className="flex items-center mx-4">
                            <img src={author?.profilePicture || 'https://via.placeholder.com/40'} alt={author?.username} className='w-10 h-10 rounded-full object-cover mr-3 border-2 border-blue-400' />
                            <span>By <span className="font-semibold text-gray-700 dark:text-gray-200">{author?.username || 'Loading Author...'}</span></span>
                        </div>
                        <span className="mx-4">&bull;</span>
                        <span className="mx-4">{calculateReadingTime(activeChapter.content)} min read</span>
                    </div>

                    {currentUser && completionPercentage > 0 && (
                        <div className="max-w-6xl mx-auto my-8">
                            <p className="text-center font-bold text-lg mb-2">
                                Tutorial Progress: {completionPercentage}%
                            </p>
                            <Progress progress={completionPercentage} size="lg" color="indigo" className="mb-8 transition-all duration-300 ease-in-out shadow-md" style={{ height: '10px' }} />
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto">
                        <div className="lg:w-3/4 w-full">
                            <h2 className='text-3xl lg:text-4xl font-bold my-6 text-gray-900 dark:text-white leading-tight'>{activeChapter.chapterTitle}</h2>
                            <ChapterContent
                                activeChapter={activeChapter}
                                sanitizedContent={sanitizedContent}
                                parserOptions={parserOptions}
                            />
                        </div>

                        <div className="lg:w-1/4 w-full sticky top-8 h-fit self-start hidden lg:block">
                            <TableOfContents headings={headings} />
                        </div>
                    </div>

                    {currentUser && !isCompleted && (
                        <div className="flex justify-center mt-8">
                            <Button
                                gradientDuoTone='greenToBlue'
                                onClick={handleMarkComplete}
                                disabled={!activeChapter}
                                className="hover:scale-105 transition-transform duration-200"
                            >
                                Mark as Complete
                            </Button>
                        </div>
                    )}
                    {currentUser && isCompleted && (
                        <div className="flex justify-center mt-8">
                            <Alert color='success' className="max-w-md">
                                <span className="font-medium">Chapter Completed!</span> You have finished this chapter.
                            </Alert>
                        </div>
                    )}

                    <div className="max-w-2xl mx-auto w-full my-12 flex justify-center border-t pt-8 border-gray-200 dark:border-gray-700">
                        <SocialShare post={tutorial} />
                    </div>

                    <div className="max-w-4xl mx-auto w-full">
                        <CommentSection tutorialId={tutorial._id} />
                    </div>

                    <div className="flex justify-between max-w-3xl mx-auto mt-12 py-6 border-t border-gray-200 dark:border-gray-700">
                        {prevChapter ? (
                            <Link to={`/tutorials/${tutorial.slug}/${prevChapter.chapterSlug}`} className="flex-1 mr-4">
                                <Button outline gradientDuoTone="purpleToBlue" className="w-full flex flex-col items-start px-4 py-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">Previous Chapter</span>
                                    <span className="text-base font-semibold text-left">{prevChapter.chapterTitle}</span>
                                </Button>
                            </Link>
                        ) : (
                            <div className="flex-1 mr-4"></div>
                        )}
                        {nextChapter ? (
                            <Link to={`/tutorials/${tutorial.slug}/${nextChapter.chapterSlug}`} className="flex-1 ml-4">
                                <Button gradientDuoTone="purpleToPink" className="w-full flex flex-col items-end px-4 py-2">
                                    <span className="text-xs text-gray-200 mb-1">Next Chapter</span>
                                    <span className="text-base font-semibold text-right">{nextChapter.chapterTitle}</span>
                                </Button>
                            </Link>
                        ) : (
                            <div className="flex-1 ml-4"></div>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}
