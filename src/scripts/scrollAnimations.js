// src/scripts/scrollAnimations.js

export function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                if (entry.target.classList.contains('stagger-children')) {
                    const children = Array.from(entry.target.children).filter(el => !el.matches('script, style'));
                    children.forEach((child, index) => {
                        // Ensure child is an HTMLElement before setting style property
                        if (child instanceof HTMLElement) {
                            child.style.setProperty('--animation-order-child', index.toString());
                        }
                    });
                }
                // Optional: Unobserve after animation to save resources, if animations are one-time
                // observer.unobserve(entry.target); 
            }
            // Optional: Remove 'visible' class if element is not intersecting (for re-animation on scroll up)
            // else {
            //     entry.target.classList.remove('visible');
            // }
        });
    }, { threshold: 0.1 }); // Trigger when 10% of the element is visible

    document.querySelectorAll('.animated-on-scroll, .stagger-children').forEach((el, index) => {
        if (el instanceof HTMLElement) { // Type guard
            if (!el.classList.contains('stagger-children')) {
                el.style.setProperty('--animation-order', (index % 8).toString());
            }
            observer.observe(el);
        }
    });

    // This logic ensures that direct children of .stagger-children also get observed
    // if they don't already have .animated-on-scroll.
    // The original script added .animated-on-scroll to them.
    // We need to ensure they are observed.
    document.querySelectorAll('.stagger-children').forEach(container => {
        const children = Array.from(container.children).filter(
            el => el instanceof HTMLElement && !el.matches('script, style') && !el.classList.contains('animated-on-scroll')
        );
        children.forEach(child => {
            if (child instanceof HTMLElement) { // Type guard
                child.classList.add('animated-on-scroll'); // Add class if missing
                // If it wasn't selected by the previous querySelectorAll, observe it now.
                // This might be redundant if the class is added before the main observer loop,
                // but ensures all relevant children are observed.
                observer.observe(child);
            }
        });
    });
}