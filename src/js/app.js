/**
 * FoxDen Main Application
 * 
 * Initializes and ties together all components of the application
 */

const App = {
    // Track initialization state
    initialized: false,
    
    /**
     * Initialize the application
     */
    init: async function() {
      if (this.initialized) return;
      
      // Show loading state if needed
      this._showLoading();
      
      try {
        // Initialize app state first
        await AppState.init();
        
        // Set up basic event listeners
        this._setupEventListeners();
        
        // Initialize all managers with individual error handling
        try {
          console.log("Initializing DenManager...");
          DenManager.init();
        } catch (error) {
          console.error("Error initializing DenManager:", error);
          throw new Error("DenManager initialization failed: " + error.message);
        }
        
        try {
          console.log("Initializing ChannelManager...");
          ChannelManager.init();
        } catch (error) {
          console.error("Error initializing ChannelManager:", error);
          throw new Error("ChannelManager initialization failed: " + error.message);
        }
        
        try {
          console.log("Initializing ChatManager...");
          ChatManager.init();
        } catch (error) {
          console.error("Error initializing ChatManager:", error);
          throw new Error("ChatManager initialization failed: " + error.message);
        }
        
        try {
          console.log("Initializing VoiceManager...");
          VoiceManager.init();
        } catch (error) {
          console.error("Error initializing VoiceManager:", error);
          throw new Error("VoiceManager initialization failed: " + error.message);
        }
        
        try {
          console.log("Initializing UserManager...");
          UserManager.init();
        } catch (error) {
          console.error("Error initializing UserManager:", error);
          throw new Error("UserManager initialization failed: " + error.message);
        }
        
        try {
          console.log("Initializing SettingsManager...");
          SettingsManager.init();
        } catch (error) {
          console.error("Error initializing SettingsManager:", error);
          throw new Error("SettingsManager initialization failed: " + error.message);
        }
        
        // No longer need to dynamically load screen-selector.js
        // It's now included directly in the HTML
        
        // Set up keyboard shortcuts
        this._setupKeyboardShortcuts();
        
        // Handle window resize
        this._handleWindowResize();
        window.addEventListener('resize', this._handleWindowResize.bind(this));
        
        // Add window controls for Electron
        this._setupWindowControls();
        
        this.initialized = true;
        
        // Hide loading screen
        this._hideLoading();
        
        console.log('FoxDen application initialized successfully');
      } catch (error) {
        console.error('Error initializing application:', error);
        this._showError(error);
      }
    },
    
    /**
     * Show loading screen
     * @private
     */
    _showLoading: function() {
      // Check if loading screen already exists
      let loadingScreen = document.getElementById('app-loading');
      
      if (!loadingScreen) {
        loadingScreen = document.createElement('div');
        loadingScreen.id = 'app-loading';
        loadingScreen.innerHTML = `
          <div class="loading-content">
            <div class="loading-logo">🦊</div>
            <div class="loading-text">Loading FoxDen...</div>
            <div class="loading-spinner"></div>
          </div>
        `;
        
        // Add CSS
        const style = document.createElement('style');
        style.textContent = `
          #app-loading {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--bg-primary, #121212);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
          }
          
          .loading-content {
            text-align: center;
          }
          
          .loading-logo {
            font-size: 48px;
            margin-bottom: 16px;
          }
          
          .loading-text {
            color: var(--text-primary, #ffffff);
            font-size: 18px;
            margin-bottom: 24px;
          }
          
          .loading-spinner {
            width: 40px;
            height: 40px;
            margin: 0 auto;
            border: 4px solid rgba(255, 255, 255, 0.2);
            border-top-color: var(--accent, #ff7518);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(loadingScreen);
      }
    },
    
    /**
     * Hide loading screen
     * @private
     */
    _hideLoading: function() {
      const loadingScreen = document.getElementById('app-loading');
      
      if (loadingScreen) {
        // Add fade-out animation
        loadingScreen.style.transition = 'opacity 0.5s';
        loadingScreen.style.opacity = '0';
        
        // Remove after animation
        setTimeout(() => {
          loadingScreen.remove();
        }, 500);
      }
    },
    
    /**
     * Show error screen
     * @param {Error} error - The error that occurred
     * @private
     */
    _showError: function(error) {
      // Hide loading screen
      this._hideLoading();
      
      // Create error screen
      const errorScreen = document.createElement('div');
      errorScreen.id = 'app-error';
      errorScreen.innerHTML = `
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <div class="error-title">Something went wrong</div>
          <div class="error-message">${error.message || 'Could not initialize the application'}</div>
          <button class="error-retry">Retry</button>
        </div>
      `;
      
      // Add CSS
      const style = document.createElement('style');
      style.textContent = `
        #app-error {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--bg-primary, #121212);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        
        .error-content {
          text-align: center;
          padding: 24px;
          background-color: var(--bg-secondary, #1e1e1e);
          border-radius: 8px;
          max-width: 400px;
        }
        
        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        
        .error-title {
          color: var(--text-primary, #ffffff);
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 16px;
        }
        
        .error-message {
          color: var(--text-secondary, #8e9297);
          font-size: 16px;
          margin-bottom: 24px;
        }
        
        .error-retry {
          background-color: var(--accent, #ff7518);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
        }
        
        .error-retry:hover {
          background-color: var(--accent-hover, #e66000);
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(errorScreen);
      
      // Set up retry button
      errorScreen.querySelector('.error-retry').addEventListener('click', () => {
        errorScreen.remove();
        window.location.reload();
      });
    },
    
    /**
     * Set up basic event listeners
     * @private
     */
    _setupEventListeners: function() {
      // Theme toggle button
      document.getElementById('toggle-theme').addEventListener('click', () => {
        AppState.toggleTheme();
      });
      
      // Handle clicks on the backdrop elements to close modals
      document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop')) {
          const modal = e.target.closest('.modal');
          if (modal) {
            modal.classList.remove('active');
          }
        }
      });
    },
    
    /**
     * Set up keyboard shortcuts
     * @private
     */
    _setupKeyboardShortcuts: function() {
      document.addEventListener('keydown', (e) => {
        // Check if the user is typing in an input field
        const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || 
                         document.activeElement.isContentEditable;
        
        // Ctrl+, = Open Settings (always works)
        if (e.ctrlKey && e.key === ',') {
          e.preventDefault();
          SettingsManager.showSettings();
        }
        
        // Ctrl+Shift+T = Toggle Theme (always works)
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
          e.preventDefault();
          AppState.toggleTheme();
        }
        
        // Escape = Close Modals (always works)
        if (e.key === 'Escape') {
          const activeModals = document.querySelectorAll('.modal.active');
          if (activeModals.length > 0) {
            activeModals.forEach(modal => modal.classList.remove('active'));
          } else if (AppState.get('settingsOpen')) {
            SettingsManager.hideSettings();
          }
        }
        
        // Skip single-key shortcuts if user is typing in an input field
        if (isTyping) return;
        
        // Only process the following shortcuts if in a voice channel
        if (AppState.get('connectedToVoice')) {
          // M = Toggle Mute (only when not typing)
          if (e.key === 'm' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            VoiceManager.toggleMicrophone();
          }
          
          // D = Toggle Deafen (only when not typing)
          if (e.key === 'd' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            VoiceManager.toggleDeafen();
          }
          
          // V = Toggle Video (only when not typing)
          if (e.key === 'v' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            VoiceManager.toggleVideo();
          }
          
          // S = Toggle Screen Share (only when not typing)
          if (e.key === 's' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            VoiceManager.toggleScreenShare();
          }
        }
        
        // Channel navigation (always works since it requires modifier keys)
        if (e.altKey && e.key === 'ArrowDown') {
          e.preventDefault();
          this._navigateNextChannel();
        }
        
        if (e.altKey && e.key === 'ArrowUp') {
          e.preventDefault();
          this._navigatePreviousChannel();
        }
        
        // Den navigation (always works since it requires modifier keys)
        if (e.ctrlKey && e.altKey && e.key === 'ArrowDown') {
          e.preventDefault();
          this._navigateNextDen();
        }
        
        if (e.ctrlKey && e.altKey && e.key === 'ArrowUp') {
          e.preventDefault();
          this._navigatePreviousDen();
        }
      });
    },
    
    /**
     * Handle window resize
     * @private
     */
    _handleWindowResize: function() {
      // Check window width and update mobile state
      const isMobile = window.innerWidth <= 768;
      document.body.classList.toggle('mobile', isMobile);
      
      // On mobile, collapse the member sidebar
      if (isMobile) {
        document.getElementById('members-sidebar').classList.remove('active');
      }
    },
    
    /**
     * Set up window controls for Electron
     * @private
     */
    _setupWindowControls: function() {
      // Only set up if electron is available
      if (!window.electron || !window.electron.windowControls) return;
      
      document.getElementById('minimize-button').addEventListener('click', () => {
        window.electron.windowControls.minimize();
      });
      
      document.getElementById('maximize-button').addEventListener('click', () => {
        window.electron.windowControls.maximize();
      });
      
      document.getElementById('close-button').addEventListener('click', () => {
        window.electron.windowControls.close();
      });
    },
    
    /**
     * Navigate to the next channel
     * @private
     */
    _navigateNextChannel: function() {
      const denId = AppState.get('activeDen');
      if (!denId) return;
      
      const channels = AppState.getChannelsForDen(denId);
      const currentChannelId = AppState.get('activeChannel');
      
      if (!channels || channels.length === 0) return;
      
      // Find the current channel index
      const currentIndex = channels.findIndex(channel => channel.id === currentChannelId);
      
      // Calculate the next index
      const nextIndex = (currentIndex + 1) % channels.length;
      
      // Set the next channel as active
      AppState.setActiveChannel(channels[nextIndex].id);
    },
    
    /**
     * Navigate to the previous channel
     * @private
     */
    _navigatePreviousChannel: function() {
      const denId = AppState.get('activeDen');
      if (!denId) return;
      
      const channels = AppState.getChannelsForDen(denId);
      const currentChannelId = AppState.get('activeChannel');
      
      if (!channels || channels.length === 0) return;
      
      // Find the current channel index
      const currentIndex = channels.findIndex(channel => channel.id === currentChannelId);
      
      // Calculate the previous index
      const previousIndex = (currentIndex - 1 + channels.length) % channels.length;
      
      // Set the previous channel as active
      AppState.setActiveChannel(channels[previousIndex].id);
    },
    
    /**
     * Navigate to the next den
     * @private
     */
    _navigateNextDen: function() {
      const dens = AppState.get('dens');
      const currentDenId = AppState.get('activeDen');
      
      if (!dens || dens.length === 0) return;
      
      // Find the current den index
      const currentIndex = dens.findIndex(den => den.id === currentDenId);
      
      // Calculate the next index
      const nextIndex = (currentIndex + 1) % dens.length;
      
      // Set the next den as active
      AppState.setActiveDen(dens[nextIndex].id);
    },
    
    /**
     * Navigate to the previous den
     * @private
     */
    _navigatePreviousDen: function() {
      const dens = AppState.get('dens');
      const currentDenId = AppState.get('activeDen');
      
      if (!dens || dens.length === 0) return;
      
      // Find the current den index
      const currentIndex = dens.findIndex(den => den.id === currentDenId);
      
      // Calculate the previous index
      const previousIndex = (currentIndex - 1 + dens.length) % dens.length;
      
      // Set the previous den as active
      AppState.setActiveDen(dens[previousIndex].id);
    },

    /**
     * Load a script dynamically
     * @param {string} src - Script source path
     * @returns {Promise} - Promise that resolves when script is loaded
     * @private
     */
    _loadScript: function(src) {
      return new Promise((resolve, reject) => {
        // Check if script already exists
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
          console.log(`Script ${src} already loaded`);
          resolve();
          return;
        }

        // Check if file exists by making a HEAD request
        const checkFileExists = () => {
          return new Promise((resolveCheck) => {
            const xhr = new XMLHttpRequest();
            xhr.open('HEAD', src, true);
            xhr.onreadystatechange = function() {
              if (xhr.readyState === 4) {
                resolveCheck(xhr.status === 200);
              }
            };
            xhr.send();
          });
        };

        console.log(`Loading script: ${src}`);
        
        // First check if file exists
        checkFileExists().then(exists => {
          if (!exists) {
            console.warn(`Script file not found at ${src}. Creating a fallback implementation.`);
            
            // If it's the screen-selector.js that's missing, we'll create a minimal version in memory
            if (src.includes('screen-selector.js')) {
              const inlineScript = document.createElement('script');
              inlineScript.textContent = `
                // Fallback ScreenSelector implementation
                window.ScreenSelector = {
                  showSelectionDialog: function() {
                    return new Promise(resolve => {
                      alert("Screen selector is not available. Using default system dialog.");
                      // Fallback to default electron/browser sharing dialog
                      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                        navigator.mediaDevices.getDisplayMedia({video: true})
                          .then(stream => {
                            resolve({
                              sourceId: 'default',
                              sourceName: 'Screen',
                              sourceType: 'screen',
                              options: {
                                captureAudio: false,
                                width: 1920,
                                height: 1080,
                                frameRate: 30
                              },
                              stream: stream
                            });
                          })
                          .catch(() => resolve(null));
                      } else {
                        resolve(null);
                      }
                    });
                  }
                };
                console.log("Fallback ScreenSelector created");
              `;
              document.head.appendChild(inlineScript);
              resolve();
              return;
            }
            
            // For other scripts, reject with error
            reject(new Error(`Script file not found: ${src}`));
            return;
          }
          
          // File exists, proceed with loading
          const script = document.createElement('script');
          script.src = src;
          script.onload = () => {
            console.log(`Script loaded successfully: ${src}`);
            resolve();
          };
          script.onerror = (error) => {
            console.error(`Failed to load script: ${src}`, error);
            reject(new Error(`Failed to load script: ${src}`));
          };
          document.head.appendChild(script);
        }).catch(error => {
          console.error(`Error checking script existence: ${src}`, error);
          reject(error);
        });
      });
    }
  };
  
  // Initialize the app when the DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing app...");
    App.init().catch(error => {
      console.error('Failed to initialize application:', error);
    });
  });
  
  // Export for use in other modules
  window.App = App;