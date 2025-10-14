'use client';

import { useEffect } from 'react';

export function FullscreenManager() {
  useEffect(() => {
    // Überprüfe ob es ein mobiles Gerät ist
    const isMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || '';
      
      // Prüfe auf mobile User Agents
      const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
      const isMobileUserAgent = mobileRegex.test(userAgent.toLowerCase());
      
      // Prüfe auf Touch-Unterstützung
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Prüfe auf kleine Bildschirmbreite
      const isSmallScreen = window.innerWidth <= 768;
      
      return isMobileUserAgent || (hasTouch && isSmallScreen);
    };

    // Nur auf mobilen Geräten ausführen
    if (!isMobile()) {
      console.log('🖥️ Desktop detected - skipping fullscreen setup');
      return;
    }

    console.log('📱 Mobile device detected - setting up fullscreen features');

    // PWA Fullscreen Setup
    const setupFullscreen = () => {
      // Hide address bar on mobile
      if (window.navigator && 'standalone' in window.navigator) {
        // Already in standalone mode (iOS)
        return;
      }
      
      // For Android Chrome
      if (window.screen && window.screen.orientation) {
        // Request fullscreen on user interaction
        const requestFullscreen = () => {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => {
              console.log('Fullscreen request failed:', err);
            });
          }
        };
        
        // Auto-hide address bar
        window.scrollTo(0, 1);
        
        // Add event listener for user interaction
        document.addEventListener('touchstart', requestFullscreen, { once: true });
        document.addEventListener('click', requestFullscreen, { once: true });
      }
    };

    // Setup viewport for mobile
    const setupViewport = () => {
      // Prevent zoom on double tap
      let lastTouchEnd = 0;
      document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      }, false);

      // Prevent pinch zoom
      document.addEventListener('touchmove', function (event) {
        if (event.touches.length > 1) {
          event.preventDefault();
        }
      }, { passive: false });

      // Set viewport height to fill screen
      const setViewportHeight = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };

      setViewportHeight();
      window.addEventListener('resize', setViewportHeight);
      window.addEventListener('orientationchange', setViewportHeight);
    };

    // iOS Safari specific
    const setupIOSSafari = () => {
      // Check if it's iOS Safari
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      if (isIOS && isSafari) {
        // Hide Safari UI on scroll
        let ticking = false;
        function updateScrollPosition() {
          if (window.pageYOffset === 0) {
            window.scrollTo(0, 1);
          }
          ticking = false;
        }
        
        function requestTick() {
          if (!ticking) {
            requestAnimationFrame(updateScrollPosition);
            ticking = true;
          }
        }
        
        window.addEventListener('scroll', requestTick);
      }
    };

    setupFullscreen();
    setupViewport();
    setupIOSSafari();

    // Cleanup function
    return () => {
      window.removeEventListener('resize', () => {});
      window.removeEventListener('orientationchange', () => {});
    };
  }, []);

  return null; // This component doesn't render anything
}