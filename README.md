# ScientistShieldOne

## Project Purpose
ScientistShieldOne is a MERN-stack application for sharing knowledge and practicing coding. It provides a platform where users can learn through tutorials, test themselves with quizzes, and experiment with code in an integrated editor.

## Features
- **Tutorials:** Browse and read educational content on various topics.
- **Quizzes:** Evaluate understanding through interactive quizzes.
- **Code Editor:** Try out code snippets directly in the browser with handy keyboard shortcuts (e.g., `Ctrl+Enter` to run, `Ctrl+S` to save, `Ctrl+Shift+F` to format).

## Directory Structure
- `api/` – Node.js/Express backend including routes, controllers, and models.
- `client/` – React front-end powered by Vite.

## Prerequisites
- [Node.js](https://nodejs.org/) and npm
- [MongoDB](https://www.mongodb.com/)
- Environment variables (in a `.env` file at the project root or your shell):
    - `JWT_SECRET` – secret used to sign JSON Web Tokens.
    - `MONGO_URI` *(optional)* – MongoDB connection string (defaults to `mongodb://0.0.0.0:27017/myappp`).
    - `PORT` *(optional)* – port for the Express server (defaults to `3000`).
    - `CORS_ORIGIN` *(optional)* – allowed origin for CORS (defaults to `http://localhost:5173`).

## Installation & Usage
1. Clone the repository and navigate into it.
2. Install backend dependencies:
   ```bash
   npm install
   ```
3. Install front-end dependencies:
   ```bash
   npm install --prefix client
   ```
4. Set the required environment variables.
5. Start the development servers:
    - Backend: `npm run dev`
    - Frontend: `npm run dev --prefix client`
6. For production build:
   ```bash
   npm run build
   npm start
   ```

## Managing Tutorials
- `GET /api/tutorial/gettutorials` – list all tutorials.
- `GET /api/tutorial/getsingleTutorial/:tutorialSlug` – fetch a tutorial by slug.
- `POST /api/tutorial/create/:userId` – create a new tutorial (requires auth).
- `PUT /api/tutorial/update/:tutorialId/:userId` – update an existing tutorial.
- `DELETE /api/tutorial/delete/:tutorialId/:userId` – remove a tutorial.

## Contribution Guidelines
1. Fork the repository and create a new branch for your feature or fix.
2. Make your changes and run any available tests (`npm test`).
3. Commit your changes with a clear message and open a pull request.
