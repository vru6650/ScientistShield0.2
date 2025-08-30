import Tutorial from '../models/tutorial.model.js';
import { errorHandler } from '../utils/error.js';

const generateSlug = (text) => {
    return text
        .split(' ')
        .join('-')
        .toLowerCase()
        .replace(/[^a-zA-Z0-9-]/g, '');
};

export const createTutorial = async (req, res, next) => {
    if (!req.user.isAdmin) {
        return next(errorHandler(403, 'You are not allowed to create a tutorial'));
    }
    const { title, description, category, thumbnail, chapters = [] } = req.body;

    if (!title || !description || !category) {
        return next(errorHandler(400, 'Please provide all required fields for the tutorial.'));
    }

    const slug = generateSlug(title);

    const sanitizeChapters = (chapters = []) =>
        chapters.map((chapter) => {
            const sanitized = {
                ...chapter,
                quizId:
                    chapter.contentType === 'quiz' && chapter.quizId
                        ? chapter.quizId
                        : undefined,
            };
            if (chapter.subChapters && chapter.subChapters.length > 0) {
                sanitized.subChapters = sanitizeChapters(chapter.subChapters);
            }
            return sanitized;
        });

    const chaptersToSave = sanitizeChapters(chapters);

    const newTutorial = new Tutorial({
        title,
        description,
        slug,
        thumbnail,
        category,
        authorId: req.user.id,
        chapters: chaptersToSave,
    });

    try {
        const savedTutorial = await newTutorial.save();
        res.status(201).json(savedTutorial);
    } catch (error) {
        console.error('Error saving new tutorial:', error);
        next(error);
    }
};

export const getTutorials = async (req, res, next) => {
    try {
        const startIndex = parseInt(req.query.startIndex) || 0;
        const limit = parseInt(req.query.limit) || 9;
        const sortDirection = req.query.order === 'asc' ? 1 : -1;

        const query = {
            ...(req.query.authorId && { authorId: req.query.authorId }),
            ...(req.query.category && { category: req.query.category }),
            ...(req.query.tutorialId && { _id: req.query.tutorialId }),
            ...(req.query.slug && { slug: req.query.slug }),
            ...(req.query.searchTerm && {
                $or: [
                    { title: { $regex: req.query.searchTerm, $options: 'i' } },
                    { description: { $regex: req.query.searchTerm, $options: 'i' } },
                    { 'chapters.content': { $regex: req.query.searchTerm, $options: 'i' } },
                ],
            }),
        };

        const tutorials = await Tutorial.find(query)
            .sort({ updatedAt: sortDirection })
            .skip(startIndex)
            .limit(limit);

        const totalTutorials = await Tutorial.countDocuments(query);

        const now = new Date();
        const oneMonthAgo = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate()
        );
        const lastMonthTutorials = await Tutorial.countDocuments({
            ...query,
            createdAt: { $gte: oneMonthAgo },
        });

        res.status(200).json({
            tutorials,
            totalTutorials,
            lastMonthTutorials,
        });
    } catch (error) {
        next(error);
    }
};

// Fetch distinct tutorial categories
export const getTutorialCategories = async (req, res, next) => {
    try {
        const categories = await Tutorial.distinct('category');
        res.status(200).json(categories);
    } catch (error) {
        next(error);
    }
};

export const updateTutorial = async (req, res, next) => {
    if (!req.user.isAdmin && req.user.id !== req.params.userId) {
        return next(errorHandler(403, 'You are not allowed to update this tutorial'));
    }
    const { title, description, category, thumbnail } = req.body;
    const updateFields = {
        title,
        description,
        category,
        thumbnail,
    };
    if (title) {
        updateFields.slug = generateSlug(title);
    }

    try {
        const updatedTutorial = await Tutorial.findByIdAndUpdate(
            req.params.tutorialId,
            { $set: updateFields },
            { new: true }
        );
        if (!updatedTutorial) {
            return next(errorHandler(404, 'Tutorial not found'));
        }
        res.status(200).json(updatedTutorial);
    } catch (error) {
        next(error);
    }
};

export const deleteTutorial = async (req, res, next) => {
    if (!req.user.isAdmin && req.user.id !== req.params.userId) {
        return next(errorHandler(403, 'You are not allowed to delete this tutorial'));
    }
    try {
        await Tutorial.findByIdAndDelete(req.params.tutorialId);
        res.status(200).json('The tutorial has been deleted');
    } catch (error) {
        next(error);
    }
};

