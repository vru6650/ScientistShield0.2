import { useEffect, useState } from 'react';
import { FaArrowUp } from 'react-icons/fa';

/**
 * Displays a floating button that scrolls the window back to the top
 * when clicked. The button appears after the user scrolls down the page.
 */
export default function BackToTopButton() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsVisible(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <button
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className={`fixed bottom-8 right-8 z-50 rounded-full bg-purple-600 p-3 text-white shadow-lg transition-opacity duration-300 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            <FaArrowUp />
        </button>
    );
}
