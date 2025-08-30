// client/src/pages/Tutorials.jsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Spinner, Alert, Button, TextInput, Select } from 'flowbite-react';
import { motion } from 'framer-motion';

import TutorialCard from '../components/TutorialCard';
import { getTutorials, getCategories } from '../services/tutorialService.js';
import TutorialCardSkeleton from '../components/TutorialCardSkeleton'; // <-- Import the new skeleton component

export default function Tutorials() {
    const location = useLocation();
    const navigate = useNavigate();

    const [sidebarSearchTerm, setSidebarSearchTerm] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState('uncategorized');
    const [sort, setSort] = useState('desc');

    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const searchTermFromUrl = urlParams.get('searchTerm') || '';
        const categoryFromUrl = urlParams.get('category') || 'uncategorized';
        const sortFromUrl = urlParams.get('sort') || 'desc';

        setSidebarSearchTerm(searchTermFromUrl);
        setSearchTerm(searchTermFromUrl);
        setCategory(categoryFromUrl);
        setSort(sortFromUrl);
    }, [location.search]);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['tutorials', { searchTerm, category, sort }],
        queryFn: () => getTutorials(`searchTerm=${searchTerm}&category=${category}&sort=${sort}`),
        staleTime: 1000 * 60 * 5,
        keepPreviousData: true,
    });

    const tutorials = data?.tutorials || [];

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const urlParams = new URLSearchParams(location.search);
        urlParams.set('searchTerm', sidebarSearchTerm);
        navigate({ search: urlParams.toString() });
    };

    const handleCategoryChange = (e) => {
        const newCategory = e.target.value;
        const urlParams = new URLSearchParams(location.search);
        urlParams.set('category', newCategory);
        navigate({ search: urlParams.toString() });
    };

    const handleSortChange = (e) => {
        const newSort = e.target.value;
        const urlParams = new URLSearchParams(location.search);
        urlParams.set('sort', newSort);
        navigate({ search: urlParams.toString() });
    };

    const {
        data: categoriesData,
        isLoading: categoriesLoading,
        isError: categoriesError,
    } = useQuery({
        queryKey: ['tutorialCategories'],
        queryFn: getCategories,
        staleTime: Infinity,
    });

    const availableCategories = categoriesData || [];

    const containerVariants = {
        visible: {
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="p-3 max-w-7xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <h1 className="text-4xl lg:text-5xl font-extrabold text-center my-10 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-md">
                Explore All Tutorials
            </h1>

            {/* Filter and Search Section */}
            <motion.div
                className="flex flex-col md:flex-row gap-6 mb-12 items-center justify-center bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-700"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 100 }}
            >
                <form onSubmit={handleSearchSubmit} className="flex gap-4 w-full md:w-auto">
                    <TextInput
                        type="text"
                        placeholder="Search tutorials..."
                        value={sidebarSearchTerm}
                        onChange={(e) => setSidebarSearchTerm(e.target.value)}
                        className="flex-grow md:flex-grow-0 bg-gray-700 text-white"
                    />
                    <Button type="submit" gradientDuoTone="purpleToBlue">Search</Button>
                </form>

                <div className="flex gap-4 w-full md:w-auto">
                    <Select value={category} onChange={handleCategoryChange} className="min-w-[150px] bg-gray-700 text-white">
                        <option value="uncategorized">All Categories</option>
                        {categoriesLoading ? (
                            <option disabled>Loading categories...</option>
                        ) : categoriesError ? (
                            <option disabled>Error loading categories</option>
                        ) : (
                            availableCategories.map((cat, index) => (
                                <option key={index} value={cat.toLowerCase().replace(/\s/g, '-')}>{cat}</option>
                            ))
                        )}
                    </Select>

                    <Select value={sort} onChange={handleSortChange} className="min-w-[120px] bg-gray-700 text-white">
                        <option value="desc">Latest</option>
                        <option value="asc">Oldest</option>
                    </Select>
                </div>
            </motion.div>

            {/* Loading, Error, and No Results States */}
            {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-10">
                    {[...Array(8)].map((_, index) => <TutorialCardSkeleton key={index} />)}
                </div>
            )}
            {isError && (
                <Alert color="failure" className="text-center mx-auto max-w-lg mt-12 animate-fade-in">
                    Error loading tutorials: {error?.message || 'Please try again.'}
                </Alert>
            )}
            {!isLoading && tutorials.length === 0 && !isError && (
                <p className="text-center text-gray-400 text-lg my-12 animate-fade-in">
                    No tutorials found matching your criteria. Try adjusting your search or filters!
                </p>
            )}

            {/* Tutorials Grid */}
            {!isLoading && tutorials.length > 0 && (
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-10"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {tutorials.map((tutorial) => (
                        <motion.div key={tutorial._id} variants={cardVariants}>
                            <TutorialCard tutorial={tutorial} />
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
