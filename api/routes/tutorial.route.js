import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import {
    createTutorial,
    getTutorials,
    getTutorialCategories,
    updateTutorial,
    deleteTutorial,
    addChapter,
    updateChapter,
    deleteChapter,
    markChapterAsComplete
} from '../controllers/tutorial.controller.js';

const router = express.Router();

// Tutorial CRUD operations (admin-only)
router.post('/create', verifyToken, createTutorial);
router.get('/gettutorials', getTutorials);
router.get('/categories', getTutorialCategories);
router.get('/getsingletutorial/:tutorialSlug', (req, res, next) => {
    req.query.slug = req.params.tutorialSlug;
    getTutorials(req, res, next);
});
router.put('/update/:tutorialId/:userId', verifyToken, updateTutorial);
router.delete('/delete/:tutorialId/:userId', verifyToken, deleteTutorial);

// Chapter operations (admin-only)
// The addChapter route will now handle adding both top-level chapters and subchapters.
// The parent chapter ID is passed in the request body.
router.post('/addchapter/:tutorialId/:userId', verifyToken, addChapter);
router.put('/updatechapter/:tutorialId/:chapterId/:userId', verifyToken, updateChapter);
router.delete('/deletechapter/:tutorialId/:chapterId/:userId', verifyToken, deleteChapter);

// NEW: Route to mark a chapter as complete for the logged-in user
router.post('/complete/:tutorialId/:chapterId', verifyToken, markChapterAsComplete);

export default router;
