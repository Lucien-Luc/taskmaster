/**
 * Test script for Due Tasks Warning System
 * This helps test the warning system by creating sample due tasks
 */

window.testDueWarning = {
    
    // Create a test task due today
    createTestDueTask: async function() {
        if (!window.taskManager || !window.auth?.currentUser) {
            console.log('Please log in first to test the due warning system');
            return;
        }

        const today = new Date();
        const testTask = {
            title: 'Test Task Due Today',
            description: 'This is a test task created to verify the due tasks warning system',
            dueDate: today,
            priority: 'high',
            category: 'testing',
            status: 'todo',
            assignedUsers: [window.auth.currentUser],
            createdAt: new Date(),
            createdBy: window.auth.currentUser
        };

        try {
            await window.taskManager.createTask(testTask);
            console.log('Test task created successfully');
            
            // Force show warning after a short delay
            setTimeout(() => {
                this.forceShowWarning();
            }, 2000);
            
        } catch (error) {
            console.error('Error creating test task:', error);
        }
    },

    // Force show the warning (removes localStorage flag)
    forceShowWarning: function() {
        if (window.dueTasksWarning) {
            localStorage.removeItem('dueTasksWarningShown');
            window.dueTasksWarning.checkAndShowDueTasksWarning();
        } else {
            console.log('Due tasks warning system not loaded');
        }
    },

    // Clean up test tasks
    cleanupTestTasks: async function() {
        if (!window.taskManager?.tasks) {
            console.log('No tasks available to clean up');
            return;
        }

        const testTasks = window.taskManager.tasks.filter(task => 
            task.title.includes('Test Task Due Today')
        );

        for (const task of testTasks) {
            try {
                await window.taskManager.deleteTask(task.id);
                console.log('Deleted test task:', task.title);
            } catch (error) {
                console.error('Error deleting test task:', error);
            }
        }
    }
};

// Add console shortcuts for easy testing
console.log('Due Tasks Warning Test Functions Available:');
console.log('- testDueWarning.createTestDueTask() - Creates a test task due today');
console.log('- testDueWarning.forceShowWarning() - Force shows the warning');
console.log('- testDueWarning.cleanupTestTasks() - Removes test tasks');