import mongoose from 'mongoose';

// Define the schema for a single sub-chapter
const subChapterSchema = new mongoose.Schema(
    {
        chapterTitle: {
            type: String,
            required: true,
        },
        chapterSlug: {
            type: String,
            required: true,
        },
        contentType: {
            type: String,
            enum: ['text', 'code-interactive', 'quiz', 'video'],
            default: 'text',
        },
        content: {
            type: String,
            default: '',
        },
        initialCode: {
            type: String,
            default: '',
        },
        expectedOutput: {
            type: String,
            default: '',
        },
        quizId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Quiz',
        },
        order: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

// Define the schema for a single top-level chapter
const tutorialChapterSchema = new mongoose.Schema(
    {
        chapterTitle: {
            type: String,
            required: true,
        },
        chapterSlug: {
            type: String,
            required: true,
            unique: true,
        },
        contentType: {
            type: String,
            enum: ['text', 'code-interactive', 'quiz', 'video'],
            default: 'text',
        },
        content: {
            type: String,
            default: '',
        },
        initialCode: {
            type: String,
            default: '',
        },
        expectedOutput: {
            type: String,
            default: '',
        },
        quizId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Quiz',
        },
        order: {
            type: Number,
            required: true,
        },
        completedBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: [],
        }],
        subChapters: [subChapterSchema], // Nested sub-chapters array
    },
    { timestamps: true }
);

const tutorialSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            unique: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
            required: true,
        },
        thumbnail: {
            type: String,
            default: 'https://www.hostinger.com/tutorials/wp-content/uploads/sites/2/2021/09/how-to-write-a-blog-post.png',
        },
        category: {
            type: String,
            default: 'uncategorized',
        },
        authorId: {
            type: String,
            required: true,
        },
        chapters: [tutorialChapterSchema],
        difficulty: {
            type: String,
            enum: ['Beginner', 'Intermediate', 'Advanced'],
            default: 'Beginner',
        },
        readingTime: {
            type: Number,
            default: 0,
        },
        completedBy: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'User',
            default: [],
        },
    },
    { timestamps: true }
);

const Tutorial = mongoose.model('Tutorial', tutorialSchema);

export default Tutorial;
