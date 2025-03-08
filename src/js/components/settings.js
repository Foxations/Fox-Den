/**
 * FoxDen Settings Management
 * 
 * Handles all functionality related to application settings
 */

const SettingsManager = {
  // Track initialization state
  initialized: false,
  
  // Currently active settings category
  activeCategory: 'account',
  
  /**
   * Initialize the settings manager
   */
  init: function() {
    if (this.initialized) return;
    
    // Cache DOM elements
    this.settingsPanel = document.getElementById('settings-panel');
    this.settingsSidebar = document.getElementById('settings-sidebar');
    this.settingsContent = document.getElementById('settings-content');
    
    // Set up event listeners
    this._setupEventListeners();
    
    // Subscribe to state changes
    AppState.subscribe('settingsOpen', (isOpen) => this._handleSettingsToggle(isOpen));
    AppState.subscribe('activeSettingsTab', (tab) => this._handleSettingsTabChange(tab));
    
    this.initialized = true;
  },
  
  /**
   * Set up event listeners for settings-related elements
   * @private
   */
  _setupEventListeners: function() {
    // Handle settings button click
    document.getElementById('open-settings').addEventListener('click', () => {
      this.showSettings();
    });
    
    // Handle close settings button click
    document.getElementById('close-settings').addEventListener('click', () => {
      this.hideSettings();
    });
    
    // Handle settings category clicks
    this.settingsSidebar.addEventListener('click', (e) => {
      const category = e.target.closest('.settings-category');
      if (category) {
        const categoryId = category.dataset.category;
        
        if (categoryId === 'logout') {
          this._handleLogout();
        } else {
          this.showSettings(categoryId);
        }
      }
    });
  },
  
  /**
   * Show the settings panel
   * @param {string} [category] - The settings category to show
   */
  showSettings: function(category = null) {
    // If a category is specified, set it as active
    if (category) {
      this.activeCategory = category;
      AppState.set('activeSettingsTab', category);
    }
    
    // Update active category in sidebar
    this._updateActiveCategorySidebar();
    
    // Load content for the active category
    this._loadCategoryContent(this.activeCategory);
    
    // Show settings panel
    this.settingsPanel.classList.add('active');
    AppState.set('settingsOpen', true);
  },
  
  /**
   * Hide the settings panel
   */
  hideSettings: function() {
    this.settingsPanel.classList.remove('active');
    AppState.set('settingsOpen', false);
  },
  
  /**
   * Handle settings panel toggle
   * @param {boolean} isOpen - Whether the settings panel is open
   * @private
   */
  _handleSettingsToggle: function(isOpen) {
    this.settingsPanel.classList.toggle('active', isOpen);
  },
  
  /**
   * Handle settings tab change
   * @param {string} tab - The new active tab
   * @private
   */
  _handleSettingsTabChange: function(tab) {
    this.activeCategory = tab;
    this._updateActiveCategorySidebar();
    this._loadCategoryContent(tab);
  },
  
  /**
   * Update the active category in the sidebar
   * @private
   */
  _updateActiveCategorySidebar: function() {
    const categories = this.settingsSidebar.querySelectorAll('.settings-category');
    
    categories.forEach(category => {
      category.classList.toggle('active', category.dataset.category === this.activeCategory);
    });
  },
  
  /**
   * Load content for a settings category
   * @param {string} category - The category to load
   * @private
   */
  _loadCategoryContent: function(category) {
    // Clear existing content
    this.settingsContent.innerHTML = '';
    
    // Load category content
    switch (category) {
      case 'account':
        this._loadAccountSettings();
        break;
      case 'profile':
        this._loadProfileSettings();
        break;
      case 'privacy':
        this._loadPrivacySettings();
        break;
      case 'appearance':
        this._loadAppearanceSettings();
        break;
      case 'accessibility':
        this._loadAccessibilitySettings();
        break;
      case 'voice':
        this._loadVoiceSettings();
        break;
      case 'text':
        this._loadTextSettings();
        break;
      case 'notifications':
        this._loadNotificationSettings();
        break;
      case 'keybinds':
        this._loadKeybindSettings();
        break;
      case 'language':
        this._loadLanguageSettings();
        break;
      default:
        this._loadAccountSettings();
    }
  },
  
  /**
   * Load account settings content
   * @private
   */
  _loadAccountSettings: function() {
    const user = AppState.get('currentUser');
    
    const accountHtml = `
      <div class="settings-section">
        <h3>My Account</h3>
        
        <div class="account-info">
          <div class="account-avatar">
            <div class="avatar-wrapper">${user.avatar || Utils.getInitials(user.username)}</div>
            <div class="avatar-edit">Edit</div>
          </div>
          
          <div class="account-details">
            <div class="edit-field">
              <label>Username</label>
              <input type="text" id="settings-username" value="${user.username}#${user.tag}" />
            </div>
            
            <div class="edit-field">
              <label>Email</label>
              <input type="email" id="settings-email" value="fox@foxden.com" />
            </div>
            
            <div class="edit-field">
              <label>Phone Number</label>
              <input type="tel" id="settings-phone" value="+1 (555) 123-4567" />
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Password and Authentication</h4>
          <button class="change-button" id="change-password">Change Password</button>
          <button class="change-button" id="enable-2fa">Enable Two-Factor Authentication</button>
        </div>
        
        <div class="settings-group danger-zone">
          <h4>Account Removal</h4>
          <p>Disabling your account means you can recover it later.</p>
          <button class="disable-button" id="disable-account">Disable Account</button>
          <p>This will permanently delete your account.</p>
          <button class="delete-button" id="delete-account">Delete Account</button>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = accountHtml;
    
    // Set up event listeners
    document.getElementById('change-password').addEventListener('click', () => {
      this._showChangePasswordModal();
    });
    
    document.getElementById('enable-2fa').addEventListener('click', () => {
      Utils.showToast('Two-Factor Authentication setup would open here', 'info');
    });
    
    document.getElementById('disable-account').addEventListener('click', () => {
      if (confirm('Are you sure you want to disable your account? You can recover it later by logging in again.')) {
        Utils.showToast('Account has been disabled', 'success');
      }
    });
    
    document.getElementById('delete-account').addEventListener('click', () => {
      if (confirm('Are you sure you want to PERMANENTLY DELETE your account? This cannot be undone!')) {
        if (prompt('Please type "DELETE" to confirm:') === 'DELETE') {
          Utils.showToast('Account has been deleted', 'success');
          setTimeout(() => window.location.reload(), 2000);
        }
      }
    });
    
    document.querySelector('.avatar-edit').addEventListener('click', () => {
      this._showAvatarEditModal();
    });
    
    // Handle account info changes
    document.getElementById('settings-username').addEventListener('change', (e) => {
      this._handleUsernameChange(e.target.value);
    });
    
    document.getElementById('settings-email').addEventListener('change', (e) => {
      Utils.showToast('Email updated', 'success');
    });
    
    document.getElementById('settings-phone').addEventListener('change', (e) => {
      Utils.showToast('Phone number updated', 'success');
    });
  },
  
  /**
   * Load profile settings content
   * @private
   */
  _loadProfileSettings: function() {
    const user = AppState.get('currentUser');
    
    const profileHtml = `
      <div class="settings-section">
        <h3>User Profile</h3>
        
        <div class="profile-preview">
          <div class="profile-preview-header">
            <div class="avatar-wrapper" style="background-color: ${Utils.getRandomAvatarColor()}">${user.avatar || Utils.getInitials(user.username)}</div>
            <div>
              <div class="profile-username">${user.username}</div>
              <div class="profile-tag">#${user.tag}</div>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>About Me</h4>
          <textarea class="profile-bio-input" id="profile-bio" placeholder="Tell us about yourself...">${user.bio || ''}</textarea>
        </div>
        
        <div class="settings-group">
          <h4>Profile Color</h4>
          <p>Choose a color for your name in the den.</p>
          <div class="profile-color-picker">
            <div class="color-option active" style="background-color: #ff7518;" data-color="#ff7518"></div>
            <div class="color-option" style="background-color: #ff4f4f;" data-color="#ff4f4f"></div>
            <div class="color-option" style="background-color: #4fafff;" data-color="#4fafff"></div>
            <div class="color-option" style="background-color: #4fff4f;" data-color="#4fff4f"></div>
            <div class="color-option" style="background-color: #d14fff;" data-color="#d14fff"></div>
            <div class="color-option" style="background-color: #ff4fa6;" data-color="#ff4fa6"></div>
            <div class="color-option" style="background-color: #ffd700;" data-color="#ffd700"></div>
            <div class="color-option" style="background-color: #00c3ff;" data-color="#00c3ff"></div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Profile Banner</h4>
          <button class="change-button" id="change-banner">Change Banner</button>
        </div>
        
        <div class="settings-actions">
          <button class="change-button" id="save-profile">Save Changes</button>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = profileHtml;
    
    // Set up event listeners
    document.querySelectorAll('.color-option').forEach(option => {
      option.addEventListener('click', () => {
        // Remove active class from all options
        document.querySelectorAll('.color-option').forEach(opt => {
          opt.classList.remove('active');
        });
        
        // Add active class to clicked option
        option.classList.add('active');
      });
    });
    
    document.getElementById('change-banner').addEventListener('click', () => {
      Utils.showToast('Banner selection would open here', 'info');
    });
    
    document.getElementById('save-profile').addEventListener('click', () => {
      const bio = document.getElementById('profile-bio').value;
      const colorOption = document.querySelector('.color-option.active');
      const color = colorOption ? colorOption.dataset.color : '#ff7518';
      
      // Update user in state
      const updatedUser = { ...user, bio, color };
      AppState.set('currentUser', updatedUser);
      
      Utils.showToast('Profile updated successfully', 'success');
    });
  },
  
  /**
   * Load privacy settings content
   * @private
   */
  _loadPrivacySettings: function() {
    const privacyHtml = `
      <div class="settings-section">
        <h3>Privacy & Safety</h3>
        
        <div class="settings-group">
          <h4>Privacy Settings</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Show when you're online</div>
              <div class="privacy-option-description">Let others see when you're online</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="online-status" class="toggle-input" checked>
              <label for="online-status" class="toggle-slider"></label>
            </div>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Allow direct messages</div>
              <div class="privacy-option-description">Let people message you directly</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="allow-dms" class="toggle-input" checked>
              <label for="allow-dms" class="toggle-slider"></label>
            </div>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Friend requests</div>
              <div class="privacy-option-description">Who can send you friend requests</div>
            </div>
            <select id="friend-requests">
              <option value="everyone">Everyone</option>
              <option value="friends-of-friends">Friends of Friends</option>
              <option value="den-members">Den Members Only</option>
              <option value="nobody">Nobody</option>
            </select>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Safety Settings</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Filter explicit content</div>
              <div class="privacy-option-description">Filter out potentially explicit content</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="filter-content" class="toggle-input" checked>
              <label for="filter-content" class="toggle-slider"></label>
            </div>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Safe direct messaging</div>
              <div class="privacy-option-description">Automatically scan and delete unsafe direct messages</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="safe-dms" class="toggle-input" checked>
              <label for="safe-dms" class="toggle-slider"></label>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Data & Privacy</h4>
          <button class="change-button" id="request-data">Request Account Data</button>
          <button class="change-button" id="privacy-settings">Manage Privacy Settings</button>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = privacyHtml;
    
    // Set up event listeners
    document.getElementById('request-data').addEventListener('click', () => {
      Utils.showToast('Your data has been requested. You will receive an email when it is ready.', 'success');
    });
    
    document.getElementById('privacy-settings').addEventListener('click', () => {
      Utils.showToast('Advanced privacy settings would open here', 'info');
    });
    
    // Handle toggle changes
    document.querySelectorAll('.toggle-input').forEach(toggle => {
      toggle.addEventListener('change', () => {
        Utils.showToast(`Setting updated: ${toggle.id}`, 'success');
      });
    });
    
    // Handle dropdown changes
    document.getElementById('friend-requests').addEventListener('change', (e) => {
      Utils.showToast(`Friend request setting updated to: ${e.target.options[e.target.selectedIndex].text}`, 'success');
    });
  },
  
  /**
   * Load appearance settings content
   * @private
   */
  _loadAppearanceSettings: function() {
    const currentTheme = AppState.get('currentTheme');
    
    const appearanceHtml = `
      <div class="settings-section">
        <h3>Appearance</h3>
        
        <div class="settings-group">
          <h4>Theme</h4>
          
          <div class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">
            <div class="theme-preview dark">
              <div class="theme-preview-sidebar"></div>
            </div>
            <div class="theme-info">
              <div class="theme-name">Dark</div>
              <div class="theme-description">A dark theme for low-light environments</div>
            </div>
          </div>
          
          <div class="theme-option ${currentTheme === 'light' ? 'active' : ''}" data-theme="light">
            <div class="theme-preview light">
              <div class="theme-preview-sidebar"></div>
            </div>
            <div class="theme-info">
              <div class="theme-name">Light</div>
              <div class="theme-description">A bright theme for well-lit environments</div>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Font</h4>
          
          <div class="font-option active" data-font="segoe-ui">
            <div class="font-preview" style="font-family: 'Segoe UI', sans-serif;">Aa</div>
            <div class="font-info">
              <div class="font-name">Segoe UI</div>
              <div class="font-description">Default font (recommended)</div>
            </div>
          </div>
          
          <div class="font-option" data-font="roboto">
            <div class="font-preview" style="font-family: 'Roboto', sans-serif;">Aa</div>
            <div class="font-info">
              <div class="font-name">Roboto</div>
              <div class="font-description">Google's signature font</div>
            </div>
          </div>
          
          <div class="font-option" data-font="open-sans">
            <div class="font-preview" style="font-family: 'Open Sans', sans-serif;">Aa</div>
            <div class="font-info">
              <div class="font-name">Open Sans</div>
              <div class="font-description">Clean and modern</div>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Chat Appearance</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Compact Mode</div>
              <div class="privacy-option-description">Make chat messages smaller and more compact</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="compact-mode" class="toggle-input">
              <label for="compact-mode" class="toggle-slider"></label>
            </div>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Show message timestamps</div>
              <div class="privacy-option-description">Always show timestamps next to messages</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="show-timestamps" class="toggle-input" checked>
              <label for="show-timestamps" class="toggle-slider"></label>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = appearanceHtml;
    
    // Set up event listeners
    document.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        
        // Update theme in state
        AppState.set('currentTheme', theme);
        
        // Update body class
        document.body.className = `theme-${theme}`;
        
        // Update active class
        document.querySelectorAll('.theme-option').forEach(opt => {
          opt.classList.toggle('active', opt.dataset.theme === theme);
        });
        
        Utils.showToast(`Theme changed to ${theme}`, 'success');
      });
    });
    
    document.querySelectorAll('.font-option').forEach(option => {
      option.addEventListener('click', () => {
        const font = option.dataset.font;
        
        // Remove active class from all options
        document.querySelectorAll('.font-option').forEach(opt => {
          opt.classList.remove('active');
        });
        
        // Add active class to clicked option
        option.classList.add('active');
        
        Utils.showToast(`Font changed to ${option.querySelector('.font-name').textContent}`, 'success');
      });
    });
    
    // Handle toggle changes
    document.querySelectorAll('.toggle-input').forEach(toggle => {
      toggle.addEventListener('change', () => {
        Utils.showToast(`Setting updated: ${toggle.id}`, 'success');
      });
    });
  },
  
  /**
   * Load accessibility settings content
   * @private
   */
  _loadAccessibilitySettings: function() {
    const accessibilityHtml = `
      <div class="settings-section">
        <h3>Accessibility</h3>
        
        <div class="settings-group">
          <h4>Text Scaling</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Text Size</div>
              <div class="privacy-option-description">Adjust the size of text in the app</div>
            </div>
            <input type="range" min="80" max="150" value="100" class="slider" id="text-size-slider">
          </div>
          
          <div class="text-size-preview">
            <p style="font-size: 1rem;">This is how text will appear throughout the app.</p>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Motion</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Reduce Motion</div>
              <div class="privacy-option-description">Reduce animations throughout the app</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="reduce-motion" class="toggle-input">
              <label for="reduce-motion" class="toggle-slider"></label>
            </div>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Disable GIF Autoplay</div>
              <div class="privacy-option-description">Only play GIFs when you click on them</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="disable-gif-autoplay" class="toggle-input">
              <label for="disable-gif-autoplay" class="toggle-slider"></label>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Vision</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">High Contrast Mode</div>
              <div class="privacy-option-description">Increase contrast for better readability</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="high-contrast" class="toggle-input">
              <label for="high-contrast" class="toggle-slider"></label>
            </div>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Saturation</div>
              <div class="privacy-option-description">Adjust color intensity</div>
            </div>
            <input type="range" min="0" max="200" value="100" class="slider" id="saturation-slider">
          </div>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = accessibilityHtml;
    
    // Set up event listeners
    document.getElementById('text-size-slider').addEventListener('input', (e) => {
      const size = e.target.value;
      document.querySelector('.text-size-preview p').style.fontSize = `${size / 100}rem`;
    });
    
    // Handle toggle changes
    document.querySelectorAll('.toggle-input').forEach(toggle => {
      toggle.addEventListener('change', () => {
        Utils.showToast(`Setting updated: ${toggle.id}`, 'success');
      });
    });
    
    // Handle slider changes
    document.querySelectorAll('input[type="range"]').forEach(slider => {
      slider.addEventListener('change', () => {
        Utils.showToast(`Setting updated: ${slider.id}`, 'success');
      });
    });
  },
  
  /**
   * Load voice settings content
   * @private
   */
  _loadVoiceSettings: function() {
    const voiceHtml = `
      <div class="settings-section">
        <h3>Voice & Video</h3>
        
        <div class="settings-group">
          <h4>Input Device</h4>
          
          <div class="device-select-group">
            <label for="mic-device">Microphone</label>
            <select id="mic-device">
              <option value="default">Default Microphone</option>
              <option value="mic1">Microphone (USB)</option>
              <option value="mic2">Headset Microphone</option>
            </select>
          </div>
          
          <div class="audio-preview">
            <div>Input Level</div>
            <div class="audio-bar">
              <div class="audio-level" id="mic-level"></div>
            </div>
            <input type="range" min="0" max="100" value="100" class="volume-slider" id="mic-volume">
          </div>
          
          <div class="input-sensitivity">
            <div>Input Sensitivity</div>
            <p class="setting-description">Automatically detect when you are speaking</p>
            <input type="range" min="0" max="100" value="50" class="sensitivity-slider" id="mic-sensitivity">
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Output Device</h4>
          
          <div class="device-select-group">
            <label for="speaker-device">Output Device</label>
            <select id="speaker-device">
              <option value="default">Default Speakers</option>
              <option value="speaker1">External Speakers</option>
              <option value="speaker2">Headset</option>
            </select>
          </div>
          
          <div class="audio-preview">
            <div>Output Volume</div>
            <input type="range" min="0" max="100" value="80" class="volume-slider" id="speaker-volume">
          </div>
          
          <button class="change-button" id="test-sound">Test Sound</button>
          
          <!-- Insert Voice Quality control here -->
          <div class="quality-option">
            <div>Voice Quality</div>
            <input type="range" min="0" max="100" value="70" class="quality-slider" id="voice-quality">
            <div class="quality-labels">
              <span>Low</span>
              <span>Standard</span>
              <span>High</span>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Video Settings</h4>
          
          <div class="device-select-group">
            <label for="camera-device">Camera</label>
            <select id="camera-device">
              <option value="default">Default Camera</option>
              <option value="camera1">Webcam 1</option>
              <option value="camera2">Webcam 2</option>
            </select>
          </div>
          
          <div class="video-settings">
            <div class="video-preview">
              <div class="video-preview-no-signal">No camera signal</div>
              <div class="video-preview-controls">
                <button class="camera-control" id="test-video">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Insert Video Quality control here -->
          <div class="quality-option">
            <div>Video Quality</div>
            <input type="range" min="0" max="100" value="70" class="quality-slider" id="video-quality">
            <div class="quality-labels">
              <span>Low</span>
              <span>Standard</span>
              <span>High</span>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = voiceHtml;

    // Enumerate devices and populate select options
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        const videoInputs = devices.filter(d => d.kind === 'videoinput');

        // Populate microphone options
        const micSelect = document.getElementById('mic-device');
        if (micSelect) {
          micSelect.innerHTML = '';
          audioInputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Microphone ${micSelect.options.length + 1}`;
            micSelect.appendChild(option);
          });
        }

        // Populate speaker options
        const speakerSelect = document.getElementById('speaker-device');
        if (speakerSelect) {
          speakerSelect.innerHTML = '';
          audioOutputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Speaker ${speakerSelect.options.length + 1}`;
            speakerSelect.appendChild(option);
          });
        }

        // Populate camera options
        const cameraSelect = document.getElementById('camera-device');
        if (cameraSelect) {
          cameraSelect.innerHTML = '';
          videoInputs.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Camera ${cameraSelect.options.length + 1}`;
            cameraSelect.appendChild(option);
          });
        }
      })
      .catch(err => console.error('Device enumeration error:', err));
    
    // Set up event listeners
    document.getElementById('test-sound').addEventListener('click', () => {
      Utils.showToast('Playing test sound...', 'info');
    });
    
    document.getElementById('test-video').addEventListener('click', () => {
      const previewElement = document.querySelector('.video-preview');
      const noSignalElement = document.querySelector('.video-preview-no-signal');
      
      if (noSignalElement.style.display === 'none') {
        // Turn off video preview
        noSignalElement.style.display = 'flex';
        document.getElementById('test-video').classList.remove('active');
        
        // Remove video element if exists
        const videoElement = previewElement.querySelector('video');
        if (videoElement) videoElement.remove();
        
      } else {
        // Turn on video preview
        noSignalElement.style.display = 'none';
        document.getElementById('test-video').classList.add('active');
        
        // Create video element if web APIs are available
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
              const videoElement = document.createElement('video');
              videoElement.srcObject = stream;
              videoElement.autoplay = true;
              videoElement.playsInline = true;
              videoElement.style.width = '100%';
              videoElement.style.height = '100%';
              videoElement.style.objectFit = 'cover';
              
              previewElement.appendChild(videoElement);
              
              // Store stream to stop later
              this.previewStream = stream;
            })
            .catch(error => {
              console.error('Error accessing camera:', error);
              Utils.showToast('Could not access camera. Please check permissions.', 'error');
              noSignalElement.style.display = 'flex';
              document.getElementById('test-video').classList.remove('active');
            });
        } else {
          Utils.showToast('Your browser does not support camera access', 'error');
        }
      }
    });
    
    // Replace simulated microphone activity with real audio input measurement
    const micLevel = document.getElementById('mic-level');
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);
        const updateMicLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          dataArray.forEach(value => { sum += value; });
          const average = sum / dataArray.length;
          micLevel.style.width = `${(average / 255) * 100}%`;
          requestAnimationFrame(updateMicLevel);
        };
        updateMicLevel();
      })
      .catch(err => {
        console.error('Error accessing microphone:', err);
        micLevel.style.width = '0%';
      });
    
    // Handle settings panel closure to clean up
    const cleanup = () => {
      cancelAnimationFrame(this.micActivityInterval);
      
      // Stop video preview if active
      if (this.previewStream) {
        this.previewStream.getTracks().forEach(track => track.stop());
        this.previewStream = null;
      }
    };
    
    document.getElementById('close-settings').addEventListener('click', cleanup);
    this.settingsSidebar.querySelectorAll('.settings-category').forEach(category => {
      if (category.dataset.category !== 'voice') {
        category.addEventListener('click', cleanup);
      }
    });
  },
  
  /**
   * Load text settings content
   * @private
   */
  _loadTextSettings: function() {
    const textHtml = `
      <div class="settings-section">
        <h3>Text & Media</h3>
        
        <div class="settings-group">
          <h4>Chat Settings</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Show link previews</div>
              <div class="privacy-option-description">Show rich previews for links in chat</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="link-previews" class="toggle-input" checked>
              <label for="link-previews" class="toggle-slider"></label>
            </div>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Show inline media</div>
              <div class="privacy-option-description">Display images and videos directly in chat</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="inline-media" class="toggle-input" checked>
              <label for="inline-media" class="toggle-slider"></label>
            </div>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Automatically play GIFs</div>
              <div class="privacy-option-description">Play GIFs without clicking on them</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="autoplay-gifs" class="toggle-input" checked>
              <label for="autoplay-gifs" class="toggle-slider"></label>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Emoji</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Emoji style</div>
              <div class="privacy-option-description">Choose which style of emoji to use</div>
            </div>
            <select id="emoji-style">
              <option value="native">Native (Operating System)</option>
              <option value="twemoji">Twemoji (Twitter)</option>
              <option value="facebook">Facebook</option>
            </select>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Emoji suggestions</div>
              <div class="privacy-option-description">Show emoji suggestions while typing</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="emoji-suggestions" class="toggle-input" checked>
              <label for="emoji-suggestions" class="toggle-slider"></label>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Markdown & Formatting</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Enable markdown</div>
              <div class="privacy-option-description">Use markdown formatting in messages</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="enable-markdown" class="toggle-input" checked>
              <label for="enable-markdown" class="toggle-slider"></label>
            </div>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Code block highlighting</div>
              <div class="privacy-option-description">Syntax highlighting in code blocks</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="code-highlighting" class="toggle-input" checked>
              <label for="code-highlighting" class="toggle-slider"></label>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = textHtml;
    
    // Set up event listeners
    document.querySelectorAll('.toggle-input').forEach(toggle => {
      toggle.addEventListener('change', () => {
        Utils.showToast(`Setting updated: ${toggle.id}`, 'success');
      });
    });
    
    document.querySelectorAll('select').forEach(select => {
      select.addEventListener('change', () => {
        Utils.showToast(`Setting updated: ${select.id}`, 'success');
      });
    });
  },
  
  /**
   * Load notification settings content
   * @private
   */
  _loadNotificationSettings: function() {
    const notificationHtml = `
      <div class="settings-section">
        <h3>Notifications</h3>
        
        <div class="settings-group">
          <h4>Notification Settings</h4>
          
          <div class="notification-toggle">
            <div class="privacy-option">
              <div class="privacy-option-info">
                <div class="privacy-option-name">Enable desktop notifications</div>
                <div class="privacy-option-description">Show notifications on your desktop</div>
              </div>
              <div class="toggle-switch">
                <input type="checkbox" id="desktop-notifications" class="toggle-input" checked>
                <label for="desktop-notifications" class="toggle-slider"></label>
              </div>
            </div>
          </div>
          
          <div class="notification-toggle">
            <div class="privacy-option">
              <div class="privacy-option-info">
                <div class="privacy-option-name">Enable sounds</div>
                <div class="privacy-option-description">Play sounds for notifications</div>
              </div>
              <div class="toggle-switch">
                <input type="checkbox" id="notification-sounds" class="toggle-input" checked>
                <label for="notification-sounds" class="toggle-slider"></label>
              </div>
            </div>
          </div>
          
          <div class="notification-toggle">
            <div class="privacy-option">
              <div class="privacy-option-info">
                <div class="privacy-option-name">Mute when app is focused</div>
                <div class="privacy-option-description">Don't play notification sounds when app is focused</div>
              </div>
              <div class="toggle-switch">
                <input type="checkbox" id="mute-focused" class="toggle-input" checked>
                <label for="mute-focused" class="toggle-slider"></label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Channel Notifications</h4>
          
          <div class="notifications-channel-list">
            <div class="channel-notification">
              <div class="channel-notification-info">
                <span class="channel-icon">#</span>
                <span>welcome</span>
              </div>
              <select class="notification-level-select">
                <option value="all">All messages</option>
                <option value="mentions" selected>@mentions only</option>
                <option value="none">Nothing</option>
              </select>
            </div>
            
            <div class="channel-notification">
              <div class="channel-notification-info">
                <span class="channel-icon">#</span>
                <span>general</span>
              </div>
              <select class="notification-level-select">
                <option value="all">All messages</option>
                <option value="mentions" selected>@mentions only</option>
                <option value="none">Nothing</option>
              </select>
            </div>
            
            <div class="channel-notification">
              <div class="channel-notification-info">
                <span class="channel-icon">#</span>
                <span>announcements</span>
              </div>
              <select class="notification-level-select">
                <option value="all" selected>All messages</option>
                <option value="mentions">@mentions only</option>
                <option value="none">Nothing</option>
              </select>
            </div>
          </div>
          
          <div class="notification-toggle">
            <div class="privacy-option">
              <div class="privacy-option-info">
                <div class="privacy-option-name">Default notification setting for new channels</div>
              </div>
              <select id="default-notification">
                <option value="all">All messages</option>
                <option value="mentions" selected>@mentions only</option>
                <option value="none">Nothing</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Quiet Hours</h4>
          
          <div class="notification-toggle">
            <div class="privacy-option">
              <div class="privacy-option-info">
                <div class="privacy-option-name">Enable quiet hours</div>
                <div class="privacy-option-description">Disable notifications during specified hours</div>
              </div>
              <div class="toggle-switch">
                <input type="checkbox" id="quiet-hours" class="toggle-input">
                <label for="quiet-hours" class="toggle-slider"></label>
              </div>
            </div>
          </div>
          
          <div class="quiet-hours-times">
            <div class="input-group">
              <label for="quiet-start">From</label>
              <input type="time" id="quiet-start" value="22:00">
            </div>
            <div class="input-group">
              <label for="quiet-end">To</label>
              <input type="time" id="quiet-end" value="08:00">
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = notificationHtml;
    
    // Set up event listeners
    document.querySelectorAll('.toggle-input').forEach(toggle => {
      toggle.addEventListener('change', () => {
        Utils.showToast(`Setting updated: ${toggle.id}`, 'success');
        
        // Show/hide quiet hours times based on toggle
        if (toggle.id === 'quiet-hours') {
          document.querySelector('.quiet-hours-times').style.display = toggle.checked ? 'block' : 'none';
        }
      });
    });
    
    document.querySelectorAll('select').forEach(select => {
      select.addEventListener('change', () => {
        Utils.showToast('Notification setting updated', 'success');
      });
    });
    
    // Hide quiet hours times initially
    document.querySelector('.quiet-hours-times').style.display = 'none';
  },
  
  /**
   * Load keybind settings content
   * @private
   */
  _loadKeybindSettings: function() {
    const keybindHtml = `
      <div class="settings-section">
        <h3>Keybinds</h3>
        
        <div class="settings-group">
          <h4>Navigation</h4>
          
          <div class="keybind-list">
            <div class="keybind-item">
              <div class="keybind-action">Next Channel</div>
              <div class="keybind-controls">
                <div class="keybind-keys">
                  <div class="keybind-key">Alt</div>
                  <div class="keybind-key">↓</div>
                </div>
                <div class="reset-keybind">Reset</div>
              </div>
            </div>
            
            <div class="keybind-item">
              <div class="keybind-action">Previous Channel</div>
              <div class="keybind-controls">
                <div class="keybind-keys">
                  <div class="keybind-key">Alt</div>
                  <div class="keybind-key">↑</div>
                </div>
                <div class="reset-keybind">Reset</div>
              </div>
            </div>
            
            <div class="keybind-item">
              <div class="keybind-action">Next Den</div>
              <div class="keybind-controls">
                <div class="keybind-keys">
                  <div class="keybind-key">Ctrl</div>
                  <div class="keybind-key">Alt</div>
                  <div class="keybind-key">↓</div>
                </div>
                <div class="reset-keybind">Reset</div>
              </div>
            </div>
            
            <div class="keybind-item">
              <div class="keybind-action">Previous Den</div>
              <div class="keybind-controls">
                <div class="keybind-keys">
                  <div class="keybind-key">Ctrl</div>
                  <div class="keybind-key">Alt</div>
                  <div class="keybind-key">↑</div>
                </div>
                <div class="reset-keybind">Reset</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Chat</h4>
          
          <div class="keybind-list">
            <div class="keybind-item">
              <div class="keybind-action">Upload File</div>
              <div class="keybind-controls">
                <div class="keybind-keys">
                  <div class="keybind-key">Ctrl</div>
                  <div class="keybind-key">U</div>
                </div>
                <div class="reset-keybind">Reset</div>
              </div>
            </div>
            
            <div class="keybind-item">
              <div class="keybind-action">Emoji Picker</div>
              <div class="keybind-controls">
                <div class="keybind-keys">
                  <div class="keybind-key">Ctrl</div>
                  <div class="keybind-key">E</div>
                </div>
                <div class="reset-keybind">Reset</div>
              </div>
            </div>
            
            <div class="keybind-item">
              <div class="keybind-action">Mark Channel as Read</div>
              <div class="keybind-controls">
                <div class="keybind-keys">
                  <div class="keybind-key">Escape</div>
                </div>
                <div class="reset-keybind">Reset</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Voice & Video</h4>
          
          <div class="keybind-list">
            <div class="keybind-item">
              <div class="keybind-action">Toggle Mute</div>
              <div class="keybind-controls">
                <div class="keybind-keys">
                  <div class="keybind-key">M</div>
                </div>
                <div class="reset-keybind">Reset</div>
              </div>
            </div>
            
            <div class="keybind-item">
              <div class="keybind-action">Toggle Deafen</div>
              <div class="keybind-controls">
                <div class="keybind-keys">
                  <div class="keybind-key">D</div>
                </div>
                <div class="reset-keybind">Reset</div>
              </div>
            </div>
            
            <div class="keybind-item">
              <div class="keybind-action">Toggle Video</div>
              <div class="keybind-controls">
                <div class="keybind-keys">
                  <div class="keybind-key">V</div>
                </div>
                <div class="reset-keybind">Reset</div>
              </div>
            </div>
            
            <div class="keybind-item">
              <div class="keybind-action">Toggle Screen Share</div>
              <div class="keybind-controls">
                <div class="keybind-keys">
                  <div class="keybind-key">S</div>
                </div>
                <div class="reset-keybind">Reset</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Application</h4>
          
          <div class="keybind-list">
            <div class="keybind-item">
              <div class="keybind-action">Open Settings</div>
              <div class="keybind-controls">
                <div class="keybind-keys">
                  <div class="keybind-key">Ctrl</div>
                  <div class="keybind-key">,</div>
                </div>
                <div class="reset-keybind">Reset</div>
              </div>
            </div>
            
            <div class="keybind-item">
              <div class="keybind-action">Toggle Theme</div>
              <div class="keybind-controls">
                <div class="keybind-keys">
                  <div class="keybind-key">Ctrl</div>
                  <div class="keybind-key">Shift</div>
                  <div class="keybind-key">T</div>
                </div>
                <div class="reset-keybind">Reset</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = keybindHtml;
    
    // Set up event listeners
    document.querySelectorAll('.reset-keybind').forEach(reset => {
      reset.addEventListener('click', () => {
        const keybindItem = reset.closest('.keybind-item');
        const action = keybindItem.querySelector('.keybind-action').textContent;
        
        Utils.showToast(`Reset keybind for: ${action}`, 'success');
      });
    });
    
    document.querySelectorAll('.keybind-keys').forEach(keys => {
      keys.addEventListener('click', () => {
        const keybindItem = keys.closest('.keybind-item');
        const action = keybindItem.querySelector('.keybind-action').textContent;
        
        // Replace with "Press a key" temporarily
        const originalHTML = keys.innerHTML;
        keys.innerHTML = '<div class="keybind-key recording">Press a key...</div>';
        
        // Listen for a keypress
        const handleKeyPress = (e) => {
          e.preventDefault();
          
          // Update keys
          let newKeys = '';
          if (e.ctrlKey) newKeys += '<div class="keybind-key">Ctrl</div>';
          if (e.altKey) newKeys += '<div class="keybind-key">Alt</div>';
          if (e.shiftKey) newKeys += '<div class="keybind-key">Shift</div>';
          
          // Add the main key
          let keyName = e.key;
          if (keyName === ' ') keyName = 'Space';
          if (keyName === 'Control' || keyName === 'Alt' || keyName === 'Shift') {
            // If only a modifier key was pressed, ignore it
            keys.innerHTML = originalHTML;
            document.removeEventListener('keydown', handleKeyPress);
            return;
          }
          
          newKeys += `<div class="keybind-key">${keyName}</div>`;
          keys.innerHTML = newKeys;
          
          Utils.showToast(`Updated keybind for: ${action}`, 'success');
          
          // Remove the event listener
          document.removeEventListener('keydown', handleKeyPress);
        };
        
        document.addEventListener('keydown', handleKeyPress);
      });
    });
  },
  
  /**
   * Load language settings content
   * @private
   */
  _loadLanguageSettings: function() {
    const languageHtml = `
      <div class="settings-section">
        <h3>Language</h3>
        
        <div class="settings-group">
          <h4>App Language</h4>
          
          <div class="language-option">
            <div class="language-name">
              <img src="/api/placeholder/24/16" alt="English" class="language-flag">
              <span>English (US)</span>
            </div>
            <input type="radio" name="language" class="language-radio" checked>
          </div>
          
          <div class="language-option">
            <div class="language-name">
              <img src="/api/placeholder/24/16" alt="Spanish" class="language-flag">
              <span>Español (Spanish)</span>
            </div>
            <input type="radio" name="language" class="language-radio">
          </div>
          
          <div class="language-option">
            <div class="language-name">
              <img src="/api/placeholder/24/16" alt="French" class="language-flag">
              <span>Français (French)</span>
            </div>
            <input type="radio" name="language" class="language-radio">
          </div>
          
          <div class="language-option">
            <div class="language-name">
              <img src="/api/placeholder/24/16" alt="German" class="language-flag">
              <span>Deutsch (German)</span>
            </div>
            <input type="radio" name="language" class="language-radio">
          </div>
          
          <div class="language-option">
            <div class="language-name">
              <img src="/api/placeholder/24/16" alt="Japanese" class="language-flag">
              <span>日本語 (Japanese)</span>
            </div>
            <input type="radio" name="language" class="language-radio">
          </div>
          
          <div class="language-option">
            <div class="language-name">
              <img src="/api/placeholder/24/16" alt="Chinese" class="language-flag">
              <span>中文 (Chinese)</span>
            </div>
            <input type="radio" name="language" class="language-radio">
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Regional Format</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Date format</div>
              <div class="privacy-option-description">How dates are displayed</div>
            </div>
            <select id="date-format">
              <option value="us">MM/DD/YYYY (US)</option>
              <option value="eu">DD/MM/YYYY (European)</option>
              <option value="iso">YYYY-MM-DD (ISO)</option>
            </select>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Time format</div>
              <div class="privacy-option-description">How time is displayed</div>
            </div>
            <select id="time-format">
              <option value="12">12-hour (AM/PM)</option>
              <option value="24">24-hour</option>
            </select>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Spellchecker</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Enable spellcheck</div>
              <div class="privacy-option-description">Highlight misspelled words</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="spellcheck" class="toggle-input" checked>
              <label for="spellcheck" class="toggle-slider"></label>
            </div>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Spellcheck language</div>
              <div class="privacy-option-description">Language used for spell checking</div>
            </div>
            <select id="spellcheck-language">
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = languageHtml;
    
    // Set up event listeners
    document.querySelectorAll('.language-option').forEach(option => {
      option.addEventListener('click', () => {
        // Select the radio button
        const radio = option.querySelector('.language-radio');
        radio.checked = true;
        
        // Get language name
        const language = option.querySelector('.language-name span').textContent;
        
        Utils.showToast(`Language changed to: ${language}`, 'success');
      });
    });
    
    document.querySelectorAll('select').forEach(select => {
      select.addEventListener('change', () => {
        Utils.showToast(`Setting updated: ${select.id}`, 'success');
      });
    });
    
    document.getElementById('spellcheck').addEventListener('change', (e) => {
      document.getElementById('spellcheck-language').disabled = !e.target.checked;
      Utils.showToast(`Spellcheck ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
    });
  },
  
  /**
   * Show change password modal
   * @private
   */
  _showChangePasswordModal: function() {
    const modalHtml = `
      <div class="modal active" id="change-password-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-container">
          <div class="modal-header">
            <h3>Change Password</h3>
            <button class="modal-close">✕</button>
          </div>
          <div class="modal-content">
            <div class="input-group">
              <label for="current-password">Current Password</label>
              <input type="password" id="current-password" placeholder="Enter your current password">
            </div>
            <div class="input-group">
              <label for="new-password">New Password</label>
              <input type="password" id="new-password" placeholder="Enter your new password">
            </div>
            <div class="input-group">
              <label for="confirm-password">Confirm New Password</label>
              <input type="password" id="confirm-password" placeholder="Confirm your new password">
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-button secondary" id="cancel-password">Cancel</button>
            <button class="modal-button primary" id="save-password">Save</button>
          </div>
        </div>
      </div>
    `;
    
    // Add to document
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstChild);
    
    const passwordModal = document.getElementById('change-password-modal');
    
    // Set up event listeners
    passwordModal.querySelector('.modal-close').addEventListener('click', () => {
      passwordModal.remove();
    });
    
    document.getElementById('cancel-password').addEventListener('click', () => {
      passwordModal.remove();
    });
    
    document.getElementById('save-password').addEventListener('click', () => {
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      
      // Simple validation
      if (!currentPassword || !newPassword || !confirmPassword) {
        Utils.showToast('Please fill in all fields', 'error');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        Utils.showToast('New passwords do not match', 'error');
        return;
      }
      
      // In a real app, would make API call to change password
      Utils.showToast('Password changed successfully', 'success');
      
      // Close modal
      passwordModal.remove();
    });
  },
  
  /**
   * Show avatar edit modal
   * @private
   */
  _showAvatarEditModal: function() {
    const modalHtml = `
      <div class="modal active" id="avatar-edit-modal">
        <div class="modal-backdrop"></div>
        <div class="modal-container">
          <div class="modal-header">
            <h3>Edit Avatar</h3>
            <button class="modal-close">✕</button>
          </div>
          <div class="modal-content">
            <div class="avatar-preview">
              <div class="avatar-wrapper large" style="background-color: ${Utils.getRandomAvatarColor()}">
                ${AppState.get('currentUser').avatar || Utils.getInitials(AppState.get('currentUser').username)}
              </div>
            </div>
            <div class="avatar-options">
              <button class="change-button" id="upload-avatar">Upload Image</button>
              <button class="change-button" id="select-icon">Choose Icon</button>
              <button class="change-button" id="remove-avatar">Remove Avatar</button>
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-button secondary" id="cancel-avatar">Cancel</button>
            <button class="modal-button primary" id="save-avatar">Save</button>
          </div>
        </div>
      </div>
    `;
    
    // Add to document
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstChild);
    
    const avatarModal = document.getElementById('avatar-edit-modal');
    
    // Set up event listeners
    avatarModal.querySelector('.modal-close').addEventListener('click', () => {
      avatarModal.remove();
    });
    
    document.getElementById('cancel-avatar').addEventListener('click', () => {
      avatarModal.remove();
    });
    
    document.getElementById('upload-avatar').addEventListener('click', () => {
      Utils.showToast('File upload would open here', 'info');
    });
    
    document.getElementById('select-icon').addEventListener('click', () => {
      // Show emoji picker for avatar
      const emojis = ['🦊', '🐱', '🐶', '🐭', '🐹', '🐰', '🦝', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷'];
      
      // Create emoji grid
      let emojiGrid = '<div class="emoji-grid">';
      emojis.forEach(emoji => {
        emojiGrid += `<div class="emoji" data-emoji="${emoji}">${emoji}</div>`;
      });
      emojiGrid += '</div>';
      
      // Show in a simple modal
      const emojiModalHtml = `
        <div class="modal active" id="emoji-avatar-modal">
          <div class="modal-backdrop"></div>
          <div class="modal-container small">
            <div class="modal-header">
              <h3>Select Avatar Icon</h3>
              <button class="modal-close">✕</button>
            </div>
            <div class="modal-content">
              ${emojiGrid}
            </div>
          </div>
        </div>
      `;
      
      const emojiContainer = document.createElement('div');
      emojiContainer.innerHTML = emojiModalHtml;
      document.body.appendChild(emojiContainer.firstChild);
      
      const emojiModal = document.getElementById('emoji-avatar-modal');
      
      // Set up event listeners
      emojiModal.querySelector('.modal-close').addEventListener('click', () => {
        emojiModal.remove();
      });
      
      emojiModal.querySelectorAll('.emoji').forEach(emoji => {
        emoji.addEventListener('click', () => {
          // Update avatar preview
          const avatarWrapper = avatarModal.querySelector('.avatar-wrapper');
          avatarWrapper.textContent = emoji.textContent;
          
          // Close emoji modal
          emojiModal.remove();
        });
      });
    });
    
    document.getElementById('remove-avatar').addEventListener('click', () => {
      // Reset to initials
      const avatarWrapper = avatarModal.querySelector('.avatar-wrapper');
      avatarWrapper.textContent = Utils.getInitials(AppState.get('currentUser').username);
    });
    
    document.getElementById('save-avatar').addEventListener('click', () => {
      // Get selected avatar
      const avatarWrapper = avatarModal.querySelector('.avatar-wrapper');
      const avatarText = avatarWrapper.textContent;
      
      // Check if it's an emoji or initials
      const isEmoji = /\p{Emoji}/u.test(avatarText);
      
      // Update user
      const user = { ...AppState.get('currentUser') };
      user.avatar = isEmoji ? avatarText : null;
      
      AppState.set('currentUser', user);
      
      // Update UI
      this.userInitials.textContent = isEmoji ? avatarText : Utils.getInitials(user.username);
      
      Utils.showToast('Avatar updated successfully', 'success');
      
      // Close modal
      avatarModal.remove();
    });
  },
  
  /**
   * Handle username change
   * @param {string} value - The new username
   * @private
   */
  _handleUsernameChange: function(value) {
    // Parse username and tag
    const match = value.match(/(.+)#(\d+)/);
    
    if (!match) {
      Utils.showToast('Username format should be "Username#0000"', 'error');
      return;
    }
    
    const username = match[1];
    const tag = match[2];
    
    // Update user
    const user = { ...AppState.get('currentUser') };
    user.username = username;
    user.tag = tag;
    
    AppState.set('currentUser', user);
    
    // Update UI
    this.userInitials.textContent = user.avatar || Utils.getInitials(username);
    
    Utils.showToast('Username updated successfully', 'success');
  },
  
  /**
   * Handle logout
   * @private
   */
  _handleLogout: function() {
    if (confirm('Are you sure you want to log out?')) {
      // In a real app, this would call a logout API
      Utils.showToast('You have been logged out', 'success');
      
      // Redirect to login page or reset app
      // For this demo, we'll just reload the page
      window.location.reload();
    }
  }
};

// Export for use in other modules
window.SettingsManager = SettingsManager;
