import express from 'express';
import { verifyToken } from '../utils/verifyUser.js';
import { createCodeSnippet, getCodeSnippet, saveCodeSnippet } from '../controllers/codeSnippet.controller.js';

const router = express.Router();

router.post('/create', verifyToken, createCodeSnippet);
router.post('/save', saveCodeSnippet);
router.get('/:snippetId', getCodeSnippet);

export default router;