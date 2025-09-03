import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Spinner } from 'flowbite-react';
import 'highlight.js/styles/atom-one-dark.css';

// Import layout and route protection components statically
import MainLayout from './components/MainLayout';
import PrivateRoute from './components/PrivateRoute';
import OnlyAdminPrivateRoute from './components/OnlyAdminPrivateRoute';

// LAZY LOAD all page components for code-splitting
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const SignIn = lazy(() => import('./pages/SignIn'));
const SignUp = lazy(() => import('./pages/SignUp'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const CreatePost = lazy(() => import('./pages/CreatePost'));
const UpdatePost = lazy(() => import('./pages/UpdatePost'));
const PostPage = lazy(() => import('./pages/PostPage'));
const Search = lazy(() => import('./pages/Search'));
const NotFound = lazy(() => import('./pages/NotFound'));

// NEW: Lazy load tutorial-related pages
const Tutorials = lazy(() => import('./pages/Tutorials'));
const SingleTutorialPage = lazy(() => import('./pages/SingleTutorialPage'));
const CreateTutorial = lazy(() => import('./pages/CreateTutorial'));
const UpdateTutorial = lazy(() => import('./pages/UpdateTutorial'));

// NEW: Lazy load quiz-related pages and components
const CreateQuiz = lazy(() => import('./pages/CreateQuiz'));
const SingleQuizPage = lazy(() => import('./pages/SingleQuizPage'));
const Quizzes = lazy(() => import('./pages/Quizzes'));
const UpdateQuiz = lazy(() => import('./pages/UpdateQuiz'));

// NEW: Lazy load the Try it Yourself page
const TryItPage = lazy(() => import('./pages/TryItPage'));
const CodeVisualizer = lazy(() => import('./pages/CodeVisualizer'));

// A fallback component to show while pages are loading
const LoadingFallback = () => (
    <div className="flex justify-center items-center min-h-screen">
        <Spinner size="xl" />
    </div>
);

export default function App() {
    return (
        <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
                <Routes>
                    <Route path="/" element={<MainLayout />}>
                        <Route index element={<Home />} />
                        <Route path="about" element={<About />} />
                        <Route path="search" element={<Search />} />
                        <Route path="projects" element={<Projects />} />
                        <Route path="post/:postSlug" element={<PostPage />} />

                        {/* Public Tutorial Routes */}
                        <Route path="tutorials" element={<Tutorials />} />
                        <Route path="tutorials/:tutorialSlug" element={<SingleTutorialPage />} />
                        <Route path="tutorials/:tutorialSlug/:chapterSlug" element={<SingleTutorialPage />} />

                        {/* Public Quiz Routes */}
                        <Route path="quizzes" element={<Quizzes />} />
                        <Route path="quizzes/:quizSlug" element={<SingleQuizPage />} />

                        {/* NEW: Try It Yourself Route */}
                        <Route path="tryit" element={<TryItPage />} />
                        <Route path="visualizer" element={<CodeVisualizer />} />

                        {/* Private Routes also use the main layout */}
                        <Route element={<PrivateRoute />}>
                            <Route path="dashboard" element={<Dashboard />} />
                        </Route>

                        {/* Admin Routes also use the main layout */}
                        <Route element={<OnlyAdminPrivateRoute />}>
                            <Route path="create-post" element={<CreatePost />} />
                            <Route path="update-post/:postId" element={<UpdatePost />} />
                            {/* Admin Tutorial Routes */}
                            <Route path="create-tutorial" element={<CreateTutorial />} />
                            <Route path="update-tutorial/:tutorialId" element={<UpdateTutorial />} />
                            {/* Admin Quiz Routes */}
                            <Route path="create-quiz" element={<CreateQuiz />} />
                            <Route path="update-quiz/:quizId" element={<UpdateQuiz />} />
                        </Route>

                        <Route path="*" element={<NotFound />} />
                    </Route>

                    <Route path="/sign-in" element={<SignIn />} />
                    <Route path="/sign-up" element={<SignUp />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}