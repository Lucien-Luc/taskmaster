// users.js - Enhanced User Authentication System with User Blocking
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Global auth object that other scripts can access
window.auth = {
    currentUser: null,
    isAuthenticated: false,
    userRole: null,
    userAvatar: null,
    isBlocked: false,
    blockedReason: '',
    // Methods that other scripts can use
    getCurrentUser: () => window.auth.currentUser,
    getUserRole: () => window.auth.userRole,
    isLoggedIn: () => window.auth.isAuthenticated,
    getUserAvatar: () => window.auth.userAvatar,
    isUserBlocked: () => window.auth.isBlocked,
    getBlockedReason: () => window.auth.blockedReason,
    // Add updateUserAvatar method reference
    updateUserAvatar: null
};

// Authentication functions
const auth = {
    // Simple SHA-256 hash function
    hashPassword: async (password) => {
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Check if user exists in Firestore
    checkUserExists: async (username) => {
        try {
            const userRef = doc(window.db, 'users', username);
            const docSnap = await getDoc(userRef);
            return docSnap.exists();
        } catch (error) {
            console.error('Error checking user existence:', error);
            return false;
        }
    },

    // Create new user in Firestore
    createUser: async (username, password, role, avatar = '') => {
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        const hashedPassword = await auth.hashPassword(password);
        await setDoc(doc(window.db, 'users', username), {
            username,
            password: hashedPassword,
            role,
            avatar,
            createdAt: new Date().toISOString(),
            isBlocked: false,
            blockedAt: null,
            blockedReason: ''
        });
    },

    // Verify user credentials
    verifyUser: async (username, password) => {
        const userRef = doc(window.db, 'users', username);
        const docSnap = await getDoc(userRef);
        
        if (!docSnap.exists()) {
            throw new Error('user-not-found');
        }
        
        const userData = docSnap.data();
        const hashedPassword = await auth.hashPassword(password);
        
        if (userData.password !== hashedPassword) {
            throw new Error('wrong-password');
        }
        
        return userData;
    },

    // Login function
    login: async (username, password) => {
        try {
            const userData = await auth.verifyUser(username, password);
            
            // Update global auth object
            window.auth.currentUser = username;
            window.auth.isAuthenticated = true;
            window.auth.userRole = userData.role;
            window.auth.userAvatar = userData.avatar || '';
            window.auth.isBlocked = userData.isBlocked || false;
            window.auth.blockedReason = userData.blockedReason || '';
            
            // Store session in localStorage
            localStorage.setItem('mne_auth', JSON.stringify({
                user: username,
                role: userData.role,
                avatar: userData.avatar || '',
                isBlocked: userData.isBlocked || false,
                blockedReason: userData.blockedReason || '',
                timestamp: new Date().getTime()
            }));
            
            // Update UI blocking status
            auth.updateBlockingUI();
            
            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    },

    // Logout function
    logout: () => {
        window.auth.currentUser = null;
        window.auth.isAuthenticated = false;
        window.auth.userRole = null;
        window.auth.userAvatar = null;
        window.auth.isBlocked = false;
        window.auth.blockedReason = '';
        localStorage.removeItem('mne_auth');
        
        // Clear any blocking UI
        auth.updateBlockingUI();
    },

    // Check session on page load
    checkSession: async () => {
        const session = localStorage.getItem('mne_auth');
        if (session) {
            try {
                const { user, role, avatar, isBlocked, blockedReason } = JSON.parse(session);
                
                // Verify user still exists in database
                const userExists = await auth.checkUserExists(user);
                if (!userExists) {
                    auth.logout();
                    return false;
                }
                
                // Get fresh user data to check for blocking status changes and latest avatar
                const userData = await auth.refreshUserData(user);
                
                window.auth.currentUser = user;
                window.auth.isAuthenticated = true;
                window.auth.userRole = role;
                window.auth.userAvatar = userData.avatar || ''; // Use fresh avatar from database
                window.auth.isBlocked = userData.isBlocked || false;
                window.auth.blockedReason = userData.blockedReason || '';
                
                // Update session with fresh data including avatar
                const sessionData = JSON.parse(session);
                sessionData.isBlocked = userData.isBlocked || false;
                sessionData.blockedReason = userData.blockedReason || '';
                sessionData.avatar = userData.avatar || ''; // Update avatar in session
                localStorage.setItem('mne_auth', JSON.stringify(sessionData));
                
                // Update UI blocking status
                auth.updateBlockingUI();
                
                return true;
            } catch (e) {
                console.error('Session parse error:', e);
                auth.logout();
                return false;
            }
        }
        return false;
    },

    // Refresh user data from database
    refreshUserData: async (username) => {
        try {
            const userRef = doc(window.db, 'users', username);
            const docSnap = await getDoc(userRef);
            
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return {};
        } catch (error) {
            console.error('Error refreshing user data:', error);
            return {};
        }
    },

    // Update user avatar
    updateUserAvatar: async (username, avatarUrl) => {
        try {
            const userRef = doc(window.db, 'users', username);
            await setDoc(userRef, { avatar: avatarUrl }, { merge: true });
            
            // Update local session
            window.auth.userAvatar = avatarUrl;
            const session = localStorage.getItem('mne_auth');
            if (session) {
                const sessionData = JSON.parse(session);
                sessionData.avatar = avatarUrl;
                localStorage.setItem('mne_auth', JSON.stringify(sessionData));
            }
            
            // Update avatar display immediately for current user
            const avatarImg = document.getElementById('current-user-avatar');
            if (avatarImg && window.auth.currentUser === username) {
                if (avatarUrl && avatarUrl.trim() !== '') {
                    avatarImg.src = avatarUrl;
                } else {
                    avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=3b82f6&color=ffffff&size=200&bold=true`;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error updating avatar:', error);
            return false;
        }
    },

    // Update user blocking status - MAIN FUNCTION FOR OVERDUE MANAGER
    updateUserBlockingStatus: async (username, isBlocked, reason = '') => {
        try {
            console.log(`Updating blocking status for ${username}: blocked=${isBlocked}, reason="${reason}"`);
            
            const userRef = doc(window.db, 'users', username);
            const updateData = {
                isBlocked,
                blockedReason: reason,
                blockedAt: isBlocked ? new Date().toISOString() : null,
                lastBlockingUpdate: new Date().toISOString()
            };
            
            await setDoc(userRef, updateData, { merge: true });
            
            // Update local session if it's the current user
            if (window.auth.currentUser === username) {
                console.log(`Updating local auth state for current user: ${username}`);
                window.auth.isBlocked = isBlocked;
                window.auth.blockedReason = reason;
                
                const session = localStorage.getItem('mne_auth');
                if (session) {
                    const sessionData = JSON.parse(session);
                    sessionData.isBlocked = isBlocked;
                    sessionData.blockedReason = reason;
                    localStorage.setItem('mne_auth', JSON.stringify(sessionData));
                }
                
                // Update UI
                auth.updateBlockingUI();
                
                // Show notification
                if (window.showNotification) {
                    if (isBlocked) {
                        window.showNotification(reason || 'Your account has been blocked due to overdue tasks', 'error');
                    } else {
                        window.showNotification('Account access restored - you can now create tasks', 'success');
                    }
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error updating user blocking status:', error);
            return false;
        }
    },

    // Check if user is currently blocked (fresh from database)
    checkUserBlockingStatus: async (username) => {
        try {
            const userData = await auth.refreshUserData(username);
            return {
                isBlocked: userData.isBlocked || false,
                reason: userData.blockedReason || '',
                blockedAt: userData.blockedAt || null
            };
        } catch (error) {
            console.error('Error checking user blocking status:', error);
            return { isBlocked: false, reason: '', blockedAt: null };
        }
    },

    // Update blocking UI elements
    updateBlockingUI: () => {
        const blockWarning = document.getElementById('user-block-warning');
        const blockMessage = document.getElementById('block-warning-message');
        const createTaskBtn = document.getElementById('create-task-btn');
        const kanbanBoard = document.getElementById('kanban-board');
        
        if (window.auth.isBlocked) {
            // Show warning with self-unblocking instructions
            if (blockWarning) {
                blockWarning.classList.remove('hidden');
                if (blockMessage) {
                    let message = window.auth.blockedReason || 'You have overdue tasks that require attention.';
                    
                    // Add self-unblocking instructions if available
                    if (window.overdueManager && window.taskManager && window.taskManager.tasks) {
                        const canSelfUnblock = window.overdueManager.canUserUnblockSelf(
                            window.taskManager.tasks, 
                            window.auth.currentUser
                        );
                        
                        if (canSelfUnblock) {
                            const instructions = window.overdueManager.getSelfUnblockingInstructions(
                                window.taskManager.tasks, 
                                window.auth.currentUser
                            );
                            message += '\n\n' + instructions;
                        }
                    }
                    
                    blockMessage.textContent = message;
                }
            }
            
            // Disable task creation
            if (createTaskBtn) {
                createTaskBtn.disabled = true;
                createTaskBtn.innerHTML = '<i data-lucide="lock"></i> Account Blocked';
                createTaskBtn.classList.add('opacity-50', 'cursor-not-allowed');
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }
            
            // Add visual indicator to kanban board
            if (kanbanBoard) {
                kanbanBoard.classList.add('blocked-mode');
            }
        } else {
            // Hide warning
            if (blockWarning) {
                blockWarning.classList.add('hidden');
            }
            
            // Enable task creation
            if (createTaskBtn) {
                createTaskBtn.disabled = false;
                createTaskBtn.innerHTML = '<i data-lucide="plus"></i> Create Task';
                createTaskBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                if (window.lucide) {
                    window.lucide.createIcons();
                }
            }
            
            // Remove visual indicator from kanban board
            if (kanbanBoard) {
                kanbanBoard.classList.remove('blocked-mode');
            }
        }
        
        // Trigger custom event for other modules to respond to blocking status changes
        const blockingEvent = new CustomEvent('userBlockingStatusChanged', {
            detail: {
                username: window.auth.currentUser,
                isBlocked: window.auth.isBlocked,
                reason: window.auth.blockedReason
            }
        });
        document.dispatchEvent(blockingEvent);
    },

    // Check if user can perform task operations
    canPerformTaskOperations: () => {
        return window.auth.isAuthenticated && !window.auth.isBlocked;
    },

    // Check if user can create new tasks
    canCreateTasks: () => {
        return window.auth.isAuthenticated && !window.auth.isBlocked;
    },

    // Check if user can move tasks (including blocked tasks for self-unblocking)
    canMoveTasks: () => {
        return window.auth.isAuthenticated; // Allowed even when blocked for self-unblocking
    },

    // Get user blocking summary for dashboard
    getUserBlockingSummary: () => {
        return {
            isBlocked: window.auth.isBlocked,
            reason: window.auth.blockedReason,
            canCreateTasks: auth.canCreateTasks(),
            canMoveTasks: auth.canMoveTasks(),
            canPerformOperations: auth.canPerformTaskOperations()
        };
    },

    // Self-unblock function - allows users to unblock themselves with grace period
    selfUnblock: async () => {
        if (!window.auth.isAuthenticated || !window.auth.currentUser) {
            showNotification('You must be logged in to unblock yourself', 'error');
            return false;
        }

        try {
            const username = window.auth.currentUser;
            console.log(`User ${username} is attempting to self-unblock`);
            
            // Unblock the user and start grace period
            const success = await auth.updateUserBlockingStatus(username, false, '');
            
            if (success) {
                // Start 5-minute grace period countdown
                auth.startGracePeriodCountdown();
                showNotification('Account unblocked! You have 5 minutes to move overdue tasks to paused status', 'warning');
                return true;
            } else {
                showNotification('Failed to unblock your account. Please try again.', 'error');
                return false;
            }
        } catch (error) {
            console.error('Error during self-unblock:', error);
            showNotification('An error occurred while unblocking your account', 'error');
            return false;
        }
    },

    // Start grace period countdown after self-unblock
    startGracePeriodCountdown: () => {
        const gracePeriodDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
        const startTime = Date.now();
        
        // Store grace period start time
        localStorage.setItem('gracePeriodStart', startTime.toString());
        
        // Show countdown UI
        auth.showGracePeriodUI();
        
        // Start countdown timer
        const countdownInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = gracePeriodDuration - elapsed;
            
            if (remaining <= 0) {
                clearInterval(countdownInterval);
                auth.endGracePeriod();
            } else {
                auth.updateGracePeriodDisplay(remaining);
            }
        }, 1000);
        
        // Store interval ID for cleanup
        window.gracePeriodInterval = countdownInterval;
    },

    // Show grace period UI
    showGracePeriodUI: () => {
        const blockWarning = document.getElementById('user-block-warning');
        const blockMessage = document.getElementById('block-warning-message');
        const selfUnblockBtn = document.getElementById('self-unblock-btn');
        
        if (blockWarning && blockMessage) {
            blockWarning.classList.remove('hidden');
            blockMessage.innerHTML = `
                <strong>Grace Period Active</strong>
                <p>You have <span id="grace-countdown">5:00</span> remaining to move overdue tasks to paused status.</p>
                <p>Drag overdue tasks to the "Paused" column to avoid being blocked again.</p>
            `;
            
            // Hide self-unblock button during grace period
            if (selfUnblockBtn) {
                selfUnblockBtn.style.display = 'none';
            }
        }
    },

    // Update grace period countdown display
    updateGracePeriodDisplay: (remainingMs) => {
        const countdownEl = document.getElementById('grace-countdown');
        if (countdownEl) {
            const minutes = Math.floor(remainingMs / 60000);
            const seconds = Math.floor((remainingMs % 60000) / 1000);
            countdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    },

    // End grace period and check for overdue tasks
    endGracePeriod: async () => {
        console.log('Grace period ended, checking for overdue tasks...');
        
        // Clear grace period from localStorage
        localStorage.removeItem('gracePeriodStart');
        
        // Clear interval
        if (window.gracePeriodInterval) {
            clearInterval(window.gracePeriodInterval);
            delete window.gracePeriodInterval;
        }
        
        // Check if user still has overdue tasks
        if (window.taskManager && window.taskManager.tasks && window.overdueManager) {
            const currentUser = window.auth.currentUser;
            const tasks = window.taskManager.tasks;
            
            const userOverdueTasks = tasks.filter(task => {
                return task.assignedUsers && 
                       task.assignedUsers.includes(currentUser) && 
                       task.status !== 'completed' && 
                       task.status !== 'paused' && 
                       window.overdueManager.isTaskOverdue(task);
            });
            
            if (userOverdueTasks.length > 0) {
                // Re-block the user
                await auth.updateUserBlockingStatus(currentUser, true, 
                    `Grace period expired. You still have ${userOverdueTasks.length} overdue task(s) that need attention.`);
                showNotification('Grace period expired! You have been blocked again due to unresolved overdue tasks.', 'error');
            } else {
                // Hide grace period UI
                auth.hideGracePeriodUI();
                showNotification('Great! All overdue tasks have been resolved.', 'success');
            }
        }
    },

    // Hide grace period UI
    hideGracePeriodUI: () => {
        const blockWarning = document.getElementById('user-block-warning');
        if (blockWarning) {
            blockWarning.classList.add('hidden');
        }
    },

    // Check if user is in grace period (on page load)
    checkGracePeriod: () => {
        const gracePeriodStart = localStorage.getItem('gracePeriodStart');
        if (gracePeriodStart && !window.auth.isBlocked) {
            const startTime = parseInt(gracePeriodStart);
            const elapsed = Date.now() - startTime;
            const gracePeriodDuration = 5 * 60 * 1000; // 5 minutes
            
            if (elapsed < gracePeriodDuration) {
                // Resume grace period countdown
                const remaining = gracePeriodDuration - elapsed;
                auth.showGracePeriodUI();
                auth.updateGracePeriodDisplay(remaining);
                
                const countdownInterval = setInterval(() => {
                    const newElapsed = Date.now() - startTime;
                    const newRemaining = gracePeriodDuration - newElapsed;
                    
                    if (newRemaining <= 0) {
                        clearInterval(countdownInterval);
                        auth.endGracePeriod();
                    } else {
                        auth.updateGracePeriodDisplay(newRemaining);
                    }
                }, 1000);
                
                window.gracePeriodInterval = countdownInterval;
            } else {
                // Grace period expired, check overdue tasks
                auth.endGracePeriod();
            }
        }
    }
};

// DOM Event Listeners and UI Functions
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize UI elements
    const loginModal = document.getElementById('login-modal');
    const createUserModal = document.getElementById('create-user-modal');
    const appContainer = document.getElementById('app-container');
    const loginForm = document.getElementById('login-form');
    const createUserForm = document.getElementById('create-user-form');
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');

    // Show loading status
    if (statusText) statusText.textContent = "Connecting to Firebase...";
    
    try {
        // Check for existing session
        const hasSession = await auth.checkSession();
        
        if (hasSession) {
            // Hide login modal, show app
            if (loginModal) loginModal.classList.add('hidden');
            if (appContainer) appContainer.classList.remove('hidden');
            
            // Update UI with user info
            const userNameEl = document.getElementById('current-user-name');
            const userRoleEl = document.getElementById('current-user-role');
            if (userNameEl) userNameEl.textContent = window.auth.currentUser;
            if (userRoleEl) userRoleEl.textContent = window.auth.userRole;
            
            // Update avatar
            const avatarImg = document.getElementById('current-user-avatar');
            if (avatarImg) {
                if (window.auth.userAvatar) {
                    avatarImg.src = window.auth.userAvatar;
                    avatarImg.onerror = () => {
                        avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(window.auth.currentUser)}&background=3b82f6&color=ffffff&size=200&bold=true`;
                    };
                } else {
                    avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(window.auth.currentUser)}&background=3b82f6&color=ffffff&size=200&bold=true`;
                }
            }
            
            if (statusText) statusText.textContent = "Connected";
            if (statusIndicator) statusIndicator.classList.add('connected');
            
            // Check if user is in grace period
            auth.checkGracePeriod();
        } else {
            if (loginModal) loginModal.classList.remove('hidden');
            if (statusText) statusText.textContent = "Ready to login";
            if (statusIndicator) statusIndicator.classList.add('connected');
        }
    } catch (error) {
        console.error('Initialization error:', error);
        if (statusText) statusText.textContent = "Connection error";
        if (statusIndicator) statusIndicator.classList.add('error');
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('login-name');
            const passwordInput = document.getElementById('login-password');
            
            if (!usernameInput || !passwordInput) return;
            
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            
            if (!submitBtn) return;
            
            // Save original button text
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Authenticating...';
            if (window.lucide) window.lucide.createIcons();
            
            const result = await auth.login(username, password);
            
            if (result.success) {
                if (loginModal) loginModal.classList.add('hidden');
                if (appContainer) appContainer.classList.remove('hidden');
                
                // Update UI with user info
                const userNameEl = document.getElementById('current-user-name');
                const userRoleEl = document.getElementById('current-user-role');
                if (userNameEl) userNameEl.textContent = username;
                if (userRoleEl) userRoleEl.textContent = window.auth.userRole;
                
                // Update avatar
                const avatarImg = document.getElementById('current-user-avatar');
                if (avatarImg) {
                    if (window.auth.userAvatar) {
                        avatarImg.src = window.auth.userAvatar;
                        avatarImg.onerror = () => {
                            avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=3b82f6&color=ffffff&size=200&bold=true`;
                        };
                    } else {
                        avatarImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=3b82f6&color=ffffff&size=200&bold=true`;
                    }
                }
                
                // Initialize task manager after successful login
                if (window.taskManager && typeof window.taskManager.init === 'function') {
                    await window.taskManager.init();
                }
            } else {
                // Reset button
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
                
                // Show appropriate error message
                let errorMessage = "Login failed";
                if (result.error === 'user-not-found') {
                    errorMessage = "User not found";
                } else if (result.error === 'wrong-password') {
                    errorMessage = "Incorrect password";
                }
                
                // Show error notification
                if (window.showNotification) {
                    window.showNotification(errorMessage, 'error');
                }
            }
        });
    }
    
    // Create user form submission
    if (createUserForm) {
        createUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('user-name');
            const roleInput = document.getElementById('user-role');
            const avatarInput = document.getElementById('user-avatar');
            const passwordInput = document.getElementById('user-password');
            
            if (!usernameInput || !roleInput || !passwordInput) return;
            
            const username = usernameInput.value.trim();
            const role = roleInput.value;
            const avatar = avatarInput ? avatarInput.value.trim() : '';
            const password = passwordInput.value;
            const submitBtn = createUserForm.querySelector('button[type="submit"]');
            
            if (!submitBtn) return;
            
            // Save original button text
            const originalBtnText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Creating User...';
            if (window.lucide) window.lucide.createIcons();
            
            try {
                if (password.length < 6) {
                    throw new Error('Password must be at least 6 characters long');
                }
                
                await auth.createUser(username, password, role, avatar);
                if (window.showNotification) {
                    window.showNotification('User created successfully!', 'success');
                }
                
                // Reset form and switch back to login
                createUserForm.reset();
                if (createUserModal) createUserModal.classList.add('hidden');
                if (loginModal) loginModal.classList.remove('hidden');
            } catch (error) {
                console.error('Error creating user:', error);
                if (window.showNotification) {
                    window.showNotification(error.message || 'Error creating user', 'error');
                }
            } finally {
                // Reset button
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }
    
    // Toggle between login and create user modals
    const createUserBtn = document.getElementById('create-user-btn');
    const closeCreateUserBtn = document.getElementById('close-create-user');
    const cancelCreateUserBtn = document.getElementById('cancel-create-user');
    
    if (createUserBtn) {
        createUserBtn.addEventListener('click', () => {
            if (loginModal) loginModal.classList.add('hidden');
            if (createUserModal) createUserModal.classList.remove('hidden');
        });
    }
    
    if (closeCreateUserBtn) {
        closeCreateUserBtn.addEventListener('click', () => {
            if (createUserModal) createUserModal.classList.add('hidden');
            if (loginModal) loginModal.classList.remove('hidden');
        });
    }
    
    if (cancelCreateUserBtn) {
        cancelCreateUserBtn.addEventListener('click', () => {
            if (createUserModal) createUserModal.classList.add('hidden');
            if (loginModal) loginModal.classList.remove('hidden');
        });
    }
    
    // Self-unblock button
    const selfUnblockBtn = document.getElementById('self-unblock-btn');
    if (selfUnblockBtn) {
        selfUnblockBtn.addEventListener('click', async () => {
            const originalText = selfUnblockBtn.innerHTML;
            selfUnblockBtn.disabled = true;
            selfUnblockBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Unblocking...';
            if (window.lucide) window.lucide.createIcons();
            
            const success = await auth.selfUnblock();
            
            // Reset button
            selfUnblockBtn.disabled = false;
            selfUnblockBtn.innerHTML = originalText;
            if (window.lucide) window.lucide.createIcons();
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.logout();
            if (appContainer) appContainer.classList.add('hidden');
            if (loginModal) loginModal.classList.remove('hidden');
            if (loginForm) loginForm.reset();
            if (window.showNotification) {
                window.showNotification('Logged out successfully', 'success');
            }
        });
    }
});

// Notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i data-lucide="${type === 'error' ? 'alert-circle' : type === 'success' ? 'check-circle' : 'info'}"></i>
        <span>${message}</span>
    `;
    
    const container = document.getElementById('notification-container');
    if (container) {
        container.appendChild(notification);
        if (window.lucide) {
            window.lucide.createIcons();
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }
}

// Periodic check for blocking status changes (every 30 seconds)
setInterval(async () => {
    if (window.auth.isAuthenticated && window.auth.currentUser) {
        const freshStatus = await auth.checkUserBlockingStatus(window.auth.currentUser);
        
        // If blocking status has changed, update local state
        if (freshStatus.isBlocked !== window.auth.isBlocked) {
            console.log(`Blocking status changed for ${window.auth.currentUser}: ${freshStatus.isBlocked}`);
            window.auth.isBlocked = freshStatus.isBlocked;
            window.auth.blockedReason = freshStatus.reason;
            
            // Update session storage
            const session = localStorage.getItem('mne_auth');
            if (session) {
                const sessionData = JSON.parse(session);
                sessionData.isBlocked = freshStatus.isBlocked;
                sessionData.blockedReason = freshStatus.reason;
                localStorage.setItem('mne_auth', JSON.stringify(sessionData));
            }
            
            // Update UI
            auth.updateBlockingUI();
        }
    }
}, 30000); // 30 seconds

// Initialize auth when script loads
auth.checkSession().then(hasSession => {
    if (hasSession) {
        console.log('User session restored:', window.auth.currentUser);
    }
});

// Add authModule for compatibility and assign updateUserAvatar method
window.authModule = {
    canPerformTaskOperations: () => !window.auth.isBlocked,
    updateUserAvatar: auth.updateUserAvatar
};

// Assign updateUserAvatar method to window.auth
window.auth.updateUserAvatar = auth.updateUserAvatar;
window.showNotification = showNotification;