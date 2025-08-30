import { Alert, Button, FileInput, Select, TextInput, Spinner, Modal, Progress } from 'flowbite-react';
import { useState, useReducer, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiOutlineExclamationCircle } from 'react-icons/hi';
import { useCloudinaryUpload } from '../hooks/useCloudinaryUpload';
import { createTutorial as createTutorialService } from '../services/tutorialService';
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useQuery } from '@tanstack/react-query';
import { FaPlus, FaChevronDown, FaTrash, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { getQuizzes as getQuizzesService } from '../services/quizService';
import { motion, AnimatePresence } from 'framer-motion';
import TiptapEditor from '../components/TiptapEditor';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DraggableChapter from '../components/DraggableChapter';

const DRAFT_KEY_TUTORIAL = 'tutorialDraft';

const tutorialInitialState = {
    formData: {
        title: '',
        description: '',
        category: 'uncategorized',
        thumbnail: 'https://www.hostinger.com/tutorials/wp-content/uploads/sites/2/2021/09/how-to-write-a-blog-post.png',
        chapters: [],
    },
    publishError: null,
    loading: false,
};

const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result.map((item, index) => ({ ...item, order: index + 1 }));
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

const findAndAddChapter = (chapters, parentId, newChapter) => {
    for (const chapter of chapters) {
        if (chapter._id === parentId) {
            chapter.subChapters = chapter.subChapters || [];
            chapter.subChapters.push(newChapter);
            return true;
        }
        if (chapter.subChapters && chapter.subChapters.length > 0) {
            if (findAndAddChapter(chapter.subChapters, parentId, newChapter)) {
                return true;
            }
        }
    }
    return false;
};

const updateNestedChapter = (chapters, chapterId, field, value) => {
    return chapters.map(chapter => {
        if (chapter._id === chapterId) {
            return { ...chapter, [field]: value };
        }
        if (chapter.subChapters && chapter.subChapters.length > 0) {
            return {
                ...chapter,
                subChapters: updateNestedChapter(chapter.subChapters, chapterId, field, value)
            };
        }
        return chapter;
    });
};

const findAndRemoveChapter = (chapters, chapterId) => {
    const index = chapters.findIndex(c => c._id === chapterId);
    if (index !== -1) {
        chapters.splice(index, 1);
        return true;
    }
    for (const chapter of chapters) {
        if (chapter.subChapters && chapter.subChapters.length > 0) {
            if (findAndRemoveChapter(chapter.subChapters, chapterId)) {
                return true;
            }
        }
    }
    return false;
};

const cleanTemporaryIds = (chapters) => {
    if (!chapters) return [];
    return chapters.map(chapter => {
        const cleanedChapter = { ...chapter };
        if (typeof cleanedChapter._id === 'string' && cleanedChapter._id.startsWith('temp-')) {
            delete cleanedChapter._id;
        }
        if (cleanedChapter.contentType !== 'quiz' || !cleanedChapter.quizId) {
            delete cleanedChapter.quizId;
        }
        if (cleanedChapter.subChapters && cleanedChapter.subChapters.length > 0) {
            cleanedChapter.subChapters = cleanTemporaryIds(cleanedChapter.subChapters);
        }

        return cleanedChapter;
    });
};

function tutorialReducer(state, action) {
    switch (action.type) {
        case 'FIELD_CHANGE':
            return { ...state, formData: { ...state.formData, ...action.payload } };
        case 'ADD_CHAPTER_FIELD': {
            const { parentId } = action.payload;
            const newChapter = {
                _id: `temp-${Date.now()}`,
                chapterTitle: '',
                chapterSlug: '',
                content: '',
                order: parentId ?
                    (state.formData.chapters.find(c => c._id === parentId)?.subChapters?.length || 0) + 1 :
                    state.formData.chapters.length + 1,
                contentType: 'text',
                initialCode: '',
                expectedOutput: '',
                quizId: '',
                subChapters: [],
            };

            if (parentId) {
                const updatedChapters = updateNestedChapter(state.formData.chapters, parentId, 'subChapters', [
                    ...(state.formData.chapters.find(c => c._id === parentId)?.subChapters || []),
                    newChapter
                ]);
                return { ...state, formData: { ...state.formData, chapters: updatedChapters } };
            } else {
                return { ...state, formData: { ...state.formData, chapters: [...state.formData.chapters, newChapter] } };
            }
        }
        case 'UPDATE_CHAPTER_FIELD': {
            const { chapterId, field, value } = action.payload;
            const updatedChapters = updateNestedChapter(state.formData.chapters, chapterId, field, value);
            return { ...state, formData: { ...state.formData, chapters: updatedChapters } };
        }
        case 'REMOVE_CHAPTER': {
            const chaptersAfterRemove = JSON.parse(JSON.stringify(state.formData.chapters));
            findAndRemoveChapter(chaptersAfterRemove, action.payload.chapterId);
            return {
                ...state,
                formData: {
                    ...state.formData,
                    chapters: chaptersAfterRemove,
                },
            };
        }
        case 'REORDER_CHAPTERS':
            return {
                ...state,
                formData: {
                    ...state.formData,
                    chapters: reorder(state.formData.chapters, action.payload.startIndex, action.payload.endIndex)
                }
            };
        case 'THUMBNAIL_UPLOAD_SUCCESS':
            return { ...state, formData: { ...state.formData, thumbnail: action.payload } };
        case 'PUBLISH_START':
            return { ...state, loading: true, publishError: null };
        case 'PUBLISH_SUCCESS':
            return { ...tutorialInitialState };
        case 'PUBLISH_ERROR':
            return { ...state, loading: false, publishError: action.payload };
        case 'LOAD_DRAFT':
            return { ...state, formData: action.payload };
        default:
            throw new Error(`Unhandled action type: ${action.type}`);
    }
}

const generateSlug = (text) => {
    if (!text) return '';
    return text.toLowerCase().trim().replace(/[\\s\\W-]+/g, '-').replace(/^-+|-+$/g, '');
};

const NestedChapterList = ({ chapters, handleChapterFieldChange, handleChapterContentChange, quizzesData, quizzesLoading, quizzesError, handleAddSubchapter, handleRemoveChapter }) => {
    return (
        <AnimatePresence initial={false}>
            {chapters.sort((a, b) => a.order - b.order).map((chapter, index) => (
                <motion.div
                    key={chapter._id}
                    layout
                    initial={{ opacity: 0, y: 50, scale: 0.3 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                    className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow mb-4"
                >
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Chapter {chapter.order}</span>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                gradientDuoTone='cyanToBlue'
                                onClick={() => handleAddSubchapter(chapter._id)}
                            >
                                <FaPlus className="mr-2" /> Add Subchapter
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                color="failure"
                                onClick={() => handleRemoveChapter(chapter._id)}
                            >
                                <FaTrash />
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <TextInput
                            type='text'
                            placeholder='Chapter Title'
                            value={chapter.chapterTitle}
                            onChange={(e) => handleChapterFieldChange(chapter._id, 'chapterTitle', e.target.value)}
                        />
                        <Select
                            value={chapter.contentType}
                            onChange={(e) => handleChapterFieldChange(chapter._id, 'contentType', e.target.value)}
                        >
                            <option value='text'>Text Content</option>
                            <option value='video'>Video Content</option>
                            <option value='code-interactive'>Interactive Code Example</option>
                            <option value='quiz'>Linked Quiz</option>
                        </Select>

                        {chapter.contentType === 'text' && (
                            <TiptapEditor
                                content={chapter.content}
                                onChange={html => handleChapterContentChange(chapter._id, html)}
                            />
                        )}
                        {chapter.contentType === 'video' && (
                            <TiptapEditor
                                content={chapter.content}
                                onChange={html => handleChapterContentChange(chapter._id, html)}
                                placeholder='Embed a video via the toolbar or paste HTML code'
                            />
                        )}
                        {chapter.contentType === 'code-interactive' && (
                            <div className="flex flex-col gap-3">
                                <TiptapEditor
                                    content={chapter.content}
                                    onChange={html => handleChapterContentChange(chapter._id, html)}
                                />
                                <TextInput
                                    type='text'
                                    placeholder='Initial Code'
                                    value={chapter.initialCode}
                                    onChange={(e) => handleChapterFieldChange(chapter._id, 'initialCode', e.target.value)}
                                />
                                <TextInput
                                    type='text'
                                    placeholder='Expected Output'
                                    value={chapter.expectedOutput || ''}
                                    onChange={(e) => handleChapterFieldChange(chapter._id, 'expectedOutput', e.target.value)}
                                />
                            </div>
                        )}
                        {chapter.contentType === 'quiz' && (
                            <div className="flex flex-col gap-3">
                                <TiptapEditor
                                    content={chapter.content}
                                    onChange={html => handleChapterContentChange(chapter._id, html)}
                                />
                                <Select
                                    value={chapter.quizId}
                                    onChange={(e) => handleChapterFieldChange(chapter._id, 'quizId', e.target.value)}
                                    disabled={quizzesLoading}
                                >
                                    <option value="">{quizzesLoading ? 'Loading quizzes...' : 'Select a Quiz'}</option>
                                    {quizzesData?.map(quiz => (
                                        <option key={quiz._id} value={quiz._id}>{quiz.title}</option>
                                    ))}
                                </Select>
                            </div>
                        )}
                    </div>
                    {chapter.subChapters && chapter.subChapters.length > 0 && (
                        <div className="mt-4 pl-4 border-l-2 border-gray-300 dark:border-gray-600">
                            <NestedChapterList
                                chapters={chapter.subChapters}
                                handleChapterFieldChange={handleChapterFieldChange}
                                handleChapterContentChange={handleChapterContentChange}
                                quizzesData={quizzesData}
                                quizzesLoading={quizzesLoading}
                                quizzesError={quizzesError}
                                handleAddSubchapter={handleAddSubchapter}
                                handleRemoveChapter={handleRemoveChapter}
                            />
                        </div>
                    )}
                </motion.div>
            ))}
        </AnimatePresence>
    );
};

export default function CreateTutorial() {
    const [state, dispatch] = useReducer(tutorialReducer, tutorialInitialState);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const { upload, progress: uploadProgress, error: uploadError, isUploading } = useCloudinaryUpload();
    const navigate = useNavigate();

    const { data: categoriesData, isLoading: categoriesLoading, isError: categoriesError } = useQuery({
        queryKey: ['tutorialCategories'],
        queryFn: async () => {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(['JavaScript', 'React.js', 'Next.js', 'CSS', 'HTML', 'Node.js', 'Python', 'Web Development', 'Databases', 'DevOps', 'Algorithms']);
                }, 500);
            });
        },
        staleTime: Infinity,
    });
    const availableCategories = categoriesData || [];

    const { data: quizzesData, isLoading: quizzesLoading, isError: quizzesError } = useQuery({
        queryKey: ['availableQuizzes'],
        queryFn: async () => {
            const res = await getQuizzesService();
            return res.quizzes;
        },
        staleTime: 1000 * 60 * 10,
    });
    const availableQuizzes = quizzesData || [];

    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY_TUTORIAL);
        if (savedDraft) {
            const draftData = JSON.parse(savedDraft);
            if (draftData.title || (draftData.chapters && draftData.chapters.some(c => c.content?.replace(/<(.|\n)*?>/g, '').trim().length > 0 || c.initialCode?.trim().length > 0 || c.quizId))) {
                setShowDraftModal(true);
            }
        }
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            if (state.formData.title || (state.formData.chapters && flattenChapters(state.formData.chapters).some(c => c.content?.replace(/<(.|\n)*?>/g, '').trim().length > 0 || c.initialCode?.trim().length > 0 || c.quizId))) {
                localStorage.setItem(DRAFT_KEY_TUTORIAL, JSON.stringify(state.formData));
            } else {
                localStorage.removeItem(DRAFT_KEY_TUTORIAL);
            }
        }, 2000);
        return () => clearTimeout(handler);
    }, [state.formData]);

    const handleRestoreDraft = () => {
        const savedDraft = JSON.parse(localStorage.getItem(DRAFT_KEY_TUTORIAL));
        dispatch({ type: 'LOAD_DRAFT', payload: savedDraft });
        setShowDraftModal(false);
    };

    const handleDismissDraft = () => {
        localStorage.removeItem(DRAFT_KEY_TUTORIAL);
        setShowDraftModal(false);
    };

    const handleThumbnailChange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            dispatch({ type: 'PUBLISH_ERROR', payload: 'Please select a thumbnail image.' });
            return;
        }

        try {
            const url = await upload(file, {
                allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
                maxSizeMB: 5,
            });
            dispatch({ type: 'THUMBNAIL_UPLOAD_SUCCESS', payload: url });
            dispatch({ type: 'PUBLISH_ERROR', payload: null });
        } catch (err) {
            dispatch({ type: 'PUBLISH_ERROR', payload: err.message || 'Failed to upload thumbnail.' });
            console.error('Thumbnail upload error:', err);
        }
    };

    const handleMainFieldChange = (e) => {
        const { id, value } = e.target;
        const payload = { [id]: value };
        if (id === 'title') {
            payload.slug = generateSlug(value);
        }
        dispatch({ type: 'FIELD_CHANGE', payload });
    };

    const handleChapterContentChange = (chapterId, htmlContent) => {
        const contentToSave = htmlContent === undefined || htmlContent === null ? '' : htmlContent;
        dispatch({ type: 'UPDATE_CHAPTER_FIELD', payload: { chapterId, field: 'content', value: contentToSave } });
    };

    const handleChapterFieldChange = (chapterId, field, value) => {
        if (field === 'chapterTitle') {
            const newSlug = generateSlug(value);
            dispatch({ type: 'UPDATE_CHAPTER_FIELD', payload: { chapterId, field: 'chapterTitle', value } });
            dispatch({ type: 'UPDATE_CHAPTER_FIELD', payload: { chapterId, field: 'chapterSlug', value: newSlug } });
        } else {
            dispatch({ type: 'UPDATE_CHAPTER_FIELD', payload: { chapterId, field, value } });
        }
    };

    const handleAddSubchapter = (parentId) => {
        dispatch({ type: 'ADD_CHAPTER_FIELD', payload: { parentId } });
    };

    const handleRemoveChapter = (chapterId) => {
        dispatch({ type: 'REMOVE_CHAPTER', payload: { chapterId } });
    };

    const validateStep1 = () => {
        if (!state.formData.title.trim()) {
            dispatch({ type: 'PUBLISH_ERROR', payload: 'Tutorial Title is required.' });
            return false;
        }
        if (!state.formData.description.trim()) {
            dispatch({ type: 'PUBLISH_ERROR', payload: 'Tutorial Description is required.' });
            return false;
        }
        if (state.formData.category === 'uncategorized') {
            dispatch({ type: 'PUBLISH_ERROR', payload: 'Please select a category for the tutorial.' });
            return false;
        }
        return true;
    }

    const validateStep2 = () => {
        const flatChapters = flattenChapters(state.formData.chapters);
        if (flatChapters.length === 0) {
            dispatch({ type: 'PUBLISH_ERROR', payload: 'A tutorial must have at least one chapter.' });
            return false;
        }

        for (const chapter of flatChapters) {
            if (!chapter.chapterTitle.trim()) {
                dispatch({ type: 'PUBLISH_ERROR', payload: `Chapter with slug '${chapter.chapterSlug}': Title is required.` });
                return false;
            }
            if (['text', 'video'].includes(chapter.contentType)) {
                if (!chapter.content || chapter.content.replace(/<(.|\n)*?>/g, '').trim().length === 0) {
                    const typeLabel = chapter.contentType === 'video' ? 'Video' : 'Text';
                    dispatch({ type: 'PUBLISH_ERROR', payload: `Chapter with title '${chapter.chapterTitle}': ${typeLabel} content cannot be empty for '${typeLabel} Content' type.` });
                    return false;
                }
            }
            if (chapter.contentType === 'code-interactive') {
                if (!chapter.initialCode?.trim()) {
                    dispatch({ type: 'PUBLISH_ERROR', payload: `Chapter with title '${chapter.chapterTitle}': Initial Code is required for 'Interactive Code Example' type.` });
                    return false;
                }
            }
            if (chapter.contentType === 'quiz') {
                if (!chapter.quizId) {
                    dispatch({ type: 'PUBLISH_ERROR', payload: `Chapter with title '${chapter.chapterTitle}': A Quiz must be selected for 'Linked Quiz' type.` });
                    return false;
                }
            }
        }

        return true;
    }

    const nextStep = () => {
        dispatch({ type: 'PUBLISH_ERROR', payload: null });
        if (currentStep === 1) {
            if (validateStep1()) {
                setCurrentStep(currentStep + 1);
            }
        } else if (currentStep === 2) {
            if(validateStep2()) {
                setCurrentStep(currentStep + 1);
            }
        }
    };

    const prevStep = () => {
        setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch({ type: 'PUBLISH_START' });

        if (!state.formData.thumbnail || state.formData.thumbnail === tutorialInitialState.formData.thumbnail) {
            return dispatch({ type: 'PUBLISH_ERROR', payload: 'Please upload a custom thumbnail for your tutorial.' });
        }

        try {
            const chaptersForServer = cleanTemporaryIds(state.formData.chapters);
            const formDataToSend = { ...state.formData, chapters: chaptersForServer };

            const data = await createTutorialService(formDataToSend);
            dispatch({ type: 'PUBLISH_SUCCESS' });
            localStorage.removeItem(DRAFT_KEY_TUTORIAL);
            navigate(`/tutorials/${data.slug}`);
        } catch (error) {
            console.error('Publish error:', error);
            dispatch({ type: 'PUBLISH_ERROR', payload: error.message || 'An unexpected error occurred during publishing.' });
        }
    };

    return (
        <div className='p-3 max-w-4xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200'>
            <h1 className='text-center text-4xl my-8 font-extrabold text-gray-900 dark:text-white'>Create a New Tutorial</h1>
            <div className='mb-8'>
                <Progress
                    progress={((currentStep - 1) / 2) * 100}
                    color="indigo"
                    size="lg"
                />
            </div>
            <form className='flex flex-col gap-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg' onSubmit={handleSubmit}>
                <AnimatePresence mode="wait">
                    {currentStep === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -300, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Step 1: Tutorial Details</h2>
                            <div className='flex flex-col gap-5'>
                                <div>
                                    <label htmlFor="title" className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">Tutorial Title</label>
                                    <TextInput
                                        type='text'
                                        placeholder='e.g., Mastering React Hooks'
                                        required
                                        id='title'
                                        value={state.formData.title}
                                        onChange={handleMainFieldChange}
                                        className='w-full'
                                    />
                                </div>
                                <div>
                                    <label htmlFor="description" className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">Description</label>
                                    <TextInput
                                        type='text'
                                        placeholder='A brief overview of the tutorial content...'
                                        required
                                        id='description'
                                        value={state.formData.description}
                                        onChange={handleMainFieldChange}
                                        className='w-full'
                                    />
                                </div>
                                <div>
                                    <label htmlFor="slug" className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">Slug (Auto-generated)</label>
                                    <TextInput
                                        type='text'
                                        placeholder='tutorial-slug'
                                        id='slug'
                                        value={generateSlug(state.formData.title)}
                                        readOnly
                                        disabled
                                        className='w-full bg-gray-100 dark:bg-gray-700'
                                    />
                                </div>
                                <div>
                                    <label htmlFor="category" className="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">Category</label>
                                    <Select id='category' onChange={handleMainFieldChange} value={state.formData.category} className='w-full'>
                                        <option value='uncategorized'>Select a category</option>
                                        {categoriesLoading ? (
                                            <option disabled>Loading categories...</option>
                                        ) : categoriesError ? (
                                            <option disabled>Error loading categories</option>
                                        ) : (
                                            availableCategories.map((cat, index) => (
                                                <option key={index} value={cat.toLowerCase().replace(/\s/g, '-')}>{cat}</option>
                                            ))
                                        )}
                                    </Select>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {currentStep === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -300, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-white">Step 2: Tutorial Chapters</h2>
                            <Alert color="purple" className="mb-4">
                                <span className="font-semibold">Pro tip:</span> Include a chapter with content type
                                <span className="font-semibold"> Linked Quiz</span> at the end of each major section to
                                reinforce what your learners just covered.
                            </Alert>
                            {state.formData.chapters.length === 0 && (
                                <Alert color="info" className="animate-fade-in">
                                    <span className="font-semibold">Heads up!</span> No chapters added yet. Click "Add New Chapter" to get started!
                                </Alert>
                            )}
                            <motion.div layout className='flex flex-col gap-4'>
                                <NestedChapterList
                                    chapters={state.formData.chapters}
                                    handleChapterFieldChange={handleChapterFieldChange}
                                    handleChapterContentChange={handleChapterContentChange}
                                    quizzesData={availableQuizzes}
                                    quizzesLoading={quizzesLoading}
                                    quizzesError={quizzesError}
                                    handleAddSubchapter={handleAddSubchapter}
                                    handleRemoveChapter={handleRemoveChapter}
                                />
                            </motion.div>
                            <Button
                                type="button"
                                gradientDuoTone='cyanToBlue'
                                outline
                                onClick={() => dispatch({ type: 'ADD_CHAPTER_FIELD', payload: { parentId: null } })}
                                className="w-fit self-end"
                            >
                                <FaPlus className="mr-2" /> Add New Top-Level Chapter
                            </Button>
                        </motion.div>
                    )}

                    {currentStep === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -300, opacity: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h2 className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-white">Step 3: Thumbnail and Publish</h2>
                            <div className='flex flex-col gap-3 border-4 border-teal-500 border-dotted p-5 rounded-md relative'>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-300 mb-2">Tutorial Thumbnail</p>
                                <div className='flex gap-4 items-center justify-between flex-wrap'>
                                    <FileInput
                                        helperText='Upload a thumbnail image (Max 5MB, JPG, PNG, WEBP, GIF).'
                                        type='file'
                                        accept='image/*'
                                        onChange={handleThumbnailChange}
                                        disabled={isUploading}
                                        className="flex-1 min-w-[200px]"
                                    />
                                    {isUploading && (
                                        <div className='w-20 h-20 self-center'>
                                            <CircularProgressbar value={uploadProgress} text={`${uploadProgress}%`} strokeWidth={10} styles={{
                                                root: { width: '100%', height: '100%' },
                                                path: { stroke: `rgba(62, 152, 199, ${uploadProgress / 100})` },
                                                text: { fill: '#3b82f6', fontSize: '16px' },
                                            }} />
                                        </div>
                                    )}
                                </div>
                                {state.formData.thumbnail && !isUploading && (
                                    <img src={state.formData.thumbnail} alt='Thumbnail preview' className='w-full h-48 object-cover rounded-md mt-3 border border-gray-300 dark:border-gray-600' />
                                )}
                                {uploadError && <Alert color='failure' className='mt-4'>{uploadError}</Alert>}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className='flex justify-between mt-8'>
                    {currentStep > 1 && (
                        <Button type="button" gradientDuoTone='purpleToBlue' onClick={prevStep}>
                            <FaArrowLeft className="mr-2" /> Previous
                        </Button>
                    )}
                    {currentStep < 3 ? (
                        <Button type="button" gradientDuoTone='purpleToBlue' onClick={nextStep} className="ml-auto">
                            Next <FaArrowRight className="ml-2" />
                        </Button>
                    ) : (
                        <Button type='submit' gradientDuoTone='purpleToPink' disabled={state.loading || isUploading} className="ml-auto">
                            {state.loading ? (<><Spinner size='sm' /><span className='pl-3'>Publishing...</span></>) : 'Publish Tutorial'}
                        </Button>
                    )}
                </div>

                {state.publishError && <Alert className='mt-5 animate-fade-in' color='failure'>{state.publishError}</Alert>}
            </form>

            <Modal show={showDraftModal} size="md" onClose={handleDismissDraft} popup>
                <Modal.Header />
                <Modal.Body>
                    <div className="text-center">
                        <HiOutlineExclamationCircle className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
                        <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
                            We found an unsaved tutorial draft. Do you want to restore it?
                        </h3>
                        <div className="flex justify-center gap-4">
                            <Button color="success" onClick={handleRestoreDraft}>Yes, restore it</Button>
                            <Button color="gray" onClick={handleDismissDraft}>No, start fresh</Button>
                        </div>
                    </div >
                </Modal.Body >
            </Modal >
        </div>
    );
}