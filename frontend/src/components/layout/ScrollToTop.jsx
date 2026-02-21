import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // Smoothly and perfectly scroll to the exact top on every route change
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'auto' // 'auto' feels faster and more responsive for SPAs
        });
    }, [pathname]);

    return null;
};

export default ScrollToTop;
