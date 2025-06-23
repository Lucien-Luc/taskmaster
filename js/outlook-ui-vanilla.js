/**
 * Outlook UI Integration - Vanilla JavaScript
 * Compatible with all hosting environments including FTP
 * No ES6 classes, no imports, no modern syntax
 */

(function() {
    'use strict';
    
    var OutlookUIIntegration = {
        isInitialized: false,
        outlookPanel: null,
        settingsModal: null,
        autoSyncInterval: null,

        // Initialize UI components
        initialize: function() {
            if (this.isInitialized) return;

            this.createOutlookControlPanel();
            this.createSettingsModal();
            this.setupEventListeners();
            this.addCalendarIntegrationStyles();
            
            this.isInitialized = true;
            console.log('Outlook UI integration initialized');
        },

        // Create control panel
        createOutlookControlPanel: function() {
            var controlPanel = document.createElement('div');
            controlPanel.id = 'outlook-control-panel';
            controlPanel.className = 'outlook-control-panel glass';
            
            controlPanel.innerHTML = 
                '<div class="panel-header">' +
                    '<h3>' +
                        '<i data-lucide="calendar" class="panel-icon"></i>' +
                        'Microsoft 365 Integration' +
                    '</h3>' +
                    '<button class="btn-icon settings-btn" id="outlook-settings-btn" title="Integration Settings">' +
                        '<i data-lucide="settings"></i>' +
                    '</button>' +
                '</div>' +
                '<div class="panel-content">' +
                    '<div class="connection-status">' +
                        '<div class="status-indicator disconnected" id="outlook-status-indicator"></div>' +
                        '<span id="outlook-status-text">Not connected</span>' +
                    '</div>' +
                    '<div class="control-buttons">' +
                        '<button class="btn btn-primary" id="outlook-connect-btn">' +
                            '<i data-lucide="link"></i>' +
                            'Connect to Microsoft 365' +
                        '</button>' +
                        '<button class="btn btn-outline" id="outlook-disconnect-btn" style="display: none;">' +
                            '<i data-lucide="unlink"></i>' +
                            'Disconnect' +
                        '</button>' +
                        '<button class="btn btn-secondary" id="outlook-sync-btn" disabled>' +
                            '<i data-lucide="refresh-cw"></i>' +
                            'Sync Calendar' +
                        '</button>' +
                    '</div>' +
                    '<div class="sync-options" id="outlook-sync-options" style="display: none;">' +
                        '<div class="form-group">' +
                            '<label for="sync-range">Sync Range:</label>' +
                            '<select id="sync-range" class="form-control">' +
                                '<option value="current-month">Current Month</option>' +
                                '<option value="next-month">Next Month</option>' +
                                '<option value="current-quarter">Current Quarter</option>' +
                                '<option value="custom">Custom Range</option>' +
                            '</select>' +
                        '</div>' +
                        '<div class="auto-sync-toggle">' +
                            '<label class="toggle-label">' +
                                '<input type="checkbox" id="auto-sync-checkbox">' +
                                '<span class="toggle-slider"></span>' +
                                'Auto-sync every hour' +
                            '</label>' +
                        '</div>' +
                    '</div>' +
                    '<div class="sync-status" id="sync-status" style="display: none;">' +
                        '<div class="status-item">' +
                            '<span class="label">Last Sync:</span>' +
                            '<span class="value" id="last-sync-time">Never</span>' +
                        '</div>' +
                        '<div class="status-item">' +
                            '<span class="label">Events Synced:</span>' +
                            '<span class="value" id="events-count">0</span>' +
                        '</div>' +
                    '</div>' +
                '</div>';

            var sidebar = document.querySelector('.sidebar') || document.querySelector('.controls-panel');
            if (sidebar) {
                sidebar.appendChild(controlPanel);
            } else {
                document.body.appendChild(controlPanel);
            }

            this.outlookPanel = controlPanel;
        },

        // Create settings modal
        createSettingsModal: function() {
            var modal = document.createElement('div');
            modal.id = 'outlook-settings-modal';
            modal.className = 'modal-overlay';
            modal.style.display = 'none';
            
            modal.innerHTML = 
                '<div class="modal glass-strong">' +
                    '<div class="modal-header">' +
                        '<h2>Microsoft 365 Integration Settings</h2>' +
                        '<button class="btn-icon close-btn" id="outlook-settings-close">' +
                            '<i data-lucide="x"></i>' +
                        '</button>' +
                    '</div>' +
                    '<div class="modal-body">' +
                        '<div class="settings-section">' +
                            '<h3>Calendar Synchronization</h3>' +
                            '<div class="form-group">' +
                                '<label for="calendar-filter">Event Visibility:</label>' +
                                '<select id="calendar-filter" class="form-control">' +
                                    '<option value="normal">Normal and Personal Events</option>' +
                                    '<option value="normal-only">Normal Events Only</option>' +
                                    '<option value="personal-only">Personal Events Only</option>' +
                                '</select>' +
                            '</div>' +
                            '<div class="form-group">' +
                                '<label for="sync-frequency">Auto-Sync Frequency:</label>' +
                                '<select id="sync-frequency" class="form-control">' +
                                    '<option value="disabled">Disabled</option>' +
                                    '<option value="15">Every 15 minutes</option>' +
                                    '<option value="30">Every 30 minutes</option>' +
                                    '<option value="60">Every hour</option>' +
                                    '<option value="240">Every 4 hours</option>' +
                                '</select>' +
                            '</div>' +
                            '<div class="checkbox-group">' +
                                '<label class="checkbox-label">' +
                                    '<input type="checkbox" id="show-attendees">' +
                                    '<span class="checkmark"></span>' +
                                    'Show attendee count' +
                                '</label>' +
                                '<label class="checkbox-label">' +
                                    '<input type="checkbox" id="show-location">' +
                                    '<span class="checkmark"></span>' +
                                    'Show event location' +
                                '</label>' +
                                '<label class="checkbox-label">' +
                                    '<input type="checkbox" id="create-tasks">' +
                                    '<span class="checkmark"></span>' +
                                    'Auto-create tasks for meetings' +
                                '</label>' +
                            '</div>' +
                        '</div>' +
                        '<div class="settings-section">' +
                            '<h3>Security & Privacy</h3>' +
                            '<div class="info-box">' +
                                '<i data-lucide="shield-check"></i>' +
                                '<div>' +
                                    '<strong>Enterprise Security</strong>' +
                                    '<p>All authentication uses Microsoft\'s secure OAuth 2.0 with PKCE. No credentials are stored locally.</p>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="modal-footer">' +
                        '<button class="btn btn-outline" id="outlook-settings-cancel">Cancel</button>' +
                        '<button class="btn btn-primary" id="outlook-settings-save">Save Settings</button>' +
                    '</div>' +
                '</div>';

            document.body.appendChild(modal);
            this.settingsModal = modal;
        },

        // Setup event listeners
        setupEventListeners: function() {
            var self = this;
            
            // Connect button
            var connectBtn = document.getElementById('outlook-connect-btn');
            if (connectBtn) {
                connectBtn.addEventListener('click', function() {
                    try {
                        window.microsoftGraphIntegration.authenticateUser();
                    } catch (error) {
                        console.error('Connection failed:', error);
                    }
                });
            }

            // Disconnect button
            var disconnectBtn = document.getElementById('outlook-disconnect-btn');
            if (disconnectBtn) {
                disconnectBtn.addEventListener('click', function() {
                    window.microsoftGraphIntegration.signOut();
                });
            }

            // Sync button
            var syncBtn = document.getElementById('outlook-sync-btn');
            if (syncBtn) {
                syncBtn.addEventListener('click', function() {
                    var originalText = syncBtn.innerHTML;
                    
                    syncBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Syncing...';
                    syncBtn.disabled = true;
                    
                    self.performSync().then(function() {
                        self.updateLastSyncTime();
                    }).catch(function(error) {
                        console.error('Sync failed:', error);
                    }).finally(function() {
                        syncBtn.innerHTML = originalText;
                        syncBtn.disabled = false;
                        if (window.lucide) {
                            window.lucide.createIcons();
                        }
                    });
                });
            }

            // Settings modal
            var settingsBtn = document.getElementById('outlook-settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', function() {
                    self.showSettingsModal();
                });
            }

            var settingsClose = document.getElementById('outlook-settings-close');
            if (settingsClose) {
                settingsClose.addEventListener('click', function() {
                    self.hideSettingsModal();
                });
            }

            var settingsCancel = document.getElementById('outlook-settings-cancel');
            if (settingsCancel) {
                settingsCancel.addEventListener('click', function() {
                    self.hideSettingsModal();
                });
            }

            var settingsSave = document.getElementById('outlook-settings-save');
            if (settingsSave) {
                settingsSave.addEventListener('click', function() {
                    self.saveSettings();
                });
            }

            // Auto-sync toggle
            var autoSyncCheckbox = document.getElementById('auto-sync-checkbox');
            if (autoSyncCheckbox) {
                autoSyncCheckbox.addEventListener('change', function(e) {
                    self.toggleAutoSync(e.target.checked);
                });
            }
        },

        // Add CSS styles
        addCalendarIntegrationStyles: function() {
            var style = document.createElement('style');
            style.textContent = 
                '.outlook-control-panel {' +
                    'margin: 20px 0;' +
                    'padding: 20px;' +
                    'border-radius: 12px;' +
                    'background: rgba(255, 255, 255, 0.1);' +
                    'backdrop-filter: blur(10px);' +
                    'border: 1px solid rgba(255, 255, 255, 0.2);' +
                '}' +
                '.panel-header {' +
                    'display: flex;' +
                    'justify-content: space-between;' +
                    'align-items: center;' +
                    'margin-bottom: 15px;' +
                    'padding-bottom: 10px;' +
                    'border-bottom: 1px solid rgba(255, 255, 255, 0.1);' +
                '}' +
                '.panel-header h3 {' +
                    'display: flex;' +
                    'align-items: center;' +
                    'gap: 8px;' +
                    'margin: 0;' +
                    'font-size: 16px;' +
                    'font-weight: 600;' +
                    'color: #ffffff;' +
                '}' +
                '.panel-header .settings-btn {' +
                    'width: 36px;' +
                    'height: 36px;' +
                    'padding: 8px;' +
                    'background: rgba(255, 255, 255, 0.1);' +
                    'border: 1px solid rgba(255, 255, 255, 0.2);' +
                    'border-radius: 8px;' +
                    'color: rgba(255, 255, 255, 0.8);' +
                    'cursor: pointer;' +
                    'transition: all 0.2s ease;' +
                    'display: flex;' +
                    'align-items: center;' +
                    'justify-content: center;' +
                '}' +
                '.panel-header .settings-btn:hover {' +
                    'background: rgba(255, 255, 255, 0.2);' +
                    'color: #ffffff;' +
                    'transform: translateY(-1px);' +
                    'box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);' +
                '}' +
                '.panel-header .settings-btn i {' +
                    'width: 16px;' +
                    'height: 16px;' +
                '}' +
                '.connection-status {' +
                    'display: flex;' +
                    'align-items: center;' +
                    'gap: 8px;' +
                    'margin-bottom: 15px;' +
                    'padding: 8px 12px;' +
                    'background: rgba(0, 0, 0, 0.2);' +
                    'border-radius: 8px;' +
                '}' +
                '.status-indicator {' +
                    'width: 8px;' +
                    'height: 8px;' +
                    'border-radius: 50%;' +
                    'transition: background-color 0.3s ease;' +
                '}' +
                '.status-indicator.connected {' +
                    'background: #4CAF50;' +
                    'box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);' +
                '}' +
                '.status-indicator.disconnected {' +
                    'background: #FF5722;' +
                '}' +
                '.control-buttons {' +
                    'display: flex;' +
                    'flex-direction: column;' +
                    'gap: 8px;' +
                    'margin-bottom: 15px;' +
                '}' +
                '.control-buttons .btn {' +
                    'justify-content: center;' +
                    'padding: 8px 16px;' +
                    'font-size: 14px;' +
                '}' +
                '.outlook-event {' +
                    'position: relative;' +
                    'z-index: 1;' +
                    'cursor: default;' +
                    'transition: transform 0.2s ease;' +
                '}' +
                '.outlook-event:hover {' +
                    'transform: translateY(-1px);' +
                    'box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);' +
                '}' +
                '.event-title {' +
                    'font-weight: 500;' +
                    'line-height: 1.2;' +
                '}' +
                '.event-time, .event-location {' +
                    'font-size: 10px;' +
                    'opacity: 0.9;' +
                '}' +
                '@keyframes spin {' +
                    'from { transform: rotate(0deg); }' +
                    'to { transform: rotate(360deg); }' +
                '}' +
                '.spin {' +
                    'animation: spin 1s linear infinite;' +
                '}' +
                '.modal-overlay {' +
                    'position: fixed;' +
                    'top: 0;' +
                    'left: 0;' +
                    'right: 0;' +
                    'bottom: 0;' +
                    'background: rgba(0, 0, 0, 0.7);' +
                    'backdrop-filter: blur(8px);' +
                    'z-index: 10000;' +
                    'display: flex;' +
                    'align-items: center;' +
                    'justify-content: center;' +
                    'padding: 20px;' +
                '}' +
                '.modal {' +
                    'background: rgba(0, 0, 0, 0.9);' +
                    'backdrop-filter: blur(20px);' +
                    'border: 1px solid rgba(255, 255, 255, 0.2);' +
                    'border-radius: 16px;' +
                    'padding: 0;' +
                    'max-width: 600px;' +
                    'width: 100%;' +
                    'max-height: 80vh;' +
                    'overflow: hidden;' +
                    'box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);' +
                '}' +
                '.modal-header {' +
                    'display: flex;' +
                    'justify-content: space-between;' +
                    'align-items: center;' +
                    'padding: 24px;' +
                    'border-bottom: 1px solid rgba(255, 255, 255, 0.1);' +
                    'background: rgba(255, 255, 255, 0.05);' +
                '}' +
                '.modal-header h2 {' +
                    'margin: 0;' +
                    'color: #ffffff;' +
                    'font-size: 20px;' +
                    'font-weight: 600;' +
                '}' +
                '.modal-header .close-btn {' +
                    'width: 32px;' +
                    'height: 32px;' +
                    'padding: 6px;' +
                    'background: rgba(255, 255, 255, 0.1);' +
                    'border: 1px solid rgba(255, 255, 255, 0.2);' +
                    'border-radius: 6px;' +
                    'color: rgba(255, 255, 255, 0.8);' +
                    'cursor: pointer;' +
                    'transition: all 0.2s ease;' +
                    'display: flex;' +
                    'align-items: center;' +
                    'justify-content: center;' +
                '}' +
                '.modal-header .close-btn:hover {' +
                    'background: rgba(239, 68, 68, 0.2);' +
                    'border-color: rgba(239, 68, 68, 0.4);' +
                    'color: #ef4444;' +
                '}' +
                '.modal-body {' +
                    'padding: 24px;' +
                    'max-height: 60vh;' +
                    'overflow-y: auto;' +
                '}' +
                '.settings-section {' +
                    'margin-bottom: 24px;' +
                '}' +
                '.settings-section h3 {' +
                    'color: rgba(255, 255, 255, 0.9);' +
                    'font-size: 16px;' +
                    'font-weight: 600;' +
                    'margin: 0 0 16px 0;' +
                    'padding-bottom: 8px;' +
                    'border-bottom: 1px solid rgba(255, 255, 255, 0.1);' +
                '}' +
                '.form-group {' +
                    'margin-bottom: 16px;' +
                '}' +
                '.form-group label {' +
                    'display: block;' +
                    'color: rgba(255, 255, 255, 0.8);' +
                    'font-size: 14px;' +
                    'font-weight: 500;' +
                    'margin-bottom: 6px;' +
                '}' +
                '.form-control {' +
                    'width: 100%;' +
                    'padding: 10px 12px;' +
                    'background: rgba(255, 255, 255, 0.1);' +
                    'border: 1px solid rgba(255, 255, 255, 0.2);' +
                    'border-radius: 8px;' +
                    'color: #ffffff;' +
                    'font-size: 14px;' +
                    'transition: all 0.2s ease;' +
                '}' +
                '.form-control:focus {' +
                    'outline: none;' +
                    'border-color: #00b4d8;' +
                    'box-shadow: 0 0 0 2px rgba(0, 180, 216, 0.2);' +
                    'background: rgba(255, 255, 255, 0.15);' +
                '}' +
                '.checkbox-group {' +
                    'display: flex;' +
                    'align-items: center;' +
                    'gap: 8px;' +
                    'margin-bottom: 12px;' +
                '}' +
                '.checkbox-group input[type="checkbox"] {' +
                    'width: 16px;' +
                    'height: 16px;' +
                    'accent-color: #00b4d8;' +
                '}' +
                '.checkbox-group label {' +
                    'margin: 0;' +
                    'font-size: 14px;' +
                    'color: rgba(255, 255, 255, 0.8);' +
                '}' +
                '.modal-footer {' +
                    'padding: 20px 24px;' +
                    'background: rgba(255, 255, 255, 0.03);' +
                    'border-top: 1px solid rgba(255, 255, 255, 0.1);' +
                    'display: flex;' +
                    'gap: 12px;' +
                    'justify-content: flex-end;' +
                '}';

            document.head.appendChild(style);
        },

        // Perform sync
        performSync: function() {
            var syncRange = document.getElementById('sync-range');
            var rangeValue = syncRange ? syncRange.value : 'current-month';
            var dateRange = this.calculateSyncRange(rangeValue);
            
            return window.microsoftGraphIntegration.syncCalendarEvents(dateRange.startDate, dateRange.endDate).then(function(events) {
                var eventsCount = document.getElementById('events-count');
                if (eventsCount) {
                    eventsCount.textContent = events.length;
                }
                
                var syncStatus = document.getElementById('sync-status');
                if (syncStatus) {
                    syncStatus.style.display = 'block';
                }
                
                var syncOptions = document.getElementById('outlook-sync-options');
                if (syncOptions) {
                    syncOptions.style.display = 'block';
                }
                
                return events;
            });
        },

        // Calculate sync range
        calculateSyncRange: function(range) {
            var now = new Date();
            var startDate, endDate;

            switch (range) {
                case 'current-month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    break;
                case 'next-month':
                    startDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
                    break;
                case 'current-quarter':
                    var quarter = Math.floor(now.getMonth() / 3);
                    startDate = new Date(now.getFullYear(), quarter * 3, 1);
                    endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
                    break;
                default:
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }

            return { startDate: startDate, endDate: endDate };
        },

        // Update last sync time
        updateLastSyncTime: function() {
            var now = new Date();
            var timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            var lastSyncTime = document.getElementById('last-sync-time');
            if (lastSyncTime) {
                lastSyncTime.textContent = timeString;
            }
        },

        // Toggle auto-sync
        toggleAutoSync: function(enabled) {
            if (enabled) {
                this.startAutoSync();
            } else {
                this.stopAutoSync();
            }
        },

        // Start auto-sync
        startAutoSync: function() {
            var self = this;
            
            if (this.autoSyncInterval) {
                clearInterval(this.autoSyncInterval);
            }
            
            var syncFrequency = document.getElementById('sync-frequency');
            var frequency = parseInt(syncFrequency ? syncFrequency.value : '60');
            
            this.autoSyncInterval = setInterval(function() {
                if (window.microsoftGraphIntegration.isAuthenticated) {
                    try {
                        self.performSync().then(function() {
                            self.updateLastSyncTime();
                        }).catch(function(error) {
                            console.error('Auto-sync failed:', error);
                        });
                    } catch (error) {
                        console.error('Auto-sync failed:', error);
                    }
                }
            }, frequency * 60 * 1000);
        },

        // Stop auto-sync
        stopAutoSync: function() {
            if (this.autoSyncInterval) {
                clearInterval(this.autoSyncInterval);
                this.autoSyncInterval = null;
            }
        },

        // Show settings modal
        showSettingsModal: function() {
            this.settingsModal.style.display = 'flex';
            this.loadCurrentSettings();
        },

        // Hide settings modal
        hideSettingsModal: function() {
            this.settingsModal.style.display = 'none';
        },

        // Load current settings
        loadCurrentSettings: function() {
            var settings = this.getStoredSettings();
            
            var calendarFilter = document.getElementById('calendar-filter');
            if (calendarFilter) {
                calendarFilter.value = settings.calendarFilter || 'normal';
            }
            
            var syncFrequency = document.getElementById('sync-frequency');
            if (syncFrequency) {
                syncFrequency.value = settings.syncFrequency || 'disabled';
            }
            
            var showAttendees = document.getElementById('show-attendees');
            if (showAttendees) {
                showAttendees.checked = settings.showAttendees || false;
            }
            
            var showLocation = document.getElementById('show-location');
            if (showLocation) {
                showLocation.checked = settings.showLocation !== false;
            }
            
            var createTasks = document.getElementById('create-tasks');
            if (createTasks) {
                createTasks.checked = settings.createTasks || false;
            }
        },

        // Save settings
        saveSettings: function() {
            var calendarFilter = document.getElementById('calendar-filter');
            var syncFrequency = document.getElementById('sync-frequency');
            var showAttendees = document.getElementById('show-attendees');
            var showLocation = document.getElementById('show-location');
            var createTasks = document.getElementById('create-tasks');
            
            var settings = {
                calendarFilter: calendarFilter ? calendarFilter.value : 'normal',
                syncFrequency: syncFrequency ? syncFrequency.value : 'disabled',
                showAttendees: showAttendees ? showAttendees.checked : false,
                showLocation: showLocation ? showLocation.checked : true,
                createTasks: createTasks ? createTasks.checked : false
            };

            localStorage.setItem('outlookIntegrationSettings', JSON.stringify(settings));
            this.hideSettingsModal();
            
            this.applySettings(settings);
            
            if (window.showNotification) {
                window.showNotification('Settings saved successfully', 'success');
            }
        },

        // Get stored settings
        getStoredSettings: function() {
            try {
                var stored = localStorage.getItem('outlookIntegrationSettings');
                return stored ? JSON.parse(stored) : {};
            } catch (error) {
                console.error('Failed to load settings:', error);
                return {};
            }
        },

        // Apply settings
        applySettings: function(settings) {
            var autoSyncCheckbox = document.getElementById('auto-sync-checkbox');
            
            if (settings.syncFrequency !== 'disabled') {
                if (autoSyncCheckbox) {
                    autoSyncCheckbox.checked = true;
                }
                this.startAutoSync();
            } else {
                if (autoSyncCheckbox) {
                    autoSyncCheckbox.checked = false;
                }
                this.stopAutoSync();
            }
        }
    };

    // Initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.outlookUIIntegration = OutlookUIIntegration;
            OutlookUIIntegration.initialize();
        });
    } else {
        window.outlookUIIntegration = OutlookUIIntegration;
        OutlookUIIntegration.initialize();
    }

})();