// src/scripts/navHighlighter.js

function throttle(func, limit) {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

export function initNavHighlighter() {
    const navLinks = document.querySelectorAll('.site-nav a');
    const contentSections = document.querySelectorAll('.content-section');

    if (!navLinks.length || !contentSections.length) {
        console.warn('NavHighlighter: Navigation links or content sections not found.');
        return;
    }

    // Ensure headerHeight is calculated after the DOM is fully loaded and styles applied
    let headerHeight = 70; // Default value
    const siteHeader = document.querySelector('.site-header');
    if (siteHeader) {
        headerHeight = siteHeader.offsetHeight;
    }
    // Recalculate on resize as well, if necessary, though offsetHeight might be stable for sticky headers
    // window.addEventListener('resize', throttle(() => {
    //     if (siteHeader) headerHeight = siteHeader.offsetHeight;
    // }, 200));


    const highlightNav = () => {
        let currentSectionId = '';
        let minDistance = Infinity;

        const pageYOffset = window.pageYOffset;

        contentSections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;

            // Consider a section active if its top is within a range from the top of the viewport
            // or if a significant portion of it is visible.
            const activationPoint = pageYOffset + headerHeight + 50; // Point to check against section top

            if (activationPoint >= sectionTop && activationPoint < sectionTop + sectionHeight) {
                // More sophisticated check: find the section whose "center" is closest to viewport center,
                // or simply the one whose top is closest past the activation point.
                // The original logic was based on distance to a point slightly below the header.
                const distance = Math.abs(pageYOffset - (sectionTop - headerHeight - 50));
                if (distance < minDistance) {
                    minDistance = distance;
                    currentSectionId = section.getAttribute('id');
                }
            }
        });

        // If no section is "active" by the above logic (e.g., at the very top or bottom of the page),
        // try to default or refine.
        if (!currentSectionId && contentSections.length > 0) {
            // Default to the first section if scrolled to the top
            if (pageYOffset < (contentSections[0].offsetTop - headerHeight - 50)) {
                currentSectionId = contentSections[0].getAttribute('id');
            }
            // Or default to the last section if scrolled to the bottom (approximate)
            // This part needs careful consideration of footer, etc.
            // For now, the original logic's fallback to 'about' (first section) is simpler.
        }
        if (!currentSectionId && contentSections.length > 0) {
            currentSectionId = contentSections[0].getAttribute('id'); // Fallback to first section
        }


        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    };

    // Initial call to set active link on page load
    highlightNav();
    window.addEventListener('scroll', throttle(highlightNav, 100));
}