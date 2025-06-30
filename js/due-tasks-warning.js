/**
 * Due Tasks Warning System
 * Shows friendly popup when tasks are due today
 */

window.dueTasksWarning = {
    isInitialized: false,

    init: function() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        // Check for due tasks after user login and task data is loaded
        this.setupWarningCheck();
    },

    setupWarningCheck: function() {
        // Listen for when tasks are loaded and user is authenticated
        const checkInterval = setInterval(() => {
            if (window.auth?.currentUser && window.taskManager?.tasks && window.taskManager.tasks.length >= 0) {
                clearInterval(checkInterval);
                this.checkAndShowDueTasksWarning();
            }
        }, 500);

        // Also check when tasks change
        if (window.taskManager) {
            const originalListenForTaskChanges = window.taskManager.listenForTaskChanges;
            if (originalListenForTaskChanges) {
                window.taskManager.listenForTaskChanges = () => {
                    originalListenForTaskChanges.call(window.taskManager);
                    // Only show warning on initial load, not on every task change
                    if (!this.hasShownToday()) {
                        setTimeout(() => this.checkAndShowDueTasksWarning(), 1000);
                    }
                };
            }
        }
    },

    checkAndShowDueTasksWarning: function() {
        if (!window.taskManager?.tasks || this.hasShownToday()) return;

        const dueTasks = this.getTodayDueTasks();
        
        if (dueTasks.length > 0) {
            this.showDueTasksModal(dueTasks);
            this.markShownToday();
        }
    },

    getTodayDueTasks: function() {
        if (!window.taskManager?.tasks) return [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        return window.taskManager.tasks.filter(task => {
            if (task.status === 'completed') return false;
            
            const taskDate = new Date(task.dueDate);
            taskDate.setHours(0, 0, 0, 0);
            
            return taskDate.getTime() === today.getTime();
        });
    },

    showDueTasksModal: function(dueTasks) {
        // Create modal HTML
        const modal = document.createElement('div');
        modal.className = 'due-tasks-modal-overlay';
        modal.innerHTML = `
            <div class="due-tasks-modal">
                <div class="due-tasks-header">
                    <div class="due-tasks-icon">
                        <i data-lucide="bell-ring"></i>
                    </div>
                    <h3>Tasks Due Today</h3>
                    <p>You have ${dueTasks.length} task${dueTasks.length > 1 ? 's' : ''} due today</p>
                </div>
                
                <div class="due-tasks-list">
                    ${dueTasks.map(task => `
                        <div class="due-task-item">
                            <div class="task-priority priority-${task.priority}"></div>
                            <div class="task-details">
                                <div class="task-title">${this.escapeHtml(task.title)}</div>
                                <div class="task-meta">
                                    <span class="task-category">${task.category || 'No category'}</span>
                                    <span class="task-priority-text">${task.priority || 'normal'} priority</span>
                                    ${task.assignedUsers && task.assignedUsers.length > 0 ? 
                                        `<span class="task-assigned">Assigned to: ${task.assignedUsers.join(', ')}</span>` : ''
                                    }
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="due-tasks-actions">
                    <button class="btn btn-outline due-task-dismiss" id="due-task-dismiss">
                        <i data-lucide="check"></i>
                        I Know
                    </button>
                    <button class="btn btn-primary due-task-filter" id="due-task-filter">
                        <i data-lucide="filter"></i>
                        Take Me There
                    </button>
                </div>
            </div>
        `;

        // Add to DOM
        document.body.appendChild(modal);

        // Initialize Lucide icons for the modal
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Add event listeners
        const dismissBtn = modal.querySelector('#due-task-dismiss');
        const filterBtn = modal.querySelector('#due-task-filter');

        dismissBtn.addEventListener('click', () => {
            this.closeDueTasksModal();
        });

        filterBtn.addEventListener('click', () => {
            this.filterTodayDueTasks();
            this.closeDueTasksModal();
        });

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeDueTasksModal();
            }
        });

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeDueTasksModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        // Store reference for easy removal
        this.currentModal = modal;
    },

    filterTodayDueTasks: function() {
        // Set date filter to today
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // Clear other filters and set date filter
        if (window.taskViews) {
            window.taskViews.currentFilter = {
                user: '',
                priority: '',
                category: '',
                status: '',
                dateStart: todayStr,
                dateEnd: todayStr,
                overdue: false
            };

            // Update filter form if visible
            const dateStartInput = document.getElementById('filter-date-start');
            const dateEndInput = document.getElementById('filter-date-end');
            
            if (dateStartInput) dateStartInput.value = todayStr;
            if (dateEndInput) dateEndInput.value = todayStr;

            // Clear other filter inputs
            const filterInputs = ['filter-user', 'filter-priority', 'filter-category', 'filter-status'];
            filterInputs.forEach(id => {
                const input = document.getElementById(id);
                if (input) input.value = '';
            });

            // Update the view
            window.taskViews.updateCurrentView();

            // Show notification
            if (window.showNotification) {
                window.showNotification('Filtered to show today\'s due tasks', 'info');
            }
        }
    },

    closeDueTasksModal: function() {
        if (this.currentModal) {
            this.currentModal.remove();
            this.currentModal = null;
        }
    },

    hasShownToday: function() {
        const today = new Date().toDateString();
        const lastShown = localStorage.getItem('dueTasksWarningShown');
        return lastShown === today;
    },

    markShownToday: function() {
        const today = new Date().toDateString();
        localStorage.setItem('dueTasksWarningShown', today);
    },

    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Manual trigger for testing
    showWarning: function() {
        localStorage.removeItem('dueTasksWarningShown');
        this.checkAndShowDueTasksWarning();
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.dueTasksWarning.init();
    });
} else {
    window.dueTasksWarning.init();
}