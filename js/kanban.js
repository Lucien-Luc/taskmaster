// kanban.js - Enhanced Kanban Board with Drag & Drop and User Blocking
window.kanbanManager = {
    draggedTask: null,
    draggedElement: null,
    isInitialized: false,
    eventListeners: [],
    
    // Initialize kanban functionality
    init: function() {
        if (this.isInitialized) {
            console.log('Kanban already initialized, skipping...');
            return; // Prevent multiple initializations
        }
        console.log('Initializing Kanban manager...');
        this.cleanup(); // Clean up any existing listeners first
        this.setupDragAndDrop();
        this.setupEventListeners();
        this.isInitialized = true;
    },
    
    // Cleanup method to remove event listeners
    cleanup: function() {
        // Remove all stored event listeners
        this.eventListeners.forEach(({element, event, handler}) => {
            if (element) {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];
        
        // Clear drag state
        this.draggedTask = null;
        this.draggedElement = null;
        
        // Remove any drag-related classes from all elements
        document.querySelectorAll('.dragging, .drag-over').forEach(el => {
            el.classList.remove('dragging', 'drag-over');
        });
        
        // Ensure all task cards are only in their proper kanban columns
        this.ensureTaskCardsInCorrectContainers();
        
        this.isInitialized = false;
        console.log('Kanban cleanup completed');
    },
    
    // Ensure task cards are only in kanban board columns
    ensureTaskCardsInCorrectContainers: function() {
        const kanbanBoard = document.getElementById('kanban-board');
        if (!kanbanBoard) return;
        
        // Get all task cards in the document
        const allTaskCards = document.querySelectorAll('.task-card');
        
        allTaskCards.forEach(card => {
            const parentKanbanBoard = card.closest('#kanban-board');
            
            // If task card is not inside kanban board, remove it
            if (!parentKanbanBoard) {
                console.warn('Removing misplaced task card:', card.dataset.taskId);
                card.remove();
            }
        });
    },
    
    // Setup drag and drop functionality
    setupDragAndDrop: function() {
        // We'll set up event listeners dynamically when tasks are rendered
        // This ensures proper binding even when tasks are added/removed
    },
    
    // Setup additional event listeners
    setupEventListeners: function() {
        // Get kanban container to scope event listeners
        const kanbanContainer = document.getElementById('kanban-board');
        if (!kanbanContainer) {
            console.warn('Kanban board container not found');
            return;
        }
        
        // Task click for details - scoped to kanban container only
        const clickHandler = (e) => {
            if (e.target.closest('.task-card') && !this.draggedTask) {
                const taskCard = e.target.closest('.task-card');
                const taskId = taskCard.dataset.taskId;
                if (taskId && window.taskManager) {
                    const task = window.taskManager.tasks.find(t => t.id === taskId);
                    if (task) {
                        window.taskManager.showTaskDetails(task);
                    }
                }
            }
        };
        
        // Only add listener to kanban container, not the entire document
        kanbanContainer.addEventListener('click', clickHandler);
        this.eventListeners.push({
            element: kanbanContainer,
            event: 'click',
            handler: clickHandler
        });
    },
    
    // Render kanban board
    renderKanbanBoard: function(tasks = null) {
        const tasksToRender = tasks || (window.taskManager ? window.taskManager.getFilteredTasks() : []);
        
        // Ensure we're only working within the kanban board container
        const kanbanBoard = document.getElementById('kanban-board');
        if (!kanbanBoard) {
            console.warn('Kanban board container not found');
            return;
        }
        
        // Get column elements - only within the kanban board
        const columns = {
            'todo': kanbanBoard.querySelector('#todo-tasks'),
            'in-progress': kanbanBoard.querySelector('#in-progress-tasks'),
            'blocked': kanbanBoard.querySelector('#blocked-tasks'),
            'paused': kanbanBoard.querySelector('#paused-tasks'),
            'completed': kanbanBoard.querySelector('#completed-tasks')
        };
        
        // Clear existing tasks only from kanban columns
        Object.values(columns).forEach(column => {
            if (column) {
                // Remove only task cards, preserve column structure
                const taskCards = column.querySelectorAll('.task-card');
                taskCards.forEach(card => card.remove());
            }
        });
        
        // Group tasks by status
        const tasksByStatus = {
            'todo': [],
            'in-progress': [],
            'blocked': [],
            'paused': [],
            'completed': []
        };
        
        tasksToRender.forEach(task => {
            const status = task.status || 'todo';
            if (tasksByStatus[status]) {
                tasksByStatus[status].push(task);
            }
        });
        
        // Render tasks in each column
        Object.entries(tasksByStatus).forEach(([status, statusTasks]) => {
            const column = columns[status];
            if (!column) return;
            
            statusTasks.forEach(task => {
                const taskElement = this.createTaskCard(task);
                column.appendChild(taskElement);
            });
            
            // Update task count
            this.updateColumnCount(status, statusTasks.length);
        });
        
        // Setup drag and drop listeners for all task lists
        this.setupTaskListDropListeners();
        
        // Setup drag and drop for new elements
        this.setupTaskCardListeners();
    },
    
    // Create task card element
    createTaskCard: function(task) {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.draggable = true;
        card.dataset.taskId = task.id;
        
        // Add blocked styling if task is blocked
        if (task.status === 'blocked') {
            card.classList.add('blocked');
        }
        
        // Check if task is overdue
        const isOverdue = window.overdueManager ? window.overdueManager.isTaskOverdue(task) : false;
        const isInGrace = window.overdueManager ? window.overdueManager.isTaskInGracePeriod(task) : false;
        
        // Format due date
        const dueDate = new Date(task.dueDate);
        const dueDateStr = dueDate.toLocaleDateString();
        let dueDateClass = '';
        let dueDateText = dueDateStr;
        
        if (isOverdue) {
            dueDateClass = 'overdue';
            if (isInGrace) {
                dueDateText += ' (Grace Period)';
            } else {
                dueDateText += ' (Overdue)';
            }
        }
        
        // Create assigned users display
        const assignedUsersHtml = task.assignedUsers && task.assignedUsers.length > 0 ?
            `<div class="task-assigned-users">
                ${task.assignedUsers.map(user => `<span class="assigned-user">${user}</span>`).join('')}
            </div>` : '';
        
        // Create task description preview
        const description = task.description ? 
            `<div class="task-description">${task.description}</div>` : '';
        
        card.innerHTML = `
            <div class="task-category">${task.category || 'General'}</div>
            <div class="task-title">${task.title}</div>
            <div class="task-meta">
                <span class="task-priority ${task.priority || 'medium'}">${task.priority || 'Medium'}</span>
                <span class="task-due-date ${dueDateClass}">${dueDateText}</span>
            </div>
            ${assignedUsersHtml}
            ${description}
        `;
        
        // Setup drag event listeners immediately
        card.addEventListener('dragstart', this.handleDragStart.bind(this));
        card.addEventListener('dragend', this.handleDragEnd.bind(this));
        
        return card;
    },
    
    // Setup event listeners for task cards (deprecated - now handled in createTaskCard)
    setupTaskCardListeners: function() {
        const taskCards = document.querySelectorAll('.task-card');
        const taskLists = document.querySelectorAll('.task-list');
        
        // Setup drag events for task cards
        taskCards.forEach(card => {
            card.addEventListener('dragstart', this.handleDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
        });
        
        // Setup drop events for task lists
        taskLists.forEach(list => {
            list.addEventListener('dragover', this.handleDragOver.bind(this));
            list.addEventListener('drop', this.handleDrop.bind(this));
            list.addEventListener('dragenter', this.handleDragEnter.bind(this));
            list.addEventListener('dragleave', this.handleDragLeave.bind(this));
        });
    },

    // Setup drop listeners for task list containers
    setupTaskListDropListeners: function() {
        const kanbanBoard = document.getElementById('kanban-board');
        if (!kanbanBoard) return;
        
        const taskLists = kanbanBoard.querySelectorAll('.task-list');
        taskLists.forEach(list => {
            // Remove existing listeners first
            list.removeEventListener('dragover', this.handleDragOver);
            list.removeEventListener('drop', this.handleDrop);
            list.removeEventListener('dragenter', this.handleDragEnter);
            list.removeEventListener('dragleave', this.handleDragLeave);
            
            // Add new listeners
            list.addEventListener('dragover', this.handleDragOver.bind(this));
            list.addEventListener('drop', this.handleDrop.bind(this));
            list.addEventListener('dragenter', this.handleDragEnter.bind(this));
            list.addEventListener('dragleave', this.handleDragLeave.bind(this));
        });
    },
    
    // Handle drag start
    handleDragStart: function(e) {
        // Check if user is blocked - but allow moving overdue tasks during grace period
        if (window.auth?.isBlocked) {
            const gracePeriodActive = localStorage.getItem('gracePeriodStart');
            const taskId = e.target.dataset.taskId;
            const task = window.taskManager?.tasks.find(t => t.id === taskId);
            
            // Allow moving overdue tasks during grace period
            if (!gracePeriodActive || !task || !window.overdueManager?.isTaskOverdue(task)) {
                e.preventDefault();
                window.showNotification('Cannot move tasks while account is blocked', 'error');
                return;
            }
        }
        
        this.draggedElement = e.target;
        this.draggedTask = window.taskManager?.tasks.find(t => t.id === e.target.dataset.taskId);
        
        if (!this.draggedTask) {
            e.preventDefault();
            return;
        }
        
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
    },
    
    // Handle drag end
    handleDragEnd: function(e) {
        e.target.classList.remove('dragging');
        this.draggedElement = null;
        this.draggedTask = null;
        
        // Remove drag-over styling from all lists
        document.querySelectorAll('.task-list').forEach(list => {
            list.classList.remove('drag-over');
        });
    },
    
    // Handle drag over
    handleDragOver: function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },
    
    // Handle drag enter
    handleDragEnter: function(e) {
        e.preventDefault();
        e.target.classList.add('drag-over');
    },
    
    // Handle drag leave
    handleDragLeave: function(e) {
        e.target.classList.remove('drag-over');
    },
    
    // Handle drop
    handleDrop: async function(e) {
        e.preventDefault();
        e.target.classList.remove('drag-over');
        
        if (!this.draggedTask || !window.taskManager) return;
        
        const newStatus = e.target.dataset.status;
        if (!newStatus || newStatus === this.draggedTask.status) return;
        
        // Check if user can perform this operation - allow during grace period for overdue tasks
        const gracePeriodActive = localStorage.getItem('gracePeriodStart');
        const isOverdueTask = window.overdueManager?.isTaskOverdue(this.draggedTask);
        
        if (window.auth?.isBlocked && (!gracePeriodActive || !isOverdueTask)) {
            window.showNotification('Cannot move tasks while account is blocked', 'error');
            return;
        }
        
        // Check specific permissions for blocked/paused tasks
        const currentUser = window.auth?.currentUser;
        if ((this.draggedTask.status === 'blocked' || this.draggedTask.status === 'paused') && 
            window.overdueManager) {
            
            if (!window.overdueManager.canUserMoveBlockedTask(this.draggedTask, currentUser, newStatus)) {
                let message = 'You cannot move this task. ';
                if (this.draggedTask.assignedBy && this.draggedTask.assignedBy !== currentUser) {
                    message += `Only ${this.draggedTask.assignedBy} (who assigned this task) can move it.`;
                } else {
                    message += 'This task can only be moved to Paused or Completed status.';
                }
                window.showNotification(message, 'error');
                return;
            }
        }
        
        // Validate status transition
        if (!this.isValidStatusTransition(this.draggedTask.status, newStatus)) {
            window.showNotification('Invalid status transition', 'error');
            return;
        }
        
        // Update task status
        try {
            console.log('Drag and Drop: Updating task status for', this.draggedTask.title, 'from', this.draggedTask.status, 'to', newStatus);
            await window.taskManager.updateTaskStatus(this.draggedTask.id, newStatus);
            console.log('Drag and Drop: Task status update completed successfully');
            window.showNotification(`Task moved to ${this.getStatusDisplayName(newStatus)}`, 'success');
            
            // Force refresh the kanban board immediately
            setTimeout(() => {
                console.log('Drag and Drop: Forcing kanban refresh');
                window.kanbanManager.renderKanbanBoard();
            }, 500);
            
        } catch (error) {
            console.error('Error updating task status:', error);
            window.showNotification('Error updating task status', 'error');
        }
    },
    
    // Check if status transition is valid
    isValidStatusTransition: function(fromStatus, toStatus) {
        // Define allowed transitions
        const allowedTransitions = {
            'todo': ['in-progress', 'blocked', 'paused'],
            'in-progress': ['todo', 'blocked', 'paused', 'completed'],
            'blocked': ['paused', 'completed'], // Restricted transitions
            'paused': ['todo', 'in-progress', 'completed'],
            'completed': ['todo', 'in-progress'] // Allow reopening completed tasks
        };
        
        return allowedTransitions[fromStatus]?.includes(toStatus) || false;
    },
    
    // Get display name for status
    getStatusDisplayName: function(status) {
        const statusNames = {
            'todo': 'To Do',
            'in-progress': 'In Progress',
            'blocked': 'Blocked',
            'paused': 'Paused',
            'completed': 'Completed'
        };
        
        return statusNames[status] || status;
    },
    
    // Update column task count
    updateColumnCount: function(status, count) {
        const countElement = document.getElementById(`${status === 'in-progress' ? 'in-progress' : status}-count`);
        if (countElement) {
            countElement.textContent = count;
        }
    },
    
    // Get tasks by status for filtering
    getTasksByStatus: function(tasks, status) {
        return tasks.filter(task => (task.status || 'todo') === status);
    },
    
    // Refresh kanban board
    refresh: function() {
        if (window.taskManager && window.taskManager.currentView === 'kanban') {
            this.renderKanbanBoard();
        }
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.kanbanManager.init();
});

export default window.kanbanManager;
