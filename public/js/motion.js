/**
 * Smart Library — 3D Motion & Scroll Reveal Engine
 * Handles IntersectionObserver-based reveal animations and scroll tilt effects.
 */

(function () {
  'use strict';

  // ─── Scroll Reveal (IntersectionObserver) ───
  const revealElements = document.querySelectorAll('[data-reveal]');

  if (revealElements.length > 0 && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = parseInt(el.dataset.revealDelay || '0', 10);

            setTimeout(() => {
              el.classList.add('revealed');
            }, delay);

            // Stop observing once revealed
            revealObserver.unobserve(el);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    // Fallback: reveal everything immediately if IntersectionObserver is unavailable
    revealElements.forEach((el) => el.classList.add('revealed'));
  }

  // ─── 3D Tilt on Scroll ───
  const tiltContainers = document.querySelectorAll('[data-tilt-scroll]');

  if (tiltContainers.length > 0) {
    window.addEventListener(
      'scroll',
      () => {
        const scrollY = window.scrollY;
        const vh = window.innerHeight;

        tiltContainers.forEach((container) => {
          const rect = container.getBoundingClientRect();
          const center = rect.top + rect.height / 2;
          const offset = (center - vh / 2) / vh; // -0.5 to 0.5

          const tiltX = offset * 3; // subtle tilt in degrees
          container.style.transform = `perspective(1200px) rotateX(${tiltX}deg)`;
        });
      },
      { passive: true }
    );
  }

  // ─── Scroll Progress Bar ───
  const progressBar = document.querySelector('.scroll-progress');

  if (progressBar) {
    window.addEventListener(
      'scroll',
      () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = `${progress}%`;
      },
      { passive: true }
    );
  }
})();
