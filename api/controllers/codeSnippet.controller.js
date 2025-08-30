import CodeSnippet from '../models/CodeSnippet.model.js';
import { errorHandler } from '../utils/error.js';

/**
 * Creates a new code snippet.
 */
export const createCodeSnippet = async (req, res, next) => {
    if (!req.user.isAdmin) {
        return next(errorHandler(403, 'You are not allowed to create a code snippet'));
    }
    const { html = '', css = '', js = '', cpp = '', python = '' } = req.body;
    const newSnippet = new CodeSnippet({ html, css, js, cpp, python });

    try {
        const savedSnippet = await newSnippet.save();
        res.status(201).json(savedSnippet);
    } catch (error) {
        next(error);
    }
};

/**
 * Gets a code snippet by its ID.
 */
export const getCodeSnippet = async (req, res, next) => {
    try {
        const snippet = await CodeSnippet.findById(req.params.snippetId);
        if (!snippet) {
            return next(errorHandler(404, 'Code snippet not found.'));
        }
        res.status(200).json(snippet);
    } catch (error) {
        next(error);
    }
};

/**
 * Saves a code snippet and returns its ID for sharing.
 */
export const saveCodeSnippet = async (req, res, next) => {
    const { html = '', css = '', js = '', cpp = '', python = '' } = req.body;
    const newSnippet = new CodeSnippet({ html, css, js, cpp, python });

    try {
        const savedSnippet = await newSnippet.save();
        res.status(201).json(savedSnippet);
    } catch (error) {
        next(error);
    }
};