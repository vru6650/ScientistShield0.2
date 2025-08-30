// client/src/components/DraggableChapter.jsx
import { useRef, useState, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Button, Select, TextInput, Textarea, Spinner, Alert, Tooltip } from 'flowbite-react';
import { FaTrash, FaChevronUp, FaChevronDown, FaCode, FaBook, FaList, FaQuestionCircle, FaVideo } from 'react-icons/fa';
import TiptapEditor from './TiptapEditor';
import { motion } from 'framer-motion';

const ItemTypes = {
    CHAPTER: 'chapter',
};

const DraggableChapter = ({
                              chapter,
                              index,
                              dispatch,
                              handleChapterFieldChange,
                              handleChapterContentChange,
                              moveChapter,
                              quizzesData,
                              quizzesLoading,
                              quizzesError,
                          }) => {
    const ref = useRef(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const [{ handlerId }, drop] = useDrop({
        accept: ItemTypes.CHAPTER,
        collect(monitor) {
            return { handlerId: monitor.getHandlerId() };
        },
        hover(item, monitor) {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;

            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;

            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) return;
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) return;

            moveChapter(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.CHAPTER,
        item: () => ({ id: chapter._id, index }),
        collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });

    drag(drop(ref));

    const handleRemoveChapter = () => {
        dispatch({ type: 'REMOVE_CHAPTER', payload: { index } });
    };

    const chapterVariants = {
        collapsed: { opacity: 1, height: 'auto', transition: { duration: 0.2 } },
        expanded: { opacity: 1, height: 'auto', transition: { duration: 0.2 } },
    };

    const contentVariants = {
        collapsed: { height: 0, opacity: 0, overflow: 'hidden', transition: { duration: 0.3 } },
        expanded: { height: 'auto', opacity: 1, overflow: 'visible', transition: { duration: 0.3 } },
    };

    const renderContentTypeIcon = (type) => {
        switch (type) {
            case 'text': return <FaBook className="text-teal-500" />;
            case 'code-interactive': return <FaCode className="text-blue-500" />;
            case 'quiz': return <FaList className="text-purple-500" />;
            case 'video': return <FaVideo className="text-red-500" />;
            default: return null;
        }
    };

    const renderContentInput = useMemo(() => {
        switch (chapter.contentType) {
            case 'text':
                return (
                    <div className='flex flex-col gap-2'>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Chapter Content</p>
                        <TiptapEditor
                            content={chapter.content || ''}
                            onChange={(newContent) => handleChapterContentChange(index, newContent)}
                            placeholder="Start writing your chapter content here..."
                        />
                    </div>
                );
            case 'video':
                return (
                    <div className='flex flex-col gap-2'>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Video Content</p>
                        <TiptapEditor
                            content={chapter.content || ''}
                            onChange={(newContent) => handleChapterContentChange(index, newContent)}
                            placeholder="Embed a video via the toolbar or paste embed code..."
                        />
                    </div>
                );
            case 'code-interactive':
                return (
                    <div className='flex flex-col gap-4'>
                        <div className='flex flex-col gap-2'>
                            <div className='flex items-center gap-2'>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Initial Code</p>
                                <Tooltip content="This code will be displayed in the interactive editor for the user to start with.">
                                    <FaQuestionCircle className="text-gray-400 cursor-help" />
                                </Tooltip>
                            </div>
                            <Textarea
                                rows={8}
                                placeholder="Enter the initial code here..."
                                value={chapter.initialCode || ''}
                                onChange={(e) => handleChapterFieldChange(index, 'initialCode', e.target.value)}
                            />
                        </div>
                        <div className='flex flex-col gap-2'>
                            <div className='flex items-center gap-2'>
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Expected Output</p>
                                <Tooltip content="The expected output of the code. This will be used to validate the user's solution. Leave blank if not needed.">
                                    <FaQuestionCircle className="text-gray-400 cursor-help" />
                                </Tooltip>
                            </div>
                            <TextInput
                                type="text"
                                placeholder="e.g., Hello, World!"
                                value={chapter.expectedOutput || ''}
                                onChange={(e) => handleChapterFieldChange(index, 'expectedOutput', e.target.value)}
                            />
                        </div>
                    </div>
                );
            case 'quiz':
                return (
                    <div className='flex flex-col gap-2'>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select a Quiz</p>
                        <Select
                            value={chapter.quizId || ''}
                            onChange={(e) => handleChapterFieldChange(index, 'quizId', e.target.value)}
                            disabled={quizzesLoading}
                        >
                            <option value="">
                                {quizzesLoading ? 'Loading quizzes...' : 'Select a quiz...'}
                            </option>
                            {quizzesError ? (
                                <option disabled>Error loading quizzes</option>
                            ) : (
                                quizzesData.map((quiz) => (
                                    <option key={quiz._id} value={quiz._id}>
                                        {quiz.title}
                                    </option>
                                ))
                            )}
                        </Select>
                        {quizzesError && <Alert color="failure" className="mt-2">Failed to load quizzes.</Alert>}
                        {quizzesLoading && <Spinner size="md" className="mt-2" />}
                    </div>
                );
            default:
                return null;
        }
    }, [chapter, index, quizzesData, quizzesLoading, quizzesError, handleChapterContentChange, handleChapterFieldChange]);

    return (
        <motion.div
            ref={ref}
            variants={chapterVariants}
            initial="collapsed"
            animate={isExpanded ? "expanded" : "collapsed"}
            data-handler-id={handlerId}
            style={{ opacity: isDragging ? 0.5 : 1, cursor: 'grab' }}
            className={`
                bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-md border
                ${isExpanded ? 'border-teal-500' : 'border-gray-300 dark:border-gray-700'}
            `}
        >
            <div className='flex items-center justify-between gap-4 cursor-pointer' onClick={() => setIsExpanded(!isExpanded)}>
                <div className='flex items-center gap-4 flex-1 min-w-0'>
                    <span className="text-xl font-bold text-gray-500 dark:text-gray-400">{chapter.order}.</span>
                    <span className='font-semibold text-ellipsis overflow-hidden whitespace-nowrap flex-1'>{chapter.chapterTitle || `Untitled Chapter ${chapter.order}`}</span>
                </div>
                <div className='flex items-center gap-3'>
                    <span className='text-sm text-gray-500 dark:text-gray-400 hidden sm:flex items-center gap-1'>
                        {renderContentTypeIcon(chapter.contentType)}
                        <span className="ml-1 hidden sm:inline-block">
                            {chapter.contentType === 'text' && 'Text Content'}
                            {chapter.contentType === 'code-interactive' && 'Code Example'}
                            {chapter.contentType === 'quiz' && 'Quiz'}
                            {chapter.contentType === 'video' && 'Video'}
                        </span>
                    </span>
                    <Button onClick={(e) => { e.stopPropagation(); handleRemoveChapter(); }} color="failure" size="xs" outline>
                        <FaTrash />
                    </Button>
                    <Button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} color="gray" size="xs" outline>
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </Button>
                </div>
            </div>

            <motion.div
                variants={contentVariants}
                initial="collapsed"
                animate={isExpanded ? "expanded" : "collapsed"}
            >
                <div className='flex flex-col gap-4 mt-6'>
                    <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Chapter Title</p>
                        <TextInput
                            type="text"
                            placeholder="e.g., Introduction to React"
                            value={chapter.chapterTitle || ''}
                            onChange={(e) => handleChapterFieldChange(index, 'chapterTitle', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            required
                        />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Content Type</p>
                        <Select
                            value={chapter.contentType || 'text'}
                            onChange={(e) => handleChapterFieldChange(index, 'contentType', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <option value="text">Text Content</option>
                            <option value="video">Video Content</option>
                            <option value="code-interactive">Interactive Code Example</option>
                            <option value="quiz">Linked Quiz</option>
                        </Select>
                    </div>
                    {renderContentInput}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default DraggableChapter;