/**
 * FoxDen Channel Management
 * 
 * Handles all functionality related to channels (text and voice)
 */

const ChannelManager = {
    // Track initialization state
    initialized: false,
    
    // Store categories with collapse state
    collapsedCategories: {},
    
    /**
     * Initialize the channel manager
     */
    init: function() {
      if (this.initialized) return;
      
      // Cache DOM elements
      this.channelsContainer = document.getElementById('channels-container');
      this.currentChannelName = document.getElementById('current-channel-name');
      
      // Set up event listeners
      this._setupEventListeners();
      
      // Subscribe to state changes
      AppState.subscribe('activeDen', (denId) => this._handleActiveDenChange(denId));
      AppState.subscribe('activeChannel', (channelId) => this._handleActiveChannelChange(channelId));
      AppState.subscribe('channels', () => this.renderChannels());
      
      // Render channels for the active den
      this.renderChannels();
      
      this.initialized = true;
    },
    
    /**
     * Set up event listeners for channel-related elements
     * @private
     */
    _setupEventListeners: function() {
      // Handle channel click
      this.channelsContainer.addEventListener('click', (e) => {
        // Handle category header click (collapse/expand)
        const categoryHeader = e.target.closest('.channels-section-header');
        if (categoryHeader) {
          const section = categoryHeader.closest('.channels-section');
          const category = categoryHeader.querySelector('span').textContent;
          this.toggleCategoryCollapse(category);
          return;
        }
        
        // Handle channel click
        const channelElement = e.target.closest('.channel');
        if (channelElement) {
          // Ignore if clicked on channel controls
          if (e.target.closest('.channel-controls')) {
            return;
          }
          
          const channelId = channelElement.dataset.channelId;
          if (channelId) {
            AppState.setActiveChannel(channelId);
          }
        }
        
        // Handle add channel button click
        const addChannelButton = e.target.closest('.add-channel-button');
        if (addChannelButton) {
          const category = addChannelButton.dataset.category;
          this.showCreateChannelModal(category);
        }
      });
      
      // Handle channel context menu
      this.channelsContainer.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        
        const channelElement = e.target.closest('.channel');
        if (channelElement) {
          const channelId = channelElement.dataset.channelId;
          if (channelId) {
            this._showChannelContextMenu(e, channelId);
          }
        }
      });
      
      // Handle channel controls click
      this.channelsContainer.addEventListener('click', (e) => {
        const controlElement = e.target.closest('.channel-control');
        if (controlElement) {
          e.stopPropagation(); // Prevent channel selection
          
          const channelId = controlElement.closest('.channel').dataset.channelId;
          const action = controlElement.dataset.action;
          
          if (channelId && action) {
            if (action === 'edit') {
              this._handleEditChannel(channelId);
            } else if (action === 'delete') {
              this._handleDeleteChannel(channelId);
            }
          }
        }
      });
    },
    
    /**
     * Render the channels for the active den
     */
    renderChannels: function() {
      const denId = AppState.get('activeDen');
      if (!denId) {
        this.channelsContainer.innerHTML = '';
        return;
      }
      
      const channels = AppState.getChannelsForDen(denId);
      const activeChannelId = AppState.get('activeChannel');
      
      // Group channels by category
      const categorizedChannels = {};
      
      channels.forEach(channel => {
        const category = channel.category || 'General';
        if (!categorizedChannels[category]) {
          categorizedChannels[category] = [];
        }
        categorizedChannels[category].push(channel);
      });
      
      // Clear existing channels
      this.channelsContainer.innerHTML = '';
      
      // Add each category and its channels
      Object.entries(categorizedChannels).forEach(([category, channelList]) => {
        // Sort channels by position within category
        channelList.sort((a, b) => a.position - b.position);
        
        // Create category section
        const sectionElement = document.createElement('div');
        sectionElement.className = `channels-section ${this.collapsedCategories[category] ? 'collapsed' : ''}`;
        sectionElement.dataset.category = category;
        
        // Create category header
        const headerElement = document.createElement('div');
        headerElement.className = 'channels-section-header';
        headerElement.innerHTML = `
          <span>${category}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="channels-section-icon">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        `;
        
        sectionElement.appendChild(headerElement);
        
        // Create channels list container
        const channelsListElement = document.createElement('div');
        channelsListElement.className = 'channels-list';
        
        // Add channels to the list
        channelList.forEach(channel => {
          const channelElement = document.createElement('div');
          channelElement.className = `channel ${channel.type} ${channel.id === activeChannelId ? 'active' : ''}`;
          channelElement.dataset.channelId = channel.id;
          
          let channelContent = `
            <div class="channel-header">
              <div class="channel-name">
                <span class="channel-icon"></span>
                ${channel.name}
              </div>
              
              <div class="channel-controls">
                <div class="channel-control" data-action="edit">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </div>
                <div class="channel-control" data-action="delete">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </div>
              </div>
            </div>
          `;
          
          // Removed the voice-users-count badge since we now have the connected users list
          
          channelElement.innerHTML = channelContent;
          channelsListElement.appendChild(channelElement);
          
          // Add connected users list for voice channels
          if (channel.type === 'voice' && channel.connectedUsers > 0) {
            this._renderConnectedUsers(channelElement, channel);
          }
        });
        
        sectionElement.appendChild(channelsListElement);
        
        // Add "Add Channel" button
        const addChannelButton = document.createElement('div');
        addChannelButton.className = 'add-channel-button';
        addChannelButton.dataset.category = category;
        addChannelButton.innerHTML = `
          <span class="add-channel-icon">+</span>
          <span>Add Channel</span>
        `;
        
        sectionElement.appendChild(addChannelButton);
        
        this.channelsContainer.appendChild(sectionElement);
      });
    },
    
    /**
     * Toggle the collapse state of a category
     * @param {string} category - The category name
     */
    toggleCategoryCollapse: function(category) {
      this.collapsedCategories[category] = !this.collapsedCategories[category];
      
      // Update the UI
      const categorySection = this.channelsContainer.querySelector(`.channels-section[data-category="${category}"]`);
      if (categorySection) {
        categorySection.classList.toggle('collapsed', this.collapsedCategories[category]);
      }
    },
    
    /**
     * Handle changes to the active den
     * @param {string} denId - The new active den ID
     * @private
     */
    _handleActiveDenChange: function(denId) {
      if (!denId) return;
      
      // Update channels for the new den
      this.renderChannels();
    },
    
    /**
     * Handle changes to the active channel
     * @param {string} channelId - The new active channel ID
     * @private
     */
    _handleActiveChannelChange: function(channelId) {
      if (!channelId) return;
      
      // Update active channel in UI
      const channels = this.channelsContainer.querySelectorAll('.channel');
      channels.forEach(channel => {
        channel.classList.toggle('active', channel.dataset.channelId === channelId);
      });
      
      // Update channel name in header
      const channel = AppState.getActiveChannel();
      if (channel) {
        this.currentChannelName.textContent = `${channel.type === 'text' ? '#' : '🔊'} ${channel.name}`;
      }
    },
    
    /**
     * Show the create channel modal
     * @param {string} [category] - The category for the new channel
     */
    showCreateChannelModal: function(category) {
      // Create modal if it doesn't exist
      let modal = document.getElementById('channel-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'channel-modal';
        
        const modalHTML = `
          <div class="modal-backdrop"></div>
          <div class="modal-container">
            <div class="modal-header">
              <h3>Create Channel</h3>
              <button class="modal-close">✕</button>
            </div>
            <div class="modal-content">
              <div class="modal-section">
                <div class="input-group">
                  <label for="channel-name">Channel Name</label>
                  <input type="text" id="channel-name" placeholder="Enter a channel name">
                </div>
                <div class="input-group">
                  <label for="channel-type">Channel Type</label>
                  <div class="radio-group">
                    <label class="radio-option">
                      <input type="radio" name="channel-type" value="text" checked>
                      <span class="radio-label">Text Channel</span>
                    </label>
                    <label class="radio-option">
                      <input type="radio" name="channel-type" value="voice">
                      <span class="radio-label">Voice Channel</span>
                    </label>
                  </div>
                </div>
                <div class="input-group">
                  <label for="channel-category">Category</label>
                  <select id="channel-category">
                    <!-- Categories will be added dynamically -->
                  </select>
                </div>
              </div>
              <div class="modal-actions">
                <button class="modal-button secondary" id="cancel-channel">Cancel</button>
                <button class="modal-button primary" id="create-channel-submit">Create Channel</button>
              </div>
            </div>
          </div>
        `;
        
        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
          modal.classList.remove('active');
        });
        
        document.getElementById('cancel-channel').addEventListener('click', () => {
          modal.classList.remove('active');
        });
        
        document.getElementById('create-channel-submit').addEventListener('click', () => {
          this._handleCreateChannelSubmit();
        });
      }
      
      // Populate category dropdown
      const categorySelect = document.getElementById('channel-category');
      categorySelect.innerHTML = '';
      
      const denId = AppState.get('activeDen');
      if (!denId) return;
      
      const channels = AppState.getChannelsForDen(denId);
      
      // Get unique categories
      const categories = [...new Set(channels.map(channel => channel.category || 'General'))];
      
      // Add option to create new category
      categories.push('+ Create New Category');
      
      // Populate dropdown
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        
        // Set the provided category as selected
        if (category && cat === category) {
          option.selected = true;
        }
        
        categorySelect.appendChild(option);
      });
      
      // Show the modal
      modal.classList.add('active');
    },
    
    /**
     * Handle the submission of the create channel form
     * @private
     */
    _handleCreateChannelSubmit: function() {
      const nameInput = document.getElementById('channel-name');
      const channelName = nameInput.value.trim();
      
      if (!channelName) {
        // Show error
        Utils.showToast('Please enter a channel name', 'error');
        return;
      }
      
      // Get channel type
      const typeInputs = document.getElementsByName('channel-type');
      let channelType = 'text';
      for (const input of typeInputs) {
        if (input.checked) {
          channelType = input.value;
          break;
        }
      }
      
      // Get category
      let categorySelect = document.getElementById('channel-category');
      let category = categorySelect.value;
      
      // If "Create New Category" is selected, prompt for new category name
      if (category === '+ Create New Category') {
        const newCategory = prompt('Enter a name for the new category:');
        if (!newCategory) {
          return;
        }
        category = newCategory;
      }
      
      // Get active den
      const denId = AppState.get('activeDen');
      if (!denId) {
        Utils.showToast('No active den', 'error');
        return;
      }
      
      // Generate a unique ID for the new channel
      const channelId = `channel-${Utils.generateId()}`;
      
      // Get existing channels for this den
      const existingChannels = AppState.getChannelsForDen(denId) || [];
      
      // Calculate position (last in category)
      const categoryChannels = existingChannels.filter(ch => ch.category === category && ch.type === channelType);
      const position = categoryChannels.length > 0 
        ? Math.max(...categoryChannels.map(ch => ch.position)) + 1 
        : 0;
      
      // Create a new channel object
      const newChannel = {
        id: channelId,
        denId: denId,
        name: channelName.toLowerCase().replace(/\s+/g, '-'),
        type: channelType,
        position: position,
        category: category,
        createdAt: new Date().toISOString(),
        connectedUsers: 0
      };
      
      // Add the channel to the state
      const channels = { ...AppState.get('channels') };
      channels[denId] = [...(channels[denId] || []), newChannel];
      AppState.set('channels', channels);
      
      // Create welcome message for text channels
      if (channelType === 'text') {
        const welcomeMessage = {
          id: `msg-${Utils.generateId()}`,
          channelId: channelId,
          userId: 'bot-1',
          username: 'FoxDen Bot',
          content: `Welcome to #${newChannel.name}! This is the beginning of the channel.`,
          timestamp: new Date().toISOString(),
          type: 'system'
        };
        
        // Add message to state
        AppState.addMessage(channelId, welcomeMessage);
      }
      
      // Set the new channel as active
      AppState.setActiveChannel(channelId);
      
      // Close the modal
      const modal = document.getElementById('channel-modal');
      modal.classList.remove('active');
      
      // Show success toast
      Utils.showToast(`Channel "${newChannel.name}" created successfully!`, 'success');
    },
    
    /**
     * Show the channel context menu
     * @param {Event} event - The context menu event
     * @param {string} channelId - The channel ID
     * @private
     */
    _showChannelContextMenu: function(event, channelId) {
      const denId = AppState.get('activeDen');
      if (!denId) return;
      
      const channels = AppState.getChannelsForDen(denId);
      const channel = channels.find(ch => ch.id === channelId);
      
      if (!channel) return;
      
      const menuItems = [
        {
          label: `${channel.type === 'text' ? 'Mark as Read' : 'Join Channel'}`,
          icon: channel.type === 'text' ? '✓' : '🔊',
          onClick: () => {
            if (channel.type === 'text') {
              // Mark as read logic would go here
              Utils.showToast(`Marked #${channel.name} as read`, 'success');
            } else {
              // Join voice channel
              AppState.setActiveChannel(channelId);
            }
          }
        },
        { divider: true },
        {
          label: 'Edit Channel',
          icon: '✏️',
          onClick: () => this._handleEditChannel(channelId)
        },
        {
          label: 'Delete Channel',
          icon: '🗑️',
          danger: true,
          onClick: () => this._handleDeleteChannel(channelId)
        }
      ];
      
      Utils.showContextMenu(menuItems, event.clientX, event.clientY);
    },
    
    /**
     * Handle editing a channel
     * @param {string} channelId - The channel ID to edit
     * @private
     */
    _handleEditChannel: function(channelId) {
      const denId = AppState.get('activeDen');
      if (!denId) return;
      
      const channels = AppState.getChannelsForDen(denId);
      const channel = channels.find(ch => ch.id === channelId);
      
      if (!channel) return;
      
      // Create or update edit modal
      let modal = document.getElementById('edit-channel-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'edit-channel-modal';
        
        const modalHTML = `
          <div class="modal-backdrop"></div>
          <div class="modal-container">
            <div class="modal-header">
              <h3>Edit Channel</h3>
              <button class="modal-close">✕</button>
            </div>
            <div class="modal-content">
              <div class="modal-section">
                <div class="input-group">
                  <label for="edit-channel-name">Channel Name</label>
                  <input type="text" id="edit-channel-name" placeholder="Enter a channel name">
                </div>
                <div class="input-group">
                  <label for="edit-channel-category">Category</label>
                  <select id="edit-channel-category">
                    <!-- Categories will be added dynamically -->
                  </select>
                </div>
              </div>
              <div class="modal-actions">
                <button class="modal-button secondary" id="cancel-edit-channel">Cancel</button>
                <button class="modal-button primary" id="save-channel-edit">Save Changes</button>
              </div>
            </div>
          </div>
        `;
        
        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
          modal.classList.remove('active');
        });
        
        document.getElementById('cancel-edit-channel').addEventListener('click', () => {
          modal.classList.remove('active');
        });
        
        document.getElementById('save-channel-edit').addEventListener('click', () => {
          const editNameInput = document.getElementById('edit-channel-name');
          const editName = editNameInput.value.trim();
          
          if (!editName) {
            Utils.showToast('Please enter a channel name', 'error');
            return;
          }
          
          const editCategorySelect = document.getElementById('edit-channel-category');
          let editCategory = editCategorySelect.value;
          
          // If "Create New Category" is selected, prompt for new category name
          if (editCategory === '+ Create New Category') {
            const newCategory = prompt('Enter a name for the new category:');
            if (!newCategory) {
              return;
            }
            editCategory = newCategory;
          }
          
          // Update channel in state
          const updatedChannels = channels.map(ch => {
            if (ch.id === channelId) {
              return {
                ...ch,
                name: editName.toLowerCase().replace(/\s+/g, '-'),
                category: editCategory
              };
            }
            return ch;
          });
          
          const allChannels = { ...AppState.get('channels') };
          allChannels[denId] = updatedChannels;
          AppState.set('channels', allChannels);
          
          // Close the modal
          modal.classList.remove('active');
          
          // Show success toast
          Utils.showToast(`Channel updated successfully!`, 'success');
        });
      }
      
      // Fill form with current channel data
      document.getElementById('edit-channel-name').value = channel.name;
      
      // Populate category dropdown
      const categorySelect = document.getElementById('edit-channel-category');
      categorySelect.innerHTML = '';
      
      // Get unique categories
      const categories = [...new Set(channels.map(ch => ch.category || 'General'))];
      
      // Add option to create new category
      categories.push('+ Create New Category');
      
      // Populate dropdown
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        
        // Set the current category as selected
        if (cat === channel.category) {
          option.selected = true;
        }
        
        categorySelect.appendChild(option);
      });
      
      // Update modal title
      modal.querySelector('.modal-header h3').textContent = `Edit ${channel.type === 'text' ? 'Text' : 'Voice'} Channel`;
      
      // Show the modal
      modal.classList.add('active');
    },
    
    /**
     * Handle deleting a channel
     * @param {string} channelId - The channel ID to delete
     * @private
     */
    _handleDeleteChannel: function(channelId) {
      const denId = AppState.get('activeDen');
      if (!denId) return;
      
      const channels = AppState.getChannelsForDen(denId);
      const channel = channels.find(ch => ch.id === channelId);
      
      if (!channel) return;
      
      // Ask for confirmation
      if (confirm(`Are you sure you want to delete #${channel.name}? This cannot be undone.`)) {
        // Remove channel from state
        const updatedChannels = channels.filter(ch => ch.id !== channelId);
        
        const allChannels = { ...AppState.get('channels') };
        allChannels[denId] = updatedChannels;
        AppState.set('channels', allChannels);
        
        // If the active channel was deleted, select another channel
        if (AppState.get('activeChannel') === channelId) {
          if (updatedChannels.length > 0) {
            // Prefer text channels
            const textChannels = updatedChannels.filter(ch => ch.type === 'text');
            if (textChannels.length > 0) {
              AppState.setActiveChannel(textChannels[0].id);
            } else {
              AppState.setActiveChannel(updatedChannels[0].id);
            }
          }
        }
        
        // Show success toast
        Utils.showToast(`Channel deleted successfully!`, 'success');
      }
    },
    
    /**
     * Render connected users under a voice channel
     * @param {HTMLElement} channelElement - The channel element to append users to
     * @param {Object} channel - The channel object
     * @private
     */
    _renderConnectedUsers: function(channelElement, channel) {
      // Create container for connected users
      const connectedUsersElement = document.createElement('div');
      connectedUsersElement.className = 'connected-users';
      
      // Get den members
      const denId = AppState.get('activeDen');
      const members = AppState.getMembersForDen(denId) || [];
      
      // Get current user
      const currentUser = AppState.get('currentUser');
      
      // Add current user if they're connected to this voice channel
      if (AppState.get('activeVoiceChannel') === channel.id && AppState.get('connectedToVoice')) {
        const userElement = this._createConnectedUserElement(currentUser);
        connectedUsersElement.appendChild(userElement);
      }
      
      // Add other connected users (simulated)
      // In a real app, this would get actual connected users from the server
      const connectedCount = Math.min(channel.connectedUsers, members.length);
      
      let addedCount = connectedUsersElement.children.length; // Count current user if connected
      
      for (let i = 0; i < members.length && addedCount < connectedCount; i++) {
        const member = members[i];
        // Skip current user since we already added them if connected
        if (member.id === currentUser.id) continue;
        
        const userElement = this._createConnectedUserElement(member);
        connectedUsersElement.appendChild(userElement);
        addedCount++;
      }
      
      // Add to channel element
      channelElement.appendChild(connectedUsersElement);
    },
    
    /**
     * Create an element for a connected user
     * @param {Object} user - The user object
     * @returns {HTMLElement} - The user element
     * @private
     */
    _createConnectedUserElement: function(user) {
      const userElement = document.createElement('div');
      userElement.className = 'connected-user';
      userElement.dataset.userId = user.id;
      
      // Generate avatar (initials or custom avatar)
      const avatar = user.avatar || Utils.getInitials(user.username);
      const avatarColor = Utils.getRandomAvatarColor();
      
      userElement.innerHTML = `
        <div class="connected-user-avatar" style="background-color: ${avatarColor}">
          ${avatar}
        </div>
        <div class="connected-user-name">${user.username}</div>
      `;
      
      return userElement;
    },
    
  };
  
  // Export for use in other modules
  window.ChannelManager = ChannelManager;