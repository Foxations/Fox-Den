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
    this._cacheElements();
    
    // Set up event listeners
    this._setupEventListeners();
    
    // Subscribe to state changes
    AppState.subscribe('settingsOpen', (isOpen) => this._handleSettingsToggle(isOpen));
    AppState.subscribe('activeSettingsTab', (tab) => this._handleSettingsTabChange(tab));
    
    this.initialized = true;
  },
  
  /**
   * Cache DOM elements for settings components
   * @private
   */
  _cacheElements: function() {
    this.settingsPanel = document.getElementById('settings-panel');
    this.settingsContentContainer = this.settingsPanel.querySelector('.settings-content-container');
    this.settingsSidebar = document.getElementById('settings-sidebar');
    this.settingsContent = document.getElementById('settings-content');
  },
  
  /**
   * Set up event listeners for settings components
   * @private
   */
  _setupEventListeners: function() {
    // Handle settings button click
    const settingsButton = document.getElementById('user-settings');
    if (settingsButton) {
      settingsButton.addEventListener('click', () => {
        this.showSettings();
      });
    }
    
    // Handle close button click
    const closeButton = document.getElementById('close-settings');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hideSettings();
      });
    }
    
    // Listen for ESC key to close settings
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.settingsPanel.classList.contains('active')) {
        this.hideSettings();
      }
    });
    
    // Handle category selection
    if (this.settingsSidebar) {
      this.settingsSidebar.addEventListener('click', (e) => {
        const category = e.target.closest('.settings-category');
        if (category && category.dataset.category) {
          if (category.dataset.category === 'logout') {
            this._handleLogout();
          } else {
            this.showSettings(category.dataset.category);
          }
        }
      });
    }
  },
  
  /**
   * Show the settings panel
   * @param {string} category - The category to show
   */
  showSettings: function(category = 'account') {
    this.activeCategory = category;
    
    // Update sidebar
    this._updateActiveCategorySidebar();
    
    // Load category content
    this._loadCategoryContent(category);
    
    // Show panel
    this.settingsPanel.classList.add('active');
    
    // Notify app state - prevent recursion by checking if value is already set
    if (AppState.get('settingsOpen') !== true) {
      AppState.set('settingsOpen', true);
    }
    if (AppState.get('activeSettingsTab') !== category) {
      AppState.set('activeSettingsTab', category);
    }
  },
  
  /**
   * Hide the settings panel
   */
  hideSettings: function() {
    this.settingsPanel.classList.remove('active');
    
    // Notify app state - prevent recursion
    if (AppState.get('settingsOpen') !== false) {
      AppState.set('settingsOpen', false);
    }
  },
  
  /**
   * Handle settings toggle from app state
   * @param {boolean} isOpen - Whether settings should be open
   * @private
   */
  _handleSettingsToggle: function(isOpen) {
    // Prevent recursion by checking current state
    const isCurrentlyOpen = this.settingsPanel.classList.contains('active');
    if (isOpen && !isCurrentlyOpen) {
      this.showSettings(AppState.get('activeSettingsTab') || 'account');
    } else if (!isOpen && isCurrentlyOpen) {
      this.hideSettings();
    }
  },
  
  /**
   * Handle settings tab change from app state
   * @param {string} tab - The new active tab
   * @private
   */
  _handleSettingsTabChange: function(tab) {
    if (AppState.get('settingsOpen')) {
      this.showSettings(tab);
    }
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
    console.log(`Selecting category: ${category}`);
    
    // Clear existing content
    this.settingsContent.innerHTML = '';
    
    // Load category content
    switch (category) {
      case 'account':
        this._loadAccountSettings();
        break;
      case 'profiles':
        this._loadProfileSettings();
        break;
      case 'content-social':
        this._loadContentSettings();
        break;
      case 'data-privacy':
        this._loadDataPrivacySettings();
        break;
      case 'privacy':
        this._loadPrivacySettings();
        break;
      case 'apps':
        this._loadAuthorizedAppsSettings();
        break;
      case 'devices':
        this._loadDevicesSettings();
        break;
      case 'connections':
        this._loadConnectionsSettings();
        break;
      case 'clips':
        this._loadClipsSettings();
        break;
      case 'premium':
        this._loadPremiumSettings();
        break;
      case 'boosts':
        this._loadBoostsSettings();
        break;
      case 'subscriptions':
        this._loadSubscriptionsSettings();
        break;
      case 'gifts':
        this._loadGiftsSettings();
        break;
      case 'billing':
        this._loadBillingSettings();
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
      case 'windows':
        this._loadWindowsSettings();
        break;
      case 'streamer':
        this._loadStreamerSettings();
        break;
      case 'advanced':
        this._loadAdvancedSettings();
        break;
      case 'activity-privacy':
        this._loadActivityPrivacySettings();
        break;
      case 'registered-apps':
        this._loadRegisteredAppsSettings();
        break;
      case 'overlay':
        this._loadOverlaySettings();
        break;
      case 'whats-new':
        this._loadWhatsNewContent();
        break;
      case 'merch':
        this._loadMerchContent();
        break;
      case 'foxpack':
        this._loadFoxpackContent();
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
    console.log('Loading content for category: account');
    const user = AppState.get('currentUser') || {
      username: 'FoxUser',
      tag: '1234',
      displayName: 'Fox User',
    };

    // Create tabs for Security and Standing
    const accountHtml = `
      <div class="account-section">
        <h2>My Account</h2>
      
        <div class="account-tabs">
          <div class="account-tab active" data-tab="security">Security</div>
          <div class="account-tab" data-tab="standing">Standing</div>
          </div>
          
        <div class="account-tab-content" id="security-tab">
          <!-- User Info Fields -->
          <div class="user-info-fields">
            <div class="user-field">
              <div class="field-label">USERNAME</div>
              <div class="field-value">${user.displayName || 'FoxUser'}</div>
              <button class="field-edit-btn">Edit</button>
            </div>
            
            <div class="user-field">
              <div class="field-label">EMAIL</div>
              <div class="field-value">••••••@${user.email?.split('@')[1] || 'example.com'}</div>
              <button class="field-reveal-btn">Reveal</button>
              <button class="field-edit-btn">Edit</button>
            </div>
            
            <div class="user-field">
              <div class="field-label">PHONE NUMBER</div>
              <div class="field-value">*******3785</div>
              <button class="field-reveal-btn">Reveal</button>
              <button class="field-edit-btn">Edit</button>
            </div>
            </div>
            
          <!-- Password and Authentication -->
          <h3>PASSWORD AND AUTHENTICATION</h3>
          
          <!-- Password -->
          <div class="user-field">
            <div class="field-label">PASSWORD</div>
            <div class="field-value">••••••••••••••</div>
            <button class="field-edit-btn">Change Password</button>
            </div>
          
          <!-- Two-Factor Authentication Status -->
          <div class="section-divider"></div>
          <h4>TWO-FACTOR AUTHENTICATION</h4>
          <div class="auth-status-section">
            <div class="auth-status enabled">
              <div class="auth-icon">✓</div>
              <div class="auth-text">Two-factor authentication enabled</div>
          </div>
        </div>
        
          <!-- Authenticator App -->
          <div class="section-divider"></div>
          <h4>AUTHENTICATOR APP</h4>
          <p class="section-description">
            Configuring an authenticator app is a good way to add an extra layer of security to your FoxDen account to
            make sure that only you have the ability to log in.
          </p>
          
          <div class="auth-buttons">
            <button class="settings-button view-backup-btn">View Backup Codes</button>
            <button class="settings-button danger remove-auth-btn">Remove Authenticator App</button>
        </div>
        
          <!-- SMS Backup Authentication -->
          <div class="section-divider"></div>
          <h4>SMS BACKUP AUTHENTICATION</h4>
          <p class="section-description">
            Add your phone as a backup MFA method in case you lose access to your authenticator app or backup codes.
            Your current phone number is: *******3785 
            <button class="inline-reveal-btn">Reveal</button>
          </p>
          
          <button class="settings-button danger remove-sms-btn">Remove SMS Authentication</button>
          
          <!-- Security Keys -->
          <div class="section-divider"></div>
          <h4>SECURITY KEYS</h4>
          <p class="section-description">
            Add an additional layer of protection to your account with a Security Key.
          </p>
          
          <button class="settings-button register-key-btn">Register a Security Key</button>
          
          <!-- Account Removal -->
          <div class="section-divider"></div>
          <h4>ACCOUNT REMOVAL</h4>
          <p class="section-description">
            Disabling your account means you can recover it at any time after taking this action.
          </p>
          
          <div class="account-removal-buttons">
            <button class="settings-button danger disable-account-btn">Disable Account</button>
            <button class="settings-button danger delete-account-btn">Delete Account</button>
            </div>
            </div>
        
        <div class="account-tab-content hidden" id="standing-tab">
          <div class="account-standing">
            <div class="user-avatar-large">
              <div class="avatar-large">${user.avatar || user.displayName?.charAt(0) || 'F'}</div>
          </div>
            
            <div class="standing-status">
              <h3>Your account is <span class="standing-good">all good</span></h3>
              <p class="standing-description">
                Thanks for upholding FoxDen's <a href="#" class="text-link">Terms of Service</a> and 
                <a href="#" class="text-link">Community Guidelines</a>. If you break the rules, it will show up here.
              </p>
            </div>
        </div>
        
          <div class="standing-indicator">
            <div class="standing-progress">
              <div class="standing-progress-marker active" data-level="all-good">
                <!-- Simple bubble, no SVG needed -->
              </div>
              <div class="standing-progress-marker" data-level="limited"></div>
              <div class="standing-progress-marker" data-level="very-limited"></div>
              <div class="standing-progress-marker" data-level="at-risk"></div>
              <div class="standing-progress-marker" data-level="suspended"></div>
            </div>
            
            <div class="standing-progress-labels">
              <div class="standing-label active">All good!</div>
              <div class="standing-label">Limited</div>
              <div class="standing-label">Very limited</div>
              <div class="standing-label">At risk</div>
              <div class="standing-label">Suspended</div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = accountHtml;
    
    // Set up event listeners for tabs
    const tabButtons = document.querySelectorAll('.account-tab');
    const tabContents = document.querySelectorAll('.account-tab-content');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.dataset.tab;
        
        // Update active tab
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Show selected tab content
        tabContents.forEach(content => {
          content.classList.add('hidden');
          if (content.id === `${tabName}-tab`) {
            content.classList.remove('hidden');
          }
        });
      });
    });
    
    // Handle reveal buttons
    document.querySelectorAll('.field-reveal-btn, .inline-reveal-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const fieldValue = e.target.closest('.user-field')?.querySelector('.field-value');
        if (fieldValue) {
          if (fieldValue.textContent.includes('*')) {
            // Reveal the content - this would typically involve API calls
            if (fieldValue.textContent.includes('@')) {
              fieldValue.textContent = 'fox@foxden.com';
            } else {
              fieldValue.textContent = '+1 (555) 123-3785';
            }
            button.textContent = 'Hide';
          } else {
            // Hide the content
            if (fieldValue.textContent.includes('@')) {
              fieldValue.textContent = '*****@foxden.com';
            } else {
              fieldValue.textContent = '*******3785';
            }
            button.textContent = 'Reveal';
          }
        } else if (e.target.classList.contains('inline-reveal-btn')) {
          // For the inline reveal button in the SMS section
          const text = e.target.previousSibling;
          if (text.textContent.includes('*')) {
            text.textContent = 'Your current phone number is: +1 (555) 123-3785 ';
            button.textContent = 'Hide';
          } else {
            text.textContent = 'Your current phone number is: *******3785 ';
            button.textContent = 'Reveal';
          }
        }
      });
    });
    
    // Set up other buttons (for now they just log the action)
    document.querySelectorAll('.field-edit-btn, .field-remove-btn, .edit-user-profile-btn, .settings-button').forEach(button => {
      button.addEventListener('click', () => {
        console.log(`Button clicked: ${button.textContent.trim()}`);
        // This would typically show a modal or navigate to a different form
      });
    });
  },
  
  /**
   * Load profile settings content
   * @private
   */
  _loadProfileSettings: function() {
    console.log('Loading content for category: profiles');
    const user = AppState.get('currentUser');
    // Mock server data for demo purposes
    const servers = [
      { id: 'server1', name: 'The Alpha Build', icon: '🦊' },
      { id: 'server2', name: 'Fox Den Dev', icon: '🦊' },
      { id: 'server3', name: 'Testing Server', icon: '🧪' }
    ];
    
    const profileHtml = `
      <div class="settings-section">
        <h3>Profiles</h3>
        
        <div class="profile-tabs">
          <div class="profile-tab" data-tab="user-profile">User Profile</div>
          <div class="profile-tab active" data-tab="per-server-profiles">Per-server Profiles</div>
            </div>
        
        <div class="profile-tab-content hidden" id="user-profile-content">
          <div class="profile-form-group">
            <label for="display-name">DISPLAY NAME</label>
            <input type="text" id="display-name" class="profile-input" value="${user.displayName || ''}" placeholder="Choose a display name">
          </div>
          
          <div class="profile-form-group">
            <label for="pronouns">PRONOUNS</label>
            <input type="text" id="pronouns" class="profile-input" value="${user.pronouns || ''}" placeholder="Toaster/Oven">
        </div>
        
          <div class="profile-form-group">
            <label>AVATAR</label>
            <div class="avatar-section">
              <div class="avatar-preview">
                ${user.avatar || user.username.charAt(0).toUpperCase()}
              </div>
              <div class="avatar-actions">
                <button class="change-button" id="change-avatar">Change Avatar</button>
                <button class="change-button" id="remove-avatar">Remove Avatar</button>
              </div>
            </div>
        </div>
        
          <div class="profile-form-group">
            <label>AVATAR DECORATION</label>
            <div class="avatar-section">
              <div class="avatar-decoration-preview">
                <div class="avatar-preview">
                  ${user.avatar || user.username.charAt(0).toUpperCase()}
                </div>
                <div class="decoration-effect">
                  <!-- Decoration overlay would be displayed here -->
                </div>
              </div>
              <div class="avatar-actions">
                <button class="change-button" id="change-decoration">Change Decoration</button>
              </div>
          </div>
        </div>
        
          <div class="profile-form-group">
            <label>PROFILE EFFECT</label>
            <button class="change-button" id="change-effect">Change Effect</button>
          </div>
          
          <div class="profile-form-group">
            <label>PROFILE BANNER</label>
            <div class="profile-banner">
              ${user.banner ? `<img src="${user.banner}" alt="Profile banner" class="banner-image">` : ''}
            </div>
            <div class="avatar-actions">
          <button class="change-button" id="change-banner">Change Banner</button>
              <button class="change-button" id="remove-banner">Remove Banner</button>
            </div>
        </div>
        
          <div class="profile-form-group">
            <label>PROFILE THEME</label>
            <div class="profile-theme">
              <div class="primary-color">
                <label>Primary</label>
                <div class="color-picker-container">
                  <div class="color-swatch active" style="background-color: #ee9ca7;" data-color="#ee9ca7"></div>
                  <div class="color-swatch" style="background-color: #3b1d60;" data-color="#3b1d60"></div>
                  <div class="color-swatch" style="background-color: #76b852;" data-color="#76b852"></div>
                  <div class="color-swatch" style="background-color: #ffb347;" data-color="#ffb347"></div>
                </div>
              </div>
              <div class="accent-color">
                <label>Accent</label>
                <div class="color-picker-container">
                  <div class="color-swatch" style="background-color: #ffdde1;" data-color="#ffdde1"></div>
                  <div class="color-swatch active" style="background-color: #614385;" data-color="#614385"></div>
                  <div class="color-swatch" style="background-color: #8DC26F;" data-color="#8DC26F"></div>
                  <div class="color-swatch" style="background-color: #ffcc33;" data-color="#ffcc33"></div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="profile-form-group">
            <label for="about-me">ABOUT ME</label>
            <textarea id="about-me" class="profile-textarea" placeholder="You can use markdown and links if you'd like.">${user.aboutMe || ''}</textarea>
            <div class="character-counter">190</div>
          </div>
          
          <div class="badge-toggle">
            <label class="toggle-switch">
              <input type="checkbox" class="toggle-input" id="legacy-badge-toggle" ${user.showLegacyBadge ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
            <div class="badge-description">
              <div>Legacy Username Badge</div>
              <div>Display L̷i̷l̷_q̷ #6718 on your profile.</div>
            </div>
          </div>
        </div>
        
        <div class="profile-tab-content" id="per-server-profiles-content">
          <p>Show who you are with different profiles for each of your servers. <a href="#" class="learn-more-link">Learn more about per-server profiles</a></p>
          
          <div class="server-select-container">
            <label>CHOOSE A SERVER</label>
            <div class="server-dropdown">
              <div class="selected-server">
                <span class="server-icon">${servers[0].icon}</span>
                <span class="server-name">${servers[0].name}</span>
                <span class="dropdown-arrow">▼</span>
              </div>
              <div class="server-dropdown-menu hidden">
                ${servers.map(server => `
                  <div class="server-option" data-server-id="${server.id}">
                    <span class="server-icon">${server.icon}</span>
                    <span class="server-name">${server.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
          
          <div class="profile-preview-container">
            <div class="profile-form">
              <div class="profile-form-group">
                <label for="server-nickname">SERVER NICKNAME</label>
                <input type="text" id="server-nickname" class="profile-input" value="L̷i̷l̷_q̷" placeholder="Choose a nickname for this server">
              </div>
              
              <div class="profile-form-group">
                <label for="server-pronouns">PRONOUNS</label>
                <input type="text" id="server-pronouns" class="profile-input" value="Toaster/Oven" placeholder="Add your pronouns">
              </div>
              
              <div class="profile-form-group">
                <label>AVATAR</label>
                <div class="avatar-section">
                  <div class="avatar-preview">
                    ${user.avatar || user.username.charAt(0).toUpperCase()}
                  </div>
                  <div class="avatar-actions">
                    <button class="change-button" id="change-server-avatar">Change Avatar</button>
                  </div>
                </div>
              </div>
              
              <div class="profile-form-group">
                <label>AVATAR DECORATION</label>
                <div class="avatar-section">
                  <div class="avatar-decoration-preview">
                    <div class="avatar-preview">
                      ${user.avatar || user.username.charAt(0).toUpperCase()}
                    </div>
                    <div class="decoration-effect">
                      <!-- Decoration overlay would be displayed here -->
                    </div>
                  </div>
                  <div class="avatar-actions">
                    <button class="change-button" id="change-server-decoration">Change Decoration</button>
                  </div>
                </div>
              </div>
              
              <div class="profile-form-group">
                <label>PROFILE EFFECT</label>
                <button class="change-button" id="change-server-effect">Change Effect</button>
              </div>
              
              <div class="profile-form-group">
                <label>PROFILE BANNER</label>
                <div class="profile-banner">
                  <img src="assets/images/banner-sample.jpg" alt="Profile banner" class="banner-image">
                </div>
                <div class="avatar-actions">
                  <button class="change-button" id="change-server-banner">Change Banner</button>
                </div>
              </div>
              
              <div class="profile-form-group">
                <label>PROFILE THEME</label>
                <div class="profile-theme">
                  <div class="primary-color">
                    <label>Primary</label>
                    <div class="color-picker-container">
                      <div class="color-swatch active" style="background-color: #ee9ca7;" data-color="#ee9ca7"></div>
                      <div class="color-swatch" style="background-color: #3b1d60;" data-color="#3b1d60"></div>
                      <div class="color-swatch" style="background-color: #76b852;" data-color="#76b852"></div>
                      <div class="color-swatch" style="background-color: #ffb347;" data-color="#ffb347"></div>
                    </div>
                  </div>
                  <div class="accent-color">
                    <label>Accent</label>
                    <div class="color-picker-container">
                      <div class="color-swatch" style="background-color: #ffdde1;" data-color="#ffdde1"></div>
                      <div class="color-swatch active" style="background-color: #614385;" data-color="#614385"></div>
                      <div class="color-swatch" style="background-color: #8DC26F;" data-color="#8DC26F"></div>
                      <div class="color-swatch" style="background-color: #ffcc33;" data-color="#ffcc33"></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="profile-form-group">
                <label for="server-about-me">ABOUT ME</label>
                <textarea id="server-about-me" class="profile-textarea" placeholder="You can use markdown and links if you'd like.">Fox Den Developer</textarea>
                <div class="character-counter">190</div>
              </div>
            </div>
            
            <div class="server-profile-preview">
              <h4>PREVIEW FOR ${servers[0].name.toUpperCase()}</h4>
              <div class="preview-content">
                <div class="preview-banner">
                  <img src="assets/images/banner-sample.jpg" alt="Banner" class="preview-banner-img">
                  <div class="preview-avatar">
                    <div class="avatar-circle">
                      ${user.avatar || 'L'}
                    </div>
                  </div>
                  <div class="preview-status-container">
                    <button class="preview-status-button">
                      <span class="status-icon">+</span>
                      Add Status
                    </button>
                  </div>
                </div>
                <div class="preview-info">
                  <div class="preview-name">L̷i̷l̷_q̷</div>
                  <div class="preview-tag">lil_q • Toaster/Oven 😊 🎮 🎯</div>
                  <div class="preview-button">Example Button</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-actions">
            <button class="save-button" id="save-server-profile">Save Changes</button>
          </div>
        </div>
        
        <div class="form-actions" id="user-profile-actions">
          <button class="save-button" id="save-profile">Save Changes</button>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = profileHtml;
    
    // Set up event listeners for tabs
    document.querySelectorAll('.profile-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active tab
        document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show appropriate content
        const tabId = tab.dataset.tab;
        document.querySelectorAll('.profile-tab-content').forEach(content => {
          content.classList.add('hidden');
        });
        document.getElementById(`${tabId}-content`).classList.remove('hidden');
        
        // Toggle form actions visibility
        if (tabId === 'user-profile') {
          document.getElementById('user-profile-actions').style.display = 'block';
        } else {
          document.getElementById('user-profile-actions').style.display = 'none';
        }
      });
    });
    
    // Server dropdown toggle
    const selectedServer = document.querySelector('.selected-server');
    const dropdownMenu = document.querySelector('.server-dropdown-menu');
    
    if (selectedServer) {
      selectedServer.addEventListener('click', () => {
        dropdownMenu.classList.toggle('hidden');
      });
    }
    
    // Server selection
    document.querySelectorAll('.server-option').forEach(option => {
      option.addEventListener('click', () => {
        const serverId = option.dataset.serverId;
        const serverName = option.querySelector('.server-name').textContent;
        const serverIcon = option.querySelector('.server-icon').textContent;
        
        // Update selected server display
        document.querySelector('.selected-server .server-name').textContent = serverName;
        document.querySelector('.selected-server .server-icon').textContent = serverIcon;
        
        // Update preview heading
        document.querySelector('.server-profile-preview h4').textContent = `PREVIEW FOR ${serverName.toUpperCase()}`;
        
        // Hide dropdown
        dropdownMenu.classList.add('hidden');
        
        // In a real implementation, you would load the server-specific profile here
        console.log(`Selected server: ${serverName} (${serverId})`);
      });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.server-dropdown') && !dropdownMenu.classList.contains('hidden')) {
        dropdownMenu.classList.add('hidden');
      }
    });
    
    // Color swatch selection
    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', (e) => {
        // Only set active within the same container (primary or accent)
        const container = swatch.closest('.color-picker-container');
        container.querySelectorAll('.color-swatch').forEach(s => {
          s.classList.remove('active');
        });
        swatch.classList.add('active');
      });
    });
    
    // Learn more link
    const learnMoreLink = document.querySelector('.learn-more-link');
    if (learnMoreLink) {
      learnMoreLink.addEventListener('click', (e) => {
        e.preventDefault();
        Utils.showToast('Per-server profiles allow you to customize your appearance in different servers', 'info');
      });
    }
    
    // Save button for user profile
    document.getElementById('save-profile').addEventListener('click', () => {
      const displayName = document.getElementById('display-name').value;
      const pronouns = document.getElementById('pronouns').value;
      const aboutMe = document.getElementById('about-me').value;
      const showLegacyBadge = document.getElementById('legacy-badge-toggle').checked;
      
      // Get selected colors
      const primaryColor = document.querySelector('#user-profile-content .primary-color .color-swatch.active').dataset.color;
      const accentColor = document.querySelector('#user-profile-content .accent-color .color-swatch.active').dataset.color;
      
      // Update user in state
      const updatedUser = {
        ...user,
        displayName,
        pronouns,
        aboutMe,
        showLegacyBadge,
        profileTheme: {
          primary: primaryColor,
          accent: accentColor
        }
      };
      
      AppState.set('currentUser', updatedUser);
      Utils.showToast('Profile updated successfully', 'success');
    });
    
    // Save button for server profile
    document.getElementById('save-server-profile').addEventListener('click', () => {
      const nickname = document.getElementById('server-nickname').value;
      const pronouns = document.getElementById('server-pronouns').value;
      const aboutMe = document.getElementById('server-about-me').value;
      
      // Get selected colors
      const primaryColor = document.querySelector('#per-server-profiles-content .primary-color .color-swatch.active').dataset.color;
      const accentColor = document.querySelector('#per-server-profiles-content .accent-color .color-swatch.active').dataset.color;
      const serverName = document.querySelector('.selected-server .server-name').textContent;
      
      // In a real implementation, you would save this to the specific server profile
      console.log(`Saving profile for server: ${serverName}`);
      console.log({ nickname, pronouns, aboutMe, primaryColor, accentColor });
      
      Utils.showToast(`Server profile for "${serverName}" updated successfully`, 'success');
    });
    
    // Other button event listeners
    const buttonActions = {
      'change-avatar': 'Avatar change functionality would open here',
      'remove-avatar': 'Avatar removed',
      'change-decoration': 'Avatar decoration options would open here',
      'change-effect': 'Profile effect options would open here',
      'change-banner': 'Banner change functionality would open here',
      'remove-banner': 'Banner removed',
      'change-server-avatar': 'Server avatar change functionality would open here',
      'change-server-decoration': 'Server avatar decoration options would open here',
      'change-server-effect': 'Server profile effect options would open here',
      'change-server-banner': 'Server banner change functionality would open here'
    };
    
    Object.keys(buttonActions).forEach(buttonId => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.addEventListener('click', () => {
          Utils.showToast(buttonActions[buttonId], 'info');
        });
      }
    });
  },
  
  /**
   * Load privacy settings content
   * @private
   */
  _loadPrivacySettings: function() {
    console.log('Loading content for category: privacy');
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
        // Handle specific toggles
        if (toggle.id === 'compact-mode') {
          const chatContainer = document.getElementById('messages-container');
          if (chatContainer) {
            chatContainer.classList.toggle('compact-mode', toggle.checked);
          }
          AppState.set('compactMode', toggle.checked);
        }
        
        if (toggle.id === 'show-timestamps') {
          const chatContainer = document.getElementById('messages-container');
          if (chatContainer) {
            chatContainer.classList.toggle('show-timestamps', toggle.checked);
          }
          AppState.set('showTimestamps', toggle.checked);
        }
        
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
    console.log('Loading content for category: appearance');
    const currentTheme = AppState.get('currentTheme');
    const chatFontSize = AppState.get('chatFontSize') || 16;
    const messageSpacing = AppState.get('messageSpacing') || 16;
    const zoomLevel = AppState.get('zoomLevel') || 100;
    const timeFormat = AppState.get('timeFormat') || 'auto';
    
    const appearanceHtml = `
      <div class="settings-section">
        <h3>Appearance</h3>
        
        <div class="settings-group chat-preview">
          <div class="chat-preview-container">
            <div class="chat-preview-message">
              <div class="chat-preview-avatar">🦊</div>
              <div class="chat-preview-content">
                <div class="chat-preview-header">
                  <span class="chat-preview-username">Nouna</span>
                  <span class="chat-preview-timestamp">Today at 22:59</span>
                </div>
                <div class="chat-preview-text">Look at me I'm a beautiful butterfly</div>
                <div class="chat-preview-text">Fluttering in the moonlight 😊</div>
              </div>
            </div>
            <div class="chat-preview-message">
              <div class="chat-preview-avatar">👑</div>
              <div class="chat-preview-content">
                <div class="chat-preview-header">
                  <span class="chat-preview-username">Lili</span>
                  <span class="chat-preview-timestamp">Today at 22:59</span>
                </div>
                <div class="chat-preview-text">Waiting for the day when</div>
                <div class="chat-preview-text">Compact mode would be turned on</div>
              </div>
            </div>
            <div class="chat-preview-message">
              <div class="chat-preview-avatar">👑</div>
              <div class="chat-preview-content">
                <div class="chat-preview-header">
                  <span class="chat-preview-username">Lili</span>
                  <span class="chat-preview-timestamp">Today at 22:59</span>
                </div>
                <div class="chat-preview-text">Hello everyone!</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Theme</h4>
          
          <div class="theme-option ${currentTheme === 'dark' ? 'active' : ''}" data-theme="dark">
            <div class="theme-preview dark">
              <div class="theme-preview-sidebar"></div>
            </div>
            <div class="theme-info">
              <div class="theme-name">Original Fox</div>
              <div class="theme-description">A dark theme for low-light environments</div>
            </div>
          </div>
          
          <div class="theme-option ${currentTheme === 'light' ? 'active' : ''}" data-theme="light">
            <div class="theme-preview light">
              <div class="theme-preview-sidebar"></div>
            </div>
            <div class="theme-info">
              <div class="theme-name">Fennec</div>
              <div class="theme-description">A soft grey theme inspired by the fennec fox</div>
            </div>
          </div>
        </div>
        
        <div class="settings-group disabled-setting">
          <div class="premium-feature">
            <h4>Color</h4>
            <span class="premium-badge">Premium</span>
          </div>
          <div class="premium-feature-text">Make FoxDen yours. Only with Premium.</div>
        </div>
        
        <div class="settings-group disabled-setting">
          <div class="premium-feature">
            <h4>In-app Icon</h4>
            <span class="premium-badge">Premium</span>
          </div>
          <div class="premium-feature-text">Change the FoxDen in-app icon, only with Premium.</div>
        </div>
        
        <div class="settings-group">
          <h4>Message Display</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Compact Mode</div>
              <div class="privacy-option-description">Fit more messages on screen at one time. #IRC</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="compact-mode" class="toggle-input">
              <label for="compact-mode" class="toggle-slider"></label>
            </div>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Show avatars in Compact mode</div>
              <div class="privacy-option-description">When using compact mode, show user avatars next to messages</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="show-avatars-compact" class="toggle-input" checked>
              <label for="show-avatars-compact" class="toggle-slider"></label>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Chat Font Scaling</h4>
          <div class="slider-container">
            <div class="slider-markers">
              <span>12px</span>
              <span>14px</span>
              <span>15px</span>
              <span>16px</span>
              <span>18px</span>
              <span>20px</span>
              <span>24px</span>
            </div>
            <input type="range" id="font-size-slider" class="quality-slider" min="12" max="24" step="1" value="${chatFontSize}">
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Space Between Message Groups</h4>
          <div class="slider-container">
            <div class="slider-markers">
              <span>0px</span>
              <span>4px</span>
              <span>8px</span>
              <span>16px</span>
              <span>24px</span>
            </div>
            <input type="range" id="message-spacing-slider" class="quality-slider" min="0" max="24" step="4" value="${messageSpacing}">
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Zoom Level</h4>
          <div class="slider-container">
            <div class="slider-markers">
              <span>50</span>
              <span>67</span>
              <span>75</span>
              <span>80</span>
              <span>90</span>
              <span>100</span>
              <span>110</span>
              <span>125</span>
              <span>150</span>
              <span>175</span>
              <span>200</span>
            </div>
            <input type="range" id="zoom-level-slider" class="quality-slider" min="50" max="200" step="5" value="${zoomLevel}">
          </div>
          <div class="slider-hint">You can change the zoom level with ctrl +/- and reset to the default zoom with ctrl+0.</div>
        </div>
        
        <div class="settings-group">
          <h4>Time Format</h4>
          
          <div class="radio-group">
            <div class="radio-option">
              <input type="radio" id="time-format-auto" name="time-format" class="radio-input" value="auto" ${timeFormat === 'auto' ? 'checked' : ''}>
              <label for="time-format-auto" class="radio-label">
                <div class="radio-button"></div>
                <div class="radio-content">
                  <div class="radio-title">Auto</div>
                </div>
              </label>
            </div>
            
            <div class="radio-option">
              <input type="radio" id="time-format-12h" name="time-format" class="radio-input" value="12h" ${timeFormat === '12h' ? 'checked' : ''}>
              <label for="time-format-12h" class="radio-label">
                <div class="radio-button"></div>
                <div class="radio-content">
                  <div class="radio-title">12-hour</div>
                </div>
              </label>
            </div>
            
            <div class="radio-option">
              <input type="radio" id="time-format-24h" name="time-format" class="radio-input" value="24h" ${timeFormat === '24h' ? 'checked' : ''}>
              <label for="time-format-24h" class="radio-label">
                <div class="radio-button"></div>
                <div class="radio-content">
                  <div class="radio-title">24-hour</div>
                </div>
              </label>
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
        
        // Use the new setTheme method
        AppState.setTheme(theme);
        
        // Update active class in the settings panel
        document.querySelectorAll('.theme-option').forEach(opt => {
          opt.classList.toggle('active', opt.dataset.theme === theme);
        });
        
        // Update chat preview theme
        this._updateChatPreviewTheme(theme);
        
        const themeName = theme === 'dark' ? 'Original Fox' : 'Fennec';
        Utils.showToast(`Theme changed to ${themeName}`, 'success');
      });
    });
    
    // Set up compact mode toggle
    const compactModeToggle = document.getElementById('compact-mode');
    compactModeToggle.checked = AppState.get('compactMode') || false;
    compactModeToggle.addEventListener('change', () => {
      const isCompact = compactModeToggle.checked;
      AppState.set('compactMode', isCompact);
      this._updateChatPreviewCompactMode(isCompact);
      Utils.showToast(`Compact mode ${isCompact ? 'enabled' : 'disabled'}`, 'success');
    });
    
    // Set up avatar in compact mode toggle
    const showAvatarsToggle = document.getElementById('show-avatars-compact');
    showAvatarsToggle.checked = AppState.get('showAvatarsInCompactMode') !== false; // Default to true
    showAvatarsToggle.addEventListener('change', () => {
      const showAvatars = showAvatarsToggle.checked;
      AppState.set('showAvatarsInCompactMode', showAvatars);
      this._updateChatPreviewAvatars(showAvatars);
      Utils.showToast(`Avatars in compact mode ${showAvatars ? 'enabled' : 'disabled'}`, 'success');
    });
    
    // Set up font size slider
    const fontSizeSlider = document.getElementById('font-size-slider');
    // Set initial value percent
    this._updateSliderTrack(fontSizeSlider);
    fontSizeSlider.addEventListener('input', () => {
      const fontSize = parseInt(fontSizeSlider.value);
      AppState.set('chatFontSize', fontSize);
      this._updateChatPreviewFontSize(fontSize);
      this._updateSliderTrack(fontSizeSlider);
    });
    
    // Set up message spacing slider
    const messageSpacingSlider = document.getElementById('message-spacing-slider');
    // Set initial value percent
    this._updateSliderTrack(messageSpacingSlider);
    messageSpacingSlider.addEventListener('input', () => {
      const spacing = parseInt(messageSpacingSlider.value);
      AppState.set('messageSpacing', spacing);
      this._updateChatPreviewMessageSpacing(spacing);
      this._updateSliderTrack(messageSpacingSlider);
    });
    
    // Set up zoom level slider
    const zoomLevelSlider = document.getElementById('zoom-level-slider');
    // Set initial value percent
    this._updateSliderTrack(zoomLevelSlider);
    zoomLevelSlider.addEventListener('input', () => {
      const zoom = parseInt(zoomLevelSlider.value);
      AppState.set('zoomLevel', zoom);
      document.body.style.zoom = `${zoom}%`;
      this._updateSliderTrack(zoomLevelSlider);
    });
    
    // Set up time format radio buttons
    document.querySelectorAll('input[name="time-format"]').forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          const format = radio.value;
          AppState.set('timeFormat', format);
          Utils.showToast(`Time format changed to ${format === 'auto' ? 'Auto' : format === '12h' ? '12-hour' : '24-hour'}`, 'success');
        }
      });
    });
    
    // Initialize preview with current settings
    this._updateChatPreviewTheme(currentTheme);
    this._updateChatPreviewCompactMode(compactModeToggle.checked);
    this._updateChatPreviewAvatars(showAvatarsToggle.checked);
    this._updateChatPreviewFontSize(chatFontSize);
    this._updateChatPreviewMessageSpacing(messageSpacing);
    document.body.style.zoom = `${zoomLevel}%`;
  },
  
  /**
   * Update slider track to show filled portion
   * @param {HTMLElement} slider - The slider element
   * @private
   */
  _updateSliderTrack: function(slider) {
    const min = parseInt(slider.min) || 0;
    const max = parseInt(slider.max) || 100;
    const value = parseInt(slider.value) || min;
    const percent = (value - min) / (max - min);
    slider.style.setProperty('--value-percent', percent);
  },
  
  /**
   * Update chat preview theme
   * @param {string} theme - The theme to apply
   * @private
   */
  _updateChatPreviewTheme: function(theme) {
    const previewContainer = document.querySelector('.chat-preview-container');
    if (previewContainer) {
      previewContainer.classList.remove('theme-dark', 'theme-light');
      previewContainer.classList.add(`theme-${theme}`);
    }
  },
  
  /**
   * Update chat preview compact mode
   * @param {boolean} isCompact - Whether compact mode is enabled
   * @private
   */
  _updateChatPreviewCompactMode: function(isCompact) {
    const previewContainer = document.querySelector('.chat-preview-container');
    if (previewContainer) {
      previewContainer.classList.toggle('compact-mode', isCompact);
    }
  },
  
  /**
   * Update chat preview avatars
   * @param {boolean} showAvatars - Whether to show avatars
   * @private
   */
  _updateChatPreviewAvatars: function(showAvatars) {
    const previewContainer = document.querySelector('.chat-preview-container');
    if (previewContainer) {
      previewContainer.classList.toggle('hide-avatars', !showAvatars);
    }
  },
  
  /**
   * Update chat preview font size
   * @param {number} fontSize - The font size to apply
   * @private
   */
  _updateChatPreviewFontSize: function(fontSize) {
    const previewContainer = document.querySelector('.chat-preview-container');
    if (previewContainer) {
      previewContainer.style.setProperty('--chat-font-size', `${fontSize}px`);
    }
  },
  
  /**
   * Update chat preview message spacing
   * @param {number} spacing - The spacing to apply
   * @private
   */
  _updateChatPreviewMessageSpacing: function(spacing) {
    const previewContainer = document.querySelector('.chat-preview-container');
    if (previewContainer) {
      previewContainer.style.setProperty('--message-spacing', `${spacing}px`);
    }
  },
  
  /**
   * Load accessibility settings content
   * @private
   */
  _loadAccessibilitySettings: function() {
    console.log('Loading content for category: accessibility');
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
        // Handle specific toggles
        if (toggle.id === 'compact-mode') {
          const chatContainer = document.getElementById('messages-container');
          if (chatContainer) {
            chatContainer.classList.toggle('compact-mode', toggle.checked);
          }
          AppState.set('compactMode', toggle.checked);
        }
        
        if (toggle.id === 'show-timestamps') {
          const chatContainer = document.getElementById('messages-container');
          if (chatContainer) {
            chatContainer.classList.toggle('show-timestamps', toggle.checked);
          }
          AppState.set('showTimestamps', toggle.checked);
        }
        
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
      
      // Play a test sound
      try {
        // Create an audio context
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create oscillator for a simple beep sound
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // 440 Hz (A4)
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); // 30% volume
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // Play sound for 500ms
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          // Optionally close the audio context to free up resources
          if (audioCtx.state !== 'closed' && typeof audioCtx.close === 'function') {
            audioCtx.close();
          }
        }, 500);
      } catch (error) {
        console.error('Error playing test sound:', error);
        Utils.showToast('Could not play test sound', 'error');
      }
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
          this.micActivityInterval = requestAnimationFrame(updateMicLevel);
        };
        updateMicLevel();
        
        // Store the stream for cleanup
        this.micStream = stream;
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
      
      // Stop microphone stream if active
      if (this.micStream) {
        this.micStream.getTracks().forEach(track => track.stop());
        this.micStream = null;
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
        // Handle specific toggles
        if (toggle.id === 'quiet-hours') {
          document.querySelector('.quiet-hours-times').style.display = toggle.checked ? 'block' : 'none';
        }
        
        Utils.showToast(`Setting updated: ${toggle.id}`, 'success');
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
        
        // Listen for keydown events
        const handleKeyPress = (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Get key combination
          const keyCombo = [];
          if (e.ctrlKey) keyCombo.push('<div class="keybind-key">Ctrl</div>');
          if (e.shiftKey) keyCombo.push('<div class="keybind-key">Shift</div>');
          if (e.altKey) keyCombo.push('<div class="keybind-key">Alt</div>');
          
          // Add the main key if it's not a modifier
          if (!['Control', 'Shift', 'Alt'].includes(e.key)) {
            const displayKey = e.key === ' ' ? 'Space' : 
                              e.key.length === 1 ? e.key.toUpperCase() : 
                              e.key;
            keyCombo.push(`<div class="keybind-key">${displayKey}</div>`);
          }
          
          // Update UI with new key combo
          if (keyCombo.length > 0) {
            keys.innerHTML = keyCombo.join('');
            
            // Show success message
            Utils.showToast(`Keybind updated for: ${action}`, 'success');
            
            // Remove event listener
            document.removeEventListener('keydown', handleKeyPress);
          } else {
            // If no valid keys were pressed, restore original
            keys.innerHTML = originalHTML;
          }
        };
        
        // Add event listener
        document.addEventListener('keydown', handleKeyPress);
        
        // Add a click listener to cancel
        document.addEventListener('click', function cancelKeybind(e) {
          if (!keys.contains(e.target)) {
            keys.innerHTML = originalHTML;
            document.removeEventListener('keydown', handleKeyPress);
            document.removeEventListener('click', cancelKeybind);
          }
        });
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
    
    // Initialize spellcheck language dropdown state
    const spellcheckToggle = document.getElementById('spellcheck');
    const spellcheckLanguage = document.getElementById('spellcheck-language');
    spellcheckLanguage.disabled = !spellcheckToggle.checked;
    
    spellcheckToggle.addEventListener('change', (e) => {
      spellcheckLanguage.disabled = !e.target.checked;
      Utils.showToast(`Spellcheck ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
    });
  },
  
  /**
   * Load activity settings content
   * @private
   */
  _loadActivitySettings: function() {
    const activityHtml = `
      <div class="settings-section">
        <h3>Activity Status</h3>
        
        <div class="settings-group">
          <h4>Activity Settings</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Display current activity as a status message</div>
              <div class="privacy-option-description">Allow your activity to be shown as a status message</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="activity-status" class="toggle-input" checked>
              <label for="activity-status" class="toggle-slider"></label>
            </div>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Show current activity on your profile</div>
              <div class="privacy-option-description">Show what you're currently doing on your user profile</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="activity-profile" class="toggle-input" checked>
              <label for="activity-profile" class="toggle-slider"></label>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Game Activity</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Display game activity</div>
              <div class="privacy-option-description">Show what game you're playing as a status message</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="game-activity" class="toggle-input" checked>
              <label for="game-activity" class="toggle-slider"></label>
            </div>
          </div>
          
          <div class="settings-description">Games will be automatically detected when you play them. If games aren't being detected, add them manually below:</div>
          
          <div class="game-list">
            <div class="game-item">
              <div class="game-info">
                <div class="game-icon">🎮</div>
                <div class="game-name">Minecraft</div>
              </div>
              <div class="game-overlay">
                <button class="delete-button">Remove</button>
              </div>
            </div>
            
            <div class="game-item">
              <div class="game-info">
                <div class="game-icon">🎮</div>
                <div class="game-name">League of Legends</div>
              </div>
              <div class="game-overlay">
                <button class="delete-button">Remove</button>
              </div>
            </div>
          </div>
          
          <button class="change-button" id="add-game">Add Game</button>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = activityHtml;
    
    // Set up event listeners
    document.querySelectorAll('.toggle-input').forEach(toggle => {
      toggle.addEventListener('change', () => {
        Utils.showToast(`Setting updated: ${toggle.id}`, 'success');
      });
    });
    
    document.querySelectorAll('.game-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        item.classList.add('hover');
      });
      
      item.addEventListener('mouseleave', () => {
        item.classList.remove('hover');
      });
    });
    
    document.querySelectorAll('.game-item .delete-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const gameItem = e.target.closest('.game-item');
        const gameName = gameItem.querySelector('.game-name').textContent;
        
        gameItem.remove();
        Utils.showToast(`Removed game: ${gameName}`, 'success');
      });
    });
    
    document.getElementById('add-game').addEventListener('click', () => {
      Utils.showToast('Game addition dialog would appear here', 'info');
    });
  },
  
  /**
   * Load connections settings content
   * @private
   */
  _loadConnectionsSettings: function() {
    const connectionsHtml = `
      <div class="settings-section">
        <h3>Connections</h3>
        
        <div class="settings-description">Connect your accounts to enable integrations with other services.</div>
        
        <div class="settings-group">
          <div class="connection-grid">
            <div class="connection-item">
              <div class="connection-icon">
                <i class="fab fa-xbox"></i>
              </div>
              <div class="connection-name">Xbox</div>
              <button class="connection-button">Connect</button>
            </div>
            
            <div class="connection-item">
              <div class="connection-icon">
                <i class="fab fa-playstation"></i>
              </div>
              <div class="connection-name">PlayStation</div>
              <button class="connection-button">Connect</button>
            </div>
            
            <div class="connection-item">
              <div class="connection-icon">
                <i class="fab fa-steam"></i>
              </div>
              <div class="connection-name">Steam</div>
              <button class="connection-button">Connect</button>
            </div>
            
            <div class="connection-item">
              <div class="connection-icon">
                <i class="fab fa-spotify"></i>
              </div>
              <div class="connection-name">Spotify</div>
              <button class="connection-button">Connect</button>
            </div>
            
            <div class="connection-item">
              <div class="connection-icon">
                <i class="fab fa-twitch"></i>
              </div>
              <div class="connection-name">Twitch</div>
              <button class="connection-button">Connect</button>
            </div>
            
            <div class="connection-item">
              <div class="connection-icon">
                <i class="fab fa-youtube"></i>
              </div>
              <div class="connection-name">YouTube</div>
              <button class="connection-button">Connect</button>
            </div>
            
            <div class="connection-item">
              <div class="connection-icon">
                <i class="fab fa-github"></i>
              </div>
              <div class="connection-name">GitHub</div>
              <button class="connection-button">Connect</button>
            </div>
            
            <div class="connection-item">
              <div class="connection-icon">
                <i class="fab fa-twitter"></i>
              </div>
              <div class="connection-name">Twitter</div>
              <button class="connection-button">Connect</button>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Connected Accounts</h4>
          <div class="settings-description">No accounts connected yet.</div>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = connectionsHtml;
    
    // Set up event listeners
    document.querySelectorAll('.connection-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const connectionName = e.target.closest('.connection-item').querySelector('.connection-name').textContent;
        Utils.showToast(`${connectionName} connection would start here`, 'info');
      });
    });
  },
  
  /**
   * Load billing settings content
   * @private
   */
  _loadBillingSettings: function() {
    const billingHtml = `
      <div class="settings-section">
        <h3>Billing</h3>
        
        <div class="settings-group">
          <h4>Subscription</h4>
          
          <div class="subscription-info">
            <div class="subscription-header">
              <div class="subscription-name">FoxDen Basic</div>
              <div class="subscription-badge free">Free</div>
            </div>
            <div class="subscription-description">You're currently on the free plan.</div>
          </div>
          
          <div class="premium-banner">
            <div class="premium-banner-content">
              <div class="premium-banner-header">
                <div class="premium-banner-title">Upgrade to FoxDen Premium</div>
                <div class="premium-banner-price">$4.99/month</div>
              </div>
              <div class="premium-banner-features">
                <div class="premium-feature">
                  <i class="fas fa-check"></i> Higher quality voice chats
                </div>
                <div class="premium-feature">
                  <i class="fas fa-check"></i> Custom emojis anywhere
                </div>
                <div class="premium-feature">
                  <i class="fas fa-check"></i> Larger file uploads
                </div>
                <div class="premium-feature">
                  <i class="fas fa-check"></i> HD video streaming
                </div>
                <div class="premium-feature">
                  <i class="fas fa-check"></i> Custom profile themes
                </div>
              </div>
              <button class="premium-button">Upgrade Now</button>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Payment Methods</h4>
          <div class="settings-description">No payment methods added yet.</div>
          <button class="change-button" id="add-payment">Add Payment Method</button>
        </div>
        
        <div class="settings-group">
          <h4>Billing History</h4>
          <div class="settings-description">No recent transactions.</div>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = billingHtml;
    
    // Set up event listeners
    document.querySelector('.premium-button').addEventListener('click', () => {
      Utils.showToast('Premium upgrade flow would start here', 'info');
    });
    
    document.getElementById('add-payment').addEventListener('click', () => {
      Utils.showToast('Payment method addition dialog would appear here', 'info');
    });
  },
  
  /**
   * Load advanced settings content
   * @private
   */
  _loadAdvancedSettings: function() {
    const advancedHtml = `
      <div class="settings-section">
        <h3>Advanced</h3>
        
        <div class="settings-group">
          <h4>Behavior</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Developer Mode</div>
              <div class="privacy-option-description">Enable developer tools and advanced features</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="developer-mode" class="toggle-input">
              <label for="developer-mode" class="toggle-slider"></label>
            </div>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Hardware Acceleration</div>
              <div class="privacy-option-description">Use your GPU to improve performance (requires restart)</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="hardware-accel" class="toggle-input" checked>
              <label for="hardware-accel" class="toggle-slider"></label>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Network</h4>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Proxy Settings</div>
              <div class="privacy-option-description">Configure proxy settings for your connection</div>
            </div>
            <button class="change-button">Configure</button>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Data Management</h4>
          
          <div class="settings-description">Manage your data and cache settings</div>
          
          <div class="data-usage">
            <div class="data-item">
              <div class="data-name">App Cache</div>
              <div class="data-size">245 MB</div>
              <button class="change-button">Clear Cache</button>
            </div>
            
            <div class="data-item">
              <div class="data-name">Media Storage</div>
              <div class="data-size">128 MB</div>
              <button class="change-button">Clear Media</button>
            </div>
          </div>
          
          <div class="privacy-option">
            <div class="privacy-option-info">
              <div class="privacy-option-name">Automatic Media Cleanup</div>
              <div class="privacy-option-description">Automatically delete media files older than 30 days</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="auto-cleanup" class="toggle-input" checked>
              <label for="auto-cleanup" class="toggle-slider"></label>
            </div>
          </div>
        </div>
        
        <div class="settings-group">
          <h4>Debug</h4>
          
          <div class="debug-info">
            <div class="debug-item">
              <div class="debug-label">Version</div>
              <div class="debug-value">FoxDen v1.0.0</div>
            </div>
            
            <div class="debug-item">
              <div class="debug-label">Build</div>
              <div class="debug-value">10244</div>
            </div>
            
            <div class="debug-item">
              <div class="debug-label">Electron</div>
              <div class="debug-value">28.1.0</div>
            </div>
            
            <div class="debug-item">
              <div class="debug-label">Platform</div>
              <div class="debug-value">Windows 10</div>
            </div>
          </div>
          
          <button class="change-button" id="copy-debug">Copy Debug Info</button>
          <button class="change-button" id="debug-log">Debug Logs</button>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = advancedHtml;
    
    // Set up event listeners
    document.querySelectorAll('.toggle-input').forEach(toggle => {
      toggle.addEventListener('change', () => {
        Utils.showToast(`Setting updated: ${toggle.id}`, 'success');
      });
    });
    
    document.querySelectorAll('.data-item .change-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const dataName = e.target.closest('.data-item').querySelector('.data-name').textContent;
        Utils.showToast(`Cleared ${dataName}`, 'success');
      });
    });
    
    document.getElementById('copy-debug').addEventListener('click', () => {
      Utils.showToast('Debug info copied to clipboard', 'success');
    });
    
    document.getElementById('debug-log').addEventListener('click', () => {
      Utils.showToast('Debug logs would be shown here', 'info');
    });
  },
  
  /**
   * Handle display name change
   * @param {string} value - The new display name
   * @private
   */
  _handleDisplayNameChange: function(value) {
    if (!value.trim()) {
      Utils.showToast('Display name cannot be empty', 'error');
      return;
    }
    
    // Update user
    const user = { ...AppState.get('currentUser') };
    user.displayName = value.trim();
    
    AppState.set('currentUser', user);
    
    Utils.showToast('Display name updated successfully', 'success');
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
  },
  
  /**
   * Handle avatar edit
   * @private
   */
  _handleAvatarEdit: function() {
    Utils.showModal({
      title: 'Edit Avatar',
      content: `
        <div class="avatar-editor">
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
      `,
      onOpen: (modal) => {
        // Set up event listeners
        modal.querySelector('#upload-avatar').addEventListener('click', () => {
          Utils.showToast('File upload would open here', 'info');
        });
        
        modal.querySelector('#select-icon').addEventListener('click', () => {
          this._showEmojiPicker(modal);
        });
        
        modal.querySelector('#remove-avatar').addEventListener('click', () => {
          const avatarWrapper = modal.querySelector('.avatar-wrapper');
          avatarWrapper.textContent = Utils.getInitials(AppState.get('currentUser').username);
        });
      },
      onConfirm: (modal) => {
        // Get selected avatar
        const avatarWrapper = modal.querySelector('.avatar-wrapper');
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
      }
    });
  },
  
  /**
   * Show emoji picker for avatar selection
   * @param {HTMLElement} parentModal - The parent modal element
   * @private  
   */
  _showEmojiPicker: function(parentModal) {
    const emojis = ['🦊', '🐱', '🐶', '🐭', '🐹', '🐰', '🦝', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷'];
    
    // Create emoji grid HTML
    let emojiGrid = '<div class="emoji-grid">';
    emojis.forEach(emoji => {
      emojiGrid += `<div class="emoji" data-emoji="${emoji}">${emoji}</div>`;
    });
    emojiGrid += '</div>';
    
    // Show in a modal
    Utils.showModal({
      title: 'Select Avatar Icon',
      content: emojiGrid,
      onOpen: (modal) => {
        // Set up event listeners for emoji selection
        modal.querySelectorAll('.emoji').forEach(emoji => {
          emoji.addEventListener('click', () => {
            // Update avatar preview in parent modal
            const avatarWrapper = parentModal.querySelector('.avatar-wrapper');
            avatarWrapper.textContent = emoji.textContent;
            
            // Close emoji modal
            modal.close();
          });
        });
      }
    });
  },
  
  /**
   * Load content settings
   * @private
   */
  _loadContentSettings: function() {
    // Mock data for blocked users
    const blockedUsers = [
      { id: 'jasminium_thea', name: 'Sunny', avatar: '👩' },
      { id: 'danthemanbueno', name: 'DanTheManBueno', avatar: '👨' },
      { id: 'whx7638', name: 'whx', avatar: '🎮' },
      { id: 'albinopig0116', name: 'AlbinoPig', avatar: '🐷' },
      { id: 'goon_demon', name: 'goon demon', avatar: '👻' },
      { id: 'hidden1', name: 'Hidden User 1', avatar: '🥸' },
      { id: 'hidden2', name: 'Hidden User 2', avatar: '🤖' }
    ];

    const contentHtml = `
      <div class="settings-section">
        <h3 class="settings-section-header">Content & Social</h3>
        
        <!-- Content Section -->
        <div class="settings-subsection">
          <h4 class="settings-subsection-header">Content</h4>
          
          <div class="settings-subsection">
            <h5 class="settings-subsection-header">Sensitive media</h5>
            <p class="settings-subsection-description">
              Choose what you see when uploaded or linked media may contain sensitive content. 
              <a href="#" class="learn-more-link">Learn more</a>
            </p>
          </div>
          
          <div class="settings-subsection">
            <h5 class="settings-subsection-header">Direct Messages from friends</h5>
            <div class="dropdown-selector">
              <div class="dropdown-select">
                Show
                <span class="dropdown-arrow">▼</span>
              </div>
            </div>
          </div>
          
          <div class="settings-subsection">
            <h5 class="settings-subsection-header">Direct Messages from others</h5>
            <div class="dropdown-selector">
              <div class="dropdown-select">
                Block
                <span class="dropdown-arrow">▼</span>
              </div>
            </div>
          </div>
          
          <div class="settings-subsection">
            <h5 class="settings-subsection-header">Messages in server channels</h5>
            <div class="dropdown-selector">
              <div class="dropdown-select">
                Show
                <span class="dropdown-arrow">▼</span>
              </div>
            </div>
          </div>
          
          <div class="settings-subsection">
            <h5 class="settings-subsection-header">Direct Message spam</h5>
            <p class="settings-subsection-description">
              Automatically send DMs that may contain spam into a separate spam inbox. 
              <a href="#" class="learn-more-link">Learn more</a>
            </p>
            
            <div class="radio-group">
              <div class="radio-option green">
                <div class="radio-input-container">
                  <input type="radio" name="spam-filter" class="radio-input" id="filter-all">
                </div>
                <div class="radio-content">
                  <div class="radio-title">Filter all</div>
                  <div class="radio-description">All DMs will be filtered for spam</div>
                </div>
              </div>
              
              <div class="radio-option yellow">
                <div class="radio-input-container">
                  <input type="radio" name="spam-filter" class="radio-input" id="filter-non-friends" checked>
                </div>
                <div class="radio-content">
                  <div class="radio-title">Filter from non-friends</div>
                  <div class="radio-description">DMs from non-friends will be filtered for spam</div>
                </div>
              </div>
              
              <div class="radio-option red">
                <div class="radio-input-container">
                  <input type="radio" name="spam-filter" class="radio-input" id="no-filter">
                </div>
                <div class="radio-content">
                  <div class="radio-title">Do not filter</div>
                  <div class="radio-description">DMs will not be filtered for spam</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="toggle-container">
            <div class="toggle-text">
              <div class="toggle-title">Allow access to age-restricted commands from apps in Direct Messages</div>
              <div class="toggle-description">This setting applies to all apps. Allows people 18+ to access commands marked as age-restricted in DMs</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" class="toggle-input" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <div class="toggle-container">
            <div class="toggle-text">
              <div class="toggle-title">Allow access to age-restricted servers on iOS</div>
              <div class="toggle-description">After joining on desktop, view your servers for people 18+ on iOS devices</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" class="toggle-input" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <!-- Social Permissions Section -->
        <div class="settings-subsection">
          <h4 class="settings-subsection-header">Social permissions</h4>
          
          <div class="server-selector">
            <div class="server-select-container">
              <div class="selected-server">
                <div class="server-icon">🦊</div>
                <div class="server-name">All servers</div>
                <span class="dropdown-arrow">▼</span>
              </div>
            </div>
          </div>
          
          <div class="permission-item">
            <div class="permission-info">
              <div class="permission-name">Direct Messages</div>
              <div class="permission-description">Allow DMs from other server member</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" class="toggle-input" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <div class="permission-item">
            <div class="permission-info">
              <div class="permission-name">Message requests</div>
              <div class="permission-description">
                Filter messages from server members you may not know. 
                <a href="#" class="learn-more-link">Learn more</a>
              </div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" class="toggle-input" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <!-- Friend Requests Section -->
        <div class="settings-subsection">
          <h4 class="settings-subsection-header">Friend requests</h4>
          
          <div class="permission-item">
            <div class="permission-info">
              <div class="permission-name">Everyone</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" class="toggle-input" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <div class="permission-item">
            <div class="permission-info">
              <div class="permission-name">Friend of friends</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" class="toggle-input" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
          
          <div class="permission-item">
            <div class="permission-info">
              <div class="permission-name">Server members</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" class="toggle-input" checked>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <!-- Blocked Accounts Section -->
        <div class="settings-subsection">
          <h4 class="settings-subsection-header">Accounts you've blocked or ignored</h4>
          <p class="settings-subsection-description">
            You're in control. To compare your options for reducing unwanted interactions, 
            <a href="#" class="learn-more-link">explore our feature guide</a>
          </p>
          
          <div class="blocked-accounts-section">
            <div class="blocked-accounts-header">
              <div class="blocked-accounts-title">Blocked accounts</div>
              <div class="blocked-accounts-count">7 accounts</div>
            </div>
            
            <div class="blocked-user-list">
              ${blockedUsers.slice(0, 5).map(user => `
                <div class="blocked-user">
                  <div class="blocked-user-info">
                    <div class="user-avatar">${user.avatar}</div>
                    <div class="user-details">
                      <div class="user-name">${user.name}</div>
                      <div class="user-id">${user.id}</div>
                    </div>
                  </div>
                  <button class="unblock-button">Unblock</button>
                </div>
              `).join('')}
            </div>
            
            <button class="load-more-button">See 2 more</button>
          </div>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = contentHtml;
    
    // Set up event listeners
    document.querySelectorAll('.toggle-input').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const parent = e.target.closest('.permission-item, .toggle-container');
        const permissionName = parent ? parent.querySelector('.permission-name, .toggle-title')?.textContent : 'Setting';
        Utils.showToast(`${permissionName} ${isChecked ? 'enabled' : 'disabled'}`, 'info');
      });
    });
    
    document.querySelectorAll('.radio-option').forEach(option => {
      option.addEventListener('click', () => {
        const radioInput = option.querySelector('.radio-input');
        if (radioInput) {
          radioInput.checked = true;
          const optionTitle = option.querySelector('.radio-title').textContent;
          Utils.showToast(`Spam filter set to: ${optionTitle}`, 'info');
        }
      });
    });
    
    document.querySelector('.server-select-container').addEventListener('click', () => {
      Utils.showToast('Server selection would open here', 'info');
    });
    
    document.querySelectorAll('.dropdown-select').forEach(select => {
      select.addEventListener('click', () => {
        Utils.showToast('Dropdown options would appear here', 'info');
      });
    });
    
    document.querySelectorAll('.unblock-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const userBlock = e.target.closest('.blocked-user');
        const username = userBlock.querySelector('.user-name').textContent;
        Utils.showToast(`Unblocked ${username}`, 'success');
        userBlock.style.opacity = '0.5';
        setTimeout(() => {
          userBlock.style.display = 'none';
        }, 500);
      });
    });
    
    document.querySelector('.load-more-button').addEventListener('click', () => {
      const button = document.querySelector('.load-more-button');
      button.textContent = 'Loading...';
      
      // Simulate loading delay
      setTimeout(() => {
        const blockedUserList = document.querySelector('.blocked-user-list');
        const moreUsers = blockedUsers.slice(5).map(user => `
          <div class="blocked-user">
            <div class="blocked-user-info">
              <div class="user-avatar">${user.avatar}</div>
              <div class="user-details">
                <div class="user-name">${user.name}</div>
                <div class="user-id">${user.id}</div>
              </div>
            </div>
            <button class="unblock-button">Unblock</button>
          </div>
        `).join('');
        
        blockedUserList.insertAdjacentHTML('beforeend', moreUsers);
        
        // Add event listeners for new unblock buttons
        document.querySelectorAll('.unblock-button').forEach(btn => {
          if (!btn.hasEventListener) {
            btn.hasEventListener = true;
            btn.addEventListener('click', (e) => {
              const userBlock = e.target.closest('.blocked-user');
              const username = userBlock.querySelector('.user-name').textContent;
              Utils.showToast(`Unblocked ${username}`, 'success');
              userBlock.style.opacity = '0.5';
              setTimeout(() => {
                userBlock.style.display = 'none';
              }, 500);
            });
          }
        });
        
        button.style.display = 'none';
      }, 800);
    });
    
    document.querySelectorAll('.learn-more-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        Utils.showToast('Documentation would open here', 'info');
      });
    });
  },
  
  /**
   * Load family settings
   * @private
   */
  _loadFamilySettings: function() {
    const familyHtml = `
      <div class="settings-section">
        <h3>Family Controls</h3>
        <div class="settings-group">
          <div class="settings-description">Configure family-friendly settings and parental controls.</div>
          <div class="settings-button">Set Up Family Controls</div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = familyHtml;
  },
  
  /**
   * Load authorized apps settings
   * @private
   */
  _loadAuthorizedAppsSettings: function() {
    const appsHtml = `
      <div class="settings-section">
        <h3>Authorized Apps</h3>
        <div class="settings-description">These applications have been authorized to access your account.</div>
        <div class="authorized-apps-list">
          <div class="no-apps-message">You haven't authorized any apps yet.</div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = appsHtml;
  },
  
  /**
   * Load devices settings
   * @private
   */
  _loadDevicesSettings: function() {
    const devicesHtml = `
      <div class="settings-section">
        <h3>Devices</h3>
        <div class="settings-description">Manage devices that are currently logged in to your account.</div>
        <div class="devices-list">
          <div class="device-item current">
            <div class="device-icon">💻</div>
            <div class="device-info">
              <div class="device-name">Current Computer</div>
              <div class="device-details">Windows • FoxDen Desktop</div>
            </div>
            <div class="device-status">Current Session</div>
          </div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = devicesHtml;
  },
  
  /**
   * Load connections settings
   * @private
   */
  _loadConnectionsSettings: function() {
    const connectionsHtml = `
      <div class="settings-section">
        <h3>Connections</h3>
        <div class="settings-description">Connect your accounts to enable enhanced features.</div>
        <div class="connections-list">
          <div class="connection-type">
            <div class="connection-icon">🎮</div>
            <div class="connection-name">Gaming</div>
            <div class="settings-button">Connect</div>
          </div>
          <div class="connection-type">
            <div class="connection-icon">🎵</div>
            <div class="connection-name">Music</div>
            <div class="settings-button">Connect</div>
          </div>
          <div class="connection-type">
            <div class="connection-icon">📱</div>
            <div class="connection-name">Social</div>
            <div class="settings-button">Connect</div>
          </div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = connectionsHtml;
  },
  
  /**
   * Load clips settings
   * @private
   */
  _loadClipsSettings: function() {
    const clipsHtml = `
      <div class="settings-section">
        <h3>Clips</h3>
        <div class="settings-description">View and manage your saved clips.</div>
        <div class="clips-list">
          <div class="no-clips-message">You don't have any clips yet.</div>
          <div class="settings-button">Create a Clip</div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = clipsHtml;
  },
  
  /**
   * Load premium settings
   * @private
   */
  _loadPremiumSettings: function() {
    const premiumHtml = `
      <div class="settings-section premium-section">
        <h3>FoxDen Premium</h3>
        <div class="premium-banner">
          <div class="premium-logo">✨</div>
          <h4>Upgrade to FoxDen Premium</h4>
          <div class="premium-features">
            <ul>
              <li>Higher quality voice & video</li>
              <li>Custom profile themes</li>
              <li>Larger file uploads (up to 500MB)</li>
              <li>HD streaming</li>
              <li>Custom emojis anywhere</li>
            </ul>
          </div>
          <div class="premium-price">
            <div class="premium-amount">$9.99</div>
            <div class="premium-period">per month</div>
          </div>
          <div class="settings-button premium-button">Subscribe Now</div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = premiumHtml;
  },
  
  /**
   * Load boosts settings
   * @private
   */
  _loadBoostsSettings: function() {
    const boostsHtml = `
      <div class="settings-section">
        <h3>Den Boosts</h3>
        <div class="settings-description">Boost your favorite dens to unlock enhanced features for everyone.</div>
        <div class="boosts-info">
          <div class="boosts-available">
            <h4>Your Boosts</h4>
            <div class="boost-count">0 / 2</div>
            <div class="settings-description">Get Premium to unlock 2 boosts</div>
          </div>
          <div class="boosted-dens">
            <h4>Boosted Dens</h4>
            <div class="no-boosts-message">You haven't boosted any dens yet.</div>
          </div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = boostsHtml;
  },
  
  /**
   * Load subscriptions settings
   * @private
   */
  _loadSubscriptionsSettings: function() {
    const subscriptionsHtml = `
      <div class="settings-section">
        <h3>Subscriptions</h3>
        <div class="settings-description">Manage your active subscriptions.</div>
        <div class="subscription-list">
          <div class="no-subscriptions-message">You don't have any active subscriptions.</div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = subscriptionsHtml;
  },
  
  /**
   * Load gifts settings
   * @private
   */
  _loadGiftsSettings: function() {
    const giftsHtml = `
      <div class="settings-section">
        <h3>Gift Inventory</h3>
        <div class="gift-tabs">
          <div class="gift-tab active">Received</div>
          <div class="gift-tab">Sent</div>
          <div class="gift-tab">Redeem Code</div>
        </div>
        <div class="gift-list">
          <div class="gift-item">
            <div class="gift-icon">🎁</div>
            <div class="gift-info">
              <div class="gift-name">1 Month FoxDen Premium</div>
              <div class="gift-sender">From: FoxFriend</div>
              <div class="gift-date">Received: Today</div>
            </div>
            <div class="settings-button">Redeem</div>
          </div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = giftsHtml;
  },
  
  /**
   * Load billing settings
   * @private
   */
  _loadBillingSettings: function() {
    const billingHtml = `
      <div class="settings-section">
        <h3>Billing</h3>
        <div class="settings-group">
          <h4>Payment Methods</h4>
          <div class="settings-description">You don't have any payment methods yet.</div>
          <div class="settings-button">Add Payment Method</div>
        </div>
        <div class="settings-group">
          <h4>Billing History</h4>
          <div class="settings-description">No billing history available.</div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = billingHtml;
  },
  
  /**
   * Load Windows settings
   * @private
   */
  _loadWindowsSettings: function() {
    const windowsHtml = `
      <div class="settings-section">
        <h3>Windows Settings</h3>
        <div class="settings-group">
          <div class="settings-item toggle-item">
            <div class="settings-item-info">
              <div class="settings-item-name">Open FoxDen on startup</div>
              <div class="settings-item-description">Automatically start FoxDen when you log in to Windows</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="startup-toggle" class="toggle-input">
              <label class="toggle-slider" for="startup-toggle"></label>
            </div>
          </div>
          <div class="settings-item toggle-item">
            <div class="settings-item-info">
              <div class="settings-item-name">Minimize to system tray</div>
              <div class="settings-item-description">Keep FoxDen running in the system tray when closed</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="tray-toggle" class="toggle-input" checked>
              <label class="toggle-slider" for="tray-toggle"></label>
            </div>
          </div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = windowsHtml;
  },
  
  /**
   * Load streamer settings
   * @private
   */
  _loadStreamerSettings: function() {
    const streamerHtml = `
      <div class="settings-section">
        <h3>Streamer Mode</h3>
        <div class="settings-group">
          <div class="settings-item toggle-item">
            <div class="settings-item-info">
              <div class="settings-item-name">Enable Streamer Mode</div>
              <div class="settings-item-description">Hide personal information while streaming</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="streamer-toggle" class="toggle-input">
              <label class="toggle-slider" for="streamer-toggle"></label>
            </div>
          </div>
          <div class="settings-item toggle-item">
            <div class="settings-item-info">
              <div class="settings-item-name">Automatically enable when streaming is detected</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="auto-streamer-toggle" class="toggle-input">
              <label class="toggle-slider" for="auto-streamer-toggle"></label>
            </div>
          </div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = streamerHtml;
  },
  
  /**
   * Load advanced settings
   * @private
   */
  _loadAdvancedSettings: function() {
    const advancedHtml = `
      <div class="settings-section">
        <h3>Advanced</h3>
        <div class="settings-group">
          <h4>App Settings</h4>
          <div class="settings-item">
            <div class="settings-item-info">
              <div class="settings-item-name">Hardware Acceleration</div>
              <div class="settings-item-description">Uses your GPU to improve performance</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="hardware-toggle" class="toggle-input" checked>
              <label class="toggle-slider" for="hardware-toggle"></label>
            </div>
          </div>
          <div class="settings-button">Clear Cache</div>
        </div>
        <div class="settings-group danger-zone">
          <h4>Danger Zone</h4>
          <div class="settings-description">These actions cannot be undone.</div>
          <div class="settings-button danger">Reset All Settings</div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = advancedHtml;
  },
  
  /**
   * Load activity privacy settings
   * @private
   */
  _loadActivityPrivacySettings: function() {
    const activityHtml = `
      <div class="settings-section">
        <h3>Activity Status</h3>
        <div class="settings-group">
          <div class="settings-item toggle-item">
            <div class="settings-item-info">
              <div class="settings-item-name">Display current activity</div>
              <div class="settings-item-description">Show others what apps and games you're using</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="activity-toggle" class="toggle-input" checked>
              <label class="toggle-slider" for="activity-toggle"></label>
            </div>
          </div>
          <div class="settings-item toggle-item">
            <div class="settings-item-info">
              <div class="settings-item-name">Show app activity while playing</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="app-activity-toggle" class="toggle-input" checked>
              <label class="toggle-slider" for="app-activity-toggle"></label>
            </div>
          </div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = activityHtml;
  },
  
  /**
   * Load registered apps settings
   * @private
   */
  _loadRegisteredAppsSettings: function() {
    const registeredAppsHtml = `
      <div class="settings-section">
        <h3>Registered Apps</h3>
        <div class="settings-description">These apps will be detected when you use them.</div>
        <div class="registered-apps-list">
          <div class="registered-app">
            <div class="app-icon">🎮</div>
            <div class="app-info">
              <div class="app-name">Sample Game</div>
              <div class="app-path">C:\\Games\\SampleGame\\game.exe</div>
            </div>
            <div class="remove-button">✕</div>
          </div>
          <div class="settings-button">Add Application</div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = registeredAppsHtml;
  },
  
  /**
   * Load overlay settings
   * @private
   */
  _loadOverlaySettings: function() {
    const overlayHtml = `
      <div class="settings-section">
        <h3>App Overlay</h3>
        <div class="settings-group">
          <div class="settings-item toggle-item">
            <div class="settings-item-info">
              <div class="settings-item-name">Enable In-App Overlay</div>
              <div class="settings-item-description">Show FoxDen overlay while you're in a game</div>
            </div>
            <div class="toggle-switch">
              <input type="checkbox" id="overlay-toggle" class="toggle-input">
              <label class="toggle-slider" for="overlay-toggle"></label>
            </div>
          </div>
        </div>
        <div class="settings-group">
          <h4>Overlay Position</h4>
          <div class="settings-radio">
            <input type="radio" id="position-left" name="overlay-position" checked>
            <label for="position-left">Left</label>
          </div>
          <div class="settings-radio">
            <input type="radio" id="position-right" name="overlay-position">
            <label for="position-right">Right</label>
          </div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = overlayHtml;
  },
  
  /**
   * Load what's new content
   * @private
   */
  _loadWhatsNewContent: function() {
    const whatsNewHtml = `
      <div class="settings-section">
        <h3>What's New</h3>
        <div class="whats-new-item">
          <div class="version-number">Version 1.2.0</div>
          <div class="update-date">Released: April 12, 2023</div>
          <div class="update-notes">
            <ul>
              <li>Added screen sharing capabilities</li>
              <li>Improved voice quality</li>
              <li>New customization options</li>
              <li>Bug fixes and performance improvements</li>
            </ul>
          </div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = whatsNewHtml;
  },
  
  /**
   * Load merch content
   * @private
   */
  _loadMerchContent: function() {
    const merchHtml = `
      <div class="settings-section">
        <h3>Merch Store</h3>
        <div class="settings-description">Check out official FoxDen merchandise!</div>
        <div class="merch-items">
          <div class="merch-item">
            <div class="merch-image">👕</div>
            <div class="merch-info">
              <div class="merch-name">FoxDen T-Shirt</div>
              <div class="merch-price">$24.99</div>
            </div>
            <div class="settings-button">View</div>
          </div>
          <div class="merch-item">
            <div class="merch-image">🧢</div>
            <div class="merch-info">
              <div class="merch-name">FoxDen Cap</div>
              <div class="merch-price">$19.99</div>
            </div>
            <div class="settings-button">View</div>
          </div>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = merchHtml;
  },
  
  /**
   * Load FoxPack content
   * @private
   */
  _loadFoxpackContent: function() {
    const foxpackHtml = `
      <div class="settings-section">
        <h3>FoxPack</h3>
        <div class="foxpack-banner">
          <div class="foxpack-logo">🦊👥</div>
          <div class="foxpack-info">
            <h4>Join the FoxPack Community</h4>
            <div class="settings-description">Connect with other FoxDen users, get early access to new features, and help shape the future of FoxDen.</div>
          </div>
          <div class="settings-button">Join Now</div>
        </div>
        <div class="foxpack-benefits">
          <h4>Member Benefits</h4>
          <ul>
            <li>Early access to beta features</li>
            <li>Exclusive member badge</li>
            <li>Special community events</li>
            <li>Direct access to the development team</li>
          </ul>
        </div>
      </div>
    `;
    this.settingsContent.innerHTML = foxpackHtml;
  },
  
  /**
   * Load data privacy settings content
   * @private
   */
  _loadDataPrivacySettings: function() {
    const dataPrivacyHtml = `
      <div class="settings-section">
        <h3 class="settings-section-header">Data & Privacy</h3>
        
        <div class="data-section">
          <h4 class="data-section-title">How FoxDen uses your data</h4>
          
          <div class="data-option">
            <div class="data-option-header">
              <div class="data-option-title">Use data to improve FoxDen</div>
              <label class="toggle-switch">
                <input type="checkbox" class="toggle-input" id="improve-discord" checked>
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="data-option-description">
              Allows us to use and process your information to understand and improve our services.
              <a href="#" class="link" id="learn-more-improve">Learn more</a>
            </div>
          </div>
          
          <div class="data-option">
            <div class="data-option-header">
              <div class="data-option-title">In-game rewards (aka Quests)</div>
              <label class="toggle-switch">
                <input type="checkbox" class="toggle-input" id="in-game-rewards" checked>
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="data-option-description">
              Use your FoxDen activity, such as the games you play, to show you Quests and other rewards. If you
              opt out, you might still see Quest promotions, but they won't be personalized to your activity.
              <a href="#" class="link" id="learn-more-quests">Learn more</a>
            </div>
          </div>
          
          <div class="data-option">
            <div class="data-option-header">
              <div class="data-option-title">Use data to personalize my FoxDen experience</div>
              <label class="toggle-switch">
                <input type="checkbox" class="toggle-input" id="personalize-experience" checked>
                <span class="toggle-slider"></span>
              </label>
            </div>
            <div class="data-option-description">
              Allows us to use information, such as who you talk to and what games you play, to personalize FoxDen
              for you. <a href="#" class="link" id="learn-more-personalize">Learn more</a>
            </div>
          </div>
          
          <div class="data-option">
            <div class="data-option-title">Use data to make FoxDen work</div>
            <div class="data-option-description">
              We need to store and process some data in order to provide you the basic FoxDen service, such as your
              messages, what servers you're in and your Direct Messages. By using FoxDen, you allow us to provide this basic
              service. You can stop this by <a href="#" class="link" id="disable-account">Disabling or Deleting your account</a>.
            </div>
          </div>
        </div>
        
        <div class="data-section">
          <h4 class="data-section-title">Request your data</h4>
          
          <div class="data-option">
            <div class="data-option-title">Request all of my data</div>
            <div class="data-option-description">
              <a href="#" class="link" id="learn-more-data-request">Learn more</a> about how getting a copy of your personal data works
            </div>
            <button class="request-data-button" id="request-data-button">Request Data</button>
          </div>
        </div>
        
        <div class="data-section">
          <h4 class="data-section-title">Voice security</h4>
          
          <div class="data-option">
            <div class="data-option-description security-description">
              All of your calls on FoxDen are end-to-end encrypted no matter what. That means nobody — not even Nouna
              — can listen in on your conversations. These settings let you control optional details when verifying our
              encryption protocol. <a href="#" class="link" id="learn-more-encryption">Learn more</a>
            </div>
            
            <div class="verification-option">
              <div class="data-option-header">
                <div class="data-option-title">Enable persistent verification codes</div>
                <label class="toggle-switch">
                  <input type="checkbox" class="toggle-input" id="verification-codes" checked>
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <div class="data-option-description">
                Gives your current device persistent verification codes. If this setting is on, your friends only have to
                verify your device once, instead of every time you enter a voice call. <a href="#" class="link" id="learn-more-verification">Learn more</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.settingsContent.innerHTML = dataPrivacyHtml;
    
    // Set up event listeners
    document.querySelectorAll('.toggle-input').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const optionTitle = e.target.closest('.data-option-header').querySelector('.data-option-title').textContent;
        Utils.showToast(`${optionTitle} ${isChecked ? 'enabled' : 'disabled'}`, 'info');
      });
    });
    
    document.getElementById('request-data-button').addEventListener('click', () => {
      Utils.showToast('Data request has been submitted. You will receive an email when your data is ready to download.', 'success');
    });
    
    // Learn more links
    const learnMoreLinks = {
      'learn-more-improve': 'Learn more about how FoxDen uses your data to improve services',
      'learn-more-quests': 'Learn more about in-game rewards and Quests',
      'learn-more-personalize': 'Learn more about personalization on FoxDen',
      'disable-account': 'Information about disabling or deleting your account',
      'learn-more-data-request': 'Information about requesting your personal data',
      'learn-more-encryption': 'Learn more about FoxDen\'s encryption protocol',
      'learn-more-verification': 'Learn more about verification codes'
    };
    
    Object.keys(learnMoreLinks).forEach(linkId => {
      const link = document.getElementById(linkId);
      if (link) {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          Utils.showToast(learnMoreLinks[linkId], 'info');
        });
      }
    });
  }
};

// Export for use in other modules
window.SettingsManager = SettingsManager;
