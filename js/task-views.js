// task-views.js - Advanced Task Views Handler with Enhanced Table Formats
window.taskViews = {
    currentFilter: {
        user: '',
        priority: '',
        category: '',
        status: '',
        dateStart: '',
        dateEnd: ''
    },

    // Initialize view handlers
    init: function() {
        console.log('Initializing advanced task views...');
        this.setupFilterListeners();
        this.setupViewSpecificEvents();
        this.setupFiltersDropdown();
    },

    // Setup filter event listeners
    setupFilterListeners: function() {
        const filterUser = document.getElementById('filter-user');
        const filterPriority = document.getElementById('filter-priority');
        const filterCategory = document.getElementById('filter-category');
        const filterStatus = document.getElementById('filter-status');
        const filterDateStart = document.getElementById('filter-date-start');
        const filterDateEnd = document.getElementById('filter-date-end');

        if (filterUser) {
            filterUser.addEventListener('change', (e) => {
                this.currentFilter.user = e.target.value;
                this.updateCurrentView();
            });
        }

        if (filterPriority) {
            filterPriority.addEventListener('change', (e) => {
                this.currentFilter.priority = e.target.value;
                this.updateCurrentView();
            });
        }

        if (filterCategory) {
            filterCategory.addEventListener('change', (e) => {
                this.currentFilter.category = e.target.value;
                this.updateCurrentView();
            });
        }

        if (filterStatus) {
            filterStatus.addEventListener('change', (e) => {
                this.currentFilter.status = e.target.value;
                this.updateCurrentView();
            });
        }

        if (filterDateStart) {
            filterDateStart.addEventListener('change', (e) => {
                this.currentFilter.dateStart = e.target.value;
                this.updateCurrentView();
            });
        }

        if (filterDateEnd) {
            filterDateEnd.addEventListener('change', (e) => {
                this.currentFilter.dateEnd = e.target.value;
                this.updateCurrentView();
            });
        }
    },

    // Setup filters dropdown functionality
    setupFiltersDropdown: function() {
        // Add small delay to ensure DOM is fully loaded
        setTimeout(() => {
            const filtersToggle = document.getElementById('filters-toggle');
            const filtersPanel = document.getElementById('filters-panel');
            const clearFilters = document.getElementById('clear-filters');
            const applyFilters = document.getElementById('apply-filters');
            
            if (filtersToggle && filtersPanel) {
                filtersToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = !filtersPanel.classList.contains('hidden');
                
                if (isOpen) {
                    filtersPanel.classList.add('hidden');
                    filtersToggle.classList.remove('active');
                } else {
                    filtersPanel.classList.remove('hidden');
                    filtersToggle.classList.add('active');
                }
            });

                // Close dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (!filtersToggle.contains(e.target) && !filtersPanel.contains(e.target)) {
                        filtersPanel.classList.add('hidden');
                        filtersToggle.classList.remove('active');
                    }
                });
            }

            if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                // Clear all filter values
                document.getElementById('filter-user').value = '';
                document.getElementById('filter-priority').value = '';
                document.getElementById('filter-category').value = '';
                document.getElementById('filter-status').value = '';
                document.getElementById('filter-date-start').value = '';
                document.getElementById('filter-date-end').value = '';

                // Reset filter state
                this.currentFilter = {
                    user: '',
                    priority: '',
                    category: '',
                    status: '',
                    dateStart: '',
                    dateEnd: ''
                };

                // Update view
                this.updateCurrentView();
                
                // Show notification
                if (window.showNotification) {
                    window.showNotification('All filters cleared', 'info');
                }
            });
            }

            if (applyFilters) {
            applyFilters.addEventListener('click', () => {
                // Close the dropdown
                filtersPanel.classList.add('hidden');
                filtersToggle.classList.remove('active');
                
                // Show notification
                if (window.showNotification) {
                    window.showNotification('Filters applied', 'success');
                }
            });
            }
        }, 100); // Small delay to ensure DOM is ready
    },

    // Setup view-specific event handlers
    setupViewSpecificEvents: function() {
        // Week navigation for weekly view
        const prevWeek = document.getElementById('prev-week');
        const nextWeek = document.getElementById('next-week');
        
        if (prevWeek) {
            prevWeek.addEventListener('click', () => {
                this.navigateWeek(-1);
            });
        }
        
        if (nextWeek) {
            nextWeek.addEventListener('click', () => {
                this.navigateWeek(1);
            });
        }

        // Month navigation for monthly view
        const prevMonthView = document.getElementById('prev-month-view');
        const nextMonthView = document.getElementById('next-month-view');
        
        if (prevMonthView) {
            prevMonthView.addEventListener('click', () => {
                this.navigateMonth(-1);
            });
        }
        
        if (nextMonthView) {
            nextMonthView.addEventListener('click', () => {
                this.navigateMonth(1);
            });
        }

        // Quarter navigation for quarterly view
        const prevQuarter = document.getElementById('prev-quarter');
        const nextQuarter = document.getElementById('next-quarter');
        
        if (prevQuarter) {
            prevQuarter.addEventListener('click', () => {
                this.navigateQuarter(-1);
            });
        }
        
        if (nextQuarter) {
            nextQuarter.addEventListener('click', () => {
                this.navigateQuarter(1);
            });
        }

        // Year navigation for annual view
        const prevYear = document.getElementById('prev-year');
        const nextYear = document.getElementById('next-year');
        
        if (prevYear) {
            prevYear.addEventListener('click', () => {
                this.navigateYear(-1);
            });
        }
        
        if (nextYear) {
            nextYear.addEventListener('click', () => {
                this.navigateYear(1);
            });
        }
    },

    // Navigation methods
    navigateWeek: function(direction) {
        if (window.taskManager) {
            if (!window.taskManager.currentWeekDate) {
                window.taskManager.currentWeekDate = new Date();
            }
            window.taskManager.currentWeekDate.setDate(window.taskManager.currentWeekDate.getDate() + (direction * 7));
            this.renderWeeklyView();
        }
    },

    navigateMonth: function(direction) {
        if (window.taskManager) {
            if (!window.taskManager.currentDate) {
                window.taskManager.currentDate = new Date();
            }
            window.taskManager.currentDate.setMonth(window.taskManager.currentDate.getMonth() + direction);
            this.renderMonthlyView();
        }
    },

    navigateQuarter: function(direction) {
        if (window.taskManager) {
            window.taskManager.currentQuarter += direction;
            if (window.taskManager.currentQuarter < 1) {
                window.taskManager.currentQuarter = 4;
                window.taskManager.currentYear--;
            } else if (window.taskManager.currentQuarter > 4) {
                window.taskManager.currentQuarter = 1;
                window.taskManager.currentYear++;
            }
            this.renderQuarterlyView();
        }
    },

    navigateYear: function(direction) {
        if (window.taskManager) {
            window.taskManager.currentYear += direction;
            this.renderAnnualView();
        }
    },

    // Filter tasks based on current filters
    getFilteredTasks: function(tasks = null) {
        const tasksToFilter = tasks || (window.taskManager ? window.taskManager.tasks : []);
        
        return tasksToFilter.filter(task => {
            // User filter
            if (this.currentFilter.user && task.assignedUsers && task.assignedUsers.length > 0) {
                if (!task.assignedUsers.includes(this.currentFilter.user)) {
                    return false;
                }
            }
            
            // Priority filter
            if (this.currentFilter.priority && task.priority !== this.currentFilter.priority) {
                return false;
            }
            
            // Category filter
            if (this.currentFilter.category && task.category !== this.currentFilter.category) {
                return false;
            }

            // Status filter
            if (this.currentFilter.status && task.status !== this.currentFilter.status) {
                return false;
            }
            
            // Date range filter
            if (this.currentFilter.dateStart || this.currentFilter.dateEnd) {
                const taskDate = new Date(task.dueDate);
                
                if (this.currentFilter.dateStart) {
                    const startDate = new Date(this.currentFilter.dateStart);
                    if (taskDate < startDate) {
                        return false;
                    }
                }
                
                if (this.currentFilter.dateEnd) {
                    const endDate = new Date(this.currentFilter.dateEnd);
                    if (taskDate > endDate) {
                        return false;
                    }
                }
            }
            
            return true;
        });
    },

    // Update current view based on active view
    updateCurrentView: function() {
        if (!window.taskManager) return;
        
        const currentView = window.taskManager.currentView;
        
        switch (currentView) {
            case 'weekly':
                this.renderWeeklyView();
                break;
            case 'monthly':
                this.renderMonthlyView();
                break;
            case 'quarterly':
                this.renderQuarterlyView();
                break;
            case 'annually':
                this.renderAnnualView();
                break;
            case 'kanban':
                if (window.taskManager.renderKanbanBoard) {
                    window.taskManager.renderKanbanBoard();
                }
                break;
            case 'calendar':
                if (window.taskManager.renderCalendar) {
                    window.taskManager.renderCalendar();
                }
                break;
        }
    },

    // Get week start date (Sunday)
    getWeekStart: function(date) {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    },

    // WEEKLY VIEW - Enhanced Table Format
    renderWeeklyView: function() {
        const weeklyContainer = document.getElementById('weekly-content');
        if (!weeklyContainer || !window.taskManager) return;

        const currentDate = window.taskManager.currentWeekDate || new Date();
        const weekStart = this.getWeekStart(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        // Update week display
        const weekDisplay = document.getElementById('current-week');
        if (weekDisplay) {
            weekDisplay.textContent = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
        }

        // Get tasks for the week
        const weekTasks = this.getFilteredTasks().filter(task => {
            const taskDate = new Date(task.dueDate);
            return taskDate >= weekStart && taskDate <= weekEnd;
        });

        // Render week table
        weeklyContainer.innerHTML = this.renderTaskTable(weekTasks, 'Weekly Report', weekStart, weekEnd);
        
        // Add task click listeners
        this.addTaskClickListeners(weeklyContainer);
    },

    // MONTHLY VIEW - Enhanced Table Format
    renderMonthlyView: function() {
        const monthlyContainer = document.getElementById('monthly-content');
        if (!monthlyContainer || !window.taskManager) return;

        const currentDate = window.taskManager.currentDate || new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Update month display
        const monthDisplay = document.getElementById('current-month-view');
        if (monthDisplay) {
            monthDisplay.textContent = new Date(year, month, 1).toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
            });
        }

        // Get month date range
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);

        // Get tasks for the month
        const monthTasks = this.getFilteredTasks().filter(task => {
            const taskDate = new Date(task.dueDate);
            return taskDate >= monthStart && taskDate <= monthEnd;
        });

        // Render monthly table
        monthlyContainer.innerHTML = this.renderTaskTable(monthTasks, 'Monthly Report', monthStart, monthEnd);
        
        // Add task click listeners
        this.addTaskClickListeners(monthlyContainer);
    },

    // QUARTERLY VIEW - Enhanced Table Format
    renderQuarterlyView: function() {
        const quarterlyContainer = document.getElementById('quarterly-content');
        if (!quarterlyContainer || !window.taskManager) return;

        const quarter = window.taskManager.currentQuarter;
        const year = window.taskManager.currentYear;

        // Update quarter display
        const quarterDisplay = document.getElementById('current-quarter');
        if (quarterDisplay) {
            quarterDisplay.textContent = `Q${quarter} ${year}`;
        }

        // Get quarter date range
        const quarterStart = new Date(year, (quarter - 1) * 3, 1);
        const quarterEnd = new Date(year, quarter * 3, 0);
        quarterEnd.setHours(23, 59, 59, 999);

        // Get tasks for the quarter
        const quarterTasks = this.getFilteredTasks().filter(task => {
            const taskDate = new Date(task.dueDate);
            return taskDate >= quarterStart && taskDate <= quarterEnd;
        });

        // Render quarterly table
        quarterlyContainer.innerHTML = this.renderTaskTable(quarterTasks, `Q${quarter} ${year} Report`, quarterStart, quarterEnd);
        
        // Add task click listeners
        this.addTaskClickListeners(quarterlyContainer);
    },

    // ANNUAL VIEW - Enhanced Table Format
    renderAnnualView: function() {
        const annualContainer = document.getElementById('annual-content');
        if (!annualContainer || !window.taskManager) return;

        const year = window.taskManager.currentYear;

        // Update year display
        const yearDisplay = document.getElementById('current-year');
        if (yearDisplay) {
            yearDisplay.textContent = year.toString();
        }

        // Get year date range
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        yearEnd.setHours(23, 59, 59, 999);

        // Get tasks for the year
        const yearTasks = this.getFilteredTasks().filter(task => {
            const taskDate = new Date(task.dueDate);
            return taskDate >= yearStart && taskDate <= yearEnd;
        });

        // Render annual table
        annualContainer.innerHTML = this.renderTaskTable(yearTasks, `${year} Annual Report`, yearStart, yearEnd);
        
        // Add task click listeners
        this.addTaskClickListeners(annualContainer);
    },

    // Enhanced table rendering with comprehensive data
    renderTaskTable: function(tasks, title, startDate, endDate) {
        if (tasks.length === 0) {
            return `
                <div class="empty-state">
                    <i data-lucide="calendar-x" style="width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                    <h3>No tasks found</h3>
                    <p>No tasks match the current criteria for this period.</p>
                </div>
            `;
        }

        // Sort tasks by due date
        const sortedTasks = [...tasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        // Calculate analytics
        const analytics = this.calculateTaskAnalytics(tasks, startDate, endDate);

        // Generate table HTML
        const tableHTML = `
            <div class="table-header">
                <h2>${title}</h2>
                <div class="period-info">
                    <!-- Period and task count information removed -->
                </div>
            </div>
            
            ${this.renderAnalyticsSummary(analytics)}
            
            <div class="table-container">
                <table class="task-table">
                    <thead>
                        <tr>
                            <th>Task</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Category</th>
                            <th>Assigned To</th>
                            <th>Created By</th>
                            <th>Start Date</th>
                            <th>Due Date</th>
                            <th>Days Remaining</th>
                            <th>Progress</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedTasks.map(task => this.renderTaskRow(task)).join('')}
                    </tbody>
                </table>
            </div>
        `;

        // Initialize Lucide icons after content is rendered
        setTimeout(() => {
            lucide.createIcons();
        }, 100);

        return tableHTML;
    },

    // Render individual task row
    renderTaskRow: function(task) {
        const dueDate = new Date(task.dueDate);
        const startDate = task.startDate ? new Date(task.startDate) : null;
        const today = new Date();
        
        // Calculate days remaining
        const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
        const daysRemainingText = daysRemaining < 0 ? 
            `${Math.abs(daysRemaining)} days overdue` : 
            `${daysRemaining} days left`;
        
        const daysRemainingClass = daysRemaining < 0 ? 'overdue' : 
            daysRemaining <= 2 ? 'urgent' : 
            daysRemaining <= 7 ? 'warning' : 'normal';

        // Calculate progress indicator
        const progressText = this.calculateTaskProgress(task);
        
        // Check if task is blocked/overdue
        const isOverdue = window.overdueManager ? window.overdueManager.isTaskOverdue(task) : false;
        const isBlocked = task.status === 'blocked';
        
        const rowClass = isBlocked ? 'blocked-row' : isOverdue ? 'overdue-row' : '';

        return `
            <tr class="task-row ${rowClass}" data-task-id="${task.id}">
                <td>
                    <div class="table-task-title" title="${task.title}">
                        ${task.title}
                        ${task.description ? `<div class="task-description-preview">${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</div>` : ''}
                    </div>
                </td>
                <td>
                    <span class="table-status ${task.status}">
                        ${this.formatStatus(task.status)}
                        ${isBlocked ? '<i data-lucide="lock" style="width: 12px; height: 12px; margin-left: 4px;"></i>' : ''}
                    </span>
                </td>
                <td>
                    <span class="table-priority ${task.priority}">${task.priority}</span>
                </td>
                <td>${task.category}</td>
                <td>
                    <div class="assigned-users-list">
                        ${task.assignedUsers && task.assignedUsers.length > 0 ? 
                            task.assignedUsers.map(user => `<span class="assigned-user-tag">${user}</span>`).join('') : 
                            '<span class="unassigned">Unassigned</span>'
                        }
                    </div>
                </td>
                <td>${task.createdBy || 'Unknown'}</td>
                <td>${startDate ? startDate.toLocaleDateString() : 'Not set'}</td>
                <td class="${daysRemainingClass}">${dueDate.toLocaleDateString()}</td>
                <td class="${daysRemainingClass}">${daysRemainingText}</td>
                <td>${progressText}</td>
            </tr>
        `;
    },

    // Calculate task analytics for the period
    calculateTaskAnalytics: function(tasks, startDate, endDate) {
        const analytics = {
            total: tasks.length,
            completed: 0,
            inProgress: 0,
            blocked: 0,
            paused: 0,
            todo: 0,
            overdue: 0,
            dueThisWeek: 0,
            byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
            byCategory: {},
            byUser: {},
            completionRate: 0,
            averageDaysToComplete: 0
        };

        const today = new Date();
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        tasks.forEach(task => {
            // Status counts
            analytics[task.status] = (analytics[task.status] || 0) + 1;

            // Priority counts
            analytics.byPriority[task.priority] = (analytics.byPriority[task.priority] || 0) + 1;

            // Category counts
            analytics.byCategory[task.category] = (analytics.byCategory[task.category] || 0) + 1;

            // User counts
            if (task.assignedUsers) {
                task.assignedUsers.forEach(user => {
                    analytics.byUser[user] = (analytics.byUser[user] || 0) + 1;
                });
            }

            // Overdue check
            if (window.overdueManager && window.overdueManager.isTaskOverdue(task) && task.status !== 'completed') {
                analytics.overdue++;
            }

            // Due this week
            const dueDate = new Date(task.dueDate);
            if (dueDate >= today && dueDate <= weekFromNow) {
                analytics.dueThisWeek++;
            }
        });

        // Calculate completion rate
        analytics.completionRate = tasks.length > 0 ? 
            Math.round((analytics.completed / tasks.length) * 100) : 0;

        return analytics;
    },

    // Render analytics summary
    renderAnalyticsSummary: function(analytics) {
        const topCategories = Object.entries(analytics.byCategory)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);

        const topUsers = Object.entries(analytics.byUser)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);

        return `
            <div class="analytics-summary">
                <div class="summary-grid">
                    <div class="summary-card">
                        <h4>Completion Rate</h4>
                        <div class="summary-value">${analytics.completionRate}%</div>
                        <div class="summary-detail">${analytics.completed}/${analytics.total} tasks</div>
                    </div>
                    <div class="summary-card">
                        <h4>In Progress</h4>
                        <div class="summary-value">${analytics.inProgress || 0}</div>
                        <div class="summary-detail">Active tasks</div>
                    </div>
                    <div class="summary-card">
                        <h4>Overdue</h4>
                        <div class="summary-value" style="color: ${analytics.overdue > 0 ? '#ef4444' : '#22c55e'}">${analytics.overdue}</div>
                        <div class="summary-detail">Requires attention</div>
                    </div>
                    <div class="summary-card">
                        <h4>Due This Week</h4>
                        <div class="summary-value">${analytics.dueThisWeek}</div>
                        <div class="summary-detail">Upcoming deadlines</div>
                    </div>
                    <div class="summary-card">
                        <h4>Blocked</h4>
                        <div class="summary-value" style="color: ${analytics.blocked > 0 ? '#f59e0b' : '#22c55e'}">${analytics.blocked || 0}</div>
                        <div class="summary-detail">Needs resolution</div>
                    </div>
                    <div class="summary-card">
                        <h4>High Priority</h4>
                        <div class="summary-value">${(analytics.byPriority.high || 0) + (analytics.byPriority.urgent || 0)}</div>
                        <div class="summary-detail">Critical tasks</div>
                    </div>
                    ${topCategories.length > 0 ? `
                    <div class="summary-card">
                        <h4>Top Categories</h4>
                        <div class="breakdown-list">
                            ${topCategories.map(([category, count]) => 
                                `<span class="breakdown-item">${category}: ${count}</span>`
                            ).join('')}
                        </div>
                    </div>` : ''}
                    ${topUsers.length > 0 ? `
                    <div class="summary-card">
                        <h4>Most Assigned Users</h4>
                        <div class="breakdown-list">
                            ${topUsers.map(([user, count]) => 
                                `<span class="breakdown-item">${user}: ${count}</span>`
                            ).join('')}
                        </div>
                    </div>` : ''}
                </div>
            </div>
        `;
    },

    // Calculate task progress
    calculateTaskProgress: function(task) {
        const statusProgress = {
            'todo': '0%',
            'in-progress': '50%',
            'paused': '25%',
            'blocked': '0%',
            'completed': '100%'
        };

        const progress = statusProgress[task.status] || '0%';
        const progressClass = task.status === 'completed' ? 'completed' : 
                             task.status === 'in-progress' ? 'in-progress' : 'pending';

        return `<span class="progress-indicator ${progressClass}">${progress}</span>`;
    },

    // Format status for display
    formatStatus: function(status) {
        const statusMap = {
            'todo': 'To Do',
            'in-progress': 'In Progress',
            'blocked': 'Blocked',
            'paused': 'Paused',
            'completed': 'Completed'
        };
        return statusMap[status] || status;
    },

    // Add task click listeners
    addTaskClickListeners: function(container) {
        const taskRows = container.querySelectorAll('.task-row');
        taskRows.forEach(row => {
            row.addEventListener('click', () => {
                const taskId = row.dataset.taskId;
                if (taskId && window.taskManager) {
                    const task = window.taskManager.tasks.find(t => t.id === taskId);
                    if (task) {
                        window.taskManager.showTaskDetails(task);
                    }
                }
            });
        });
    },

    // Get current view data for export
    getCurrentViewData: function() {
        if (!window.taskManager) return { tasks: [], period: '', type: 'all' };

        const currentView = window.taskManager.currentView;
        let tasks = [];
        let period = '';
        let type = currentView;

        switch (currentView) {
            case 'weekly':
                const weekStart = this.getWeekStart(window.taskManager.currentWeekDate || new Date());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                tasks = this.getFilteredTasks().filter(task => {
                    const taskDate = new Date(task.dueDate);
                    return taskDate >= weekStart && taskDate <= weekEnd;
                });
                period = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
                break;

            case 'monthly':
                const currentDate = window.taskManager.currentDate || new Date();
                const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
                
                tasks = this.getFilteredTasks().filter(task => {
                    const taskDate = new Date(task.dueDate);
                    return taskDate >= monthStart && taskDate <= monthEnd;
                });
                period = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                break;

            case 'quarterly':
                const quarter = window.taskManager.currentQuarter;
                const year = window.taskManager.currentYear;
                const quarterStart = new Date(year, (quarter - 1) * 3, 1);
                const quarterEnd = new Date(year, quarter * 3, 0);
                
                tasks = this.getFilteredTasks().filter(task => {
                    const taskDate = new Date(task.dueDate);
                    return taskDate >= quarterStart && taskDate <= quarterEnd;
                });
                period = `Q${quarter} ${year}`;
                break;

            case 'annually':
                const annualYear = window.taskManager.currentYear;
                const yearStart = new Date(annualYear, 0, 1);
                const yearEnd = new Date(annualYear, 11, 31);
                
                tasks = this.getFilteredTasks().filter(task => {
                    const taskDate = new Date(task.dueDate);
                    return taskDate >= yearStart && taskDate <= yearEnd;
                });
                period = annualYear.toString();
                break;

            default:
                tasks = this.getFilteredTasks();
                period = 'All Tasks';
                type = 'all';
                break;
        }

        return { tasks, period, type };
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.taskViews.init();
});

export default window.taskViews;
