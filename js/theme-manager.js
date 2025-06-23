// Theme Manager for switching between dark and light themes
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.themeStylesheet = document.getElementById('theme-stylesheet');
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeIcon = document.getElementById('theme-icon');
        
        this.init();
    }
    
    init() {
        // Set initial theme
        this.applyTheme(this.currentTheme);
        
        // Add event listener for theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        // Update icon based on current theme
        this.updateIcon();
        
        console.log('Theme manager initialized');
    }
    
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(this.currentTheme);
        this.saveTheme();
        this.updateIcon();
        
        // Show notification
        if (window.showNotification) {
            window.showNotification(
                `Switched to ${this.currentTheme} theme`, 
                'success'
            );
        }
    }
    
    applyTheme(theme) {
        if (!this.themeStylesheet) return;
        
        const stylesheetPath = theme === 'light' ? 'styles-white.css' : 'styles.css';
        this.themeStylesheet.href = stylesheetPath;
        
        // Add theme class to body for additional styling if needed
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${theme}`);
    }
    
    updateIcon() {
        if (!this.themeIcon) return;
        
        // Update icon based on current theme
        const iconName = this.currentTheme === 'dark' ? 'sun' : 'moon';
        this.themeIcon.setAttribute('data-lucide', iconName);
        
        // Re-initialize Lucide icons if available
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
    
    saveTheme() {
        localStorage.setItem('theme', this.currentTheme);
    }
    
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.currentTheme = theme;
            this.applyTheme(theme);
            this.saveTheme();
            this.updateIcon();
        }
    }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// Make theme manager available globally
window.ThemeManager = ThemeManager;