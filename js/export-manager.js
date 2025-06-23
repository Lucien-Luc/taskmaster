// export-manager.js - Enhanced Excel Export with Visual Formatting and Filtered Data
window.exportManager = {
    // Initialize export functionality
    init: function() {
        console.log('Initializing export manager...');
        this.setupExportListeners();
    },

    // Setup export event listeners
    setupExportListeners: function() {
        // Setup export dropdown using the same pattern as filters
        this.setupExportDropdown();
    },

    // Setup export dropdown functionality
    setupExportDropdown: function() {
        const initDropdown = () => {
            const exportToggle = document.getElementById('export-toggle');
            const exportPanel = document.getElementById('export-panel');
            
            if (exportToggle && exportPanel) {
                // Remove any existing listeners to prevent conflicts
                const newToggle = exportToggle.cloneNode(true);
                exportToggle.parentNode.replaceChild(newToggle, exportToggle);
                
                newToggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const isHidden = exportPanel.classList.contains('hidden');
                    
                    if (isHidden) {
                        exportPanel.classList.remove('hidden');
                        newToggle.classList.add('active');
                    } else {
                        exportPanel.classList.add('hidden');
                        newToggle.classList.remove('active');
                    }
                });

                // Close dropdown when clicking outside
                document.addEventListener('click', function(e) {
                    if (!newToggle.contains(e.target) && !exportPanel.contains(e.target)) {
                        exportPanel.classList.add('hidden');
                        newToggle.classList.remove('active');
                    }
                });

                // Re-setup export option listeners after cloning
                const exportExcelBtn = exportPanel.querySelector('#export-excel-btn');
                const exportPdfBtn = exportPanel.querySelector('#export-pdf-btn');
                
                if (exportExcelBtn) {
                    exportExcelBtn.addEventListener('click', () => {
                        exportPanel.classList.add('hidden');
                        newToggle.classList.remove('active');
                        window.exportManager.exportCurrentView();
                    });
                }
                
                if (exportPdfBtn) {
                    exportPdfBtn.addEventListener('click', () => {
                        exportPanel.classList.add('hidden');
                        newToggle.classList.remove('active');
                        window.exportManager.exportPDFReport();
                    });
                }
            }
        };

        // Try immediate setup and also on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initDropdown);
        } else {
            initDropdown();
        }
        
        // Also try with a delay as fallback
        setTimeout(initDropdown, 500);
    },

    // Export current view data to Excel with enhanced formatting
    exportCurrentView: function() {
        if (!window.taskViews) {
            window.showNotification('Export functionality not available', 'error');
            return;
        }

        try {
            window.showNotification('Preparing enhanced export...', 'info');
            
            // Get current view data (filtered)
            const viewData = window.taskViews.getCurrentViewData();
            
            if (viewData.tasks.length === 0) {
                window.showNotification('No data to export in current view', 'warning');
                return;
            }

            // Create workbook
            const workbook = XLSX.utils.book_new();
            
            // Add multiple sheets with enhanced formatting
            this.addTaskDataSheet(workbook, viewData);
            this.addSummarySheet(workbook, viewData);
            this.addAnalyticsSheet(workbook, viewData);
            
            // Generate filename with timestamp and view type
            const timestamp = new Date().toISOString().split('T')[0];
            const viewType = viewData.type.charAt(0).toUpperCase() + viewData.type.slice(1);
            const filename = `TaskManager_${viewType}_${viewData.period.replace(/[^\w\s-]/g, '')}_${timestamp}.xlsx`;
            
            // Write and download file
            XLSX.writeFile(workbook, filename);
            
            window.showNotification(`Enhanced report exported as ${filename}`, 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            window.showNotification('Error exporting data', 'error');
        }
    },

    // Add main task data sheet with enhanced formatting
    addTaskDataSheet: function(workbook, viewData) {
        const { tasks, period, type } = viewData;
        
        // Prepare task data for export with enhanced formatting
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
                'Priority': task.priority ? task.priority.toUpperCase() : 'MEDIUM',
                'Category': task.category || 'General',
                'Created By': task.createdBy || '',
                'Assigned To': task.assignedUsers ? task.assignedUsers.join(', ') : 'Unassigned',
                'Assigned By': task.assignedBy || '',
                'Created Date': createdDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: '2-digit' 
                }),
                'Start Date': startDate ? startDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: '2-digit' 
                }) : '',
                'Due Date': dueDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: '2-digit' 
                }),
                'Days Remaining': daysRemaining,
                'Is Overdue': isOverdue ? '⚠️ YES' : '✓ NO',
                'In Grace Period': isInGrace ? '⏱️ YES' : 'NO',
                'Progress': this.getTaskProgress(task.status),
                'Blocked At': task.blockedAt ? new Date(task.blockedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: '2-digit' 
                }) : '',
                'Blocked Reason': task.blockedReason || '',
                'Completed At': task.completedAt ? new Date(task.completedAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: '2-digit' 
                }) : '',
                'Completed By': task.completedBy || ''
            };
        });

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        
        // Enhanced header formatting
        this.formatHeaders(worksheet, exportData.length);
        
        // Set column widths for better readability
        const colWidths = [
            { wch: 18 }, // Task ID
            { wch: 35 }, // Title
            { wch: 60 }, // Description
            { wch: 15 }, // Status
            { wch: 12 }, // Priority
            { wch: 18 }, // Category
            { wch: 18 }, // Created By
            { wch: 25 }, // Assigned To
            { wch: 18 }, // Assigned By
            { wch: 15 }, // Created Date
            { wch: 15 }, // Start Date
            { wch: 15 }, // Due Date
            { wch: 18 }, // Days Remaining
            { wch: 15 }, // Is Overdue
            { wch: 18 }, // In Grace Period
            { wch: 12 }, // Progress
            { wch: 15 }, // Blocked At
            { wch: 40 }, // Blocked Reason
            { wch: 15 }, // Completed At
            { wch: 18 }  // Completed By
        ];
        worksheet['!cols'] = colWidths;
        
        // Add conditional formatting and styling
        this.addAdvancedFormatting(worksheet, exportData.length);
        
        // Add sheet to workbook
        const sheetName = `${type.charAt(0).toUpperCase() + type.slice(1)} Tasks`;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    },

    // Enhanced header formatting
    formatHeaders: function(worksheet, dataLength) {
        if (dataLength === 0) return;
        
        // Get all header cells (first row)
        const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            const cell = worksheet[cellAddress];
            
            if (cell) {
                // Set header cell style
                cell.s = {
                    font: { 
                        bold: true, 
                        color: { rgb: "FFFFFF" },
                        size: 12
                    },
                    fill: { 
                        fgColor: { rgb: "2563EB" } // Blue background
                    },
                    alignment: { 
                        horizontal: "center",
                        vertical: "center",
                        wrapText: true 
                    },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                };
            }
        }
    },

    // Advanced formatting for data cells
    addAdvancedFormatting: function(worksheet, dataLength) {
        if (dataLength === 0) return;
        
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        // Format data rows
        for (let row = 1; row <= range.e.r; row++) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = worksheet[cellAddress];
                
                if (cell) {
                    // Base cell style
                    cell.s = {
                        alignment: { 
                            vertical: "center",
                            wrapText: true 
                        },
                        border: {
                            top: { style: "thin", color: { rgb: "E5E7EB" } },
                            bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                            left: { style: "thin", color: { rgb: "E5E7EB" } },
                            right: { style: "thin", color: { rgb: "E5E7EB" } }
                        }
                    };
                    
                    // Alternating row colors
                    if (row % 2 === 0) {
                        cell.s.fill = { fgColor: { rgb: "F9FAFB" } };
                    }
                    
                    // Special formatting based on column content
                    const headerCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
                    if (headerCell && headerCell.v) {
                        const header = headerCell.v.toString();
                        
                        // Priority column formatting
                        if (header === 'Priority' && cell.v) {
                            const priority = cell.v.toString().toLowerCase();
                            switch (priority) {
                                case 'urgent':
                                    cell.s.fill = { fgColor: { rgb: "FEE2E2" } }; // Light red
                                    cell.s.font = { color: { rgb: "DC2626" }, bold: true }; // Red text
                                    break;
                                case 'high':
                                    cell.s.fill = { fgColor: { rgb: "FED7AA" } }; // Light orange
                                    cell.s.font = { color: { rgb: "EA580C" }, bold: true }; // Orange text
                                    break;
                                case 'medium':
                                    cell.s.fill = { fgColor: { rgb: "FEF3C7" } }; // Light yellow
                                    cell.s.font = { color: { rgb: "D97706" } }; // Yellow text
                                    break;
                                case 'low':
                                    cell.s.fill = { fgColor: { rgb: "D1FAE5" } }; // Light green
                                    cell.s.font = { color: { rgb: "059669" } }; // Green text
                                    break;
                            }
                        }
                        
                        // Status column formatting
                        if (header === 'Status' && cell.v) {
                            const status = cell.v.toString().toLowerCase();
                            switch (status) {
                                case 'completed':
                                    cell.s.fill = { fgColor: { rgb: "D1FAE5" } }; // Light green
                                    cell.s.font = { color: { rgb: "059669" }, bold: true }; // Green text
                                    break;
                                case 'in progress':
                                    cell.s.fill = { fgColor: { rgb: "DBEAFE" } }; // Light blue
                                    cell.s.font = { color: { rgb: "2563EB" }, bold: true }; // Blue text
                                    break;
                                case 'blocked':
                                    cell.s.fill = { fgColor: { rgb: "FEE2E2" } }; // Light red
                                    cell.s.font = { color: { rgb: "DC2626" }, bold: true }; // Red text
                                    break;
                                case 'paused':
                                    cell.s.fill = { fgColor: { rgb: "F3E8FF" } }; // Light purple
                                    cell.s.font = { color: { rgb: "7C3AED" } }; // Purple text
                                    break;
                                case 'to do':
                                    cell.s.fill = { fgColor: { rgb: "F3F4F6" } }; // Light gray
                                    cell.s.font = { color: { rgb: "6B7280" } }; // Gray text
                                    break;
                            }
                        }
                        
                        // Overdue column formatting
                        if (header === 'Is Overdue' && cell.v && cell.v.toString().includes('YES')) {
                            cell.s.fill = { fgColor: { rgb: "FEE2E2" } }; // Light red
                            cell.s.font = { color: { rgb: "DC2626" }, bold: true }; // Red text
                        }
                        
                        // Days remaining formatting
                        if (header === 'Days Remaining' && cell.v !== undefined) {
                            const days = parseInt(cell.v);
                            if (!isNaN(days)) {
                                if (days < 0) {
                                    cell.s.fill = { fgColor: { rgb: "FEE2E2" } }; // Light red
                                    cell.s.font = { color: { rgb: "DC2626" }, bold: true }; // Red text
                                } else if (days <= 3) {
                                    cell.s.fill = { fgColor: { rgb: "FED7AA" } }; // Light orange
                                    cell.s.font = { color: { rgb: "EA580C" }, bold: true }; // Orange text
                                } else if (days <= 7) {
                                    cell.s.fill = { fgColor: { rgb: "FEF3C7" } }; // Light yellow
                                    cell.s.font = { color: { rgb: "D97706" } }; // Yellow text
                                }
                            }
                        }
                        
                        // Center align specific columns
                        if (['Priority', 'Status', 'Is Overdue', 'In Grace Period', 'Progress', 'Days Remaining'].includes(header)) {
                            cell.s.alignment.horizontal = "center";
                        }
                        
                        // Left align text columns
                        if (['Title', 'Description', 'Blocked Reason'].includes(header)) {
                            cell.s.alignment.horizontal = "left";
                        }
                    }
                }
            }
        }
        
        // Set row heights for better visibility
        if (!worksheet['!rows']) worksheet['!rows'] = [];
        worksheet['!rows'][0] = { hpt: 30 }; // Header row height
        for (let i = 1; i <= dataLength; i++) {
            worksheet['!rows'][i] = { hpt: 25 }; // Data row height
        }
    },

    // Add enhanced summary analytics sheet
    addSummarySheet: function(workbook, viewData) {
        const { tasks, period, type } = viewData;
        
        // Calculate comprehensive analytics
        const analytics = this.calculateDetailedAnalytics(tasks);
        
        // Get current filter information
        const filterInfo = this.getCurrentFilterInfo();
        
        // Create enhanced summary data
        const summaryData = [
            ['TASK MANAGEMENT SUMMARY REPORT', ''],
            ['', ''],
            ['REPORT INFORMATION', ''],
            ['Report Period:', period],
            ['Report Type:', type.charAt(0).toUpperCase() + type.slice(1)],
            ['Generated On:', new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })],
            ['Generated At:', new Date().toLocaleTimeString('en-US')],
            ['Generated By:', window.auth?.currentUser || 'System User'],
            ['Total Records:', analytics.total],
            ['', ''],
            
            ['APPLIED FILTERS', ''],
            ...filterInfo.map(filter => [filter.name, filter.value]),
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
            ...Object.entries(analytics.byCategory).map(([category, count]) => [`${category}:`, count]),
            ['', ''],
            
            ['USER WORKLOAD DISTRIBUTION', ''],
            ...Object.entries(analytics.byUser).map(([user, count]) => [`${user}:`, count]),
            ['', ''],
            
            ['TIME ANALYSIS', ''],
            ['Due This Week:', analytics.dueThisWeek],
            ['Due Next Week:', analytics.dueNextWeek],
            ['Due This Month:', analytics.dueThisMonth],
            ['Past Due:', analytics.overdue],
            ['', ''],
            
            ['KEY INSIGHTS', ''],
            ['Most Common Priority:', this.getMostCommon(analytics.byPriority)],
            ['Most Active Category:', this.getMostCommon(analytics.byCategory)],
            ['Most Assigned User:', this.getMostCommon(analytics.byUser)],
            ['Average Days to Due:', this.calculateAverageDaysToDue(tasks)]
        ];

        // Create worksheet
        const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
        
        // Enhanced formatting for summary sheet
        this.formatSummarySheet(summaryWorksheet, summaryData.length);
        
        // Set column widths
        summaryWorksheet['!cols'] = [
            { wch: 35 },
            { wch: 20 }
        ];
        
        // Add sheet to workbook
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
    },

    // Get current filter information for export
    getCurrentFilterInfo: function() {
        const filters = [];
        
        // Check each filter element
        const filterUser = document.getElementById('filter-user');
        const filterPriority = document.getElementById('filter-priority');
        const filterCategory = document.getElementById('filter-category');
        const filterStatus = document.getElementById('filter-status');
        const filterDateStart = document.getElementById('filter-date-start');
        const filterDateEnd = document.getElementById('filter-date-end');
        
        if (filterUser && filterUser.value) {
            filters.push({ name: 'User Filter:', value: filterUser.value });
        }
        if (filterPriority && filterPriority.value) {
            filters.push({ name: 'Priority Filter:', value: filterPriority.value.toUpperCase() });
        }
        if (filterCategory && filterCategory.value) {
            filters.push({ name: 'Category Filter:', value: filterCategory.value });
        }
        if (filterStatus && filterStatus.value) {
            filters.push({ name: 'Status Filter:', value: filterStatus.value.replace('-', ' ').toUpperCase() });
        }
        if (filterDateStart && filterDateStart.value) {
            filters.push({ name: 'Start Date Filter:', value: new Date(filterDateStart.value).toLocaleDateString() });
        }
        if (filterDateEnd && filterDateEnd.value) {
            filters.push({ name: 'End Date Filter:', value: new Date(filterDateEnd.value).toLocaleDateString() });
        }
        
        if (filters.length === 0) {
            filters.push({ name: 'Filters Applied:', value: 'None - Showing All Data' });
        }
        
        return filters;
    },

    // Format summary sheet with enhanced styling
    formatSummarySheet: function(worksheet, rowCount) {
        for (let row = 0; row < rowCount; row++) {
            for (let col = 0; col < 2; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = worksheet[cellAddress];
                
                if (cell && cell.v) {
                    const value = cell.v.toString();
                    
                    // Section headers
                    if (value.includes('SUMMARY REPORT') || value.includes('REPORT INFORMATION') || 
                        value.includes('APPLIED FILTERS') || value.includes('OVERALL STATISTICS') || 
                        value.includes('PRIORITY BREAKDOWN') || value.includes('CATEGORY BREAKDOWN') || 
                        value.includes('USER WORKLOAD') || value.includes('TIME ANALYSIS') || 
                        value.includes('KEY INSIGHTS')) {
                        cell.s = {
                            font: { bold: true, color: { rgb: "FFFFFF" }, size: 14 },
                            fill: { fgColor: { rgb: "1F2937" } }, // Dark gray background
                            alignment: { horizontal: "left", vertical: "center" },
                            border: {
                                top: { style: "medium", color: { rgb: "000000" } },
                                bottom: { style: "medium", color: { rgb: "000000" } },
                                left: { style: "medium", color: { rgb: "000000" } },
                                right: { style: "medium", color: { rgb: "000000" } }
                            }
                        };
                    }
                    // Data labels (left column with colons)
                    else if (col === 0 && value.includes(':')) {
                        cell.s = {
                            font: { bold: true, color: { rgb: "374151" }, size: 11 },
                            fill: { fgColor: { rgb: "F3F4F6" } }, // Light gray background
                            alignment: { horizontal: "left", vertical: "center" },
                            border: {
                                top: { style: "thin", color: { rgb: "D1D5DB" } },
                                bottom: { style: "thin", color: { rgb: "D1D5DB" } },
                                left: { style: "thin", color: { rgb: "D1D5DB" } },
                                right: { style: "thin", color: { rgb: "D1D5DB" } }
                            }
                        };
                    }
                    // Data values (right column)
                    else if (col === 1 && value !== '') {
                        cell.s = {
                            font: { color: { rgb: "111827" }, size: 11 },
                            alignment: { horizontal: "left", vertical: "center" },
                            border: {
                                top: { style: "thin", color: { rgb: "D1D5DB" } },
                                bottom: { style: "thin", color: { rgb: "D1D5DB" } },
                                left: { style: "thin", color: { rgb: "D1D5DB" } },
                                right: { style: "thin", color: { rgb: "D1D5DB" } }
                            }
                        };
                        
                        // Special formatting for percentage values
                        if (value.includes('%')) {
                            const percentage = parseInt(value);
                            if (percentage >= 80) {
                                cell.s.fill = { fgColor: { rgb: "D1FAE5" } }; // Light green
                                cell.s.font.color = { rgb: "059669" };
                                cell.s.font.bold = true;
                            } else if (percentage >= 60) {
                                cell.s.fill = { fgColor: { rgb: "FEF3C7" } }; // Light yellow
                                cell.s.font.color = { rgb: "D97706" };
                            } else if (percentage < 40) {
                                cell.s.fill = { fgColor: { rgb: "FEE2E2" } }; // Light red
                                cell.s.font.color = { rgb: "DC2626" };
                            }
                        }
                    }
                }
            }
        }
        
        // Set row heights
        if (!worksheet['!rows']) worksheet['!rows'] = [];
        for (let i = 0; i < rowCount; i++) {
            worksheet['!rows'][i] = { hpt: 25 };
        }
    },

    // Helper function to get most common item
    getMostCommon: function(obj) {
        let maxCount = 0;
        let mostCommon = 'None';
        
        for (const [key, value] of Object.entries(obj)) {
            if (value > maxCount) {
                maxCount = value;
                mostCommon = key;
            }
        }
        
        return maxCount > 0 ? `${mostCommon} (${maxCount})` : 'None';
    },

    // Calculate average days to due date
    calculateAverageDaysToDue: function(tasks) {
        if (tasks.length === 0) return 'N/A';
        
        const today = new Date();
        let totalDays = 0;
        let validTasks = 0;
        
        tasks.forEach(task => {
            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                const days = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
                totalDays += days;
                validTasks++;
            }
        });
        
        return validTasks > 0 ? `${Math.round(totalDays / validTasks)} days` : 'N/A';
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
            'blocked': '25%',
            'paused': '25%',
            'completed': '100%'
        };
        return progressMap[status] || '0%';
    },

    // Export comprehensive PDF report with charts and formal formatting
    exportPDFReport: function() {
        if (!window.taskViews) {
            window.showNotification('Export functionality not available', 'error');
            return;
        }

        if (!window.jspdf || !window.jspdf.jsPDF) {
            window.showNotification('PDF library not loaded', 'error');
            return;
        }

        try {
            window.showNotification('Generating PDF report...', 'info');
            
            // Get current view data (filtered)
            const viewData = window.taskViews.getCurrentViewData();
            
            if (viewData.tasks.length === 0) {
                window.showNotification('No data to export in current view', 'warning');
                return;
            }

            // Create PDF with formal report structure
            this.generateSimplePDFReport(viewData);
            
        } catch (error) {
            console.error('PDF Export error:', error);
            window.showNotification(`PDF generation failed: ${error.message}`, 'error');
        }
    },

    // Generate a simplified but comprehensive PDF report
    generateSimplePDFReport: function(viewData) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 20;
        const contentWidth = pageWidth - (2 * margin);
        let yPosition = margin;

        // Add header
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 114, 141);
        pdf.text('M&E Task Management Report', margin, yPosition);
        yPosition += 15;

        // Report metadata
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(60, 60, 60);
        
        const reportInfo = [
            `Report Period: ${viewData.period}`,
            `Report Type: ${viewData.type.charAt(0).toUpperCase() + viewData.type.slice(1)}`,
            `Total Records: ${viewData.tasks.length}`,
            `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
            `Filter Status: ${this.getFilterSummary()}`
        ];
        
        reportInfo.forEach(info => {
            pdf.text(info, margin, yPosition);
            yPosition += 6;
        });
        yPosition += 10;

        // Executive Summary
        const analytics = this.calculateDetailedAnalytics(viewData.tasks);
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 114, 141);
        pdf.text('Executive Summary', margin, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 40);
        
        const summaryLines = [
            `Analysis of ${analytics.total} tasks with ${analytics.completionRate}% completion rate.`,
            `${analytics.overdue} tasks are overdue and require immediate attention.`,
            `${analytics.inProgress} tasks currently in progress, ${analytics.blocked} blocked.`,
            `Priority distribution: ${analytics.byPriority.urgent || 0} urgent, ${analytics.byPriority.high || 0} high priority.`
        ];
        
        summaryLines.forEach(line => {
            const splitText = pdf.splitTextToSize(line, contentWidth);
            pdf.text(splitText, margin, yPosition);
            yPosition += splitText.length * 5 + 3;
        });
        yPosition += 15;

        // Statistics Table
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 114, 141);
        pdf.text('Key Statistics', margin, yPosition);
        yPosition += 10;

        const statsData = [
            ['Metric', 'Value', 'Status'],
            ['Total Tasks', analytics.total.toString(), 'Current workload'],
            ['Completion Rate', `${analytics.completionRate}%`, analytics.completionRate >= 70 ? 'Good' : 'Needs improvement'],
            ['Overdue Tasks', analytics.overdue.toString(), analytics.overdue === 0 ? 'On track' : 'Action needed'],
            ['Blocked Tasks', analytics.blocked.toString(), analytics.blocked === 0 ? 'Clear' : 'Resolve blocks'],
            ['Due This Week', analytics.dueThisWeek.toString(), 'Priority focus'],
            ['Urgent Priority', (analytics.byPriority.urgent || 0).toString(), 'Immediate attention']
        ];

        // Draw table
        pdf.setFontSize(10);
        const colWidths = [40, 30, 50];
        const rowHeight = 8;
        
        statsData.forEach((row, index) => {
            let xPos = margin;
            
            if (index === 0) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFillColor(0, 114, 141);
                pdf.setTextColor(255, 255, 255);
                pdf.rect(margin, yPosition - 2, 120, rowHeight, 'F');
            } else {
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(40, 40, 40);
                if (index % 2 === 0) {
                    pdf.setFillColor(248, 249, 250);
                    pdf.rect(margin, yPosition - 2, 120, rowHeight, 'F');
                }
            }
            
            row.forEach((cell, colIndex) => {
                pdf.text(cell, xPos + 2, yPosition + 3);
                xPos += colWidths[colIndex];
            });
            
            yPosition += rowHeight;
        });
        yPosition += 15;

        // Task Listings by Priority
        if (yPosition > 200) {
            pdf.addPage();
            yPosition = margin;
        }

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 114, 141);
        pdf.text('Priority Task Listings', margin, yPosition);
        yPosition += 15;

        const priorityOrder = ['urgent', 'high', 'medium', 'low'];
        priorityOrder.forEach(priority => {
            const tasks = viewData.tasks.filter(t => t.priority === priority);
            if (tasks.length === 0) return;

            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(60, 60, 60);
            pdf.text(`${priority.toUpperCase()} Priority (${tasks.length} tasks)`, margin, yPosition);
            yPosition += 8;

            tasks.slice(0, 8).forEach(task => {
                if (yPosition > 270) {
                    pdf.addPage();
                    yPosition = margin;
                }
                
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(40, 40, 40);
                
                const taskLine = `• ${task.title} - ${this.formatStatus(task.status)} - Due: ${new Date(task.dueDate).toLocaleDateString()}`;
                const splitText = pdf.splitTextToSize(taskLine, contentWidth - 5);
                pdf.text(splitText, margin + 3, yPosition);
                yPosition += splitText.length * 4 + 2;
            });
            yPosition += 8;
        });

        // Recommendations
        if (yPosition > 220) {
            pdf.addPage();
            yPosition = margin;
        }

        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 114, 141);
        pdf.text('Recommendations', margin, yPosition);
        yPosition += 15;

        const recommendations = this.generateRecommendations(analytics);
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 40);
        
        recommendations.forEach((rec, index) => {
            if (yPosition > 270) {
                pdf.addPage();
                yPosition = margin;
            }
            
            const recText = `${index + 1}. ${rec}`;
            const splitText = pdf.splitTextToSize(recText, contentWidth);
            pdf.text(splitText, margin, yPosition);
            yPosition += splitText.length * 5 + 3;
        });

        // Footer on last page
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Generated by M&E Task Management System - ${new Date().toLocaleDateString()}`, margin, pageHeight - 15);

        // Save the PDF
        const timestamp = new Date().toISOString().split('T')[0];
        const viewType = viewData.type.charAt(0).toUpperCase() + viewData.type.slice(1);
        const filename = `TaskReport_${viewType}_${timestamp}.pdf`;
        
        pdf.save(filename);
        window.showNotification(`PDF report generated: ${filename}`, 'success');
    },

    // Generate intelligent recommendations
    generateRecommendations: function(analytics) {
        const recommendations = [];
        
        if (analytics.completionRate < 70) {
            recommendations.push('Improve task completion rates through better resource allocation and deadline management.');
        }
        
        if (analytics.overdue > 0) {
            recommendations.push(`Address ${analytics.overdue} overdue tasks immediately to prevent project delays.`);
        }
        
        if (analytics.blocked > 0) {
            recommendations.push(`Resolve ${analytics.blocked} blocked tasks by identifying and removing bottlenecks.`);
        }
        
        if (analytics.byPriority.urgent > 0) {
            recommendations.push(`Focus on ${analytics.byPriority.urgent} urgent tasks requiring immediate attention.`);
        }
        
        if (analytics.dueThisWeek > 5) {
            recommendations.push(`Plan resources for ${analytics.dueThisWeek} tasks due this week.`);
        }
        
        if (Object.keys(analytics.byUser).length < 2) {
            recommendations.push('Consider distributing workload among more team members for better efficiency.');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Task management is performing well. Continue current practices and monitor trends.');
        }
        
        return recommendations;
    },

    // Generate formal PDF report with charts and detailed analysis
    generateFormalPDFReport: async function(viewData) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Constants for layout
        const pageWidth = 210;
        const pageHeight = 297;
        const margin = 20;
        const contentWidth = pageWidth - (2 * margin);
        let yPosition = margin;

        // Load logo with better error handling
        let logoImg = null;
        try {
            logoImg = await this.loadImage('./logo.png');
        } catch (error) {
            console.warn('Logo could not be loaded:', error);
        }

        try {
            
            // Add header with logo on every page
            const addHeader = () => {
                // Logo (only if loaded successfully)
                if (logoImg) {
                    pdf.addImage(logoImg, 'PNG', margin, 10, 30, 15);
                }
                
                // Company header
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(0, 114, 141); // #00728d
                pdf.text('M&E Task Management System', logoImg ? margin + 35 : margin, 18);
                
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(100, 100, 100);
                pdf.text('Comprehensive Task Analysis Report', logoImg ? margin + 35 : margin, 24);
                
                // Header line
                pdf.setLineWidth(0.5);
                pdf.setDrawColor(0, 114, 141);
                pdf.line(margin, 30, pageWidth - margin, 30);
                
                return 40; // Return Y position after header
            };

            // Add footer
            const addFooter = (pageNum) => {
                pdf.setFontSize(8);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(100, 100, 100);
                
                // Footer line
                pdf.setLineWidth(0.3);
                pdf.setDrawColor(200, 200, 200);
                pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
                
                // Footer text
                const footerText = `Generated on ${new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })} at ${new Date().toLocaleTimeString('en-US')}`;
                pdf.text(footerText, margin, pageHeight - 12);
                
                // Page number
                pdf.text(`Page ${pageNum}`, pageWidth - margin - 15, pageHeight - 12);
                
                // Logo in footer (only if loaded successfully)
                if (logoImg) {
                    pdf.addImage(logoImg, 'PNG', pageWidth - margin - 25, pageHeight - 18, 10, 5);
                }
            };

            // Initialize first page
            yPosition = addHeader();
            
            // Title and report info
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text('Task Management Report', margin, yPosition);
            yPosition += 15;
            
            // Report metadata
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(60, 60, 60);
            
            const reportInfo = [
                `Report Period: ${viewData.period}`,
                `Report Type: ${viewData.type.charAt(0).toUpperCase() + viewData.type.slice(1)}`,
                `Total Records: ${viewData.tasks.length}`,
                `Filter Status: ${this.getFilterSummary()}`
            ];
            
            reportInfo.forEach(info => {
                pdf.text(info, margin, yPosition);
                yPosition += 6;
            });
            
            yPosition += 10;

            // Executive Summary
            yPosition = await this.addExecutiveSummary(pdf, viewData, yPosition, contentWidth, margin);
            
            // Check if we need a new page
            if (yPosition > pageHeight - 80) {
                pdf.addPage();
                yPosition = addHeader();
            }

            // Add charts section
            yPosition = await this.addChartsSection(pdf, viewData, yPosition, contentWidth, margin);
            
            // Add detailed analysis
            yPosition = await this.addDetailedAnalysis(pdf, viewData, yPosition, contentWidth, margin);
            
            // Add task listings
            yPosition = await this.addTaskListings(pdf, viewData, yPosition, contentWidth, margin);
            
            // Add recommendations
            yPosition = await this.addRecommendations(pdf, viewData, yPosition, contentWidth, margin);
            
            // Add footer to all pages
            const totalPages = pdf.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                pdf.setPage(i);
                addFooter(i);
            }
            
            // Generate filename and save
            const timestamp = new Date().toISOString().split('T')[0];
            const viewType = viewData.type.charAt(0).toUpperCase() + viewData.type.slice(1);
            const filename = `TaskReport_${viewType}_${viewData.period.replace(/[^\w\s-]/g, '')}_${timestamp}.pdf`;
            
            pdf.save(filename);
            window.showNotification(`Comprehensive PDF report generated: ${filename}`, 'success');
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            window.showNotification('Error generating PDF report', 'error');
        }
    },

    // Load image helper function
    loadImage: function(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => {
                console.warn('Logo could not be loaded, continuing without it');
                resolve(null);
            };
            // Add timeout fallback
            setTimeout(() => {
                console.warn('Logo loading timeout, continuing without it');
                resolve(null);
            }, 3000);
            img.src = src;
        });
    },

    // Get filter summary for report
    getFilterSummary: function() {
        const filterInfo = this.getCurrentFilterInfo();
        if (filterInfo.length === 1 && filterInfo[0].value === 'None - Showing All Data') {
            return 'No filters applied - Complete dataset';
        }
        return `${filterInfo.length} filter(s) applied`;
    },

    // Add executive summary section
    addExecutiveSummary: async function(pdf, viewData, startY, contentWidth, margin) {
        let yPosition = startY + 10;
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 114, 141);
        pdf.text('Executive Summary', margin, yPosition);
        yPosition += 10;
        
        const analytics = this.calculateDetailedAnalytics(viewData.tasks);
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 40);
        
        const summaryText = [
            `This report analyzes ${analytics.total} tasks from the ${viewData.type} view covering ${viewData.period}.`,
            `Key findings show a ${analytics.completionRate}% completion rate with ${analytics.overdue} overdue tasks.`,
            `${analytics.inProgress} tasks are currently in progress, while ${analytics.blocked} tasks are blocked and require attention.`,
            `The workload distribution shows ${Object.keys(analytics.byUser).length} active team members with varying task assignments.`,
            `Priority analysis reveals ${analytics.byPriority.urgent || 0} urgent and ${analytics.byPriority.high || 0} high-priority tasks requiring immediate focus.`
        ];
        
        summaryText.forEach(line => {
            const splitText = pdf.splitTextToSize(line, contentWidth);
            pdf.text(splitText, margin, yPosition);
            yPosition += splitText.length * 5;
        });
        
        return yPosition + 10;
    },

    // Add charts section with visual analytics
    addChartsSection: async function(pdf, viewData, startY, contentWidth, margin) {
        let yPosition = startY + 15;
        
        // Check if new page needed
        if (yPosition > 200) {
            pdf.addPage();
            yPosition = 50; // After header space
        }
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 114, 141);
        pdf.text('Data Visualization & Analytics', margin, yPosition);
        yPosition += 15;
        
        const analytics = this.calculateDetailedAnalytics(viewData.tasks);
        
        try {
            // Create charts using simple canvas drawing instead of Chart.js
            await this.createSimpleCharts(pdf, analytics, margin, yPosition);
            return yPosition + 70;
        } catch (error) {
            console.warn('Chart generation failed, continuing without charts:', error);
            
            // Add text-based visualization instead
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(60, 60, 60);
            pdf.text('Status Distribution:', margin, yPosition);
            yPosition += 8;
            
            const statusItems = [
                `Completed: ${analytics.completed}`,
                `In Progress: ${analytics.inProgress}`,
                `To Do: ${analytics.todo}`,
                `Blocked: ${analytics.blocked}`,
                `Paused: ${analytics.paused}`
            ];
            
            statusItems.forEach(item => {
                pdf.text(`• ${item}`, margin + 5, yPosition);
                yPosition += 6;
            });
            
            yPosition += 10;
            pdf.text('Priority Distribution:', margin, yPosition);
            yPosition += 8;
            
            const priorityItems = [
                `Low: ${analytics.byPriority.low || 0}`,
                `Medium: ${analytics.byPriority.medium || 0}`,
                `High: ${analytics.byPriority.high || 0}`,
                `Urgent: ${analytics.byPriority.urgent || 0}`
            ];
            
            priorityItems.forEach(item => {
                pdf.text(`• ${item}`, margin + 5, yPosition);
                yPosition += 6;
            });
            
            return yPosition + 20;
        }
    },

    // Create simple charts without Chart.js dependency
    createSimpleCharts: async function(pdf, analytics, margin, yPosition) {
        // Simple bar chart for status distribution
        const chartWidth = 80;
        const chartHeight = 50;
        const barWidth = 12;
        const maxValue = Math.max(analytics.completed, analytics.inProgress, analytics.todo, analytics.blocked, analytics.paused);
        
        if (maxValue === 0) return;
        
        const statusData = [
            { label: 'Completed', value: analytics.completed, color: [16, 185, 129] },
            { label: 'In Progress', value: analytics.inProgress, color: [59, 130, 246] },
            { label: 'To Do', value: analytics.todo, color: [107, 114, 128] },
            { label: 'Blocked', value: analytics.blocked, color: [239, 68, 68] },
            { label: 'Paused', value: analytics.paused, color: [139, 92, 246] }
        ];
        
        // Draw chart title
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        pdf.text('Task Status Distribution', margin, yPosition - 5);
        
        // Draw bars
        statusData.forEach((item, index) => {
            const barHeight = (item.value / maxValue) * chartHeight;
            const x = margin + (index * (barWidth + 2));
            const y = yPosition + chartHeight - barHeight;
            
            // Draw bar
            pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
            pdf.rect(x, y, barWidth, barHeight, 'F');
            
            // Draw value on top
            pdf.setFontSize(8);
            pdf.setTextColor(0, 0, 0);
            pdf.text(item.value.toString(), x + barWidth/2 - 2, y - 2);
            
            // Draw label at bottom (rotated)
            pdf.text(item.label.substring(0, 4), x, yPosition + chartHeight + 8);
        });
    },

    // Add detailed analysis section
    addDetailedAnalysis: async function(pdf, viewData, startY, contentWidth, margin) {
        let yPosition = startY + 15;
        
        // Check if new page needed
        if (yPosition > 220) {
            pdf.addPage();
            yPosition = 50;
        }
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 114, 141);
        pdf.text('Detailed Analysis', margin, yPosition);
        yPosition += 15;
        
        const analytics = this.calculateDetailedAnalytics(viewData.tasks);
        
        // Performance metrics table
        const tableData = [
            ['Metric', 'Value', 'Analysis'],
            ['Total Tasks', analytics.total.toString(), 'Overall workload volume'],
            ['Completion Rate', `${analytics.completionRate}%`, analytics.completionRate >= 70 ? 'Good performance' : 'Needs improvement'],
            ['Overdue Tasks', analytics.overdue.toString(), analytics.overdue > 0 ? 'Requires attention' : 'On track'],
            ['Blocked Tasks', analytics.blocked.toString(), analytics.blocked > 0 ? 'Process bottlenecks identified' : 'Smooth workflow'],
            ['Due This Week', analytics.dueThisWeek.toString(), 'Immediate priority items'],
            ['Due Next Week', analytics.dueNextWeek.toString(), 'Short-term planning items']
        ];
        
        // Draw table
        pdf.setFontSize(10);
        const colWidths = [50, 30, 80];
        const rowHeight = 8;
        
        tableData.forEach((row, index) => {
            let xPos = margin;
            
            if (index === 0) {
                // Header row
                pdf.setFont('helvetica', 'bold');
                pdf.setFillColor(0, 114, 141);
                pdf.setTextColor(255, 255, 255);
                pdf.rect(margin, yPosition - 2, contentWidth, rowHeight, 'F');
            } else {
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(40, 40, 40);
                if (index % 2 === 0) {
                    pdf.setFillColor(248, 249, 250);
                    pdf.rect(margin, yPosition - 2, contentWidth, rowHeight, 'F');
                }
            }
            
            row.forEach((cell, colIndex) => {
                pdf.text(cell, xPos + 2, yPosition + 3);
                xPos += colWidths[colIndex];
            });
            
            yPosition += rowHeight;
        });
        
        return yPosition + 15;
    },

    // Add task listings section
    addTaskListings: async function(pdf, viewData, startY, contentWidth, margin) {
        let yPosition = startY + 15;
        
        // Check if new page needed
        if (yPosition > 220) {
            pdf.addPage();
            yPosition = 50;
        }
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 114, 141);
        pdf.text('Task Listings', margin, yPosition);
        yPosition += 15;
        
        // Group tasks by priority for better organization
        const tasksByPriority = {
            urgent: viewData.tasks.filter(t => t.priority === 'urgent'),
            high: viewData.tasks.filter(t => t.priority === 'high'),
            medium: viewData.tasks.filter(t => t.priority === 'medium'),
            low: viewData.tasks.filter(t => t.priority === 'low')
        };
        
        Object.entries(tasksByPriority).forEach(([priority, tasks]) => {
            if (tasks.length === 0) return;
            
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(60, 60, 60);
            pdf.text(`${priority.toUpperCase()} Priority Tasks (${tasks.length})`, margin, yPosition);
            yPosition += 8;
            
            tasks.slice(0, 10).forEach(task => { // Limit to 10 tasks per priority
                if (yPosition > 270) {
                    pdf.addPage();
                    yPosition = 50;
                }
                
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(40, 40, 40);
                
                const taskText = `• ${task.title} - ${this.formatStatus(task.status)} - Due: ${new Date(task.dueDate).toLocaleDateString()}`;
                const splitText = pdf.splitTextToSize(taskText, contentWidth - 10);
                pdf.text(splitText, margin + 5, yPosition);
                yPosition += splitText.length * 4 + 2;
            });
            
            yPosition += 5;
        });
        
        return yPosition + 10;
    },

    // Add recommendations section
    addRecommendations: async function(pdf, viewData, startY, contentWidth, margin) {
        let yPosition = startY + 15;
        
        // Check if new page needed
        if (yPosition > 200) {
            pdf.addPage();
            yPosition = 50;
        }
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 114, 141);
        pdf.text('Recommendations & Action Items', margin, yPosition);
        yPosition += 15;
        
        const analytics = this.calculateDetailedAnalytics(viewData.tasks);
        const recommendations = [];
        
        // Generate intelligent recommendations
        if (analytics.completionRate < 70) {
            recommendations.push('Focus on improving task completion rates through better resource allocation and timeline management.');
        }
        
        if (analytics.overdue > 0) {
            recommendations.push(`Address ${analytics.overdue} overdue tasks immediately to prevent project delays.`);
        }
        
        if (analytics.blocked > 0) {
            recommendations.push(`Resolve ${analytics.blocked} blocked tasks by identifying and removing process bottlenecks.`);
        }
        
        if (analytics.byPriority.urgent > 0) {
            recommendations.push(`Prioritize ${analytics.byPriority.urgent} urgent tasks for immediate attention.`);
        }
        
        if (analytics.dueThisWeek > 5) {
            recommendations.push(`Plan for ${analytics.dueThisWeek} tasks due this week - consider resource reallocation if needed.`);
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Overall task management is performing well. Continue current practices and monitor for any emerging issues.');
        }
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(40, 40, 40);
        
        recommendations.forEach((rec, index) => {
            if (yPosition > 270) {
                pdf.addPage();
                yPosition = 50;
            }
            
            const bulletText = `${index + 1}. ${rec}`;
            const splitText = pdf.splitTextToSize(bulletText, contentWidth);
            pdf.text(splitText, margin, yPosition);
            yPosition += splitText.length * 5 + 3;
        });
        
        return yPosition + 10;
    },

    // Export filtered tasks (for custom exports)
    exportFilteredTasks: function(tasks, filename = 'filtered_tasks.xlsx') {
        try {
            const viewData = {
                tasks: tasks,
                period: 'Filtered Results',
                type: 'filtered'
            };
            
            this.exportCurrentView = () => this.addTaskDataSheet(XLSX.utils.book_new(), viewData);
            
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