/**
 * Outlook UI Integration Module
 * Provides professional UI components for Microsoft Graph integration
 */

class OutlookUIIntegration {
    constructor() {
        this.isInitialized = false;
        this.outlookPanel = null;
        this.settingsModal = null;
    }

    /**
     * Initialize Outlook UI components
     */
    initialize() {
        if (this.isInitialized) return;

        this.createOutlookControlPanel();
        this.createSettingsModal();
        this.setupEventListeners();
        this.addCalendarIntegrationStyles();
        
        this.isInitialized = true;
        console.log('Outlook UI integration initialized');
    }

    /**
     * Create the main Outlook control panel
     */
    createOutlookControlPanel() {
        const controlPanel = document.createElement('div');
        controlPanel.id = 'outlook-control-panel';
        controlPanel.className = 'outlook-control-panel glass';
        
        controlPanel.innerHTML = `
            <div class="panel-header">
                <h3>
                    <i data-lucide="calendar" class="panel-icon"></i>
                    Microsoft 365 Integration
                </h3>
                <button class="btn-icon settings-btn" id="outlook-settings-btn" title="Integration Settings">
                    <i data-lucide="settings"></i>
                </button>
            </div>
            
            <div class="panel-content">
                <div class="connection-status">
                    <div class="status-indicator disconnected" id="outlook-status-indicator"></div>
                    <span id="outlook-status-text">Not connected</span>
                </div>
                
                <div class="control-buttons">
                    <button class="btn btn-primary" id="outlook-connect-btn">
                        <i data-lucide="link"></i>
                        Connect to Microsoft 365
                    </button>
                    
                    <button class="btn btn-outline" id="outlook-disconnect-btn" style="display: none;">
                        <i data-lucide="unlink"></i>
                        Disconnect
                    </button>
                    
                    <button class="btn btn-secondary" id="outlook-sync-btn" disabled>
                        <i data-lucide="refresh-cw"></i>
                        Sync Calendar
                    </button>
                </div>
                
                <div class="sync-options" id="outlook-sync-options" style="display: none;">
                    <div class="form-group">
                        <label for="sync-range">Sync Range:</label>
                        <select id="sync-range" class="form-control">
                            <option value="current-month">Current Month</option>
                            <option value="next-month">Next Month</option>
                            <option value="current-quarter">Current Quarter</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>
                    
                    <div class="auto-sync-toggle">
                        <label class="toggle-label">
                            <input type="checkbox" id="auto-sync-checkbox">
                            <span class="toggle-slider"></span>
                            Auto-sync every hour
                        </label>
                    </div>
                </div>
                
                <div class="sync-status" id="sync-status" style="display: none;">
                    <div class="status-item">
                        <span class="label">Last Sync:</span>
                        <span class="value" id="last-sync-time">Never</span>
                    </div>
                    <div class="status-item">
                        <span class="label">Events Synced:</span>
                        <span class="value" id="events-count">0</span>
                    </div>
                </div>
            </div>
        `;

        // Insert panel in appropriate location
        const sidebar = document.querySelector('.sidebar') || document.querySelector('.controls-panel');
        if (sidebar) {
            sidebar.appendChild(controlPanel);
        } else {
            document.body.appendChild(controlPanel);
        }

        this.outlookPanel = controlPanel;
    }

