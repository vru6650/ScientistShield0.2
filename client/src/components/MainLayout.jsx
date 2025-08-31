import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import ScrollToTop from './ScrollToTop';
import BackToTopButton from './BackToTopButton';

/**
 * Renders the common layout for the application, including the
 * Header, Footer, and scroll-to-top functionality.
 * The <Outlet /> component renders the active child route.
 */
export default function MainLayout() {
    return (
        <>
            <ScrollToTop />
            <Header />
            <main>
                <Outlet />
            </main>
            <BackToTopButton />
            <Footer />
        </>
    );
}