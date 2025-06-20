// overdue-manager.js - Enhanced Overdue Task Management with Business Day Calculation
import { updateDoc, doc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

window.overdueManager = {
    gracePeriodDays: 2, // Business days
    lastProcessedDate: null,
    
    // Calculate business days between two dates (excluding weekends)
    calculateBusinessDays: function(startDate, endDate) {
        let count = 0;
        const curDate = new Date(startDate);
        
        while (curDate <= endDate) {
            const dayOfWeek = curDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
                count++;
            }
            curDate.setDate(curDate.getDate() + 1);
        }
        
        return count;
    },
    
    // Add business days to a date
    addBusinessDays: function(date, days) {
        const result = new Date(date);
        let addedDays = 0;
        
        while (addedDays < days) {
            result.setDate(result.getDate() + 1);
            const dayOfWeek = result.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not weekend
                addedDays++;
            }
        }
        
        return result;
    },
    
    // Check if a task is overdue (past due date)
    isTaskOverdue: function(task) {
        const now = new Date();
        const dueDate = new Date(task.dueDate);
        now.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        return now > dueDate;
    },
    
    // Check if a task is within grace period
    isTaskInGracePeriod: function(task) {
        if (!this.isTaskOverdue(task)) return false;
        
        const now = new Date();
        const dueDate = new Date(task.dueDate);
        const gracePeriodEnd = this.addBusinessDays(dueDate, this.gracePeriodDays);
        
        now.setHours(0, 0, 0, 0);
        gracePeriodEnd.setHours(0, 0, 0, 0);
        
        return now <= gracePeriodEnd;
    },
    
    // Check if a task should be blocked (overdue and past grace period)
    shouldTaskBeBlocked: function(task) {
        if (!this.isTaskOverdue(task)) return false;
        if (task.status === 'completed') return false;
        if (task.status === 'blocked') return true; // Already blocked
        
        return !this.isTaskInGracePeriod(task);
    },
    
    // Process all overdue tasks and update statuses
    processOverdueTasks: async function(tasks) {
        if (!tasks || !Array.isArray(tasks)) return;
        
        const currentUser = window.auth?.currentUser;
        if (!currentUser) return;
        
        const userBlockedTasks = [];
        const tasksToUpdate = [];
        
        for (const task of tasks) {
            if (this.shouldTaskBeBlocked(task) && task.status !== 'blocked') {
                // Move task to blocked status
                tasksToUpdate.push({
                    id: task.id,
                    status: 'blocked',
                    blockedAt: new Date().toISOString(),
                    blockedReason: 'Overdue task moved to blocked status after grace period'
                });
                
                // Check if this affects the current user
                if (task.assignedUsers && task.assignedUsers.includes(currentUser)) {
                    userBlockedTasks.push(task);
                }
            }
        }
        
        // Update tasks in Firestore
        for (const taskUpdate of tasksToUpdate) {
            try {
                const taskRef = doc(window.db, 'tasks', taskUpdate.id);
                await updateDoc(taskRef, {
                    status: taskUpdate.status,
                    blockedAt: taskUpdate.blockedAt,
                    blockedReason: taskUpdate.blockedReason,
                    updatedAt: new Date().toISOString()
                });
                console.log(`Task ${taskUpdate.id} moved to blocked status`);
            } catch (error) {
                console.error(`Error updating task ${taskUpdate.id}:`, error);
            }
        }
        
        // Check if current user should be blocked
        const userHasBlockedTasks = this.getUserBlockedTasks(tasks, currentUser).length > 0;
        const userCurrentlyBlocked = window.auth?.isBlocked || false;
        
        if (userHasBlockedTasks && !userCurrentlyBlocked) {
            // Block the user
            const blockedTaskCount = this.getUserBlockedTasks(tasks, currentUser).length;
            const reason = `You have ${blockedTaskCount} overdue task${blockedTaskCount > 1 ? 's' : ''} that require immediate attention.`;
            
            await window.authModule.updateUserBlockingStatus(currentUser, true, reason);
            console.log(`User ${currentUser} has been blocked due to overdue tasks`);
        } else if (!userHasBlockedTasks && userCurrentlyBlocked) {
            // Unblock the user
            await window.authModule.updateUserBlockingStatus(currentUser, false, '');
            console.log(`User ${currentUser} has been unblocked - no more overdue tasks`);
        }
    },
    
    // Get all blocked tasks for a specific user
    getUserBlockedTasks: function(tasks, username) {
        if (!tasks || !username) return [];
        
        return tasks.filter(task => {
            return task.status === 'blocked' && 
                   task.assignedUsers && 
                   task.assignedUsers.includes(username);
        });
    },
    
    // Check if user can move a task from blocked/paused status
    canUserMoveBlockedTask: function(task, currentUser, newStatus = null) {
        if (!task || !currentUser) return false;
        
        // If the task is not blocked or paused, anyone assigned can move it
        if (task.status !== 'blocked' && task.status !== 'paused') {
            return task.assignedUsers && task.assignedUsers.includes(currentUser);
        }
        
        // For self-unblocking: if user is assigned to a blocked task, they can move it to paused or completed
        if (task.status === 'blocked' && task.assignedUsers && task.assignedUsers.includes(currentUser)) {
            // Allow moving blocked tasks to paused or completed for self-unblocking
            if (newStatus === 'paused' || newStatus === 'completed') {
                return true;
            }
            // Don't allow moving blocked tasks back to todo or in-progress without completing them first
            return false;
        }
        
        // For blocked/paused tasks, check if user created it or was assigned by someone else
        if (task.createdBy === currentUser) {
            // User created the task, they can move it to paused or completed
            return task.status === 'blocked' ? 
                ['paused', 'completed'].includes(newStatus) : 
                true;
        }
        
        // If task was assigned by someone else and is in blocked status
        if (task.status === 'blocked' && task.assignedBy && task.assignedBy !== currentUser) {
            // Allow self-unblocking by moving to paused or completed
            if (task.assignedUsers && task.assignedUsers.includes(currentUser) && 
                (newStatus === 'paused' || newStatus === 'completed')) {
                return true;
            }
            return false;
        }
        
        // If task is in paused status and was assigned by someone else
        if (task.status === 'paused' && task.assignedBy && task.assignedBy !== currentUser) {
            // User can move their own paused tasks
            if (task.assignedUsers && task.assignedUsers.includes(currentUser)) {
                return true;
            }
            return false;
        }
        
        return true;
    },

    // Check if user can unblock themselves
    canUserUnblockSelf: function(tasks, username) {
        if (!tasks || !username) return false;
        
        const userBlockedTasks = this.getUserBlockedTasks(tasks, username);
        
        // User can unblock themselves if they have blocked tasks that they can resolve
        return userBlockedTasks.some(task => 
            this.canUserMoveBlockedTask(task, username, 'completed') ||
            this.canUserMoveBlockedTask(task, username, 'paused')
        );
    },

    // Get self-unblocking instructions for user
    getSelfUnblockingInstructions: function(tasks, username) {
        if (!tasks || !username) return '';
        
        const userBlockedTasks = this.getUserBlockedTasks(tasks, username);
        const resolvableTasks = userBlockedTasks.filter(task => 
            this.canUserMoveBlockedTask(task, username, 'completed') ||
            this.canUserMoveBlockedTask(task, username, 'paused')
        );
        
        if (resolvableTasks.length === 0) {
            return 'You cannot unblock yourself. Please contact your task assigner.';
        }
        
        const taskTitles = resolvableTasks.slice(0, 3).map(task => `"${task.title}"`).join(', ');
        const remaining = resolvableTasks.length > 3 ? ` and ${resolvableTasks.length - 3} more` : '';
        
        return `To unblock your account, mark the following tasks as completed or paused: ${taskTitles}${remaining}.`;
    },
    
    // Get overdue task summary for a user
    getUserOverdueSummary: function(tasks, username) {
        if (!tasks || !username) return { overdue: 0, inGrace: 0, blocked: 0 };
        
        const userTasks = tasks.filter(task => 
            task.assignedUsers && task.assignedUsers.includes(username) && task.status !== 'completed'
        );
        
        let overdue = 0;
        let inGrace = 0;
        let blocked = 0;
        
        for (const task of userTasks) {
            if (task.status === 'blocked') {
                blocked++;
            } else if (this.isTaskOverdue(task)) {
                if (this.isTaskInGracePeriod(task)) {
                    inGrace++;
                } else {
                    overdue++;
                }
            }
        }
        
        return { overdue, inGrace, blocked };
    },
    
    // Initialize overdue monitoring
    init: function() {
        console.log('Overdue manager initialized');
        
        // Run initial check after a short delay to ensure tasks are loaded
        setTimeout(() => {
            if (window.taskManager && window.taskManager.tasks) {
                this.processOverdueTasks(window.taskManager.tasks);
            }
        }, 2000);
        
        // Set up periodic checking (every 10 minutes)
        setInterval(() => {
            if (window.taskManager && window.taskManager.tasks) {
                this.processOverdueTasks(window.taskManager.tasks);
            }
        }, 10 * 60 * 1000); // 10 minutes
    },
    
    // Format overdue notification message
    formatOverdueMessage: function(task) {
        const now = new Date();
        const dueDate = new Date(task.dueDate);
        const businessDaysOverdue = this.calculateBusinessDays(dueDate, now);
        
        if (this.isTaskInGracePeriod(task)) {
            const gracePeriodEnd = this.addBusinessDays(dueDate, this.gracePeriodDays);
            const businessDaysLeft = this.calculateBusinessDays(now, gracePeriodEnd);
            return `Task "${task.title}" is overdue by ${businessDaysOverdue} business day${businessDaysOverdue !== 1 ? 's' : ''}. Grace period ends in ${businessDaysLeft} business day${businessDaysLeft !== 1 ? 's' : ''}.`;
        } else {
            return `Task "${task.title}" is overdue by ${businessDaysOverdue} business day${businessDaysOverdue !== 1 ? 's' : ''} and has been moved to blocked status.`;
        }
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize after other modules are loaded
    setTimeout(() => {
        window.overdueManager.init();
    }, 1000);
});

export default window.overdueManager;
