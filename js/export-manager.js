// export-manager.js - Enhanced Excel Export with View-Specific Data and Multi-Sheet Support
window.exportManager = {
    // Initialize export functionality
    init: function() {
        console.log('Initializing export manager...');
        this.setupExportListeners();
    },

    // Setup export event listeners
    setupExportListeners: function() {
        const exportBtn = document.getElementById('export-excel-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportCurrentView();
            });
        }
    },

    // Export current view data to Excel
    exportCurrentView: function() {
        if (!window.taskViews) {
            window.showNotification('Export functionality not available', 'error');
            return;
        }

        try {
            window.showNotification('Preparing export...', 'info');
            
            // Get current view data
            const viewData = window.taskViews.getCurrentViewData();
            
            if (viewData.tasks.length === 0) {
                window.showNotification('No data to export in current view', 'warning');
                return;
            }

            // Create workbook
            const workbook = XLSX.utils.book_new();
            
            // Add multiple sheets based on view type
            this.addTaskDataSheet(workbook, viewData);
            this.addSummarySheet(workbook, viewData);
            this.addAnalyticsSheet(workbook, viewData);
            
            // Generate filename with timestamp and view type
            const timestamp = new Date().toISOString().split('T')[0];
            const viewType = viewData.type.charAt(0).toUpperCase() + viewData.type.slice(1);
            const filename = `TaskManager_${viewType}_${viewData.period.replace(/[^\w\s-]/g, '')}_${timestamp}.xlsx`;
            
            // Write and download file
            XLSX.writeFile(workbook, filename);
            
            window.showNotification(`Data exported successfully as ${filename}`, 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            window.showNotification('Error exporting data', 'error');
        }
    },

    // Add main task data sheet
    addTaskDataSheet: function(workbook, viewData) {
        const { tasks, period, type } = viewData;
        
        // Prepare task data for export
        const exportData = tasks.map(task => {
            const dueDate = new Date(task.dueDate);
            const startDate = task.startDate ? new Date(task.startDate) : null;
            const createdDate = new Date(task.createdAt);
            const today = new Date();
            
            // Calculate days remaining
            const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            // Check overdue status
            const isOverdue = window.overdueManager ? window.overdueManager.isTaskOverdue(task) : false;
            const isInGrace = window.overdueManager ? window.overdueManager.isTaskInGracePeriod(task) : false;
            
            return {
                'Task ID': task.id,
                'Title': task.title,
                'Description': task.description || '',
                'Status': this.formatStatus(task.status),
                'Priority': task.priority,
                'Category': task.category,
                'Created By': task.createdBy || '',
                'Assigned To': task.assignedUsers ? task.assignedUsers.join(', ') : 'Unassigned',
                'Assigned By': task.assignedBy || '',
                'Created Date': createdDate.toLocaleDateString(),
                'Start Date': startDate ? startDate.toLocaleDateString() : '',
                'Due Date': dueDate.toLocaleDateString(),
                'Days Remaining': daysRemaining,
                'Is Overdue': isOverdue ? 'Yes' : 'No',
                'In Grace Period': isInGrace ? 'Yes' : 'No',
                'Progress': this.getTaskProgress(task.status),
                'Blocked At': task.blockedAt ? new Date(task.blockedAt).toLocaleDateString() : '',
                'Blocked Reason': task.blockedReason || '',
                'Completed At': task.completedAt ? new Date(task.completedAt).toLocaleDateString() : '',
                'Completed By': task.completedBy || ''
            };
        });

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        
        // Set column widths for better readability
        const colWidths = [
            { wch: 15 }, // Task ID
            { wch: 30 }, // Title
            { wch: 50 }, // Description
            { wch: 12 }, // Status
            { wch: 10 }, // Priority
            { wch: 15 }, // Category
            { wch: 15 }, // Created By
            { wch: 20 }, // Assigned To
            { wch: 15 }, // Assigned By
            { wch: 12 }, // Created Date
            { wch: 12 }, // Start Date
            { wch: 12 }, // Due Date
            { wch: 15 }, // Days Remaining
            { wch: 12 }, // Is Overdue
            { wch: 15 }, // In Grace Period
            { wch: 10 }, // Progress
            { wch: 12 }, // Blocked At
            { wch: 30 }, // Blocked Reason
            { wch: 12 }, // Completed At
            { wch: 15 }  // Completed By
        ];
        worksheet['!cols'] = colWidths;
        
        // Add conditional formatting for overdue tasks
        this.addConditionalFormatting(worksheet, exportData.length);
        
        // Add sheet to workbook
        const sheetName = `${type.charAt(0).toUpperCase() + type.slice(1)} Tasks`;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    },

    // Add summary analytics sheet
    addSummarySheet: function(workbook, viewData) {
        const { tasks, period, type } = viewData;
        
        // Calculate comprehensive analytics
        const analytics = this.calculateDetailedAnalytics(tasks);
        
        // Create summary data
        const summaryData = [
            ['TASK MANAGEMENT SUMMARY', ''],
            ['Report Period:', period],
            ['Report Type:', type.charAt(0).toUpperCase() + type.slice(1)],
            ['Generated On:', new Date().toLocaleDateString()],
            ['Generated By:', window.auth?.currentUser || 'Unknown'],
            ['', ''],
            
            ['OVERALL STATISTICS', ''],
            ['Total Tasks:', analytics.total],
            ['Completed Tasks:', analytics.completed],
            ['In Progress Tasks:', analytics.inProgress],
            ['Blocked Tasks:', analytics.blocked],
            ['Paused Tasks:', analytics.paused],
            ['To Do Tasks:', analytics.todo],
            ['Overdue Tasks:', analytics.overdue],
            ['Completion Rate:', `${analytics.completionRate}%`],
            ['', ''],
            
            ['PRIORITY BREAKDOWN', ''],
            ['Urgent Priority:', analytics.byPriority.urgent || 0],
            ['High Priority:', analytics.byPriority.high || 0],
            ['Medium Priority:', analytics.byPriority.medium || 0],
            ['Low Priority:', analytics.byPriority.low || 0],
            ['', ''],
            
            ['CATEGORY BREAKDOWN', ''],
            ...Object.entries(analytics.byCategory).map(([category, count]) => [category, count]),
            ['', ''],
            
            ['USER WORKLOAD', ''],
            ...Object.entries(analytics.byUser).map(([user, count]) => [user, count]),
            ['', ''],
            
            ['TIME ANALYSIS', ''],
            ['Due This Week:', analytics.dueThisWeek],
            ['Due Next Week:', analytics.dueNextWeek],
            ['Due This Month:', analytics.dueThisMonth],
            ['Past Due:', analytics.overdue]
        ];

        // Create worksheet
        const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Set column widths
        summaryWorksheet['!cols'] = [
            { wch: 25 },
            { wch: 15 }
        ];
        
        // Add sheet to workbook
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
    },

    // Add detailed analytics sheet
    addAnalyticsSheet: function(workbook, viewData) {
        const { tasks } = viewData;
        
        // User performance analytics
        const userAnalytics = this.calculateUserPerformance(tasks);
        
        // Create analytics data
        const analyticsData = [
            ['USER PERFORMANCE ANALYTICS', '', '', '', ''],
            ['User', 'Total Tasks', 'Completed', 'Overdue', 'Completion Rate'],
            ...userAnalytics.map(user => [
                user.name,
                user.total,
                user.completed,
                user.overdue,
                `${user.completionRate}%`
            ]),
            ['', '', '', '', ''],
            
            ['TASK LIFECYCLE ANALYSIS', '', '', '', ''],
            ['Status', 'Count', 'Percentage', 'Avg Days', 'Notes'],
            ...this.getTaskLifecycleAnalysis(tasks)
        ];

        // Create worksheet
        const analyticsWorksheet = XLSX.utils.aoa_to_sheet(analyticsData);
        
        // Set column widths
        analyticsWorksheet['!cols'] = [
            { wch: 20 },
            { wch: 12 },
            { wch: 12 },
            { wch: 12 },
            { wch: 15 }
        ];
        
        // Add sheet to workbook
        XLSX.utils.book_append_sheet(workbook, analyticsWorksheet, 'Analytics');
    },

    // Calculate detailed analytics for export
    calculateDetailedAnalytics: function(tasks) {
        const analytics = {
            total: tasks.length,
            completed: 0,
            inProgress: 0,
            blocked: 0,
            paused: 0,
            todo: 0,
            overdue: 0,
            dueThisWeek: 0,
            dueNextWeek: 0,
            dueThisMonth: 0,
            byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
            byCategory: {},
            byUser: {},
            completionRate: 0
        };

        const today = new Date();
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        const twoWeeksFromNow = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
        const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

        tasks.forEach(task => {
            // Status counts
            const status = task.status || 'todo';
            analytics[status] = (analytics[status] || 0) + 1;

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

            // Date-based analysis
            const dueDate = new Date(task.dueDate);
            
            if (window.overdueManager && window.overdueManager.isTaskOverdue(task) && task.status !== 'completed') {
                analytics.overdue++;
            }

            if (dueDate >= today && dueDate <= weekFromNow) {
                analytics.dueThisWeek++;
            } else if (dueDate > weekFromNow && dueDate <= twoWeeksFromNow) {
                analytics.dueNextWeek++;
            }

            if (dueDate >= today && dueDate <= monthFromNow) {
                analytics.dueThisMonth++;
            }
        });

        // Calculate completion rate
        analytics.completionRate = tasks.length > 0 ? 
            Math.round((analytics.completed / tasks.length) * 100) : 0;

        return analytics;
    },

    // Calculate user performance metrics
    calculateUserPerformance: function(tasks) {
        const userStats = {};
        
        tasks.forEach(task => {
            if (task.assignedUsers) {
                task.assignedUsers.forEach(user => {
                    if (!userStats[user]) {
                        userStats[user] = {
                            name: user,
                            total: 0,
                            completed: 0,
                            overdue: 0,
                            completionRate: 0
                        };
                    }
                    
                    userStats[user].total++;
                    
                    if (task.status === 'completed') {
                        userStats[user].completed++;
                    }
                    
                    if (window.overdueManager && window.overdueManager.isTaskOverdue(task) && task.status !== 'completed') {
                        userStats[user].overdue++;
                    }
                });
            }
        });

        // Calculate completion rates
        Object.values(userStats).forEach(user => {
            user.completionRate = user.total > 0 ? 
                Math.round((user.completed / user.total) * 100) : 0;
        });

        return Object.values(userStats).sort((a, b) => b.completionRate - a.completionRate);
    },

    // Get task lifecycle analysis
    getTaskLifecycleAnalysis: function(tasks) {
        const statusCounts = {
            'todo': { count: 0, avgDays: 0 },
            'in-progress': { count: 0, avgDays: 0 },
            'blocked': { count: 0, avgDays: 0 },
            'paused': { count: 0, avgDays: 0 },
            'completed': { count: 0, avgDays: 0 }
        };

        const today = new Date();

        tasks.forEach(task => {
            const status = task.status || 'todo';
            statusCounts[status].count++;
            
            // Calculate average days (rough estimate based on creation date)
            const createdDate = new Date(task.createdAt);
            const daysSinceCreation = Math.ceil((today - createdDate) / (1000 * 60 * 60 * 24));
            statusCounts[status].avgDays += daysSinceCreation;
        });

        // Calculate averages and format for export
        return Object.entries(statusCounts).map(([status, data]) => {
            const avgDays = data.count > 0 ? Math.round(data.avgDays / data.count) : 0;
            const percentage = tasks.length > 0 ? Math.round((data.count / tasks.length) * 100) : 0;
            
            return [
                this.formatStatus(status),
                data.count,
                `${percentage}%`,
                avgDays,
                this.getStatusNotes(status, data.count, avgDays)
            ];
        });
    },

    // Get notes for status analysis
    getStatusNotes: function(status, count, avgDays) {
        switch (status) {
            case 'todo':
                return count > 0 ? 'Backlog items awaiting start' : 'No pending tasks';
            case 'in-progress':
                return avgDays > 7 ? 'Some tasks may need attention' : 'Active development';
            case 'blocked':
                return count > 0 ? 'Requires immediate resolution' : 'No blocked items';
            case 'paused':
                return count > 0 ? 'On hold - check priority' : 'No paused items';
            case 'completed':
                return `Average completion time: ${avgDays} days`;
            default:
                return '';
        }
    },

    // Add conditional formatting to worksheet
    addConditionalFormatting: function(worksheet, rowCount) {
        // This is a simplified version - full conditional formatting would require more complex XLSX formatting
        // For now, we'll just ensure proper data types
        const range = XLSX.utils.encode_range({
            s: { c: 0, r: 1 },
            e: { c: 19, r: rowCount }
        });
        worksheet['!ref'] = range;
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

    // Get task progress percentage
    getTaskProgress: function(status) {
        const progressMap = {
            'todo': '0%',
            'in-progress': '50%',
            'paused': '25%',
            'blocked': '0%',
            'completed': '100%'
        };
        return progressMap[status] || '0%';
    },

    // Export filtered tasks (for custom exports)
    exportFilteredTasks: function(tasks, filename = 'filtered_tasks.xlsx') {
        try {
            const workbook = XLSX.utils.book_new();
            
            const viewData = {
                tasks: tasks,
                period: 'Custom Filter',
                type: 'filtered'
            };
            
            this.addTaskDataSheet(workbook, viewData);
            this.addSummarySheet(workbook, viewData);
            
            XLSX.writeFile(workbook, filename);
            window.showNotification(`Filtered data exported as ${filename}`, 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            window.showNotification('Error exporting filtered data', 'error');
        }
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.exportManager.init();
});

export default window.exportManager;
