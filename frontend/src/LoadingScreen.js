// Loading screen component with IZUKU animation
import React, { useState, useEffect } from 'react';
import './LoadingScreen.css';

const LoadingScreen = ({ onAnimationComplete }) => {
    const [showLogo, setShowLogo] = useState(false);
    const [showText, setShowText] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        console.log('LoadingScreen mounted');
        // Animation sequence
        const timer1 = setTimeout(() => {
            console.log('Showing logo');
            setShowLogo(true);
        }, 100);
        const timer2 = setTimeout(() => {
            console.log('Showing text');
            setShowText(true);
        }, 800);
        const timer3 = setTimeout(() => {
            console.log('Starting fade out');
            setFadeOut(true);
        }, 3000); // Increased to 3 seconds
        const timer4 = setTimeout(() => {
            console.log('Animation complete, calling onAnimationComplete');
            onAnimationComplete();
        }, 3500); // 3.5 seconds total

        return () => {
            console.log('LoadingScreen unmounting');
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            clearTimeout(timer4);
        };
    }, [onAnimationComplete]);

    return (
        <div className={`loading-screen ${fadeOut ? 'fade-out' : ''}`}>
            <div className="loading-container">
                <div className={`logo-container ${showLogo ? 'show' : ''}`}>
                    <div className="logo-bracket">[</div>
                    <div className="logo-text">
                        <span className="logo-letter I">I</span>
                        <span className="logo-letter Z">Z</span>
                        <span className="logo-letter U">U</span>
                        <span className="logo-letter K">K</span>
                        <span className="logo-letter U">U</span>
                    </div>
                    <div className="logo-bracket">]</div>
                </div>
                
                <div className={`subtitle ${showText ? 'show' : ''}`}>
                    SECURE FILE SHARE TERMINAL
                </div>
                
                <div className={`loading-dots ${showText ? 'show' : ''}`}>
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