export const addChapter = async (req, res, next) => {
    if (!req.user.isAdmin && req.user.id !== req.params.userId) {
        return next(errorHandler(403, 'You are not allowed to add chapters to this tutorial'));
    }
    const { chapterTitle, content, order, contentType, initialCode, expectedOutput, quizId } = req.body;

    if (!chapterTitle || order === undefined) {
        return next(errorHandler(400, 'Chapter title and order are required.'));
    }
    if ((contentType === 'text' || contentType === 'video') && !content) {
        return next(errorHandler(400, 'Chapter content is required for text and video chapters.'));
    }
    if (contentType === 'code-interactive' && !initialCode) {
        return next(errorHandler(400, 'Initial code is required for interactive code chapters.'));
    }
    if (contentType === 'quiz' && !quizId) {
        return next(errorHandler(400, 'A quiz ID is required for quiz chapters.'));
    }

    try {
        const tutorial = await Tutorial.findById(req.params.tutorialId);
        if (!tutorial) {
            return next(errorHandler(404, 'Tutorial not found.'));
        }

        const chapterSlug = generateSlug(chapterTitle);
        if (tutorial.chapters.some(c => c.chapterSlug === chapterSlug)) {
            return next(errorHandler(400, 'Chapter with this title already exists in this tutorial.'));
        }

        let chapterData = { chapterTitle, chapterSlug, order, contentType, initialCode, expectedOutput, content };
        if (contentType === 'quiz' && quizId) {
            chapterData.quizId = quizId;
        } else {
            chapterData.quizId = undefined;
        }

        tutorial.chapters.push(chapterData);
        tutorial.chapters.sort((a, b) => a.order - b.order);
        await tutorial.save();
        res.status(201).json(tutorial.chapters[tutorial.chapters.length - 1]);
    } catch (error) {
        console.error('Error adding new chapter:', error);
        next(error);
    }
};

export const updateChapter = async (req, res, next) => {
    if (!req.user.isAdmin && req.user.id !== req.params.userId) {
        return next(errorHandler(403, 'You are not allowed to update this chapter'));
    }
    const { chapterTitle, content, order, contentType, initialCode, expectedOutput, quizId } = req.body;

    if ((contentType === 'text' || contentType === 'video') && !content) {
        return next(errorHandler(400, 'Chapter content is required for text and video chapters.'));
    }
    if (contentType === 'code-interactive' && !initialCode) {
        return next(errorHandler(400, 'Initial code is required for interactive code chapters.'));
    }
    if (contentType === 'quiz' && !quizId) {
        return next(errorHandler(400, 'A quiz ID is required for quiz chapters.'));
    }

    const updateFields = {};
    if (chapterTitle !== undefined) updateFields.chapterTitle = chapterTitle;
    if (content !== undefined) updateFields.content = content;
    if (order !== undefined) updateFields.order = order;
    if (contentType !== undefined) updateFields.contentType = contentType;
    if (initialCode !== undefined) updateFields.initialCode = initialCode;
    if (expectedOutput !== undefined) updateFields.expectedOutput = expectedOutput;
    if (quizId !== undefined) {
        updateFields.quizId = contentType === 'quiz' ? quizId : undefined;
    }

    try {
        const tutorial = await Tutorial.findById(req.params.tutorialId);
        if (!tutorial) {
            return next(errorHandler(404, 'Tutorial not found.'));
        }

        const chapter = tutorial.chapters.id(req.params.chapterId);
        if (!chapter) {
            return next(errorHandler(404, 'Chapter not found.'));
        }

        Object.assign(chapter, updateFields);

        if (chapterTitle !== undefined) {
            const newChapterSlug = generateSlug(chapterTitle);
            if (tutorial.chapters.some(c => c.chapterSlug === newChapterSlug && c._id.toString() !== chapter._id.toString())) {
                return next(errorHandler(400, 'Another chapter with this title already exists.'));
            }
            chapter.chapterSlug = newChapterSlug;
        }

        tutorial.chapters.sort((a, b) => a.order - b.order);
        await tutorial.save();
        res.status(200).json(chapter);
    } catch (error) {
        next(error);
    }
};

export const deleteChapter = async (req, res, next) => {
    if (!req.user.isAdmin && req.user.id !== req.params.userId) {
        return next(errorHandler(403, 'You are not allowed to delete this chapter'));
    }
    try {
        const tutorial = await Tutorial.findById(req.params.tutorialId);
        if (!tutorial) {
            return next(errorHandler(404, 'Tutorial not found.'));
        }

        tutorial.chapters.pull({ _id: req.params.chapterId });
        await tutorial.save();
        res.status(200).json('Chapter deleted successfully');
    } catch (error) {
        next(error);
    }
};

// NEW: Function to mark a chapter as complete
export const markChapterAsComplete = async (req, res, next) => {
    const { tutorialId, chapterId } = req.params;
    const userId = req.user.id;

    try {
        const tutorial = await Tutorial.findById(tutorialId);
        if (!tutorial) {
            return next(errorHandler(404, 'Tutorial not found.'));
        }

        const chapter = tutorial.chapters.id(chapterId);
        if (!chapter) {
            return next(errorHandler(404, 'Chapter not found.'));
        }

        if (chapter.completedBy.includes(userId)) {
            return next(errorHandler(400, 'Chapter already marked as complete by this user.'));
        }

        chapter.completedBy.push(userId);
        await tutorial.save();

        res.status(200).json({ message: 'Chapter marked as complete.', completedBy: chapter.completedBy });
    } catch (error) {
        next(error);
    }
};