    /**
     * Create settings modal for advanced configuration
     */
    createSettingsModal() {
        const modal = document.createElement('div');
        modal.id = 'outlook-settings-modal';
        modal.className = 'modal-overlay';
        modal.style.display = 'none';
        
        modal.innerHTML = `
            <div class="modal glass-strong">
                <div class="modal-header">
                    <h2>Microsoft 365 Integration Settings</h2>
                    <button class="btn-icon close-btn" id="outlook-settings-close">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="settings-section">
                        <h3>Calendar Synchronization</h3>
                        
                        <div class="form-group">
                            <label for="calendar-filter">Event Visibility:</label>
                            <select id="calendar-filter" class="form-control">
                                <option value="normal">Normal and Personal Events</option>
                                <option value="normal-only">Normal Events Only</option>
                                <option value="personal-only">Personal Events Only</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="sync-frequency">Auto-Sync Frequency:</label>
                            <select id="sync-frequency" class="form-control">
                                <option value="disabled">Disabled</option>
                                <option value="15">Every 15 minutes</option>
                                <option value="30">Every 30 minutes</option>
                                <option value="60">Every hour</option>
                                <option value="240">Every 4 hours</option>
                            </select>
                        </div>
                        
                        <div class="checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="show-attendees">
                                <span class="checkmark"></span>
                                Show attendee count
                            </label>
                            
                            <label class="checkbox-label">
                                <input type="checkbox" id="show-location">
                                <span class="checkmark"></span>
                                Show event location
                            </label>
                            
                            <label class="checkbox-label">
                                <input type="checkbox" id="create-tasks">
                                <span class="checkmark"></span>
                                Auto-create tasks for meetings
                            </label>
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h3>Security & Privacy</h3>
                        
                        <div class="info-box">
                            <i data-lucide="shield-check"></i>
                            <div>
                                <strong>Enterprise Security</strong>
                                <p>All authentication uses Microsoft's secure OAuth 2.0 with PKCE. No credentials are stored locally.</p>
                            </div>
                        </div>
                        
                        <div class="checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="respect-sensitivity">
                                <span class="checkmark"></span>
                                Respect event sensitivity settings
                            </label>
                            
                            <label class="checkbox-label">
                                <input type="checkbox" id="session-only">
                                <span class="checkmark"></span>
                                Clear integration on browser close
                            </label>
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h3>Troubleshooting</h3>
                        
                        <div class="diagnostic-info">
                            <div class="diag-item">
                                <span class="label">Integration Status:</span>
                                <span class="value" id="diag-status">Not initialized</span>
                            </div>
                            <div class="diag-item">
                                <span class="label">Client ID:</span>
                                <span class="value" id="diag-client-id">Not configured</span>
                            </div>
                            <div class="diag-item">
                                <span class="label">Permissions:</span>
                                <span class="value" id="diag-permissions">Not checked</span>
                            </div>
                        </div>
                        
                        <div class="action-buttons">
                            <button class="btn btn-outline" id="test-connection">
                                <i data-lucide="wifi"></i>
                                Test Connection
                            </button>
                            <button class="btn btn-outline" id="clear-cache">
                                <i data-lucide="trash-2"></i>
                                Clear Cache
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn btn-outline" id="outlook-settings-cancel">Cancel</button>
                    <button class="btn btn-primary" id="outlook-settings-save">Save Settings</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.settingsModal = modal;
    }

    /**
     * Setup event listeners for UI interactions
     */
    setupEventListeners() {
        // Connect button
        document.getElementById('outlook-connect-btn')?.addEventListener('click', async () => {
            try {
                await window.microsoftGraphIntegration.authenticateUser();
            } catch (error) {
                console.error('Connection failed:', error);
            }
        });

        // Disconnect button
        document.getElementById('outlook-disconnect-btn')?.addEventListener('click', async () => {
            await window.microsoftGraphIntegration.signOut();
        });

        // Sync button
        document.getElementById('outlook-sync-btn')?.addEventListener('click', async () => {
            const syncBtn = document.getElementById('outlook-sync-btn');
            const originalText = syncBtn.innerHTML;
            
            syncBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Syncing...';
            syncBtn.disabled = true;
            
            try {
                await this.performSync();
                this.updateLastSyncTime();
            } finally {
                syncBtn.innerHTML = originalText;
                syncBtn.disabled = false;
                lucide.createIcons(); // Re-initialize icons
            }
        });

        // Settings modal
        document.getElementById('outlook-settings-btn')?.addEventListener('click', () => {
            this.showSettingsModal();
        });

        document.getElementById('outlook-settings-close')?.addEventListener('click', () => {
            this.hideSettingsModal();
        });

        document.getElementById('outlook-settings-cancel')?.addEventListener('click', () => {
            this.hideSettingsModal();
        });

        document.getElementById('outlook-settings-save')?.addEventListener('click', () => {
            this.saveSettings();
        });

        // Auto-sync toggle
        document.getElementById('auto-sync-checkbox')?.addEventListener('change', (e) => {
            this.toggleAutoSync(e.target.checked);
        });
    }

    /**
     * Add CSS styles for Outlook integration
     */
    addCalendarIntegrationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .outlook-control-panel {
                margin: 20px 0;
                padding: 20px;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }

            .panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .panel-header h3 {
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
            }

            .panel-icon {
                width: 18px;
                height: 18px;
            }

            .connection-status {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 15px;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 8px;
            }

            .status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                transition: background-color 0.3s ease;
            }

            .status-indicator.connected {
                background: #4CAF50;
                box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
            }

            .status-indicator.disconnected {
                background: #FF5722;
            }

            .control-buttons {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 15px;
            }

            .control-buttons .btn {
                justify-content: center;
                padding: 8px 16px;
                font-size: 14px;
            }

            .sync-options {
                padding: 15px;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 8px;
                margin-bottom: 15px;
            }

            .toggle-label {
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
                user-select: none;
            }

            .toggle-slider {
                width: 40px;
                height: 20px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 20px;
                position: relative;
                transition: background 0.3s ease;
            }

            .toggle-slider::before {
                content: '';
                position: absolute;
                width: 16px;
                height: 16px;
                background: white;
                border-radius: 50%;
                top: 2px;
                left: 2px;
                transition: transform 0.3s ease;
            }

            input[type="checkbox"]:checked + .toggle-slider {
                background: #4CAF50;
            }

            input[type="checkbox"]:checked + .toggle-slider::before {
                transform: translateX(20px);
            }

            .sync-status {
                padding: 10px;
                background: rgba(0, 0, 0, 0.1);
                border-radius: 6px;
                font-size: 12px;
            }

            .status-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
            }

            .status-item .label {
                color: rgba(255, 255, 255, 0.7);
            }

            .status-item .value {
                color: #ffffff;
                font-weight: 500;
            }

            .outlook-event {
                position: relative;
                z-index: 1;
                cursor: default;
                transition: transform 0.2s ease;
            }

            .outlook-event:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            }

            .event-title {
                font-weight: 500;
                line-height: 1.2;
            }

            .event-time, .event-location {
                font-size: 10px;
                opacity: 0.9;
            }

            .settings-section {
                margin-bottom: 24px;
                padding-bottom: 20px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .settings-section:last-child {
                border-bottom: none;
                margin-bottom: 0;
            }

            .settings-section h3 {
                margin: 0 0 15px 0;
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
            }

            .checkbox-group {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .checkbox-label {
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
                user-select: none;
            }

            .checkmark {
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 3px;
                position: relative;
                transition: all 0.3s ease;
            }

            input[type="checkbox"]:checked + .checkmark {
                background: #4CAF50;
                border-color: #4CAF50;
            }

            input[type="checkbox"]:checked + .checkmark::after {
                content: '✓';
                position: absolute;
                color: white;
                font-size: 12px;
                top: -2px;
                left: 1px;
            }

            .info-box {
                display: flex;
                gap: 12px;
                padding: 12px;
                background: rgba(33, 150, 243, 0.1);
                border: 1px solid rgba(33, 150, 243, 0.3);
                border-radius: 8px;
                margin-bottom: 15px;
            }

            .info-box i {
                color: #2196F3;
                flex-shrink: 0;
                margin-top: 2px;
            }

            .diagnostic-info {
                background: rgba(0, 0, 0, 0.2);
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 15px;
            }

            .diag-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 6px;
                font-size: 12px;
            }

            .action-buttons {
                display: flex;
                gap: 10px;
            }

            .action-buttons .btn {
                flex: 1;
                font-size: 12px;
                padding: 6px 12px;
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .spin {
                animation: spin 1s linear infinite;
            }

            /* Theme-specific adjustments */
            .theme-white .outlook-control-panel {
                background: rgba(255, 255, 255, 0.8);
                border: 1px solid rgba(0, 0, 0, 0.1);
                color: #333;
            }

            .theme-white .panel-header h3 {
                color: #333;
            }

            .theme-white .connection-status {
                background: rgba(0, 0, 0, 0.05);
            }

            .theme-white .sync-options,
            .theme-white .sync-status {
                background: rgba(0, 0, 0, 0.05);
            }

            .theme-white .status-item .label {
                color: rgba(0, 0, 0, 0.6);
            }

            .theme-white .status-item .value {
                color: #333;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Perform calendar synchronization
     */
    async performSync() {
        const syncRange = document.getElementById('sync-range')?.value || 'current-month';
        const { startDate, endDate } = this.calculateSyncRange(syncRange);
        
        const events = await window.microsoftGraphIntegration.syncCalendarEvents(startDate, endDate);
        
        // Update events count
        document.getElementById('events-count').textContent = events.length;
        
        // Show sync status
        document.getElementById('sync-status').style.display = 'block';
        document.getElementById('outlook-sync-options').style.display = 'block';
        
        return events;
    }

    /**
     * Calculate date range for synchronization
     */
    calculateSyncRange(range) {
        const now = new Date();
        let startDate, endDate;

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
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        return { startDate, endDate };
    }

    /**
     * Update last sync time display
     */
    updateLastSyncTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        document.getElementById('last-sync-time').textContent = timeString;
    }

    /**
     * Toggle auto-sync functionality
     */
    toggleAutoSync(enabled) {
        if (enabled) {
            this.startAutoSync();
        } else {
            this.stopAutoSync();
        }
    }

    startAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }
        
        // Default to 1 hour
        const frequency = parseInt(document.getElementById('sync-frequency')?.value || '60');
        
        this.autoSyncInterval = setInterval(async () => {
            if (window.microsoftGraphIntegration.isAuthenticated) {
                try {
                    await this.performSync();
                    this.updateLastSyncTime();
                } catch (error) {
                    console.error('Auto-sync failed:', error);
                }
            }
        }, frequency * 60 * 1000);
    }

    stopAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
        }
    }

    /**
     * Show settings modal
     */
    showSettingsModal() {
        this.settingsModal.style.display = 'flex';
        this.loadCurrentSettings();
    }

    /**
     * Hide settings modal
     */
    hideSettingsModal() {
        this.settingsModal.style.display = 'none';
    }

    /**
     * Load current settings into modal
     */
    loadCurrentSettings() {
        // Load settings from localStorage or defaults
        const settings = this.getStoredSettings();
        
        document.getElementById('calendar-filter').value = settings.calendarFilter || 'normal';
        document.getElementById('sync-frequency').value = settings.syncFrequency || 'disabled';
        document.getElementById('show-attendees').checked = settings.showAttendees || false;
        document.getElementById('show-location').checked = settings.showLocation || true;
        document.getElementById('create-tasks').checked = settings.createTasks || false;
        document.getElementById('respect-sensitivity').checked = settings.respectSensitivity !== false;
        document.getElementById('session-only').checked = settings.sessionOnly || false;
    }

    /**
     * Save settings from modal
     */
    saveSettings() {
        const settings = {
            calendarFilter: document.getElementById('calendar-filter').value,
            syncFrequency: document.getElementById('sync-frequency').value,
            showAttendees: document.getElementById('show-attendees').checked,
            showLocation: document.getElementById('show-location').checked,
            createTasks: document.getElementById('create-tasks').checked,
            respectSensitivity: document.getElementById('respect-sensitivity').checked,
            sessionOnly: document.getElementById('session-only').checked
        };

        localStorage.setItem('outlookIntegrationSettings', JSON.stringify(settings));
        this.hideSettingsModal();
        
        // Apply new settings
        this.applySettings(settings);
        
        window.showNotification?.('Settings saved successfully', 'success');
    }

    /**
     * Get stored settings
     */
    getStoredSettings() {
        try {
            const stored = localStorage.getItem('outlookIntegrationSettings');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Failed to load settings:', error);
            return {};
        }
    }

    /**
     * Apply settings to integration
     */
    applySettings(settings) {
        // Update auto-sync frequency
        if (settings.syncFrequency !== 'disabled') {
            document.getElementById('auto-sync-checkbox').checked = true;
            this.startAutoSync();
        } else {
            document.getElementById('auto-sync-checkbox').checked = false;
            this.stopAutoSync();
        }
    }
}

// Initialize Outlook UI when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.outlookUIIntegration = new OutlookUIIntegration();
    window.outlookUIIntegration.initialize();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OutlookUIIntegration;
}