// Notification Manager for UI Feedback
class NotificationManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            this.createContainer();
        }
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.id = 'notification-container';
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = this.getIcon(type);
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icon}</div>
                <span class="notification-message">${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i data-lucide="x"></i>
            </button>
        `;

        this.container.appendChild(notification);

        // Initialize lucide icons for the close button
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    this.remove(notification);
                }
            }, duration);
        }

        // Slide in animation
        setTimeout(() => {
            notification.classList.add('notification-show');
        }, 100);

        return notification;
    }

    remove(notification) {
        notification.classList.add('notification-hide');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }

    getIcon(type) {
        const icons = {
            success: '<i data-lucide="check-circle"></i>',
            error: '<i data-lucide="alert-circle"></i>',
            warning: '<i data-lucide="alert-triangle"></i>',
            info: '<i data-lucide="info"></i>'
        };
        return icons[type] || icons.info;
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Global instance
window.notificationManager = new NotificationManager();

export default NotificationManager;