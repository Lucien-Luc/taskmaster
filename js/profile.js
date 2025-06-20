// profile.js - Enhanced Profile Picture Upload Management
window.profileManager = {
    // Initialize profile functionality
    init: function() {
        console.log('Initializing profile manager...');
        this.setupProfileUpload();
        this.setupEventListeners();
    },

    // Setup profile picture upload functionality
    setupProfileUpload: function() {
        const uploadBtn = document.getElementById('upload-avatar-btn');
        const fileInput = document.getElementById('avatar-file-input');
        const currentAvatar = document.getElementById('current-user-avatar');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.authModule.canPerformTaskOperations()) {
                    fileInput.click();
                } else {
                    window.showNotification('Cannot change profile picture while account is blocked', 'error');
                }
            });

            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e);
            });
        }

        // Setup drag and drop for avatar
        if (currentAvatar) {
            currentAvatar.addEventListener('dragover', this.handleDragOver.bind(this));
            currentAvatar.addEventListener('drop', this.handleDrop.bind(this));
            currentAvatar.addEventListener('dragleave', this.handleDragLeave.bind(this));
            
            // Add click listener for avatar to show upload option
            currentAvatar.addEventListener('click', () => {
                if (window.authModule.canPerformTaskOperations()) {
                    fileInput.click();
                } else {
                    window.showNotification('Cannot change profile picture while account is blocked', 'error');
                }
            });
        }
    },

    // Setup additional event listeners
    setupEventListeners: function() {
        // Listen for auth changes to update avatar
        if (window.auth) {
            // Store original login function
            const originalLogin = window.auth.login;
            if (originalLogin) {
                window.auth.login = async (...args) => {
                    const result = await originalLogin.apply(window.auth, args);
                    if (result.success) {
                        this.updateAvatarDisplay();
                    }
                    return result;
                };
            }
        }

        // Listen for user blocking status changes
        document.addEventListener('userBlockingStatusChanged', () => {
            this.updateProfileUI();
        });
    },

    // Handle file selection
    handleFileSelect: function(event) {
        const file = event.target.files[0];
        if (file) {
            if (!window.authModule.canPerformTaskOperations()) {
                window.showNotification('Cannot change profile picture while account is blocked', 'error');
                return;
            }
            this.processImageFile(file);
        }
    },

    // Handle drag over
    handleDragOver: function(event) {
        if (!window.authModule.canPerformTaskOperations()) {
            return;
        }
        
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.style.opacity = '0.7';
        event.currentTarget.style.transform = 'scale(1.05)';
    },

    // Handle drag leave
    handleDragLeave: function(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.style.opacity = '1';
        event.currentTarget.style.transform = 'scale(1)';
    },

    // Handle drop
    handleDrop: function(event) {
        event.preventDefault();
        event.stopPropagation();
        
        event.currentTarget.style.opacity = '1';
        event.currentTarget.style.transform = 'scale(1)';
        
        if (!window.authModule.canPerformTaskOperations()) {
            window.showNotification('Cannot change profile picture while account is blocked', 'error');
            return;
        }
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                this.processImageFile(file);
            } else {
                window.showNotification('Please drop an image file', 'error');
            }
        }
    },

    // Process uploaded image file
    processImageFile: function(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            window.showNotification('Please select an image file', 'error');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            window.showNotification('Image file is too large. Please select a file smaller than 5MB', 'error');
            return;
        }

        window.showNotification('Processing image...', 'info');

        // Read and process the file
        const reader = new FileReader();
        reader.onload = (e) => {
            this.resizeAndOptimizeImage(e.target.result, (optimizedDataUrl) => {
                this.showAvatarPreview(optimizedDataUrl);
            });
        };
        reader.onerror = () => {
            window.showNotification('Error reading image file', 'error');
        };
        reader.readAsDataURL(file);
    },

    // Resize and optimize image
    resizeAndOptimizeImage: function(dataUrl, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set target dimensions (square aspect ratio)
            const targetSize = 200;
            const aspectRatio = img.width / img.height;
            
            let newWidth, newHeight;
            if (aspectRatio > 1) {
                // Landscape
                newWidth = targetSize;
                newHeight = targetSize / aspectRatio;
            } else {
                // Portrait or square
                newWidth = targetSize * aspectRatio;
                newHeight = targetSize;
            }

            // Set canvas size
            canvas.width = targetSize;
            canvas.height = targetSize;

            // Fill background with white
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetSize, targetSize);

            // Calculate position to center the image
            const x = (targetSize - newWidth) / 2;
            const y = (targetSize - newHeight) / 2;

            // Draw image
            ctx.drawImage(img, x, y, newWidth, newHeight);

            // Convert to optimized data URL
            const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            callback(optimizedDataUrl);
        };
        img.onerror = () => {
            window.showNotification('Error processing image', 'error');
        };
        img.src = dataUrl;
    },

    // Show avatar preview before uploading
    showAvatarPreview: function(dataUrl) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'avatar-preview-modal';
        previewContainer.innerHTML = `
            <div class="avatar-preview-content glass-strong">
                <div class="preview-header">
                    <h3>Profile Picture Preview</h3>
                    <button class="preview-close" type="button">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="preview-body">
                    <div class="preview-image-container">
                        <img src="${dataUrl}" alt="Avatar Preview" class="preview-image">
                    </div>
                    <p>This will be your new profile picture</p>
                </div>
                <div class="preview-actions">
                    <button class="btn btn-outline preview-cancel">Cancel</button>
                    <button class="btn btn-primary preview-confirm">Set as Profile Picture</button>
                </div>
            </div>
        `;

        document.body.appendChild(previewContainer);
        lucide.createIcons();

        // Event listeners
        previewContainer.querySelector('.preview-close').addEventListener('click', () => {
            this.closePreview(previewContainer);
        });

        previewContainer.querySelector('.preview-cancel').addEventListener('click', () => {
            this.closePreview(previewContainer);
        });

        previewContainer.querySelector('.preview-confirm').addEventListener('click', () => {
            this.closePreview(previewContainer);
            this.uploadAvatar(dataUrl);
        });

        // Close on backdrop click
        previewContainer.addEventListener('click', (e) => {
            if (e.target === previewContainer) {
                this.closePreview(previewContainer);
            }
        });
    },

    // Upload avatar to user profile
    uploadAvatar: async function(dataUrl) {
        const currentUser = window.auth?.currentUser;
        if (!currentUser) {
            window.showNotification('User not authenticated', 'error');
            return;
        }

        try {
            window.showNotification('Uploading profile picture...', 'info');

            // Update user avatar in Firestore
            const success = await window.authModule.updateUserAvatar(currentUser, dataUrl);
            
            if (success) {
                // Update UI immediately
                this.updateAvatarDisplay(dataUrl);
                window.showNotification('Profile picture updated successfully!', 'success');
            } else {
                window.showNotification('Failed to update profile picture', 'error');
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            window.showNotification('Error uploading profile picture', 'error');
        }
    },

    // Update avatar display in UI
    updateAvatarDisplay: function(newAvatarUrl = null) {
        const avatarImg = document.getElementById('current-user-avatar');
        const currentUser = window.auth?.currentUser;
        
        if (!avatarImg || !currentUser) return;

        const avatarUrl = newAvatarUrl || window.auth.userAvatar;
        
        if (avatarUrl && avatarUrl.trim() !== '') {
            avatarImg.src = avatarUrl;
            avatarImg.onerror = () => {
                // Fallback to generated avatar if custom avatar fails to load
                this.setFallbackAvatar(avatarImg, currentUser);
            };
        } else {
            this.setFallbackAvatar(avatarImg, currentUser);
        }
    },

    // Set fallback avatar using UI Avatars service
    setFallbackAvatar: function(imgElement, username) {
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=3b82f6&color=ffffff&size=200&bold=true`;
        imgElement.src = fallbackUrl;
    },

    // Close preview modal
    closePreview: function(previewContainer) {
        previewContainer.remove();
    },

    // Update profile UI based on user status
    updateProfileUI: function() {
        const uploadBtn = document.getElementById('upload-avatar-btn');
        const currentAvatar = document.getElementById('current-user-avatar');
        
        if (window.auth?.isBlocked) {
            // Disable profile picture changes when blocked
            if (uploadBtn) {
                uploadBtn.style.opacity = '0.5';
                uploadBtn.style.cursor = 'not-allowed';
                uploadBtn.title = 'Cannot change profile picture while account is blocked';
            }
            
            if (currentAvatar) {
                currentAvatar.style.cursor = 'not-allowed';
                currentAvatar.title = 'Cannot change profile picture while account is blocked';
            }
        } else {
            // Enable profile picture changes
            if (uploadBtn) {
                uploadBtn.style.opacity = '1';
                uploadBtn.style.cursor = 'pointer';
                uploadBtn.title = 'Change Profile Picture';
            }
            
            if (currentAvatar) {
                currentAvatar.style.cursor = 'pointer';
                currentAvatar.title = 'Click to change profile picture';
            }
        }
    },

    // Get current avatar data URL for export/backup
    getCurrentAvatarDataUrl: function() {
        return window.auth?.userAvatar || null;
    },

    // Validate image dimensions and format
    validateImage: function(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const validation = {
                    isValid: true,
                    errors: []
                };

                // Check dimensions (minimum 100x100, maximum 2000x2000)
                if (img.width < 100 || img.height < 100) {
                    validation.isValid = false;
                    validation.errors.push('Image must be at least 100x100 pixels');
                }

                if (img.width > 2000 || img.height > 2000) {
                    validation.isValid = false;
                    validation.errors.push('Image must be smaller than 2000x2000 pixels');
                }

                resolve(validation);
            };
            img.onerror = () => {
                reject(new Error('Invalid image file'));
            };
            img.src = URL.createObjectURL(file);
        });
    },

    // Reset profile to default avatar
    resetToDefaultAvatar: async function() {
        const currentUser = window.auth?.currentUser;
        if (!currentUser) return;

        if (!window.authModule.canPerformTaskOperations()) {
            window.showNotification('Cannot change profile picture while account is blocked', 'error');
            return;
        }

        try {
            const success = await window.authModule.updateUserAvatar(currentUser, '');
            if (success) {
                this.updateAvatarDisplay('');
                window.showNotification('Profile picture reset to default', 'success');
            }
        } catch (error) {
            console.error('Error resetting avatar:', error);
            window.showNotification('Error resetting profile picture', 'error');
        }
    }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager.init();
});

export default window.profileManager;
