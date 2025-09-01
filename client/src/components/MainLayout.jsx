import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ScrollToTop from './ScrollToTop';
import BackToTopButton from './BackToTopButton';
import Onboarding from './Onboarding';
import ProfileCompletionPrompt from './ProfileCompletionPrompt';

/**
 * Renders the common layout for the application, including the
 * Header, Footer, and scroll-to-top functionality.
 * The <Outlet /> component renders the active child route.
 */
export default function MainLayout() {
    return (
        <>
            {/* Skip link for improved accessibility */}
            <a href="#main-content" className="skip-link">Skip to main content</a>
            <ScrollToTop />
            <Header />
            <Onboarding />
            <ProfileCompletionPrompt />
            <main id="main-content">
                <Outlet />
            </main>
            <BackToTopButton />
            <Footer />
        </>
    );
}