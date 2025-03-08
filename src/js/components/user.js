/**
 * FoxDen User Management
 * 
 * Handles all functionality related to users, profiles, and statuses
 */

const UserManager = {
    // Track initialization state
    initialized: false,
    
    // Status options
    statusOptions: [
      { id: 'online', name: 'Online', emoji: '🟢' },
      { id: 'idle', name: 'Idle', emoji: '🟡' },
      { id: 'dnd', name: 'Do Not Disturb', emoji: '🔴' },
      { id: 'offline', name: 'Invisible', emoji: '⚫' }
    ],
    
    /**
     * Initialize the user manager
     */
    init: function() {
      if (this.initialized) return;
      
      // Cache DOM elements
      this.userInitials = document.getElementById('user-initials');
      this.userStatusIndicator = document.getElementById('user-status-indicator');
      this.userProfileButton = document.getElementById('user-profile');
      this.userProfileModal = document.getElementById('user-profile-modal');
      this.membersSidebar = document.getElementById('members-sidebar');
      
      // Set up event listeners
      this._setupEventListeners();
      
      // Subscribe to state changes
      AppState.subscribe('currentUser', (user) => this._handleCurrentUserChange(user));
      AppState.subscribe('activeDen', () => this.renderMembersList());
      AppState.subscribe('members', () => this.renderMembersList());
      
      // Render initial user info
      this._renderCurrentUser();
      
      // Render members list for active den
      this.renderMembersList();
      
      // Subscribe to status changes from Electron
      if (window.electron && window.electron.onStatusChange) {
        window.electron.onStatusChange((status) => {
          this.changeStatus(status);
        });
      }
      
      this.initialized = true;
    },
    
    /**
     * Set up event listeners for user-related elements
     * @private
     */
    _setupEventListeners: function() {
      // Handle user profile button click
      this.userProfileButton.addEventListener('click', () => {
        this._toggleUserProfileMenu();
      });
      
      // Handle user profile modal close
      const closeButtons = this.userProfileModal.querySelectorAll('.modal-close');
      closeButtons.forEach(button => {
        button.addEventListener('click', () => {
          this.userProfileModal.classList.remove('active');
        });
      });
      
      // Handle modal backdrop click
      this.userProfileModal.querySelector('.modal-backdrop').addEventListener('click', () => {
        this.userProfileModal.classList.remove('active');
      });
      
      // Handle members sidebar
      this.membersSidebar.addEventListener('click', (e) => {
        const memberElement = e.target.closest('.member');
        if (memberElement) {
          const userId = memberElement.dataset.userId;
          if (userId) {
            this._showUserProfile(userId);
          }
        }
      });
      
      // Toggle members sidebar visibility on mobile
      document.getElementById('channel-members-toggle').addEventListener('click', () => {
        this.toggleMembersSidebar();
      });
    },
    
    /**
     * Toggle members sidebar visibility (for mobile view)
     */
    toggleMembersSidebar: function() {
      const isMobile = window.innerWidth <= 1024;
      
      if (isMobile) {
        this.membersSidebar.classList.toggle('active');
      }
    },
    
    /**
     * Handle changes to the current user
     * @param {Object} user - The updated user data
     * @private
     */
    _handleCurrentUserChange: function(user) {
      this._renderCurrentUser();
    },
    
    /**
     * Render current user information
     * @private
     */
    _renderCurrentUser: function() {
      const user = AppState.get('currentUser');
      if (!user) return;
      
      // Update user initials
      this.userInitials.textContent = user.avatar || Utils.getInitials(user.username);
      
      // Update status indicator
      this.userStatusIndicator.className = `user-status ${user.status}`;
    },
    
    /**
     * Toggle the user profile menu
     * @private
     */
    _toggleUserProfileMenu: function() {
      const user = AppState.get('currentUser');
      if (!user) return;
      
      // Show context menu near the user avatar
      const rect = this.userProfileButton.getBoundingClientRect();
      
      const menuItems = [
        {
          label: `${this.getStatusEmoji(user.status)} ${this.getStatusName(user.status)}`,
          onClick: () => this._showStatusMenu()
        },
        { divider: true },
        {
          label: 'Set Custom Status',
          icon: '💬',
          onClick: () => this._setCustomStatus()
        },
        {
          label: 'Edit Profile',
          icon: '✏️',
          onClick: () => this._editProfile()
        },
        { divider: true },
        {
          label: 'User Settings',
          icon: '⚙️',
          onClick: () => SettingsManager.showSettings('account')
        },
        {
          label: 'Log Out',
          icon: '🚪',
          danger: true,
          onClick: () => this._handleLogOut()
        }
      ];
      
      Utils.showContextMenu(menuItems, rect.left, rect.bottom + 5);
    },
    
    /**
     * Get the emoji for a status
     * @param {string} statusId - The status ID
     * @returns {string} The status emoji
     */
    getStatusEmoji: function(statusId) {
      const status = this.statusOptions.find(s => s.id === statusId);
      return status ? status.emoji : '🟢';
    },
    
    /**
     * Get the name for a status
     * @param {string} statusId - The status ID
     * @returns {string} The status name
     */
    getStatusName: function(statusId) {
      const status = this.statusOptions.find(s => s.id === statusId);
      return status ? status.name : 'Online';
    },
    
    /**
     * Show the status selection menu
     * @private
     */
    _showStatusMenu: function() {
      const rect = this.userProfileButton.getBoundingClientRect();
      
      const menuItems = this.statusOptions.map(status => ({
        label: `${status.emoji} ${status.name}`,
        onClick: () => this.changeStatus(status.id)
      }));
      
      Utils.showContextMenu(menuItems, rect.left, rect.bottom + 5);
    },
    
    /**
     * Change the user's status
     * @param {string} statusId - The new status ID
     */
    changeStatus: function(statusId) {
      const user = { ...AppState.get('currentUser') };
      user.status = statusId;
      
      AppState.set('currentUser', user);
      
      // Update UI
      this.userStatusIndicator.className = `user-status ${statusId}`;
      
      // Show toast confirmation
      Utils.showToast(`Status set to ${this.getStatusName(statusId)}`, 'success');
    },
    
    /**
     * Set a custom status
     * @private
     */
    _setCustomStatus: function() {
      // Create a modal for custom status input
      const modalHtml = `
        <div class="modal active" id="custom-status-modal">
          <div class="modal-backdrop"></div>
          <div class="modal-container small">
            <div class="modal-header">
              <h3>Set Custom Status</h3>
              <button class="modal-close">✕</button>
            </div>
            <div class="modal-content">
              <div class="input-group">
                <label for="custom-status-text">Status Text</label>
                <input type="text" id="custom-status-text" maxlength="40" placeholder="What's on your mind?">
              </div>
              <div class="input-group">
                <label>Status Emoji</label>
                <div class="emoji-selector">
                  <button class="emoji-button" id="emoji-selector-btn">
                    <span id="selected-emoji">😊</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="modal-actions">
              <button class="modal-button secondary" id="clear-status">Clear Status</button>
              <button class="modal-button primary" id="save-status">Save</button>
            </div>
          </div>
        </div>
      `;
      
      // Add to document
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;
      document.body.appendChild(modalContainer.firstChild);
      
      const statusModal = document.getElementById('custom-status-modal');
      
      // Get current custom status
      const user = AppState.get('currentUser');
      if (user.customStatus) {
        document.getElementById('custom-status-text').value = user.customStatus;
      }
      
      // Set up event listeners
      statusModal.querySelector('.modal-close').addEventListener('click', () => {
        statusModal.remove();
      });
      
      document.getElementById('clear-status').addEventListener('click', () => {
        // Clear custom status
        const user = { ...AppState.get('currentUser') };
        user.customStatus = '';
        
        AppState.set('currentUser', user);
        
        // Show toast
        Utils.showToast('Custom status cleared', 'success');
        
        // Close modal
        statusModal.remove();
      });
      
      document.getElementById('save-status').addEventListener('click', () => {
        const statusText = document.getElementById('custom-status-text').value.trim();
        const selectedEmoji = document.getElementById('selected-emoji').textContent;
        
        // Update custom status
        const user = { ...AppState.get('currentUser') };
        user.customStatus = statusText ? `${selectedEmoji} ${statusText}` : '';
        
        AppState.set('currentUser', user);
        
        // Show toast
        Utils.showToast('Custom status updated', 'success');
        
        // Close modal
        statusModal.remove();
      });
      
      // Handle emoji selection
      document.getElementById('emoji-selector-btn').addEventListener('click', (e) => {
        const rect = e.target.getBoundingClientRect();
        
        // Temporary simple emoji picker
        const commonEmojis = ['😊', '😂', '❤️', '👍', '🎮', '💻', '🎯', '🏠', '🍕', '🎵', '📚', '💤', '🦊'];
        
        const emojiItems = commonEmojis.map(emoji => ({
          label: emoji,
          onClick: () => {
            document.getElementById('selected-emoji').textContent = emoji;
          }
        }));
        
        Utils.showContextMenu(emojiItems, rect.left, rect.bottom + 5);
      });
    },
    
    /**
     * Edit user profile
     * @private
     */
    _editProfile: function() {
      // Show profile settings
      SettingsManager.showSettings('profile');
    },
    
    /**
     * Handle log out
     * @private
     */
    _handleLogOut: function() {
      // Ask for confirmation
      if (confirm('Are you sure you want to log out?')) {
        // In a real app, this would call a logout API
        Utils.showToast('You have been logged out', 'success');
        
        // Redirect to login page or reset app
        // For this demo, we'll just reload the page
        window.location.reload();
      }
    },
    
    /**
     * Render the members list for the active den
     */
    renderMembersList: function() {
      const denId = AppState.get('activeDen');
      if (!denId) {
        this.membersSidebar.innerHTML = '';
        return;
      }
      
      const members = AppState.getMembersForDen(denId) || [];
      
      // Clear existing members
      this.membersSidebar.innerHTML = '';
      
      // Group members by status
      const online = members.filter(m => m.status === 'online' || m.status === 'idle' || m.status === 'dnd');
      const offline = members.filter(m => m.status === 'offline');
      
      // Create online members group
      if (online.length > 0) {
        const onlineGroup = document.createElement('div');
        onlineGroup.className = 'members-group';
        
        const groupHeader = document.createElement('div');
        groupHeader.className = 'members-group-header';
        groupHeader.textContent = `Online — ${online.length}`;
        
        onlineGroup.appendChild(groupHeader);
        
        online.forEach(member => {
          const memberElement = this._createMemberElement(member);
          onlineGroup.appendChild(memberElement);
        });
        
        this.membersSidebar.appendChild(onlineGroup);
      }
      
      // Create offline members group
      if (offline.length > 0) {
        const offlineGroup = document.createElement('div');
        offlineGroup.className = 'members-group';
        
        const groupHeader = document.createElement('div');
        groupHeader.className = 'members-group-header';
        groupHeader.textContent = `Offline — ${offline.length}`;
        
        offlineGroup.appendChild(groupHeader);
        
        offline.forEach(member => {
          const memberElement = this._createMemberElement(member);
          offlineGroup.appendChild(memberElement);
        });
        
        this.membersSidebar.appendChild(offlineGroup);
      }
    },
    
    /**
     * Create a member element
     * @param {Object} member - The member data
     * @returns {HTMLElement} The member element
     * @private
     */
    _createMemberElement: function(member) {
      const memberElement = document.createElement('div');
      memberElement.className = 'member';
      memberElement.dataset.userId = member.id;
      
      // Generate avatar initials
      const initials = Utils.getInitials(member.username);
      
      memberElement.innerHTML = `
        <div class="member-avatar" style="background-color: ${Utils.getRandomAvatarColor()}">
          ${member.avatar || initials}
          <div class="member-status ${member.status}"></div>
        </div>
        <div class="member-name">${member.username}</div>
      `;
      
      return memberElement;
    },
    
    /**
     * Show a user's profile
     * @param {string} userId - The user ID
     * @private
     */
    _showUserProfile: function(userId) {
      const denId = AppState.get('activeDen');
      if (!denId) return;
      
      const members = AppState.getMembersForDen(denId) || [];
      const user = members.find(m => m.id === userId);
      
      if (!user) return;
      
      // Update profile modal content
      const avatar = this.userProfileModal.querySelector('.avatar-wrapper');
      avatar.textContent = user.avatar || Utils.getInitials(user.username);
      avatar.style.backgroundColor = Utils.getRandomAvatarColor();
      
      const statusIndicator = this.userProfileModal.querySelector('.status-indicator');
      statusIndicator.className = `status-indicator ${user.status}`;
      
      const username = this.userProfileModal.querySelector('.profile-username');
      username.textContent = user.username;
      
      const userTag = this.userProfileModal.querySelector('.profile-tag');
      userTag.textContent = `#${user.tag || '0000'}`;
      
      const joined = this.userProfileModal.querySelector('.profile-joined');
      joined.textContent = user.joinedAt ? Utils.formatDate(user.joinedAt, true) : 'Unknown';
      
      // Update buttons based on whether it's the current user
      const isCurrentUser = user.id === AppState.get('currentUser').id;
      const messageButton = this.userProfileModal.querySelector('.profile-button.message');
      const addFriendButton = this.userProfileModal.querySelector('.profile-button.add-friend');
      
      if (isCurrentUser) {
        messageButton.style.display = 'none';
        addFriendButton.textContent = 'Edit Profile';
        addFriendButton.onclick = () => {
          this.userProfileModal.classList.remove('active');
          this._editProfile();
        };
      } else {
        messageButton.style.display = 'block';
        addFriendButton.textContent = 'Add Friend';
        
        // Set up message button
        messageButton.onclick = () => {
          this.userProfileModal.classList.remove('active');
          this._startDirectMessage(user);
        };
        
        // Set up add friend button
        addFriendButton.onclick = () => {
          this.userProfileModal.classList.remove('active');
          this._addFriend(user);
        };
      }
      
      // Show the modal
      this.userProfileModal.classList.add('active');
    },
    
    /**
     * Start a direct message with a user
     * @param {Object} user - The user to message
     * @private
     */
    _startDirectMessage: function(user) {
      // In a real app, this would create or open a DM channel
      Utils.showToast(`Direct messaging would open here with ${user.username}`, 'info');
    },
    
    /**
     * Add a user as a friend
     * @param {Object} user - The user to add
     * @private
     */
    _addFriend: function(user) {
      // In a real app, this would send a friend request
      Utils.showToast(`Friend request sent to ${user.username}`, 'success');
    }
  };
  
  // Export for use in other modules
  window.UserManager = UserManager;