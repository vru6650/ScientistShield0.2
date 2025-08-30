// client/src/services/tutorialService.js
import axios from 'axios';

// Create an Axios instance with a base URL and credentials
// This instance will automatically include cookies in every request
const API = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true,
});

/**
 * Fetches tutorials based on query parameters. This function can also fetch
 * a single tutorial by its slug by passing a slug query parameter.
 * @param {string} searchQuery - URL encoded query string (e.g., 'limit=5&category=reactjs' or 'slug=my-tutorial-slug').
 * @returns {Promise<object>} The data containing the tutorials array and total counts.
 */
export const getTutorials = async (searchQuery = '') => {
    const { data } = await API.get(`/api/tutorial/gettutorials?${searchQuery}`);
    return data;
};

// Fetch all distinct tutorial categories
export const getCategories = async () => {
    const { data } = await API.get('/api/tutorial/categories');
    return data;
};

/**
 * Creates a new tutorial.
 * @param {object} formData - The tutorial data to create.
 * @returns {Promise<import('../types').Tutorial>} The created tutorial data.
 */
export const createTutorial = async (formData) => {
    const { data } = await API.post('/api/tutorial/create', formData);
    return data;
};

/**
 * Updates an existing tutorial.
 * @param {object} params
 * @param {string} params.tutorialId - ID of the tutorial to update.
 * @param {string} params.userId - ID of the user performing the update.
 * @param {object} params.formData - The updated tutorial data.
 * @returns {Promise<import('../types').Tutorial>} The updated tutorial data.
 */
export const updateTutorial = async ({ tutorialId, userId, formData }) => {
    const { data } = await API.put(`/api/tutorial/update/${tutorialId}/${userId}`, formData);
    return data;
};

/**
 * Deletes a tutorial.
 * @param {object} params
 * @param {string} params.tutorialId - ID of the tutorial to delete.
 * @param {string} params.userId - ID of the user performing the delete.
 * @returns {Promise<string>} Success message.
 */
export const deleteTutorial = async ({ tutorialId, userId }) => {
    const { data } = await API.delete(`/api/tutorial/delete/${tutorialId}/${userId}`);
    return data;
};

// ==========================================================
// Chapter operations
// ==========================================================

/**
 * Adds a new chapter to a specific tutorial.
 * @param {object} params
 * @param {string} params.tutorialId - ID of the tutorial to add the chapter to.
 * @param {string} params.userId - ID of the user performing the action.
 * @param {object} params.chapterData - The chapter data to add. Supports
 * `expectedOutput` for code-interactive chapters.
 * @returns {Promise<import('../types').Tutorial>} The updated tutorial data with the new chapter.
 */
export const addChapter = async ({ tutorialId, userId, chapterData }) => {
    const { data } = await API.post(`/api/tutorial/addchapter/${tutorialId}/${userId}`, chapterData);
    return data;
};

/**
 * Updates an existing chapter in a specific tutorial.
 * @param {object} params
 * @param {string} params.tutorialId - ID of the tutorial.
 * @param {string} params.chapterId - ID of the chapter to update.
 * @param {string} params.userId - ID of the user performing the action.
 * @param {object} params.chapterData - The updated chapter data. Supports
 * `expectedOutput` for code-interactive chapters.
 * @returns {Promise<import('../types').Tutorial>} The updated tutorial data.
 */
export const updateChapter = async ({ tutorialId, chapterId, userId, chapterData }) => {
    const { data } = await API.put(`/api/tutorial/updatechapter/${tutorialId}/${chapterId}/${userId}`, chapterData);
    return data;
};

/**
 * Deletes a chapter from a specific tutorial.
 * @param {object} params
 * @param {string} params.tutorialId - ID of the tutorial.
 * @param {string} params.chapterId - ID of the chapter to delete.
 * @param {string} params.userId - ID of the user performing the action.
 * @returns {Promise<import('../types').Tutorial>} The updated tutorial data.
 */
export const deleteChapter = async ({ tutorialId, chapterId, userId }) => {
    const { data } = await API.delete(`/api/tutorial/deletechapter/${tutorialId}/${chapterId}/${userId}`);
    return data;
};

export default {
    getTutorials,
    getCategories,
    createTutorial,
    updateTutorial,
    deleteTutorial,
    addChapter,
    updateChapter,
    deleteChapter
};
