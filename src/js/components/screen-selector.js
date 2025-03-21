/**
 * Screen Selector Component
 * 
 * Displays a Discord-style modal for selecting a screen/application to share
 */

const ScreenSelector = {
  // Track state
  isOpen: false,
  selectedSource: null,
  currentStep: 'source-selection', // 'source-selection' or 'quality-settings'
  sourceType: 'applications', // 'applications', 'screens', or 'devices'
  
  // Quality settings
  quality: 'smoother', // 'smoother' or 'clearer'
  resolution: '1080', // '720', '1080', '1440', 'source'
  frameRate: '30', // '15', '30', '60'
  shareAudio: false,
  
  // Sources
  applications: [],
  screens: [],
  devices: [],
  
  /**
   * Open the screen selector modal
   * @param {Function} callback - Function to call when a source is selected
   */
  open: async function(callback) {
    this.isOpen = true;
    this.callback = callback;
    this.currentStep = 'source-selection';
    this.selectedSource = null;
    
    // Create the modal
    this._createModal();
    
    // Fetch available sources
    await this._fetchSources();
    
    // Render sources
    this._renderSources();
  },
  
  /**
   * Close the screen selector modal
   */
  close: function() {
    this.isOpen = false;
    
    // Remove modal from DOM
    const dialog = document.getElementById('screen-share-dialog');
    if (dialog) {
      dialog.remove();
    }
  },
  
  /**
   * Create the modal DOM structure
   * @private
   */
  _createModal: function() {
    // Remove any existing modal
    const existingDialog = document.getElementById('screen-share-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }
    
    // Create dialog container
        const dialog = document.createElement('div');
    dialog.id = 'screen-share-dialog';
        dialog.className = 'screen-share-dialog';
        
    if (this.currentStep === 'source-selection') {
      // First screen - Source selection
        dialog.innerHTML = `
        <div class="screen-share-modal">
            <div class="screen-share-header">
            <h2>Screen Share</h2>
            <button class="screen-share-close" id="screen-share-close">&times;</button>
          </div>
          <div class="screen-share-tabs">
            <button class="screen-share-tab ${this.sourceType === 'applications' ? 'active' : ''}" data-tab="applications">Applications</button>
            <button class="screen-share-tab ${this.sourceType === 'screens' ? 'active' : ''}" data-tab="screens">Screens</button>
            <button class="screen-share-tab ${this.sourceType === 'devices' ? 'active' : ''}" data-tab="devices">Capture Devices</button>
          </div>
          <div class="screen-share-content">
            <div class="screen-share-sources" id="screen-share-sources">
              <!-- Sources will be rendered here -->
              <div class="screen-share-loading">Loading available sources...</div>
            </div>
          </div>
          <div class="screen-share-footer">
            <div class="screen-share-option">
              <input type="checkbox" id="share-audio" class="screen-share-checkbox" ${this.shareAudio ? 'checked' : ''}>
              <label for="share-audio" class="screen-share-option-label">Also share system audio.</label>
            </div>
            <div class="screen-share-actions">
              <button class="screen-share-btn screen-share-btn-cancel" id="screen-share-cancel">Cancel</button>
              <button class="screen-share-btn screen-share-btn-go-live" id="screen-share-go-live" disabled>Continue</button>
            </div>
          </div>
        </div>
      `;
    } else if (this.currentStep === 'quality-settings') {
      // Second screen - Quality settings and final Go Live button
      dialog.innerHTML = `
        <div class="screen-share-modal">
          <div class="screen-share-header">
            <h2>Screen Share Settings</h2>
            <button class="screen-share-close" id="screen-share-close">&times;</button>
            </div>
            <div class="screen-share-content">
            <div class="screen-share-preview">
              <div class="selected-source-preview">
                <h3>You are about to share: ${this.selectedSource ? this.selectedSource.name : ''}</h3>
                ${this.selectedSource && this.selectedSource.thumbnail ? 
                  `<div class="source-preview-thumbnail">
                    <img src="${this.selectedSource.thumbnail}" alt="${this.selectedSource.name}">
                  </div>` : 
                  `<div class="source-preview-placeholder">
                    <div class="placeholder-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                      </svg>
                    </div>
                  </div>`
                }
              </div>
            </div>
            <div class="screen-share-quality-settings">
              <div class="setting-group">
                <label>Quality</label>
                <div class="quality-options">
                  <button class="quality-option ${this.quality === 'smoother' ? 'active' : ''}" data-quality="smoother">Smoother Motion</button>
                  <button class="quality-option ${this.quality === 'clearer' ? 'active' : ''}" data-quality="clearer">Clearer Text</button>
                </div>
              </div>
              <div class="setting-group">
                <label>Resolution</label>
                <div class="resolution-options">
                  <button class="resolution-option ${this.resolution === '720' ? 'active' : ''}" data-resolution="720">720p</button>
                  <button class="resolution-option ${this.resolution === '1080' ? 'active' : ''}" data-resolution="1080">1080p</button>
                  <button class="resolution-option ${this.resolution === '1440' ? 'active' : ''}" data-resolution="1440">1440p</button>
                  <button class="resolution-option ${this.resolution === 'source' ? 'active' : ''}" data-resolution="source">Source</button>
                </div>
              </div>
              <div class="setting-group">
                <label>Frame Rate</label>
                <div class="framerate-options">
                  <button class="framerate-option ${this.frameRate === '15' ? 'active' : ''}" data-framerate="15">15 FPS</button>
                  <button class="framerate-option ${this.frameRate === '30' ? 'active' : ''}" data-framerate="30">30 FPS</button>
                  <button class="framerate-option ${this.frameRate === '60' ? 'active' : ''}" data-framerate="60">60 FPS</button>
                </div>
              </div>
              </div>
            </div>
            <div class="screen-share-footer">
            <div class="screen-share-option">
              <input type="checkbox" id="share-audio" class="screen-share-checkbox" ${this.shareAudio ? 'checked' : ''}>
              <label for="share-audio" class="screen-share-option-label">Also share system audio.</label>
              </div>
              <div class="screen-share-actions">
              <button class="screen-share-btn screen-share-btn-back" id="screen-share-back">Back</button>
              <button class="screen-share-btn screen-share-btn-cancel" id="screen-share-cancel">Cancel</button>
              <button class="screen-share-btn screen-share-btn-go-live" id="screen-share-go-live">Go Live</button>
            </div>
            </div>
          </div>
        `;
    }
        
        // Add to document
        document.body.appendChild(dialog);

    // Add event listeners
    this._addEventListeners();
  },
  
  /**
   * Add event listeners to modal elements
   * @private
   */
  _addEventListeners: function() {
    // Close button
    const closeBtn = document.getElementById('screen-share-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('screen-share-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }
    
    // Go Live / Continue button
    const goLiveBtn = document.getElementById('screen-share-go-live');
    if (goLiveBtn) {
      goLiveBtn.addEventListener('click', () => {
        if (this.currentStep === 'source-selection') {
          // Move to the quality settings step
          this.currentStep = 'quality-settings';
          this._createModal();
        } else {
          // Final Go Live - start screen share
          this._startScreenShare();
        }
      });
    }
    
    // Back button (on quality settings screen)
    const backBtn = document.getElementById('screen-share-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.currentStep = 'source-selection';
        this._createModal();
      });
    }
    
    // Tab buttons
    const tabButtons = document.querySelectorAll('.screen-share-tab');
    tabButtons.forEach(tab => {
      tab.addEventListener('click', () => {
        this.sourceType = tab.dataset.tab;
        
        // Update active tab
        tabButtons.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Re-render sources based on selected tab
        this._renderSources();
      });
    });
    
    // Share audio checkbox
    const shareAudioCheckbox = document.getElementById('share-audio');
    if (shareAudioCheckbox) {
      shareAudioCheckbox.checked = this.shareAudio;
      shareAudioCheckbox.addEventListener('change', () => {
        this.shareAudio = shareAudioCheckbox.checked;
      });
    }
    
    // Quality settings buttons (only on quality-settings screen)
    if (this.currentStep === 'quality-settings') {
      // Quality option buttons
      const qualityOptions = document.querySelectorAll('.quality-option');
      qualityOptions.forEach(option => {
        option.addEventListener('click', () => {
          this.quality = option.dataset.quality;
          qualityOptions.forEach(o => o.classList.remove('active'));
          option.classList.add('active');
        });
      });
      
      // Resolution option buttons
      const resolutionOptions = document.querySelectorAll('.resolution-option');
      resolutionOptions.forEach(option => {
        option.addEventListener('click', () => {
          this.resolution = option.dataset.resolution;
          resolutionOptions.forEach(o => o.classList.remove('active'));
          option.classList.add('active');
        });
      });
      
      // Frame rate option buttons
      const framerateOptions = document.querySelectorAll('.framerate-option');
      framerateOptions.forEach(option => {
        option.addEventListener('click', () => {
          this.frameRate = option.dataset.framerate;
          framerateOptions.forEach(o => o.classList.remove('active'));
          option.classList.add('active');
        });
      });
    }
  },

  /**
   * Fetch available sources for screen sharing
   * @private
   */
  _fetchSources: async function() {
    try {
      // Clear existing sources
      this.applications = [];
      this.screens = [];
      this.devices = [];
      
      // Update loading state
      const sourcesContainer = document.getElementById('screen-share-sources');
      if (sourcesContainer) {
        sourcesContainer.innerHTML = '<div class="screen-share-loading">Loading available sources...</div>';
      }
      
      // The best approach is to have the main process provide sources via the screen-share-sources event
      // That event listener is set up in init() and will populate this.applications and this.screens
      
      // If we didn't get sources from the main process event, try to fetch them via IPC
      if (this.applications.length === 0 && this.screens.length === 0) {
        try {
          // First try using IPC if available (this is more reliable)
          if (window.electron && window.electron.invoke) {
            console.log("Getting sources via IPC handler...");
            try {
              const sources = await window.electron.invoke('get-screen-sources');
              
              if (sources && Array.isArray(sources) && sources.length > 0) {
                console.log(`Got ${sources.length} sources via IPC`);
                
                // Process sources
                sources.forEach(source => {
                  const sourceObj = {
                    id: source.id,
                    name: source.name,
                    thumbnail: source.thumbnail, // This should already be a data URL from main process
                    type: source.type === 'screen' ? 'screen' : 'application',
                    appIcon: source.appIcon
                  };
                  
                  if (sourceObj.type === 'application') {
                    this.applications.push(sourceObj);
                  } else {
                    this.screens.push(sourceObj);
                  }
                });
                
                console.log(`Processed ${this.applications.length} applications and ${this.screens.length} screens`);
              } else {
                console.warn("IPC returned no sources, falling back to direct method");
                await this._getSourcesWithDirectAPI();
              }
            } catch (err) {
              console.error("IPC source detection failed:", err);
              await this._getSourcesWithDirectAPI();
            }
          } 
          // Try using direct API if IPC is not available
          else {
            await this._getSourcesWithDirectAPI();
          }
        } catch (err) {
          console.error("All source detection methods failed:", err);
        }
      }
      
      // If no sources were detected through proper APIs, add fallbacks
      if (this.applications.length === 0 && this.screens.length === 0) {
        console.warn("No sources detected through APIs, using fallbacks");
        this._addFallbackSources();
      }
      
      // Get capture devices using mediaDevices API
      await this._getVideoDevices();
      
      // Render the sources
      this._renderSources();
      
      console.log("Sources loaded:", {
        applications: this.applications.length,
        screens: this.screens.length,
        devices: this.devices.length
      });
    } catch (error) {
      console.error('Error fetching screen share sources:', error);
      
      // Show error in the UI
      const sourcesContainer = document.getElementById('screen-share-sources');
      if (sourcesContainer) {
        sourcesContainer.innerHTML = `
          <div class="screen-share-error">
            <p>Error loading sources: ${error.message}</p>
            <p>Please check permissions and try again.</p>
      </div>
    `;
      }
    }
  },

  /**
   * Get sources using direct desktopCapturer API
   * @private
   */
  _getSourcesWithDirectAPI: async function() {
    console.log("Trying direct desktopCapturer API...");
    if (window.electron && window.electron.getDesktopCapturerSources) {
      try {
        const sources = await window.electron.getDesktopCapturerSources({ 
          types: ['window', 'screen'],
          thumbnailSize: { width: 320, height: 180 },
          fetchWindowIcons: true
        });
        
        if (sources && Array.isArray(sources) && sources.length > 0) {
          console.log(`Got ${sources.length} sources via direct API`);
          
          // Process sources
          sources.forEach(source => {
            // Generate thumbnail URL
            let thumbnailUrl = null;
            if (source.thumbnail) {
              if (typeof source.thumbnail === 'string') {
                thumbnailUrl = source.thumbnail;
              } else if (source.thumbnail.toDataURL) {
                thumbnailUrl = source.thumbnail.toDataURL();
              }
            }
            
            // Determine source type from ID
            const sourceType = source.id.includes('screen:') ? 'screen' : 'application';
            
            const sourceObj = {
              id: source.id,
              name: source.name,
              thumbnail: thumbnailUrl,
              type: sourceType
            };
            
            if (sourceType === 'application') {
              this.applications.push(sourceObj);
            } else {
              this.screens.push(sourceObj);
            }
          });
          console.log(`Processed ${this.applications.length} applications and ${this.screens.length} screens from direct API`);
        } else {
          throw new Error("No sources from direct API");
        }
      } catch (err) {
        console.error("Direct API source detection failed:", err);
        throw err;
      }
    } else {
      console.warn("Direct desktopCapturer API not available");
      throw new Error("Direct API not available");
    }
  },
  
  /**
   * Add fallback sources when detection fails
   * @private
   */
  _addFallbackSources: function() {
    // Add a generic screen
    this.screens = [
      { 
        id: 'screen:0', 
        name: 'Your Screen', 
        type: 'screen',
        thumbnail: null
      }
    ];
    
    // Add current window option
    this.applications = [
      { id: 'window:current', name: 'Current Window', type: 'application', thumbnail: null }
    ];
  },
  
  /**
   * Get video devices (cameras)
   * @private
   */
  _getVideoDevices: async function() {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        // Request permissions first
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          // Stop the tracks right away, we just needed permission
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.warn("Could not get camera permission:", err);
          return; // Exit if we can't get permission
        }
          
        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        
        // Filter for video input devices (cameras)
        const videoDevices = deviceInfos.filter(device => device.kind === 'videoinput');
        
        console.log(`Found ${videoDevices.length} video devices`);
        
        // Map to our source format
        this.devices = videoDevices.map(device => ({
          id: device.deviceId,
          name: device.label || `Camera ${this.devices.length + 1}`,
          type: 'device'
        }));
        
        // Generate thumbnails for devices
        for (const device of this.devices) {
          try {
            // Get a stream for this device to generate a thumbnail
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: device.id } }
            });
            
            // Create a video element to capture a frame
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();
            
            // Wait for video to start playing
            await new Promise(resolve => {
              video.onplaying = resolve;
              // Timeout in case video doesn't play
              setTimeout(resolve, 1000);
            });
            
            // Create a canvas and draw the video frame
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 180;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Set the thumbnail
            device.thumbnail = canvas.toDataURL('image/png');
            
            // Stop the stream
            stream.getTracks().forEach(track => track.stop());
          } catch (err) {
            console.warn(`Could not generate thumbnail for device ${device.name}:`, err);
          }
        }
      } catch (err) {
        console.error("Error enumerating media devices:", err);
      }
    }
  },
  
  /**
   * Render sources in the modal
   * @private
   */
  _renderSources: function() {
    const sourcesContainer = document.getElementById('screen-share-sources');
    if (!sourcesContainer) return;
    
    // Clear container
    sourcesContainer.innerHTML = '';
    
    // Get sources based on current tab
    let sources = [];
    switch (this.sourceType) {
      case 'applications':
        sources = this.applications;
        break;
      case 'screens':
        sources = this.screens;
        break;
      case 'devices':
        sources = this.devices;
        break;
    }
    
    console.log(`Rendering ${sources.length} ${this.sourceType}`);
    
    // Render sources
    if (sources.length === 0) {
      sourcesContainer.innerHTML = `
        <div class="no-sources">
          No ${this.sourceType} available
          ${this.sourceType === 'applications' ? 'Try opening some applications first.' : ''}
          ${this.sourceType === 'devices' ? 'Make sure your cameras are connected and permissions are granted.' : ''}
        </div>
      `;
      return;
    }
    
    sources.forEach(source => {
      const sourceElement = document.createElement('div');
      sourceElement.className = `screen-share-source ${this.selectedSource && this.selectedSource.id === source.id ? 'selected' : ''}`;
      sourceElement.dataset.id = source.id;
      
      // Create thumbnail element
      let thumbnailHtml = '';
      if (source.thumbnail) {
        // For dataURL thumbnails
        thumbnailHtml = `<img src="${source.thumbnail}" alt="${source.name}" onerror="this.style.display='none';">`;
      }
      
      // Log source info for debugging
      console.log(`Rendering source: ${source.name} (${source.type}), has thumbnail: ${Boolean(source.thumbnail)}`);
      
      sourceElement.innerHTML = `
        <div class="screen-share-thumbnail">
          ${thumbnailHtml}
        </div>
        <div class="screen-share-label">${source.name}</div>
      `;
      
      // Add click event to select source
      sourceElement.addEventListener('click', () => {
        // Update selected source
        this.selectedSource = source;
        console.log(`Selected source: ${source.name} (${source.type})`);
        
        // Update UI
        document.querySelectorAll('.screen-share-source').forEach(element => {
          element.classList.remove('selected');
        });
        sourceElement.classList.add('selected');
        
        // Enable Go Live button
        const goLiveBtn = document.getElementById('screen-share-go-live');
        if (goLiveBtn) {
          goLiveBtn.disabled = false;
        }
      });
      
      sourcesContainer.appendChild(sourceElement);
    });
  },

  /**
   * Start screen sharing with selected options
   * @private
   */
  _startScreenShare: function() {
    if (!this.selectedSource) return;
    
    // Create options object
    const options = {
      sourceId: this.selectedSource.id,
      sourceType: this.selectedSource.type,
      captureAudio: this.shareAudio,
      resolution: this.resolution,
      frameRate: parseInt(this.frameRate, 10),
      name: this.selectedSource.name
    };
    
    // Close modal
    this.close();
    
    // Call callback function with selected source and options
    if (typeof this.callback === 'function') {
      this.callback(this.selectedSource, options);
    }
  },
  
  // Initialize screen selector
  init: function() {
    // Create screen selector modal if not exists
    this._createModal();
    
    // Add event listeners
    this._addEventListeners();
    
    // Listen for screen-share-sources events from the main process
    window.addEventListener('screen-share-sources', (event) => {
      console.log('Received screen-share-sources event with', event.detail.length, 'sources');
      
      try {
        // Process the sources
        this.applications = [];
        this.screens = [];
        
        event.detail.forEach(source => {
          // Create a complete source object with required properties
          const sourceObj = {
            id: source.id,
            name: source.name || (source.type === 'screen' ? 'Screen' : 'Window'),
            type: source.type || (source.id.includes('screen:') ? 'screen' : 'application'),
            thumbnail: null
          };
          
          // Handle thumbnail - could be a data URL string already or needs conversion
          if (source.thumbnail) {
            if (typeof source.thumbnail === 'string') {
              sourceObj.thumbnail = source.thumbnail;
            } else if (source.thumbnail.toDataURL) {
              try {
                sourceObj.thumbnail = source.thumbnail.toDataURL();
              } catch (err) {
                console.warn(`Failed to convert thumbnail to data URL for ${source.name}:`, err);
              }
            }
          }
          
          // Add app icon if available
          if (source.appIcon) {
            if (typeof source.appIcon === 'string') {
              sourceObj.appIcon = source.appIcon;
            } else if (source.appIcon.toDataURL) {
              try {
                sourceObj.appIcon = source.appIcon.toDataURL();
              } catch (err) {
                console.warn(`Failed to convert app icon to data URL for ${source.name}:`, err);
              }
            }
          }
          
          // Add to appropriate collection
          if (sourceObj.type === 'screen') {
            this.screens.push(sourceObj);
          } else {
            this.applications.push(sourceObj);
          }
        });
        
        // Log what we processed
        console.log(`Processed ${this.applications.length} applications and ${this.screens.length} screens from main process event`);
        
        // Update the UI
        this._renderSources();
        
        // If this was triggered by getDisplayMedia, programmatically select the first source
        if (event.detail.fromDisplayMediaRequest && event.detail.length > 0) {
          // Auto-select first source after a small delay to let UI render
          setTimeout(() => {
            const sourceElement = document.querySelector('.screen-share-source');
            if (sourceElement) {
              sourceElement.click();
            }
          }, 100);
        }
      } catch (error) {
        console.error('Error processing screen-share-sources event:', error);
      }
    });
    
    console.log('Screen Selector module loaded successfully');
  }
};

// Export for use in other modules
window.ScreenSelector = ScreenSelector;
console.log("Screen Selector module loaded successfully");
