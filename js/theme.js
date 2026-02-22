// js/theme.js

/**
 * Applies the selected theme to the document.
 * @param {string} theme - The theme identifier.
 */
const applyTheme = (theme) => {
    const themeId = 'dynamic-theme-link';
    let link = document.getElementById(themeId);

    if (theme === 'no-style' || !theme) {
        document.documentElement.removeAttribute('data-theme');
        if (link) link.remove();
        return;
    }

    // Keep data-theme for any legacy CSS selectors or layout logic
    document.documentElement.setAttribute('data-theme', theme);

    if (!link) {
        link = document.createElement('link');
        link.id = themeId;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }
    link.href = `/css/themes/${theme}.css`;
};

// Immediate execution to prevent FOUC (Flash of Unstyled Content)
(function() {
    const defaultTheme = 'no-style';
    const storedTheme = (typeof getPreference === 'function') 
        ? getPreference('theme', defaultTheme) 
        : (localStorage.getItem('app-theme') || defaultTheme);
    applyTheme(storedTheme);
})();

document.addEventListener('DOMContentLoaded', () => {
    const defaultTheme = 'no-style';
    const storedTheme = getPreference('theme', defaultTheme);
    
    // Find selector if it exists on page (e.g., in settings.html)
    const selector = document.getElementById('theme-selector');
    if (selector) {
        selector.value = storedTheme;
        selector.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            updatePreference('theme', newTheme);
            applyTheme(newTheme);
        });
    }
});
