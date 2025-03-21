/**
 * FoxDen State Management
 * 
 * This file handles global application state and data persistence.
 */

// State management with publish/subscribe pattern
const AppState = {
    // Internal state data
    _data: {
      // Application
      initialized: false,
      currentTheme: 'dark',
      
      // User
      currentUser: {
        id: 'user-1',
        username: 'FoxUser',
        tag: '1234',
        avatar: null,
        status: 'online',
        customStatus: '',
        settings: {}
      },
      
      // Navigation
      activeDen: null,
      activeChannel: null,
      activeVoiceChannel: null,
      
      // UI state
      settingsOpen: false,
      activeSettingsTab: 'account',
      membersSidebarVisible: true,
      
      // Voice/Video state
      micMuted: false,
      deafened: false,
      videoEnabled: false,
      screenShareEnabled: false,
      connectedToVoice: false,
      
      // Dens (servers) data
      dens: [],
      
      // Channels data (mapped by den ID)
      channels: {},
      
      // Messages data (mapped by channel ID)
      messages: {},
      
      // Members data (mapped by den ID)
      members: {},
      
      // Roles data (mapped by den ID)
      roles: {},
      
      // Friends list
      friends: [],
      
      // Direct messages
      directMessages: [],
      
      // Notifications
      notifications: []
    },
    
    // Event subscribers
    _subscribers: {},
    
    /**
     * Initialize the application state
     * @returns {Promise} Resolves when state is initialized
     */
    init: async function() {
      // Load saved state from localStorage or Electron store
      await this._loadState();
      
      // Initialize default data if needed
      if (!this._data.dens || this._data.dens.length === 0) {
        this._initializeDefaultData();
      }
      
      // Mark as initialized
      this._data.initialized = true;
      
      // Notify subscribers that state is initialized
      this._notify('init', this._data);
      
      return this._data;
    },
    
    /**
     * Load saved state from storage
     * @private
     */
    _loadState: async function() {
      try {
        // Try to load from Electron store if available
        if (window.electron && window.electron.store) {
          const savedState = await window.electron.store.get('appState');
          if (savedState) {
            this._data = { ...this._data, ...savedState };
          }
        } 
        // Fallback to localStorage
        else {
          const savedState = localStorage.getItem('foxden-state');
          if (savedState) {
            this._data = { ...this._data, ...JSON.parse(savedState) };
          }
        }
        
        // Load theme preference
        const theme = localStorage.getItem('foxden-theme') || 'dark';
        this._data.currentTheme = theme;
        document.body.className = `theme-${theme}`;
      } catch (error) {
        console.error('Error loading application state:', error);
      }
    },
    
    /**
     * Save current state to storage
     * @private
     */
    _saveState: async function() {
      try {
        // Save to Electron store if available
        if (window.electron && window.electron.store) {
          // Only save specific parts of the state that need persistence
          const stateToSave = {
            currentTheme: this._data.currentTheme,
            currentUser: this._data.currentUser,
            activeDen: this._data.activeDen,
            activeChannel: this._data.activeChannel,
            membersSidebarVisible: this._data.membersSidebarVisible
          };
          
          await window.electron.store.set('appState', stateToSave);
        } 
        // Fallback to localStorage
        else {
          // Only save specific parts of the state that need persistence
          const stateToSave = {
            currentUser: this._data.currentUser,
            activeDen: this._data.activeDen,
            activeChannel: this._data.activeChannel
          };
          
          localStorage.setItem('foxden-state', JSON.stringify(stateToSave));
          localStorage.setItem('foxden-theme', this._data.currentTheme);
        }
      } catch (error) {
        console.error('Error saving application state:', error);
      }
    },
    
    /**
     * Initialize default data for a new installation
     * @private
     */
    _initializeDefaultData: function() {
      // Create default den (server)
      const foxdenCentral = {
        id: 'foxden-central',
        name: 'FoxDen Central',
        icon: 'FD',
        ownerId: 'user-1',
        description: 'Welcome to FoxDen Central! Your home for fox-themed discussion.',
        createdAt: new Date().toISOString()
      };
      
      // Add some additional dummy dens
      const dens = [
        foxdenCentral,
        {
          id: 'gaming-foxes',
          name: 'Gaming Foxes',
          icon: 'GF',
          ownerId: 'user-1',
          description: 'A den for fox gamers to discuss and play together.',
          createdAt: new Date().toISOString()
        },
        {
          id: 'fox-friends',
          name: 'Fox Friends',
          icon: '🦊',
          ownerId: 'user-2',
          description: 'A friendly community of fox enthusiasts.',
          createdAt: new Date().toISOString()
        },
        {
          id: 'forest-friends',
          name: 'Forest Friends',
          icon: 'FF',
          ownerId: 'user-3',
          description: 'Wildlife and nature discussions.',
          createdAt: new Date().toISOString()
        },
        {
          id: 'red-clan',
          name: 'Red Clan',
          icon: 'RC',
          ownerId: 'user-4',
          description: 'The premiere red fox community.',
          createdAt: new Date().toISOString()
        }
      ];
      
      // Create default channels for FoxDen Central
      const foxdenChannels = [
        {
          id: 'channel-welcome',
          denId: 'foxden-central',
          name: 'welcome',
          type: 'text',
          position: 0,
          category: 'Information Trails',
          createdAt: new Date().toISOString()
        },
        {
          id: 'channel-announcements',
          denId: 'foxden-central',
          name: 'announcements',
          type: 'text',
          position: 1,
          category: 'Information Trails',
          createdAt: new Date().toISOString()
        },
        {
          id: 'channel-rules',
          denId: 'foxden-central',
          name: 'rules',
          type: 'text',
          position: 2,
          category: 'Information Trails',
          createdAt: new Date().toISOString()
        },
        {
          id: 'channel-general',
          denId: 'foxden-central',
          name: 'general',
          type: 'text',
          position: 0,
          category: 'Den Chats',
          createdAt: new Date().toISOString()
        },
        {
          id: 'channel-memes',
          denId: 'foxden-central',
          name: 'memes',
          type: 'text',
          position: 1,
          category: 'Den Chats',
          createdAt: new Date().toISOString()
        },
        {
          id: 'channel-gaming',
          denId: 'foxden-central',
          name: 'gaming',
          type: 'text',
          position: 2,
          category: 'Den Chats',
          createdAt: new Date().toISOString()
        },
        {
          id: 'channel-general-voice',
          denId: 'foxden-central',
          name: 'General Burrow',
          type: 'voice',
          position: 0,
          category: 'Voice Dens',
          createdAt: new Date().toISOString(),
          connectedUsers: 2
        },
        {
          id: 'channel-gaming-voice',
          denId: 'foxden-central',
          name: 'Gaming Den',
          type: 'voice',
          position: 1,
          category: 'Voice Dens',
          createdAt: new Date().toISOString(),
          connectedUsers: 3
        },
        {
          id: 'channel-music-voice',
          denId: 'foxden-central',
          name: 'Music Lounge',
          type: 'voice',
          position: 2,
          category: 'Voice Dens',
          createdAt: new Date().toISOString(),
          connectedUsers: 0
        }
      ];
      
      // Create channels for other dens (simplified for brevity)
      const gamingFoxesChannels = [
        {
          id: 'gf-general',
          denId: 'gaming-foxes',
          name: 'general',
          type: 'text',
          position: 0,
          category: 'Text Channels',
          createdAt: new Date().toISOString()
        },
        {
          id: 'gf-voice',
          denId: 'gaming-foxes',
          name: 'Gaming Voice',
          type: 'voice',
          position: 0,
          category: 'Voice Channels',
          createdAt: new Date().toISOString(),
          connectedUsers: 0
        }
      ];
      
      // Sample members for FoxDen Central
      const foxdenMembers = [
        {
          id: 'user-1',
          denId: 'foxden-central',
          username: 'FoxUser',
          tag: '1234',
          avatar: null,
          status: 'online',
          isOwner: true,
          roles: ['admin'],
          joinedAt: new Date().toISOString()
        },
        {
          id: 'user-2',
          denId: 'foxden-central',
          username: 'FoxTail',
          tag: '5678',
          avatar: null,
          status: 'online',
          isOwner: false,
          roles: ['moderator'],
          joinedAt: new Date().toISOString()
        },
        {
          id: 'user-3',
          denId: 'foxden-central',
          username: 'RedFox',
          tag: '9012',
          avatar: null,
          status: 'online',
          isOwner: false,
          roles: [],
          joinedAt: new Date().toISOString()
        },
        {
          id: 'user-4',
          denId: 'foxden-central',
          username: 'ArcticFox',
          tag: '3456',
          avatar: null,
          status: 'online',
          isOwner: false,
          roles: [],
          joinedAt: new Date().toISOString()
        },
        {
          id: 'user-5',
          denId: 'foxden-central',
          username: 'FennecFox',
          tag: '7890',
          avatar: null,
          status: 'offline',
          isOwner: false,
          roles: [],
          joinedAt: new Date().toISOString()
        },
        {
          id: 'user-6',
          denId: 'foxden-central',
          username: 'GrayFox',
          tag: '1122',
          avatar: null,
          status: 'offline',
          isOwner: false,
          roles: [],
          joinedAt: new Date().toISOString()
        }
      ];
      
      // Sample messages for the welcome channel
      const welcomeMessages = [
        {
          id: 'msg-1',
          channelId: 'channel-welcome',
          userId: 'bot-1',
          username: 'FoxDen Bot',
          content: 'Welcome to FoxDen Central! This is a minimalistic, fox-themed chat platform for communities. Browse channels on the left, chat here, and see members on the right!',
          timestamp: new Date().toISOString(),
          type: 'system'
        },
        {
          id: 'msg-2',
          channelId: 'channel-welcome',
          userId: 'user-2',
          username: 'FoxTail',
          content: 'The fox theme looks fantastic! I love how the dens replace servers.',
          timestamp: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
        },
        {
          id: 'msg-3',
          channelId: 'channel-welcome',
          userId: 'user-3',
          username: 'RedFox',
          content: 'The orange accents look great with the dark mode. Can we see what light mode looks like?',
          timestamp: new Date(Date.now() - 200000).toISOString() // 3.33 minutes ago
        },
        {
          id: 'msg-4',
          channelId: 'channel-welcome',
          userId: 'user-4',
          username: 'ArcticFox',
          content: 'I like how clean and minimalistic everything is. The UI is much more streamlined than Discord!',
          timestamp: new Date(Date.now() - 100000).toISOString() // 1.67 minutes ago
        }
      ];
      
      // Update state with default data
      this._data.dens = dens;
      this._data.channels = {
        'foxden-central': foxdenChannels,
        'gaming-foxes': gamingFoxesChannels
      };
      this._data.members = {
        'foxden-central': foxdenMembers
      };
      this._data.messages = {
        'channel-welcome': welcomeMessages
      };
      this._data.activeDen = 'foxden-central';
      this._data.activeChannel = 'channel-welcome';
    },
    
    /**
     * Get the entire application state
     * @returns {Object} The current state
     */
    getState: function() {
      return { ...this._data };
    },
    
    /**
     * Get a specific part of the state
     * @param {string} key - The state key to retrieve
     * @returns {*} The requested state value
     */
    get: function(key) {
      return this._data[key];
    },
    
    /**
     * Update a specific part of the state
     * @param {string} key - The state key to update
     * @param {*} value - The new value
     * @param {boolean} persist - Whether to persist this change
     */
    set: function(key, value, persist = true) {
      const oldValue = this._data[key];
      this._data[key] = value;
      
      // Notify subscribers
      this._notify(key, value, oldValue);
      
      // Save state if needed
      if (persist) {
        this._saveState();
      }
    },
    
    /**
     * Update multiple state properties at once
     * @param {Object} updates - Object with key/value pairs to update
     * @param {boolean} persist - Whether to persist these changes
     */
    update: function(updates, persist = true) {
      for (const [key, value] of Object.entries(updates)) {
        const oldValue = this._data[key];
        this._data[key] = value;
        this._notify(key, value, oldValue);
      }
      
      // Save state if needed
      if (persist) {
        this._saveState();
      }
    },
    
    /**
     * Subscribe to state changes
     * @param {string} key - The state key to watch, or '*' for all changes
     * @param {Function} callback - Function to call when state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe: function(key, callback) {
      if (!this._subscribers[key]) {
        this._subscribers[key] = [];
      }
      
      this._subscribers[key].push(callback);
      
      // Return unsubscribe function
      return () => {
        this._subscribers[key] = this._subscribers[key].filter(cb => cb !== callback);
      };
    },
    
    /**
     * Notify subscribers of state changes
     * @param {string} key - The state key that changed
     * @param {*} newValue - The new value
     * @param {*} oldValue - The previous value
     * @private
     */
    _notify: function(key, newValue, oldValue) {
      // Notify subscribers for this specific key
      if (this._subscribers[key]) {
        this._subscribers[key].forEach(callback => {
          callback(newValue, oldValue);
        });
      }
      
      // Notify subscribers for all changes
      if (this._subscribers['*']) {
        this._subscribers['*'].forEach(callback => {
          callback({ key, newValue, oldValue });
        });
      }
    },
    
    /**
     * Get active den data
     * @returns {Object|null} The active den or null
     */
    getActiveDen: function() {
      const denId = this._data.activeDen;
      if (!denId) return null;
      
      return this._data.dens.find(den => den.id === denId) || null;
    },
    
    /**
     * Get active channel data
     * @returns {Object|null} The active channel or null
     */
    getActiveChannel: function() {
      const denId = this._data.activeDen;
      const channelId = this._data.activeChannel;
      
      if (!denId || !channelId || !this._data.channels[denId]) return null;
      
      return this._data.channels[denId].find(channel => channel.id === channelId) || null;
    },
    
    /**
     * Get channels for a den
     * @param {string} denId - The den ID
     * @returns {Array} Array of channels
     */
    getChannelsForDen: function(denId) {
      return this._data.channels[denId] || [];
    },
    
    /**
     * Get messages for a channel
     * @param {string} channelId - The channel ID
     * @returns {Array} Array of messages
     */
    getMessagesForChannel: function(channelId) {
      return this._data.messages[channelId] || [];
    },
    
    /**
     * Get members for a den
     * @param {string} denId - The den ID
     * @returns {Array} Array of members
     */
    getMembersForDen: function(denId) {
      return this._data.members[denId] || [];
    },
    
    /**
     * Add a new message to a channel
     * @param {string} channelId - The channel ID
     * @param {Object} message - The message object
     */
    addMessage: function(channelId, message) {
      // Initialize messages array for this channel if needed
      if (!this._data.messages[channelId]) {
        this._data.messages[channelId] = [];
      }
      
      // Add message to array
      this._data.messages[channelId].push(message);
      
      // Notify subscribers
      this._notify('messages', this._data.messages, null);
      this._notify(`messages:${channelId}`, this._data.messages[channelId], null);
    },
    
    /**
     * Set the theme
     * @param {string} newTheme - Either 'dark' or 'light'
     * @param {Event} event - Optional DOM event that triggered the theme change
     */
    setTheme: function(newTheme, event = null) {
      if (newTheme !== 'dark' && newTheme !== 'light') {
        console.error('Invalid theme:', newTheme);
        return;
      }
      
      const oldTheme = this.get('currentTheme');
      if (oldTheme === newTheme) return; // No change needed
      
      console.log(`Changing theme from ${oldTheme} to ${newTheme}`);
      
      // Update body class
      document.body.classList.remove(`theme-${oldTheme}`);
      document.body.classList.add(`theme-${newTheme}`);
      
      // Get ripple container (create if it doesn't exist)
      let rippleContainer = document.querySelector('.theme-transition-container');
      if (!rippleContainer) {
        rippleContainer = document.createElement('div');
        rippleContainer.className = 'theme-transition-container';
        document.body.appendChild(rippleContainer);
      }
      
      // Calculate ripple position, defaulting to center of screen
      let triggerX = window.innerWidth / 2;
      let triggerY = window.innerHeight / 2;
      
      // If the event exists and has a target, use its position for the ripple
      if (event && event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        triggerX = rect.left + rect.width / 2;
        triggerY = rect.top + rect.height / 2;
      }
      
      // Create ripple effect
      rippleContainer.innerHTML = '';
      const ripple = document.createElement('div');
      ripple.className = 'theme-transition-ripple';
      ripple.style.left = `${triggerX}px`;
      ripple.style.top = `${triggerY}px`;
      ripple.style.backgroundColor = newTheme === 'light' ? 
        getComputedStyle(document.documentElement).getPropertyValue('--light-bg') : 
        getComputedStyle(document.documentElement).getPropertyValue('--dark-bg');
      
      // Activate the transition container
      rippleContainer.classList.add('active');
      rippleContainer.appendChild(ripple);
      
      // Update state immediately
      this.set('currentTheme', newTheme, true);
      localStorage.setItem('foxden-theme', newTheme);
      
      // Notify the electron main process about the theme change
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.send('theme-changed', newTheme);
      }
      
      // Dispatch event for components to react
      document.dispatchEvent(new CustomEvent('themeChanged', { 
        detail: { oldTheme, newTheme }
      }));
      
      // Remove the transition container after the animation completes
      setTimeout(() => {
        rippleContainer.classList.remove('active');
      }, 1500); // Animation duration is 1.5s
    },
    
    /**
     * Change active den
     * @param {string} denId - The den ID to activate
     */
    setActiveDen: function(denId) {
      const den = this._data.dens.find(d => d.id === denId);
      if (!den) return;
      
      this.set('activeDen', denId);
      
      // Set the first channel as active if no active channel in this den
      const channels = this._data.channels[denId] || [];
      if (channels.length > 0) {
        const textChannels = channels.filter(c => c.type === 'text');
        if (textChannels.length > 0) {
          this.set('activeChannel', textChannels[0].id);
        }
      }
    },
    
    /**
     * Change active channel
     * @param {string} channelId - The channel ID to activate
     */
    setActiveChannel: function(channelId) {
      const denId = this._data.activeDen;
      if (!denId) return;
      
      const channels = this._data.channels[denId] || [];
      const channel = channels.find(c => c.id === channelId);
      if (!channel) return;
      
      this.set('activeChannel', channelId);
      
      // If joining a voice channel, set it as active voice channel
      // But only if not already connected to voice or if switching to a different voice channel
      if (channel.type === 'voice') {
        if (!this._data.connectedToVoice || this._data.activeVoiceChannel !== channelId) {
          this.set('activeVoiceChannel', channelId);
          this.set('connectedToVoice', true);
        }
      }
      // Important: Do NOT disconnect from voice when switching to a text channel
      // We only disconnect when the disconnect button is explicitly pressed
    },
    
    /**
     * Join a voice channel
     * @param {string} channelId - The voice channel ID to join
     */
    joinVoiceChannel: function(channelId) {
      const denId = this._data.activeDen;
      if (!denId) return;
      
      const channels = this._data.channels[denId] || [];
      const channel = channels.find(c => c.id === channelId);
      if (!channel || channel.type !== 'voice') return;
      
      // Set as active voice channel
      this.set('activeVoiceChannel', channelId);
      this.set('connectedToVoice', true);
      
      // Reset voice state
      this.set('micMuted', false);
      this.set('deafened', false);
      this.set('videoEnabled', false);
      this.set('screenShareEnabled', false);
      
      // Increment connected users count
      channel.connectedUsers = (channel.connectedUsers || 0) + 1;
      this._notify('channels', this._data.channels, null);
    },
    
    /**
     * Leave the current voice channel
     * This should ONLY be called when the disconnect button is pressed
     */
    leaveVoiceChannel: function() {
      const denId = this._data.activeDen;
      const channelId = this._data.activeVoiceChannel;
      
      if (!denId || !channelId) return;
      
      const channels = this._data.channels[denId] || [];
      const channel = channels.find(c => c.id === channelId);
      
      if (channel) {
        // Decrement connected users count
        channel.connectedUsers = Math.max(0, (channel.connectedUsers || 1) - 1);
        this._notify('channels', this._data.channels, null);
      }
      
      // Reset voice state
      this.set('activeVoiceChannel', null);
      this.set('connectedToVoice', false);
      this.set('micMuted', false);
      this.set('deafened', false);
      this.set('videoEnabled', false);
      this.set('screenShareEnabled', false);
    },
    
    /**
     * Set flag to preserve screen share when disconnecting from voice
     */
    preserveScreenShareOnDisconnect: function() {
      this._data.preserveScreenShare = true;
    },
    
    /**
     * Get the roles for a specific den
     * @param {string} denId - The den ID
     * @returns {Array} Array of roles for the den
     */
    getRolesForDen: function(denId) {
      // Initialize if needed
      if (!this._data.roles[denId]) {
        // Create default roles for the den (admin and moderator)
        const defaultRoles = [
          {
            id: 'admin',
            name: 'Admin',
            color: '#e74c3c',
            permissions: ['manageChannels', 'manageRoles', 'kickMembers', 'banMembers', 'manageMessages', 'mentionEveryone', 'uploadFiles'],
            createdAt: new Date().toISOString()
          },
          {
            id: 'moderator',
            name: 'Moderator',
            color: '#3498db',
            permissions: ['kickMembers', 'manageMessages', 'uploadFiles'],
            createdAt: new Date().toISOString()
          }
        ];
        
        this._data.roles[denId] = defaultRoles;
      }
      
      return this._data.roles[denId];
    },
    
    /**
     * Set the roles for a specific den
     * @param {string} denId - The den ID
     * @param {Array} roles - The updated roles array
     */
    setRolesForDen: function(denId, roles) {
      // Update roles for this den
      this._data.roles = {
        ...this._data.roles,
        [denId]: roles
      };
      
      // Notify subscribers
      this._notify('roles', this._data.roles);
      this._notify(`roles:${denId}`, roles);
      
      // Save state
      this._saveState();
    },
    
    /**
     * Check if current user has moderator permissions in a den
     * @param {string} [denId=null] - The den ID to check, defaults to active den
     * @returns {boolean} Whether user has mod permissions
     */
    userHasModPermissions: function(denId = null) {
      // Get the current active den if no den ID is provided
      const targetDenId = denId || this._data.activeDen;
      if (!targetDenId) return false;
      
      // Get the current user
      const currentUser = this._data.currentUser;
      if (!currentUser) return false;
      
      // Find the user's membership in the den
      const denMembers = this.getMembersForDen(targetDenId);
      const userMembership = denMembers.find(member => member.id === currentUser.id);
      
      if (!userMembership) return false;
      
      // Check if user is the owner
      if (userMembership.isOwner) return true;
      
      // Check if user has moderator or admin role
      if (userMembership.roles && (
          userMembership.roles.includes('moderator') || 
          userMembership.roles.includes('admin'))
      ) {
        return true;
      }
      
      return false;
    }
  };
  
  // Export state for use in other modules
  window.AppState = AppState;