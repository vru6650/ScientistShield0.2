import express from 'express';
import { executeCode, startDebugSession, debuggerCommand } from '../controllers/execution.controller.js';

const router = express.Router();

router.post('/execute', executeCode);
router.post('/debug/start', startDebugSession);
router.post('/debug/command', debuggerCommand);

export default router;
