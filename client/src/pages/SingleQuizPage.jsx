// client/src/pages/SingleQuizPage.jsx
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Spinner, Alert } from 'flowbite-react';
import { FaQuestionCircle } from 'react-icons/fa';

// CORRECT IMPORT: Use the new function name for clarity
import { getSingleQuizBySlug } from '../services/quizService';

// Import the existing component we already built
import QuizComponent from '../components/QuizComponent';

export default function SingleQuizPage() {
    // Get the quiz slug from the URL
    const { quizSlug } = useParams();

    // Fetch quiz data by slug
    const { data: quiz, isLoading, isError, error } = useQuery({
        queryKey: ['singleQuiz', quizSlug],
        // CORRECT CALL: Use the new function name to fetch by slug
        queryFn: () => getSingleQuizBySlug(quizSlug),
        enabled: !!quizSlug, // Only run the query if a slug is present
        staleTime: 1000 * 60 * 5, // Cache the data for 5 minutes
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Spinner size="xl" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className='flex justify-center items-center min-h-screen p-4'>
                <Alert color='failure' className='text-center text-xl max-w-lg'>
                    <div className="flex items-center justify-center">
                        <FaQuestionCircle className="h-6 w-6 mr-2" />
                        Error loading quiz: {error?.message || 'Failed to load quiz details.'}
                    </div>
                </Alert>
            </div>
        );
    }

    if (!quiz) {
        return (
            <div className="text-center my-20 text-gray-700 dark:text-gray-300 text-2xl">
                Quiz not found.
            </div>
        );
    }

    return (
        <>
            <Helmet>
                <title>{quiz.title}</title>
                <meta name="description" content={quiz.description} />
                <meta property="og:title" content={quiz.title} />
                <meta property="og:description" content={quiz.description} />
            </Helmet>

            <div className="p-3 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                <h1 className="text-4xl lg:text-5xl font-extrabold text-center my-10 leading-tight text-gray-900 dark:text-white">
                    {quiz.title}
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 text-center max-w-4xl mx-auto mb-12 font-light">
                    {quiz.description}
                </p>
                {quiz.relatedTutorials && quiz.relatedTutorials.length > 0 && (
                    <div className="mb-12 text-center">
                        <h2 className="text-2xl font-semibold mb-4">Review the related tutorials before you begin:</h2>
                        <ul className="flex flex-wrap justify-center gap-4">
                            {quiz.relatedTutorials.map((tutorial) => (
                                <li key={tutorial.slug}>
                                    <Link
                                        to={`/tutorials/${tutorial.slug}`}
                                        className="text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        {tutorial.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* The main quiz logic is handled by the reusable QuizComponent */}
                <div className="max-w-4xl mx-auto mt-8">
                    <QuizComponent quizId={quiz._id} />
                </div>

                {quiz.relatedTutorials && quiz.relatedTutorials.length > 0 && (
                    <div className="max-w-4xl mx-auto mt-12 p-6 bg-blue-50 dark:bg-gray-800 rounded-lg text-gray-800 dark:text-gray-200">
                        <h2 className="text-2xl font-bold mb-4 text-center">Struggling with the quiz?</h2>
                        <p className="mb-4 text-center">Refresh your knowledge with these tutorials:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            {quiz.relatedTutorials.map((tutorial) => (
                                <li key={`bottom-${tutorial.slug}`}>
                                    <Link
                                        to={`/tutorials/${tutorial.slug}`}
                                        className="text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        {tutorial.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </>
    );
}