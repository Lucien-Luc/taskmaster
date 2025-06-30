/**
 * Due Tasks Warning System
 * Shows friendly popup when tasks are due today
 */

window.dueTasksWarning = {
    isInitialized: false,

    init: function() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        console.log('Due Tasks Warning: Initializing...');
        // Check for due tasks after user login and task data is loaded
        this.setupWarningCheck();
    },

    setupWarningCheck: function() {
        console.log('Due Tasks Warning: Setting up warning check...');
        
        // Listen for when tasks are loaded and user is authenticated
        const checkInterval = setInterval(() => {
            console.log('Due Tasks Warning: Checking conditions...', {
                auth: !!window.auth?.currentUser,
                taskManager: !!window.taskManager,
                tasks: window.taskManager?.tasks?.length
            });
            
            if (window.auth?.currentUser && window.taskManager?.tasks && window.taskManager.tasks.length >= 0) {
                console.log('Due Tasks Warning: Conditions met, checking for due tasks...');
                clearInterval(checkInterval);
                this.checkAndShowDueTasksWarning();
            }
        }, 500);

        // Also setup delayed check for after full initialization
        setTimeout(() => {
            console.log('Due Tasks Warning: Delayed check after 3 seconds...');
            if (window.auth?.currentUser && window.taskManager?.tasks) {
                this.checkAndShowDueTasksWarning();
            }
        }, 3000);
    },

    checkAndShowDueTasksWarning: function() {
        console.log('Due Tasks Warning: Checking and showing warning...');
        
        if (!window.taskManager?.tasks) {
            console.log('Due Tasks Warning: No task manager or tasks available');
            return;
        }
        
        if (this.hasShownToday()) {
            console.log('Due Tasks Warning: Already shown today');
            return;
        }

        const dueTasks = this.getTodayDueTasks();
        console.log('Due Tasks Warning: Found', dueTasks.length, 'tasks due today');
        
        if (dueTasks.length > 0) {
            console.log('Due Tasks Warning: Showing modal for tasks:', dueTasks);
            this.showDueTasksModal(dueTasks);
            this.markShownToday();
        } else {
            console.log('Due Tasks Warning: No tasks due today');
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
    },

    // Force show with dummy data for testing
    testModal: function() {
        console.log('Due Tasks Warning: Showing test modal...');
        const dummyTasks = [
            {
                id: 'test1',
                title: 'Test Task 1',
                priority: 'high',
                category: 'testing',
                assignedUsers: ['Test User']
            },
            {
                id: 'test2', 
                title: 'Test Task 2',
                priority: 'urgent',
                category: 'development',
                assignedUsers: ['Test User']
            }
        ];
        this.showDueTasksModal(dummyTasks);
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