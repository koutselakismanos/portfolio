// src/scripts/customCursor.js

export function initCustomCursor() {
    const customCursor = document.querySelector('.custom-cursor');

    if (customCursor && !('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 480)) {
        document.addEventListener('pointermove', e => {
            if (customCursor instanceof HTMLElement) {
                customCursor.style.left = e.clientX + 'px';
                customCursor.style.top = e.clientY + 'px';
                if (!customCursor.classList.contains('visible')) {
                    customCursor.classList.add('visible');
                }
            }
        });

        const interactiveElementsSelector = 'a, button, .project-card, .skill-item, input, textarea, [role="button"], .settings-button, #pcb-3d-render-container canvas, .pcb-thumbnail-item';

        document.querySelectorAll(interactiveElementsSelector).forEach(el => {
            el.addEventListener('mouseenter', () => {
                if (customCursor instanceof HTMLElement) {
                    customCursor.classList.add('hover-interactive');
                }
            });
            el.addEventListener('mouseleave', () => {
                if (customCursor instanceof HTMLElement) {
                    customCursor.classList.remove('hover-interactive');
                }
            });
        });

        document.addEventListener('mousedown', () => {
            if (customCursor instanceof HTMLElement) {
                customCursor.style.transform = 'translate(-50%, -50%) scale(0.8)';
            }
        });
        document.addEventListener('mouseup', () => {
            if (customCursor instanceof HTMLElement) {
                customCursor.style.transform = 'translate(-50%, -50%) scale(1)';
            }
        });

        let mouseLeaveTimeout;
        document.addEventListener('mouseleave', () => {
            mouseLeaveTimeout = setTimeout(() => {
                if (customCursor instanceof HTMLElement) {
                    customCursor.classList.remove('visible');
                }
            }, 200);
        });
        document.addEventListener('mouseenter', () => {
            clearTimeout(mouseLeaveTimeout);
            if (customCursor instanceof HTMLElement) {
                if (!customCursor.classList.contains('visible')) {
                    customCursor.classList.add('visible');
                }
            }
        });
    } else if (customCursor instanceof HTMLElement) {
        customCursor.style.display = 'none';
    }
}