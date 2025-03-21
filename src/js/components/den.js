/**
 * FoxDen Den Management
 * 
 * Handles all functionality related to dens (servers)
 */

// Remove the import statement
// import DenSettingsManager from './den-settings.js';

const DenManager = {
    // Track initialization state
    initialized: false,
    
    /**
     * Initialize the den manager
     */
    init: function() {
      if (this.initialized) return;
      
      // Initialize DenSettingsManager
      if (window.DenSettingsManager && typeof window.DenSettingsManager.init === 'function') {
        window.DenSettingsManager.init();
      }
      
      // Cache DOM elements
      this.densList = document.getElementById('dens-list');
      this.currentDenName = document.getElementById('current-den-name');
      
      // Set up event listeners
      this._setupEventListeners();
      
      // Subscribe to state changes
      AppState.subscribe('activeDen', (denId) => this._handleActiveDenChange(denId));
      AppState.subscribe('dens', () => this.renderDens());
      
      // Render dens
      this.renderDens();
      
      this.initialized = true;
    },
    
    /**
     * Set up event listeners for den-related elements
     * @private
     */
    _setupEventListeners: function() {
      // Handle den click
      this.densList.addEventListener('click', (e) => {
        const denElement = e.target.closest('.den');
        if (denElement && !denElement.classList.contains('add-den')) {
          const denId = denElement.dataset.denId;
          if (denId) {
            AppState.setActiveDen(denId);
          }
        }
      });
      
      // Handle create den button
      document.getElementById('create-den').addEventListener('click', () => {
        this._showCreateDenModal();
      });
      
      // Handle den settings button
      document.getElementById('den-settings').addEventListener('click', () => {
        this._showDenSettingsMenu();
      });
    },
    
    /**
     * Render the dens list
     */
    renderDens: function() {
      const dens = AppState.get('dens') || [];
      const activeDenId = AppState.get('activeDen');
      
      // Clear the dens list, but keep the create den button
      // by removing only the den elements
      const denElements = this.densList.querySelectorAll('.den:not(.add-den)');
      denElements.forEach(el => el.remove());
      
      // Add den elements
      dens.forEach(den => {
        const denElement = document.createElement('div');
        denElement.className = `den ${den.id === activeDenId ? 'active' : ''}`;
        denElement.dataset.denId = den.id;

        // Generate the den title
        if (den.icon) {
          denElement.textContent = den.icon; // Use the icon if provided
        } else {
          const words = den.name.split(' ');
          const initials = words.map(word => word[0].toUpperCase()).join('').substring(0, 2);
          denElement.textContent = initials; // Use the first two letters of the name
        }

        denElement.title = den.name; // Set the full name as the tooltip
        
        // Insert before the add-den button
        this.densList.appendChild(denElement);
      });
    },
    
    /**
     * Handle active den change
     * @param {string} denId - The new active den ID
     * @private
     */
    _handleActiveDenChange: function(denId) {
      // Update UI
      const den = AppState.getActiveDen();
      if (den) {
        this.currentDenName.textContent = den.name;
      }
      
      // Update active class
      const denElements = this.densList.querySelectorAll('.den');
      denElements.forEach(el => {
        el.classList.toggle('active', el.dataset.denId === denId);
      });
    },
    
    /**
     * Show create den modal
     * @private
     */
    _showCreateDenModal: function() {
      const modal = document.getElementById('den-modal');
      modal.classList.add('active');
      
      // Set up modal event listeners if not already done
      if (!this._denModalInitialized) {
        // Close button
        modal.querySelector('.modal-close').addEventListener('click', () => {
          modal.classList.remove('active');
        });
        
        // Create button
        document.getElementById('create-den-submit').addEventListener('click', () => {
          this._handleCreateDenSubmit();
        });
        
        // Join button
        document.getElementById('join-den').addEventListener('click', () => {
          this._handleJoinDen();
        });
        
        this._denModalInitialized = true;
      }
      
      // Reset form
      document.getElementById('den-name').value = '';
      document.querySelector('.den-icon-preview').textContent = 'FD';
    },
    
    /**
     * Handle create den form submission
     * @private
     */
    _handleCreateDenSubmit: function() {
      const denNameInput = document.getElementById('den-name');
      const denName = denNameInput.value.trim(); // Trim whitespace
      
      if (!denName) {
        Utils.showToast('Please enter a valid den name', 'error');
        denNameInput.focus(); // Focus the input for user convenience
        return;
      }
      
      // Generate a new den
      const denId = `den-${Date.now()}`;
      const icon = document.querySelector('.den-icon-preview').textContent;
      const newDen = {
        id: denId,
        name: denName,
        icon: icon === denName.substring(0, 2) ? null : icon,
        ownerId: AppState.get('currentUser').id,
        description: `Welcome to ${denName}!`,
        createdAt: new Date().toISOString()
      };
      
      // Add to state
      const dens = [...AppState.get('dens'), newDen];
      AppState.set('dens', dens);
      
      // Create default channels
      const defaultChannels = [
        {
          id: `${denId}-welcome`,
          denId: denId,
          name: 'welcome',
          type: 'text',
          position: 0,
          category: 'Text Channels',
          createdAt: new Date().toISOString()
        },
        {
          id: `${denId}-voice`,
          denId: denId,
          name: 'Voice Chat',
          type: 'voice',
          position: 0,
          category: 'Voice Channels',
          createdAt: new Date().toISOString(),
          connectedUsers: 0
        }
      ];
      
      // Update channels in state
      const channels = { ...AppState.get('channels'), [denId]: defaultChannels };
      AppState.set('channels', channels);
      
      // Set as active den
      AppState.setActiveDen(denId);
      
      // Close modal
      document.getElementById('den-modal').classList.remove('active');
      
      Utils.showToast(`Den "${denName}" created successfully!`, 'success');
    },
    
    /**
     * Handle join den button click
     * @private
     */
    _handleJoinDen: function() {
      // This would typically show an invite code entry form
      Utils.showToast('Join den functionality would be implemented here', 'info');
    },
    
    /**
     * Show den settings menu
     * @private
     */
    _showDenSettingsMenu: function() {
      const rect = document.getElementById('den-settings').getBoundingClientRect();
      
      const menuItems = [
        {
          label: 'Invite People',
          icon: '👥',
          onClick: () => Utils.showToast('Invite people dialog would open here', 'info')
        },
        {
          label: 'Den Settings',
          icon: '⚙️',
          onClick: () => this._showDenSettings()
        },
        { divider: true },
        {
          label: 'Create Channel',
          icon: '➕',
          onClick: () => ChannelManager.showCreateChannelModal()
        },
        { divider: true },
        {
          label: 'Leave Den',
          icon: '🚪',
          danger: true,
          onClick: () => this._handleLeaveDen()
        }
      ];
      
      Utils.showContextMenu(menuItems, rect.left, rect.bottom + 5);
    },

    /**
     * Show den settings
     * @private
     */
    _showDenSettings: function() {
        // Use the global variable instead
        window.DenSettingsManager.showSettings();
    },

    /**
     * Handle leaving a den
     * @private
     */
    _handleLeaveDen: function() {
      const denId = AppState.get('activeDen');
      if (!denId) return;
      
      const den = AppState.getActiveDen();
      if (!den) return;
      
      // If user is the owner, show different message
      if (den.ownerId === AppState.get('currentUser').id) {
        if (confirm(`You are the owner of "${den.name}". If you leave, this den will be deleted. Are you sure?`)) {
          this._deleteDen(denId);
        }
      } else {
        if (confirm(`Are you sure you want to leave "${den.name}"?`)) {
          this._leaveDen(denId);
        }
      }
    },
    
    /**
     * Leave a den
     * @param {string} denId - The den ID to leave
     * @private
     */
    _leaveDen: function(denId) {
      const dens = AppState.get('dens').filter(d => d.id !== denId);
      AppState.set('dens', dens);
      
      // Set first remaining den as active or null if none
      if (dens.length > 0) {
        AppState.setActiveDen(dens[0].id);
      } else {
        AppState.set('activeDen', null);
      }
      
      Utils.showToast('You have left the den', 'success');
    },
    
    /**
     * Delete a den (as owner)
     * @param {string} denId - The den ID to delete
     * @private
     */
    _deleteDen: function(denId) {
      const dens = AppState.get('dens').filter(d => d.id !== denId);
      AppState.set('dens', dens);
      
      // Remove channels for this den
      const channels = { ...AppState.get('channels') };
      delete channels[denId];
      AppState.set('channels', channels);
      
      // Set first remaining den as active or null if none
      if (dens.length > 0) {
        AppState.setActiveDen(dens[0].id);
      } else {
        AppState.set('activeDen', null);
      }
      
      Utils.showToast('Den deleted successfully', 'success');
    }
};

// Export for use in other modules
window.DenManager = DenManager;