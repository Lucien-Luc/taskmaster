// tasks.js - Enhanced Task Management System with Overdue Automation
import { 
    collection, query, where, getDocs, addDoc, updateDoc, deleteDoc,
    onSnapshot, serverTimestamp, orderBy, doc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Global task manager object
window.taskManager = {
    currentView: 'kanban',
    currentDate: new Date(),
    currentWeekDate: new Date(),
    currentQuarter: Math.floor(new Date().getMonth() / 3) + 1,
    currentYear: new Date().getFullYear(),
    tasks: [],
    users: [],
    currentTask: null, // For editing
    
    // Performance optimization properties
    localTaskCache: new Map(),
    pendingUpdates: new Map(),
    updateBatchTimeout: null,
    isUpdating: false,
    
    // Notification system
    notifications: [],
    
    // User blocking system
    userBlocks: new Map(),
    gracePeriods: new Map(),
    
    // Initialize the task manager
    init: async function() {
        console.log('Initializing task manager...');
        
        // Initialize stored data first
        this.initializeUserBlocks();
        this.initializeNotifications();
        
        await this.fetchUsers();
        this.setupEventListeners();
        this.setupViewNavigation();
        this.setupFilterListeners();
        this.setupSidebarToggle();
        this.listenForTaskChanges();
        this.renderKanbanBoard(); // Start with Kanban view
        this.updateTaskStats();
        
        // Initialize additional modules
        if (window.taskViews && typeof window.taskViews.init === 'function') {
            window.taskViews.init();
        }
        
        // Only initialize kanban if we're starting in kanban view
        if (this.currentView === 'kanban' && window.kanbanManager && typeof window.kanbanManager.init === 'function') {
            window.kanbanManager.init();
        }
        
        if (window.exportManager && typeof window.exportManager.init === 'function') {
            window.exportManager.init();
        }
        
        if (window.profileManager && typeof window.profileManager.init === 'function') {
            window.profileManager.init();
        }
        
        console.log('Task manager initialized');
    },
    
    // Initialize user blocking system
    initializeUserBlocks: function() {
        const storedBlocks = localStorage.getItem('taskManager_userBlocks');
        if (storedBlocks) {
            try {
                const blocksData = JSON.parse(storedBlocks);
                this.userBlocks = new Map(Object.entries(blocksData));
            } catch (e) {
                console.error('Error parsing stored user blocks:', e);
                this.userBlocks = new Map();
            }
        }
    },
    
    // Initialize notifications system
    initializeNotifications: function() {
        const storedNotifications = localStorage.getItem('taskManager_notifications');
        if (storedNotifications) {
            try {
                this.notifications = JSON.parse(storedNotifications);
            } catch (e) {
                console.error('Error parsing stored notifications:', e);
                this.notifications = [];
            }
        }
    },
    
    // Fetch all users from Firestore
    fetchUsers: async function() {
        try {
            const q = query(collection(window.db, 'users'));
            const querySnapshot = await getDocs(q);
            this.users = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('Users fetched:', this.users.length);
            this.populateUserSelects();
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    },
    
    // Populate user-related dropdowns
    populateUserSelects: function() {
        const filterUserSelect = document.getElementById('filter-user');
        const assignedUsersContainer = document.getElementById('task-assigned-users');
        
        // Clear existing options
        if (filterUserSelect) {
            filterUserSelect.innerHTML = '<option value="">All Members</option>';
            this.users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.username || user.name;
                option.textContent = user.username || user.name;
                filterUserSelect.appendChild(option);
            });
        }
        
        // Populate assignment checkboxes
        if (assignedUsersContainer) {
            assignedUsersContainer.innerHTML = '';
            this.users.forEach(user => {
                const userCheckbox = document.createElement('div');
                userCheckbox.className = 'user-checkbox';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `assign-${user.username || user.name}`;
                checkbox.value = user.username || user.name;
                
                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = user.username || user.name;
                
                userCheckbox.appendChild(checkbox);
                userCheckbox.appendChild(label);
                assignedUsersContainer.appendChild(userCheckbox);
            });
        }
    },
    
    // Fetch tasks from Firestore with realtime updates and performance optimization
    listenForTaskChanges: function() {
        try {
            const q = query(collection(window.db, 'tasks'), orderBy('dueDate', 'asc'));
            
            onSnapshot(q, (snapshot) => {
                // Process changes efficiently
                snapshot.docChanges().forEach((change) => {
                    const data = change.doc.data();
                    const task = {
                        id: change.doc.id,
                        ...data,
                        // Handle different date formats
                        dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate),
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
                        startDate: data.startDate?.toDate ? data.startDate.toDate() : (data.startDate ? new Date(data.startDate) : null)
                    };
                    
                    if (change.type === 'added' || change.type === 'modified') {
                        this.localTaskCache.set(task.id, task);
                    } else if (change.type === 'removed') {
                        this.localTaskCache.delete(task.id);
                    }
                });
                
                // Update tasks array from cache
                this.tasks = Array.from(this.localTaskCache.values());
                console.log('Tasks updated:', this.tasks.length);
                
                // Process overdue tasks and update user blocking status
                this.processOverdueTasks();
                
                // Batch update views to prevent multiple renders
                this.scheduleViewUpdate();
            });
        } catch (error) {
            console.error('Error listening for task changes:', error);
        }
    },
    
    // Process overdue tasks and manage user blocking
    processOverdueTasks: async function() {
        if (!window.overdueManager) return;
        
        try {
            await window.overdueManager.processOverdueTasks(this.tasks);
        } catch (error) {
            console.error('Error processing overdue tasks:', error);
        }
    },
    
    // Scheduled view update to prevent excessive rendering
    scheduleViewUpdate: function() {
        if (this.updateBatchTimeout) {
            clearTimeout(this.updateBatchTimeout);
        }
        
        this.updateBatchTimeout = setTimeout(() => {
            this.updateAllViews();
            this.updateTaskStats();
        }, 100); // 100ms debounce
    },
    
    // Update all views when tasks change
    updateAllViews: function() {
        if (this.isUpdating) return;
        this.isUpdating = true;
        
        try {
            // Update current view
            switch (this.currentView) {
                case 'kanban':
                    this.renderKanbanBoard();
                    break;
                case 'calendar':
                    this.renderCalendar();
                    break;
                case 'weekly':
                    if (window.taskViews && typeof window.taskViews.renderWeeklyView === 'function') {
                        window.taskViews.renderWeeklyView();
                    }
                    break;
                case 'monthly':
                    if (window.taskViews && typeof window.taskViews.renderMonthlyView === 'function') {
                        window.taskViews.renderMonthlyView();
                    }
                    break;
                case 'quarterly':
                    if (window.taskViews && typeof window.taskViews.renderQuarterlyView === 'function') {
                        window.taskViews.renderQuarterlyView();
                    }
                    break;
                case 'annually':
                    if (window.taskViews && typeof window.taskViews.renderAnnualView === 'function') {
                        window.taskViews.renderAnnualView();
                    }
                    break;
            }
            
            // Update search results if there's an active search
            this.performSearch();
        } finally {
            this.isUpdating = false;
        }
    },
    
    // Setup event listeners for the UI
    setupEventListeners: function() {
        // Create task button
        const createTaskBtn = document.getElementById('create-task-btn');
        if (createTaskBtn) {
            createTaskBtn.addEventListener('click', () => {
                if (window.authModule.canPerformTaskOperations()) {
                    this.openTaskModal();
                } else {
                    window.showNotification('Cannot create tasks while account is blocked', 'error');
                }
            });
        }
        
        // Task form submission
        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Check if user can modify this specific task
                const canModify = this.canUserModifyTask();
                
                if (canModify) {
                    this.handleTaskSubmit();
                } else {
                    window.showNotification('Cannot modify this task while account is blocked', 'error');
                }
            });
        }
        
        // Cancel task button
        const cancelTaskBtn = document.getElementById('cancel-task');
        if (cancelTaskBtn) {
            cancelTaskBtn.addEventListener('click', () => {
                document.getElementById('task-modal').classList.add('hidden');
            });
        }
        
        // Close modal buttons
        const closeTaskModal = document.getElementById('close-task-modal');
        if (closeTaskModal) {
            closeTaskModal.addEventListener('click', () => {
                document.getElementById('task-modal').classList.add('hidden');
            });
        }
        
        const closeTaskDetails = document.getElementById('close-task-details');
        if (closeTaskDetails) {
            closeTaskDetails.addEventListener('click', () => {
                document.getElementById('task-details-modal').classList.add('hidden');
            });
        }
        
        // Task details modal buttons
        const editTaskBtn = document.getElementById('edit-task-btn');
        if (editTaskBtn) {
            editTaskBtn.addEventListener('click', () => {
                if (this.currentTask) {
                    const currentUser = window.auth?.currentUser;
                    const canEdit = window.authModule.canPerformTaskOperations() || 
                        (window.auth?.isBlocked && 
                         this.currentTask.status === 'blocked' &&
                         window.overdueManager?.canUserMoveBlockedTask(this.currentTask, currentUser, 'completed'));
                    
                    if (canEdit) {
                        document.getElementById('task-details-modal').classList.add('hidden');
                        this.openTaskModal(this.currentTask);
                    } else {
                        window.showNotification('Cannot edit this task while account is blocked', 'error');
                    }
                }
            });
        }
        
        const deleteTaskBtn = document.getElementById('delete-task-btn');
        if (deleteTaskBtn) {
            deleteTaskBtn.addEventListener('click', () => {
                if (this.currentTask && confirm('Are you sure you want to delete this task?')) {
                    if (window.authModule.canPerformTaskOperations()) {
                        this.deleteTask(this.currentTask.id);
                        document.getElementById('task-details-modal').classList.add('hidden');
                    } else {
                        window.showNotification('Cannot delete tasks while account is blocked', 'error');
                    }
                }
            });
        }
        
        const closeDetailsBtn = document.getElementById('close-details-btn');
        if (closeDetailsBtn) {
            closeDetailsBtn.addEventListener('click', () => {
                document.getElementById('task-details-modal').classList.add('hidden');
            });
        }
        
        // Calendar navigation
        const prevMonth = document.getElementById('prev-month');
        const nextMonth = document.getElementById('next-month');
        
        if (prevMonth) {
            prevMonth.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.renderCalendar();
            });
        }
        
        if (nextMonth) {
            nextMonth.addEventListener('click', () => {
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.renderCalendar();
            });
        }
        
        // Calendar day double-click for task creation
        const calendarDays = document.getElementById('calendar-days');
        if (calendarDays) {
            calendarDays.addEventListener('dblclick', (e) => {
                if (e.target.classList.contains('calendar-day') && e.target.dataset.day) {
                    if (window.authModule.canPerformTaskOperations()) {
                        const day = parseInt(e.target.dataset.day);
                        const month = this.currentDate.getMonth();
                        const year = this.currentDate.getFullYear();
                        const clickedDate = new Date(year, month, day);
                        
                        this.openTaskModal(null, clickedDate);
                    } else {
                        window.showNotification('Cannot create tasks while account is blocked', 'error');
                    }
                }
            });
        }
        
        // Search functionality
        const searchInput = document.getElementById('task-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value);
            });
        }
    },
    
    // Setup filter event listeners
    setupFilterListeners: function() {
        const filters = ['filter-user', 'filter-priority', 'filter-category', 'filter-status', 'filter-date-start', 'filter-date-end'];
        
        filters.forEach(filterId => {
            const filterElement = document.getElementById(filterId);
            if (filterElement) {
                filterElement.addEventListener('change', () => {
                    this.updateAllViews();
                });
            }
        });
    },
    
    // Setup view navigation
    setupViewNavigation: function() {
        const viewTabs = document.querySelectorAll('.view-tab');
        
        viewTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const view = tab.dataset.view;
                this.switchView(view);
                
                // Update active tab
                viewTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
    },
    
    // Setup sidebar toggle
    setupSidebarToggle: function() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }
    },
    
    // Switch between views
    switchView: function(view) {
        // Always cleanup kanban when leaving it
        if (this.currentView === 'kanban' && window.kanbanManager && typeof window.kanbanManager.cleanup === 'function') {
            window.kanbanManager.cleanup();
        }
        
        // Clean up any misplaced task cards from previous views
        this.cleanupMisplacedTaskCards();
        
        // Update current view
        const previousView = this.currentView;
        this.currentView = view;
        
        // Hide all view panels
        const viewPanels = document.querySelectorAll('.view-panel');
        viewPanels.forEach(panel => panel.classList.remove('active'));
        
        // Show selected view panel
        const targetPanel = document.getElementById(`${view}-view`);
        if (targetPanel) {
            targetPanel.classList.add('active');
        }
        
        // Only initialize kanban if we're actually switching TO kanban and it's not already initialized
        if (view === 'kanban' && previousView !== 'kanban' && window.kanbanManager) {
            // Small delay to ensure DOM is ready
            setTimeout(() => {
                window.kanbanManager.init();
                this.renderKanbanBoard();
            }, 50);
        } else if (view !== 'kanban') {
            // For non-kanban views, render immediately
            this.updateAllViews();
        }
    },
    
    // Clean up misplaced task cards from sidebar and other areas
    cleanupMisplacedTaskCards: function() {
        // Remove any task cards that may have leaked into the sidebar
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            const misplacedCards = sidebar.querySelectorAll('.task-card');
            misplacedCards.forEach(card => card.remove());
        }
        
        // Remove task cards from any non-kanban containers
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            // Only remove task cards that are direct children or in non-kanban areas
            const allTaskCards = mainContent.querySelectorAll('.task-card');
            allTaskCards.forEach(card => {
                const parentKanbanBoard = card.closest('#kanban-board');
                const parentViewPanel = card.closest('.view-panel');
                
                // Remove if not in kanban board or in inactive view panel
                if (!parentKanbanBoard || (parentViewPanel && !parentViewPanel.classList.contains('active'))) {
                    card.remove();
                }
            });
        }
    },
    
    // Open task modal for creating/editing
    openTaskModal: function(task = null, suggestedDate = null) {
        const modal = document.getElementById('task-modal');
        const modalTitle = document.getElementById('modal-title');
        const form = document.getElementById('task-form');
        
        if (task) {
            // Editing existing task
            modalTitle.textContent = 'Edit Task';
            this.currentTask = task;
            this.populateTaskForm(task);
        } else {
            // Creating new task
            modalTitle.textContent = 'Create New Task';
            this.currentTask = null;
            form.reset();
            
            // Set suggested date if provided
            if (suggestedDate) {
                const dateStr = suggestedDate.toISOString().split('T')[0];
                document.getElementById('task-due-date').value = dateStr;
            }
            
            // Set default start date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('task-start-date').value = today;
        }
        
        modal.classList.remove('hidden');
    },
    
    // Populate form with task data
    populateTaskForm: function(task) {
        document.getElementById('task-title').value = task.title || '';
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-priority').value = task.priority || 'medium';
        document.getElementById('task-category').value = task.category || 'development';
        document.getElementById('task-status').value = task.status || 'todo';
        
        // Handle dates
        if (task.startDate) {
            const startDate = new Date(task.startDate);
            document.getElementById('task-start-date').value = startDate.toISOString().split('T')[0];
        }
        
        if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            document.getElementById('task-due-date').value = dueDate.toISOString().split('T')[0];
        }
        
        // Handle assigned users
        const assignedUsersContainer = document.getElementById('task-assigned-users');
        if (assignedUsersContainer && task.assignedUsers) {
            const checkboxes = assignedUsersContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = task.assignedUsers.includes(checkbox.value);
            });
        }
    },
    
    // Handle task form submission
    handleTaskSubmit: async function() {
        const formData = this.getTaskFormData();
        
        if (!formData) return;
        
        try {
            if (this.currentTask) {
                // Update existing task
                await this.updateTask(this.currentTask.id, formData);
                window.showNotification('Task updated successfully!', 'success');
            } else {
                // Create new task
                await this.createTask(formData);
                window.showNotification('Task created successfully!', 'success');
            }
            
            // Close modal
            document.getElementById('task-modal').classList.add('hidden');
        } catch (error) {
            console.error('Error saving task:', error);
            window.showNotification('Error saving task', 'error');
        }
    },
    
    // Get form data
    getTaskFormData: function() {
        const title = document.getElementById('task-title').value.trim();
        const description = document.getElementById('task-description').value.trim();
        const priority = document.getElementById('task-priority').value;
        const category = document.getElementById('task-category').value;
        const status = document.getElementById('task-status').value;
        const startDate = document.getElementById('task-start-date').value;
        const dueDate = document.getElementById('task-due-date').value;
        
        if (!title || !dueDate) {
            window.showNotification('Please fill in all required fields', 'error');
            return null;
        }
        
        // Get assigned users
        const assignedUsers = [];
        const assignedUsersContainer = document.getElementById('task-assigned-users');
        if (assignedUsersContainer) {
            const checkedBoxes = assignedUsersContainer.querySelectorAll('input[type="checkbox"]:checked');
            checkedBoxes.forEach(checkbox => {
                assignedUsers.push(checkbox.value);
            });
        }
        
        return {
            title,
            description,
            priority,
            category,
            status,
            startDate: startDate ? new Date(startDate) : null,
            dueDate: new Date(dueDate),
            assignedUsers,
            assignedBy: window.auth.currentUser,
            updatedAt: new Date()
        };
    },
    
    // Create new task
    createTask: async function(taskData) {
        try {
            const docRef = await addDoc(collection(window.db, 'tasks'), {
                ...taskData,
                createdBy: window.auth.currentUser,
                createdAt: new Date(),
                blockedAt: null,
                blockedReason: ''
            });
            console.log('Task created with ID:', docRef.id);
        } catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    },
    
    // Update existing task
    updateTask: async function(taskId, taskData) {
        try {
            const taskRef = doc(window.db, 'tasks', taskId);
            await updateDoc(taskRef, taskData);
            console.log('Task updated:', taskId);
        } catch (error) {
            console.error('Error updating task:', error);
            throw error;
        }
    },
    
    // Update task status (used by drag & drop)
    updateTaskStatus: async function(taskId, newStatus) {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            const currentUser = window.auth?.currentUser;
            
            // Check if user can make this status change
            if (window.auth?.isBlocked && task) {
                const canMove = window.overdueManager?.canUserMoveBlockedTask(task, currentUser, newStatus);
                if (!canMove) {
                    throw new Error('Cannot move this task while account is blocked');
                }
            }
            
            const taskRef = doc(window.db, 'tasks', taskId);
            const updateData = {
                status: newStatus,
                updatedAt: new Date()
            };
            
            // Add special handling for completed tasks
            if (newStatus === 'completed') {
                updateData.completedAt = new Date();
                updateData.completedBy = window.auth.currentUser;
            }
            
            // Add special handling for paused tasks (useful for self-unblocking)
            if (newStatus === 'paused') {
                updateData.pausedAt = new Date();
                updateData.pausedBy = window.auth.currentUser;
            }
            
            await updateDoc(taskRef, updateData);
            console.log('Task status updated:', taskId, newStatus);
            
            // If this was a self-unblocking action, show notification
            if (window.auth?.isBlocked && task?.status === 'blocked' && 
                (newStatus === 'completed' || newStatus === 'paused')) {
                window.showNotification(
                    `Task "${task.title}" ${newStatus === 'completed' ? 'completed' : 'paused'}. Checking if account can be unblocked...`, 
                    'success'
                );
            }
        } catch (error) {
            console.error('Error updating task status:', error);
            throw error;
        }
    },
    
    // Delete task
    deleteTask: async function(taskId) {
        try {
            const taskRef = doc(window.db, 'tasks', taskId);
            await deleteDoc(taskRef);
            console.log('Task deleted:', taskId);
            window.showNotification('Task deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting task:', error);
            window.showNotification('Error deleting task', 'error');
        }
    },
    
    // Show task details modal
    showTaskDetails: function(task) {
        this.currentTask = task;
        const modal = document.getElementById('task-details-modal');
        const title = document.getElementById('details-modal-title');
        const content = document.getElementById('task-details-content');
        
        title.textContent = task.title;
        content.innerHTML = this.generateTaskDetailsHTML(task);
        
        modal.classList.remove('hidden');
    },
    
    // Generate task details HTML
    generateTaskDetailsHTML: function(task) {
        const createdDate = new Date(task.createdAt).toLocaleDateString();
        const dueDate = new Date(task.dueDate).toLocaleDateString();
        const startDate = task.startDate ? new Date(task.startDate).toLocaleDateString() : 'Not set';
        const assignedUsers = task.assignedUsers && task.assignedUsers.length > 0 ? 
            task.assignedUsers.join(', ') : 'Unassigned';
        
        let statusClass = `table-status ${task.status}`;
        let priorityClass = `task-priority ${task.priority}`;
        
        // Check if task is overdue
        const isOverdue = window.overdueManager ? window.overdueManager.isTaskOverdue(task) : false;
        const overdueInfo = isOverdue ? 
            `<div class="detail-row">
                <span class="detail-label">Overdue Status:</span>
                <span class="detail-value" style="color: #ef4444;">
                    ${window.overdueManager.formatOverdueMessage(task)}
                </span>
            </div>` : '';
        
        // Check if user can self-unblock with this task
        const currentUser = window.auth?.currentUser;
        const canSelfUnblock = window.auth?.isBlocked && 
            task.status === 'blocked' && 
            window.overdueManager?.canUserMoveBlockedTask(task, currentUser, 'completed');
        
        const selfUnblockInfo = canSelfUnblock ? 
            `<div class="detail-row">
                <span class="detail-label">Self-Unblocking:</span>
                <span class="detail-value" style="color: #10b981;">
                    ✓ You can resolve this task to help unblock your account
                </span>
            </div>` : '';
        
        return `
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">
                    <span class="${statusClass}">${this.formatStatus(task.status)}</span>
                </span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Priority:</span>
                <span class="detail-value">
                    <span class="${priorityClass}">${task.priority}</span>
                </span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Category:</span>
                <span class="detail-value">${task.category}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Created:</span>
                <span class="detail-value">${createdDate}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Start Date:</span>
                <span class="detail-value">${startDate}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Due Date:</span>
                <span class="detail-value">${dueDate}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Assigned To:</span>
                <span class="detail-value">${assignedUsers}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Created By:</span>
                <span class="detail-value">${task.createdBy || 'Unknown'}</span>
            </div>
            ${task.assignedBy ? `
            <div class="detail-row">
                <span class="detail-label">Assigned By:</span>
                <span class="detail-value">${task.assignedBy}</span>
            </div>` : ''}
            ${overdueInfo}
            ${selfUnblockInfo}
            ${task.description ? `
            <div class="detail-description">
                <h4>Description</h4>
                <p>${task.description}</p>
            </div>` : ''}
        `;
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
    
    // Check if user can modify a specific task (including self-unblocking scenarios)
    canUserModifyTask: function() {
        const currentUser = window.auth?.currentUser;
        
        // If user is not blocked, use normal permission check
        if (!window.auth?.isBlocked) {
            return window.authModule.canPerformTaskOperations();
        }
        
        // If user is blocked, check if they can modify this specific task for self-unblocking
        if (this.currentTask && window.overdueManager) {
            const newStatus = document.getElementById('task-status')?.value;
            
            // Allow modification if it's for self-unblocking (moving blocked task to paused/completed)
            if (this.currentTask.status === 'blocked' && 
                (newStatus === 'paused' || newStatus === 'completed')) {
                return window.overdueManager.canUserMoveBlockedTask(
                    this.currentTask, 
                    currentUser, 
                    newStatus
                );
            }
        }
        
        return false;
    },

    // Get filtered tasks based on current filters
    getFilteredTasks: function() {
        if (window.taskViews && typeof window.taskViews.getFilteredTasks === 'function') {
            return window.taskViews.getFilteredTasks(this.tasks);
        }
        return this.tasks;
    },
    
    // Render kanban board
    renderKanbanBoard: function() {
        if (window.kanbanManager && typeof window.kanbanManager.renderKanbanBoard === 'function') {
            const filteredTasks = this.getFilteredTasks();
            window.kanbanManager.renderKanbanBoard(filteredTasks);
        }
    },
    
    // Render calendar view
    renderCalendar: function() {
        const calendarDays = document.getElementById('calendar-days');
        const monthYearDisplay = document.getElementById('current-month-year');
        
        if (!calendarDays || !monthYearDisplay) return;
        
        // Update month/year display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        monthYearDisplay.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        
        // Clear existing days
        calendarDays.innerHTML = '';
        
        // Get first day of the month and number of days
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        // Generate calendar days
        const today = new Date();
        const filteredTasks = this.getFilteredTasks();
        
        for (let i = 0; i < 42; i++) {
            const currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.dataset.day = currentDay.getDate();
            
            // Add classes for styling
            if (currentDay.getMonth() !== this.currentDate.getMonth()) {
                dayElement.classList.add('other-month');
            }
            
            if (currentDay.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }
            
            // Get tasks for this day
            const dayTasks = filteredTasks.filter(task => {
                const taskDate = new Date(task.dueDate);
                return taskDate.toDateString() === currentDay.toDateString();
            });
            
            // Make calendar day a drop zone
            dayElement.dataset.date = currentDay.toISOString().split('T')[0];
            this.setupCalendarDropZone(dayElement);

            // Create day content
            dayElement.innerHTML = `
                <div class="day-number">${currentDay.getDate()}</div>
                <div class="day-tasks">
                    ${dayTasks.map(task => `
                        <div class="calendar-task ${task.priority ? 'priority-' + task.priority : ''} ${task.status ? 'status-' + task.status : ''}" 
                             data-task-id="${task.id}" 
                             title="${task.title}"
                             draggable="true">
                            ${task.title}
                        </div>
                    `).join('')}
                </div>
            `;
            
            calendarDays.appendChild(dayElement);
        }
        
        // Add click and drag listeners for calendar tasks
        const calendarTasks = calendarDays.querySelectorAll('.calendar-task');
        calendarTasks.forEach(taskElement => {
            // Click handler
            taskElement.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = e.target.dataset.taskId;
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    this.showTaskDetails(task);
                }
            });
            
            // Drag handlers
            this.setupCalendarTaskDrag(taskElement);
        });
    },
    
    // Setup drag and drop for calendar tasks
    setupCalendarTaskDrag: function(taskElement) {
        taskElement.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', e.target.dataset.taskId);
            e.dataTransfer.effectAllowed = 'move';
            e.target.style.opacity = '0.5';
        });
        
        taskElement.addEventListener('dragend', (e) => {
            e.target.style.opacity = '';
        });
    },
    
    // Setup drop zone for calendar days
    setupCalendarDropZone: function(dayElement) {
        dayElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            dayElement.classList.add('calendar-drop-active');
        });
        
        dayElement.addEventListener('dragleave', (e) => {
            if (!dayElement.contains(e.relatedTarget)) {
                dayElement.classList.remove('calendar-drop-active');
            }
        });
        
        dayElement.addEventListener('drop', (e) => {
            e.preventDefault();
            dayElement.classList.remove('calendar-drop-active');
            
            const taskId = e.dataTransfer.getData('text/plain');
            const newDate = dayElement.dataset.date;
            
            if (taskId && newDate) {
                this.updateTaskDate(taskId, newDate);
            }
        });
    },
    
    // Update task due date
    updateTaskDate: async function(taskId, newDateString) {
        try {
            const task = this.tasks.find(t => t.id === taskId);
            if (!task) {
                throw new Error('Task not found');
            }
            
            // Check if user can modify this task
            const currentUser = window.auth?.currentUser;
            if (window.auth?.isBlocked && task) {
                const canMove = window.overdueManager?.canUserMoveBlockedTask(task, currentUser, task.status);
                if (!canMove) {
                    window.showNotification('Cannot move this task while account is blocked', 'error');
                    return;
                }
            }
            
            const newDate = new Date(newDateString + 'T00:00:00');
            const oldDate = new Date(task.dueDate);
            
            // Update task in Firestore
            const taskRef = doc(window.db, 'tasks', taskId);
            const updateData = {
                dueDate: newDate,
                updatedAt: new Date(),
                updatedBy: currentUser
            };
            
            await updateDoc(taskRef, updateData);
            
            // Show success notification
            const formatDate = (date) => date.toLocaleDateString();
            window.showNotification(
                `Task "${task.title}" moved from ${formatDate(oldDate)} to ${formatDate(newDate)}`, 
                'success'
            );
            
            console.log('Task date updated:', taskId, newDateString);
            
        } catch (error) {
            console.error('Error updating task date:', error);
            window.showNotification(`Error moving task: ${error.message}`, 'error');
        }
    },

    // Update task statistics
    updateTaskStats: function() {
        const filteredTasks = this.getFilteredTasks();
        const currentUser = window.auth?.currentUser;
        
        // Calculate basic stats
        const totalTasks = filteredTasks.length;
        const completedTasks = filteredTasks.filter(task => task.status === 'completed').length;
        const inProgressTasks = filteredTasks.filter(task => task.status === 'in-progress').length;
        
        // Calculate overdue tasks
        let overdueTasks = 0;
        if (window.overdueManager) {
            overdueTasks = filteredTasks.filter(task => 
                window.overdueManager.isTaskOverdue(task) && task.status !== 'completed'
            ).length;
        }
        
        // Update display
        document.getElementById('total-tasks').textContent = totalTasks;
        document.getElementById('completed-tasks').textContent = completedTasks;
        document.getElementById('pending-tasks').textContent = inProgressTasks;
        document.getElementById('overdue-tasks').textContent = overdueTasks;
        
        // Update overdue tasks color based on count
        const overdueElement = document.getElementById('overdue-tasks');
        if (overdueElement) {
            if (overdueTasks > 0) {
                overdueElement.style.color = '#ef4444';
            } else {
                overdueElement.style.color = '#3b82f6';
            }
        }
    },
    
    // Perform search
    performSearch: function(searchTerm = '') {
        const searchInput = document.getElementById('task-search');
        const currentSearchTerm = searchTerm || (searchInput ? searchInput.value : '');
        
        if (!currentSearchTerm.trim()) {
            // No search term, show all filtered tasks
            this.updateAllViews();
            return;
        }
        
        // Filter tasks based on search term
        const searchResults = this.tasks.filter(task => {
            const searchFields = [
                task.title,
                task.description,
                task.category,
                task.priority,
                task.status,
                ...(task.assignedUsers || [])
            ];
            
            return searchFields.some(field => 
                field && field.toLowerCase().includes(currentSearchTerm.toLowerCase())
            );
        });
        
        // Update current view with search results
        if (this.currentView === 'kanban' && window.kanbanManager) {
            window.kanbanManager.renderKanbanBoard(searchResults);
        }
        // Add other view search handling as needed
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize after auth is ready
    const checkAuth = () => {
        if (window.auth && window.auth.isAuthenticated) {
            window.taskManager.init();
        } else {
            setTimeout(checkAuth, 500);
        }
    };
    checkAuth();
});

export default window.taskManager;
