/**
 * FoxDen Voice Management
 * 
 * Handles all functionality related to voice and video chat
 */

const VoiceManager = {
    // Track initialization state
    initialized: false,
    
    // Stream references
    localStream: null,
    screenStream: null,
    remoteStreams: {},
    
    // MediaRecorder for voice activity detection
    audioAnalyser: null,
    
    // Audio context for processing
    audioContext: null,
    
    // Speaking detection
    speakingDetectionInterval: null,
    
    // Mini player reference
    miniPlayer: null,
    
    // Mini player position tracking
    miniPlayerPosition: { x: 20, y: 20 },
    
    /**
     * Initialize the voice manager
     * @public
     */
    init: function() {
      if (this.initialized) return;
      
      // Set initial state
      this.hasVideo = false;
      this.isScreenSharing = false;
      this.isMuted = false;
      this.isDeafened = false;
      
      // Store the current user ID for context menu functionality
      this.currentUserId = AppState.get('currentUser')?.id || 'current-user';
      
      // Create UI elements
      this.videoGrid = document.getElementById('video-grid');
      
      if (!this.videoGrid) {
        console.error('Video grid element not found');
        return;
      }
      
      // Set up UI structure
      this._setupUIStructure();
      
      // Cache DOM elements
      this.voiceContainer = document.getElementById('voice-container');
      this.voiceChannelName = document.getElementById('voice-channel-name');
      this.voiceBottomPanel = document.getElementById('voice-bottom-panel');
      this.voiceBottomChannelName = document.getElementById('voice-bottom-channel-name');
      
      // Track state
      this.isConnected = false;
      
      // Set up event listeners
      this._setupEventListeners();
      
      // Subscribe to state changes
      AppState.subscribe('activeChannel', (channelId) => this._handleActiveChannelChange(channelId));
      AppState.subscribe('activeVoiceChannel', (channelId) => this._handleActiveVoiceChannelChange(channelId));
      AppState.subscribe('connectedToVoice', (isConnected) => this._handleConnectionStateChange(isConnected));
      AppState.subscribe('micMuted', (isMuted) => this._handleMicMuteChange(isMuted));
      AppState.subscribe('deafened', (isDeafened) => this._handleDeafenedChange(isDeafened));
      AppState.subscribe('videoEnabled', (isEnabled) => this._handleVideoChange(isEnabled));
      AppState.subscribe('screenShareEnabled', (isScreenSharing) => this._handleScreenShareChange(isScreenSharing));
      
      this.initialized = true;
    },
    
    /**
     * Set up event listeners for voice-related elements
     * @private
     */
    _setupEventListeners: function() {
      // Voice controls
      document.getElementById('toggle-mic').addEventListener('click', () => {
        this.toggleMicrophone();
      });
      
      document.getElementById('toggle-speakers').addEventListener('click', () => {
        this.toggleDeafen();
      });
      
      document.getElementById('toggle-video').addEventListener('click', () => {
        this._toggleVideo();
      });
      
      document.getElementById('toggle-screen').addEventListener('click', () => {
        if (this.screenStream) {
          this._stopScreenShare();
        } else {
          this._startScreenShare();
        }
      });
      
      document.getElementById('disconnect-call').addEventListener('click', () => {
        this.disconnect();
      });
      
      // Leave voice channel button in header
      document.getElementById('leave-voice').addEventListener('click', () => {
        this.disconnect();
      });
      
      // Bottom panel controls
      document.getElementById('bottom-toggle-mic').addEventListener('click', () => {
        this.toggleMicrophone();
      });
      
      document.getElementById('bottom-toggle-video').addEventListener('click', () => {
        this._toggleVideo();
      });
      
      document.getElementById('bottom-toggle-screen').addEventListener('click', () => {
        if (this.screenStream) {
          this._stopScreenShare();
        } else {
          this._startScreenShare();
        }
      });
      
      document.getElementById('bottom-disconnect').addEventListener('click', () => {
        this.disconnect();
      });
    },
    
    /**
     * Handle changes to the active channel
     * @param {string} channelId - The new active channel ID
     * @private
     */
    _handleActiveChannelChange: function(channelId) {
      if (!channelId) return;
      
      const channel = AppState.getActiveChannel();
      
      // Show appropriate container based on channel type
      if (channel && channel.type === 'voice') {
        // Show voice container
        this.voiceContainer.classList.add('active');
        document.getElementById('text-container').classList.remove('active');
        
        // If user isn't already connected to this specific voice channel, connect them
        if (channelId !== AppState.get('activeVoiceChannel')) {
          this.connect(channelId);
        } else {
          // User is already connected to this voice channel, just update UI
          console.log('Already connected to this voice channel, updating UI only');
          
          // Make sure voice panel is in the body and hidden
          if (this.voiceBottomPanel.parentElement !== document.body) {
            document.body.appendChild(this.voiceBottomPanel);
          }
          this.voiceBottomPanel.classList.remove('active');
        }
        
        // Move voice panel to the video container (remove from members sidebar)
        if (this.voiceBottomPanel.parentElement !== document.body) {
          document.body.appendChild(this.voiceBottomPanel);
        }
        this.voiceBottomPanel.classList.remove('active');
        
        // If mini-player exists, remove it and return to full view
        this._removeMiniPlayer();
      } else if (AppState.get('connectedToVoice')) {
        // User switched to a text channel while in voice
        
        // Show text container
        this.voiceContainer.classList.remove('active');
        document.getElementById('text-container').classList.add('active');
        
        // Move voice panel to the bottom of members sidebar and show it
        const membersSidebar = document.getElementById('members-sidebar');
        if (membersSidebar && this.voiceBottomPanel.parentElement !== membersSidebar) {
          membersSidebar.appendChild(this.voiceBottomPanel);
        }
        this.voiceBottomPanel.classList.add('active');
        
        // If screen sharing is active, create mini player
        if (this.isScreenSharing) {
          this._createMiniPlayer();
        }
      }
    },
    
    /**
     * Handle changes to the active voice channel
     * @param {string} channelId - The new active voice channel ID
     * @private
     */
    _handleActiveVoiceChannelChange: function(channelId) {
      if (!channelId) {
        this.voiceBottomPanel.classList.remove('active');
        return;
      }
      
      const channels = AppState.getChannelsForDen(AppState.get('activeDen')) || [];
      const channel = channels.find(ch => ch.id === channelId);
      
      if (channel) {
        // Update channel name
        this.voiceChannelName.textContent = channel.name;
        this.voiceBottomChannelName.textContent = channel.name;
      }
    },
    
    /**
     * Handle changes to the connection state
     * @param {boolean} isConnected - Whether connected to voice
     * @private
     */
    _handleConnectionStateChange: function(isConnected) {
      this.isConnected = isConnected;
      
      if (!isConnected) {
        // Clean up and remove voice UI
        this._cleanupMediaStreams();
        this.voiceBottomPanel.classList.remove('active');
        
        // Show text container if active channel is voice
        const channel = AppState.getActiveChannel();
        if (channel && channel.type === 'voice') {
          this.voiceContainer.classList.remove('active');
          document.getElementById('text-container').classList.add('active');
        }
      }
    },
    
    /**
     * Handle changes to the microphone mute state
     * @param {boolean} isMuted - Whether the microphone is muted
     * @private
     */
    _handleMicMuteChange: function(isMuted) {
      this.isMuted = isMuted;
      
      // Toggle mute state in UI
      const toggleMicBtn = document.getElementById('toggle-mic');
      const bottomToggleMicBtn = document.getElementById('bottom-toggle-mic');
      
      toggleMicBtn.classList.toggle('muted', isMuted);
      bottomToggleMicBtn.classList.toggle('muted', isMuted);
      
      // Update mic button icons
      if (isMuted) {
        toggleMicBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        `;
        
        bottomToggleMicBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        `;
      } else {
        toggleMicBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        `;
        
        bottomToggleMicBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        `;
      }
      
      // Update local stream
      if (this.localStream) {
        this.localStream.getAudioTracks().forEach(track => {
          track.enabled = !isMuted;
        });
      }
      
      // Update user video element
      const userVideo = document.querySelector('.video-container[data-user-id="' + AppState.get('currentUser').id + '"]');
      if (userVideo) {
        userVideo.classList.toggle('muted', isMuted);
        
        const statusElement = userVideo.querySelector('.video-status');
        if (statusElement) {
          if (isMuted) {
            statusElement.textContent = 'Muted';
          } else if (this.hasVideo) {
            statusElement.textContent = 'Video On';
          } else {
            statusElement.textContent = 'Talking';
          }
        }
      }
    },
    
    /**
     * Handle changes to the deafened state
     * @param {boolean} isDeafened - Whether audio output is deafened
     * @private
     */
    _handleDeafenedChange: function(isDeafened) {
      this.isDeafened = isDeafened;
      
      // Toggle deafened state in UI
      const toggleSpeakersBtn = document.getElementById('toggle-speakers');
      toggleSpeakersBtn.classList.toggle('deafened', isDeafened);
      
      // Update speakers button icon
      if (isDeafened) {
        toggleSpeakersBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 19 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
        `;
      } else {
        toggleSpeakersBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
          </svg>
        `;
      }
      
      // Mute all audio elements if deafened
      document.querySelectorAll('.voice-container audio, .voice-container video').forEach(element => {
        element.muted = isDeafened;
      });
      
      // If deafened, also mute microphone
      if (isDeafened && !this.isMuted) {
        this.toggleMicrophone();
      }
      
      // Update user video element
      const userVideo = document.querySelector('.video-container[data-user-id="' + AppState.get('currentUser').id + '"]');
      if (userVideo) {
        userVideo.classList.toggle('deafened', isDeafened);
      }
    },
    
    /**
     * Handle changes to the video state
     * @param {boolean} hasVideo - Whether video is enabled
     * @private
     */
    _handleVideoChange: function(hasVideo) {
      this.hasVideo = hasVideo;
      
      // Toggle video state in UI
      const toggleVideoBtn = document.getElementById('toggle-video');
      const bottomToggleVideoBtn = document.getElementById('bottom-toggle-video');
      
      toggleVideoBtn.classList.toggle('active', hasVideo);
      bottomToggleVideoBtn.classList.toggle('active', hasVideo);
      
      // Update video button icons
      if (hasVideo) {
        toggleVideoBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
        `;
        
        bottomToggleVideoBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M13.41 6H6.59C5.71 6 5 6.71 5 7.59v8.82c0 .88.71 1.59 1.59 1.59h6.82c.88 0 1.59-.71 1.59-1.59v-8.82C15 6.71 14.29 6 13.41 6Z"></path>
            <path d="m17 15 4 2V7l-4 2"></path>
          </svg>
        `;
      } else {
        toggleVideoBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M13.41 6H6.59C5.71 6 5 6.71 5 7.59v8.82c0 .88.71 1.59 1.59 1.59h6.82c.88 0 1.59-.71 1.59-1.59v-8.82C15 6.71 14.29 6 13.41 6Z"></path>
            <path d="m17 15 4 2V7l-4 2"></path>
          </svg>
        `;
        
        bottomToggleVideoBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M13.41 6H6.59C5.71 6 5 6.71 5 7.59v8.82c0 .88.71 1.59 1.59 1.59h6.82c.88 0 1.59-.71 1.59-1.59v-8.82C15 6.71 14.29 6 13.41 6Z"></path>
            <path d="m17 15 4 2V7l-4 2"></path>
          </svg>
        `;
      }
      
      // Update local video stream
      this._updateVideoStream(hasVideo);
    },
    
    /**
     * Handle changes to the screen sharing state
     * @param {boolean} isScreenSharing - Whether screen sharing is enabled
     * @private
     */
    _handleScreenShareChange: function(isScreenSharing) {
      // Update internal state
      this.isScreenSharing = isScreenSharing;
      console.log('Handling screen share change. Is screen sharing:', isScreenSharing);
      
      // Toggle screen sharing state in UI buttons
      const toggleScreenBtn = document.getElementById('toggle-screen');
      const bottomToggleScreenBtn = document.getElementById('bottom-toggle-screen');
      
      if (toggleScreenBtn) {
        toggleScreenBtn.classList.toggle('active', isScreenSharing);
      }
      
      if (bottomToggleScreenBtn) {
        bottomToggleScreenBtn.classList.toggle('active', isScreenSharing);
      }
      
      // Get the screen shares container
      const screenSharesContainer = document.getElementById('screen-shares');
      
      // If screen sharing enabled but container doesn't exist, create it
      if (isScreenSharing && !screenSharesContainer) {
        console.log('Creating screen share container because it does not exist');
        this._createScreenShareElement();
      } 
      // Otherwise update visibility of existing container
      else if (screenSharesContainer) {
        console.log('Setting screen shares container display to:', isScreenSharing ? 'block' : 'none');
        screenSharesContainer.style.display = isScreenSharing ? 'block' : 'none';
        screenSharesContainer.style.visibility = isScreenSharing ? 'visible' : 'hidden';
        screenSharesContainer.style.width = '50%';
        screenSharesContainer.style.margin = '0 auto';
        screenSharesContainer.style.height = 'fit-content';
      }
      
      // If screen sharing is enabled, make sure we force UI update
      if (isScreenSharing) {
        setTimeout(() => {
          const container = document.getElementById('screen-shares');
          if (container) {
            console.log('Forcing screen share container visibility after timeout');
            container.style.display = 'block';
            container.style.visibility = 'visible';
            container.style.opacity = '1';
            
            // Also check if we have a video element and it's visible
            const video = document.getElementById('screen-share-video');
            if (video) {
              video.style.display = 'block';
              
              // Force a reflow/repaint
              video.style.width = '99%';
              setTimeout(() => {
                video.style.width = '100%';
              }, 10);
            }
          }
        }, 100);
      }
    },
    
    /**
     * Connect to a voice channel
     * @param {string} channelId - The channel ID to connect to
     */
    connect: function(channelId) {
      const channel = AppState.getActiveChannel();
      if (!channel || channel.type !== 'voice') return;
      
      // If already connected to this channel, don't reconnect
      if (this.isConnected && AppState.get('activeVoiceChannel') === channelId) {
        console.log('Already connected to voice channel:', channelId);
        return;
      }
      
      // If connected to a different channel, disconnect first
      if (this.isConnected) {
        // Don't call disconnect() as that would reset everything
        // Just clean up current connection without resetting state
        this._cleanupMediaStreams();
        console.log('Switching from one voice channel to another');
      }
      
      // Set channel name
      this.voiceChannelName.textContent = channel.name;
      this.voiceBottomChannelName.textContent = channel.name;
      
      // Show voice container
      this.voiceContainer.classList.add('active');
      document.getElementById('text-container').classList.remove('active');
      
      // Make sure voice panel is in the body and hidden 
      // (we'll use in-video controls instead)
      if (this.voiceBottomPanel.parentElement !== document.body) {
        document.body.appendChild(this.voiceBottomPanel);
      }
      this.voiceBottomPanel.classList.remove('active');
      
      // Set state using AppState's joinVoiceChannel method instead of setting directly
      // This ensures the connected users count is properly incremented
      AppState.joinVoiceChannel(channelId);
      
      // Don't reset these states if already connected
      if (!this.isConnected) {
        // These states are now handled by joinVoiceChannel
        // AppState.set('micMuted', false);
        // AppState.set('deafened', false);
        // AppState.set('videoEnabled', false);
        // AppState.set('screenShareEnabled', false);
      }
      
      // Create user video elements
      this._createVideoElements();
      
      // Initialize audio/video streams if not already connected
      if (!this.localStream) {
        this._initializeMedia();
      }
      
      // In a real app, would connect to WebRTC/WebSocket here
      console.log('Connected to voice channel:', channelId);
      
      // Update channel list to show connected users
      ChannelManager.renderChannels();
    },
    
    /**
     * Disconnect from the current voice channel
     */
    disconnect: function() {
      if (!this.isConnected) return;
      
      // Clean up media streams
      this._cleanupMediaStreams();
      
      // Reset state using AppState's leaveVoiceChannel method
      // This ensures the connected users count is properly decremented
      AppState.leaveVoiceChannel();
      
      // Clear video grid
      this.videoGrid.innerHTML = '';
      
      // Hide voice container if active
      if (this.voiceContainer.classList.contains('active')) {
        this.voiceContainer.classList.remove('active');
        document.getElementById('text-container').classList.add('active');
      }
      
      // Hide and move bottom panel back to body
      this.voiceBottomPanel.classList.remove('active');
      if (this.voiceBottomPanel.parentElement !== document.body) {
        document.body.appendChild(this.voiceBottomPanel);
      }
      
      console.log('Disconnected from voice channel');
      
      // Update channel list to remove connected users
      ChannelManager.renderChannels();
    },
    
    /**
     * Toggle microphone mute state
     */
    toggleMicrophone: function() {
      AppState.set('micMuted', !this.isMuted);
    },
    
    /**
     * Toggle speakers deafened state
     */
    toggleDeafen: function() {
      AppState.set('deafened', !this.isDeafened);
    },
    
    /**
     * Toggle video/camera
     * @private
     */
    _toggleVideo: async function() {
      try {
        if (this.videoStream) {
          // Stop video stream
          this._stopVideo();
        } else {
          // Start video stream
          await this._startVideo();
        }
      } catch (error) {
        console.error('Error toggling video:', error);
      }
    },
    
    /**
     * Toggle screen sharing state
     */
    toggleScreenShare: function() {
      AppState.set('screenShareEnabled', !this.isScreenSharing);
    },
    
    /**
     * Initialize media streams
     * @private
     */
    _initializeMedia: function() {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        Utils.showToast('Your browser does not support voice/video chat', 'error');
        return;
      }
      
      // Request microphone access
      this._initializeMicrophone();
    },
    
    /**
     * Initialize microphone
     * @private
     */
    _initializeMicrophone: async function() {
      try {
        // Request microphone access
        if (window.media && window.media.getAudioStream) {
          try {
            console.log("Getting audio stream through context bridge");
            // Use direct navigator.mediaDevices.getUserMedia instead of going through the contextBridge
            this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log("Successfully obtained audio stream directly");
          } catch (directError) {
            console.error("Direct access failed, trying through context bridge:", directError);
            try {
              const stream = await window.media.getAudioStream();
              console.log("Got stream through context bridge:", stream);
              if (stream) {
                this.localStream = stream;
                console.log("Using stream from context bridge");
              } else {
                throw new Error("Context bridge returned empty stream");
              }
            } catch (bridgeError) {
              console.error("Context bridge access failed:", bridgeError);
              throw bridgeError;
            }
          }
        } else {
          console.log("No media bridge, using direct navigator.mediaDevices");
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        
        // Set up voice activity detection
        this._setupVoiceActivityDetection();
        
        console.log('Microphone initialized successfully');
      } catch (error) {
        console.error('Error accessing microphone:', error);
        Utils.showToast('Could not access microphone. Please check permissions.', 'error');
        
        // Create empty stream for UI purposes
        this.localStream = new MediaStream();
      }
    },
    
    /**
     * Update video stream
     * @param {boolean} enable - Whether to enable video
     * @private
     */
    _updateVideoStream: function(enable) {
      this.hasVideo = enable;
      
      // Update user interface
      const videoContainer = document.querySelector(`.voice-chat-video-container[data-user-id="${this.currentUserId}"]`);
      if (videoContainer) {
        if (enable) {
          // Add video element if it doesn't exist
          if (!videoContainer.querySelector('.voice-chat-video')) {
              const video = document.createElement('video');
              video.autoplay = true;
            video.muted = true;
            video.className = 'voice-chat-video';
            videoContainer.appendChild(video);
            
            // In a real implementation, we would get the user's camera stream
            // and set it as the source for this video element
            console.log('Video enabled');
          }
        } else {
          // Remove video element if it exists
          const videoElement = videoContainer.querySelector('.voice-chat-video');
          if (videoElement) {
            videoElement.remove();
            console.log('Video disabled');
          }
        }
      }
    },
    
    /**
     * Start video/camera
     * @private
     */
    _startVideo: async function() {
      try {
        // Get camera stream
        this.videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: false // Audio is handled separately
        });
        
        console.log('Camera started');
        
        // Update UI
        const toggleVideoBtn = document.getElementById('toggle-video');
        if (toggleVideoBtn) {
          toggleVideoBtn.classList.add('active');
        }
        
        const bottomToggleVideoBtn = document.getElementById('bottom-toggle-video');
        if (bottomToggleVideoBtn) {
          bottomToggleVideoBtn.classList.add('active');
        }
        
        // Update video element
        const videoContainer = document.getElementById('local-video-container');
        if (videoContainer) {
          const videoElement = videoContainer.querySelector('video');
          if (videoElement) {
            videoElement.srcObject = this.videoStream;
            videoElement.style.display = 'block';
          }
          
          // Hide avatar
          const avatar = videoContainer.querySelector('.participant-avatar');
          if (avatar) {
            avatar.style.display = 'none';
          }
        }
        
        // Re-create the entire UI to ensure proper layout
        this._createVideoElements();
      } catch (error) {
        console.error('Error starting camera:', error);
        alert('Failed to start camera: ' + error.message);
      }
    },
    
    /**
     * Stop video/camera
     * @private
     */
    _stopVideo: function() {
      try {
        // Stop all tracks in the video stream
        if (this.videoStream) {
          this.videoStream.getTracks().forEach(track => track.stop());
          this.videoStream = null;
        }
        
        console.log('Camera stopped');
        
        // Update UI
        const toggleVideoBtn = document.getElementById('toggle-video');
        if (toggleVideoBtn) {
          toggleVideoBtn.classList.remove('active');
        }
        
        const bottomToggleVideoBtn = document.getElementById('bottom-toggle-video');
        if (bottomToggleVideoBtn) {
          bottomToggleVideoBtn.classList.remove('active');
        }
        
        // Update video element
        const videoContainer = document.getElementById('local-video-container');
        if (videoContainer) {
          const videoElement = videoContainer.querySelector('video');
          if (videoElement) {
            videoElement.srcObject = null;
            videoElement.style.display = 'none';
          }
          
          // Show avatar
          const avatar = videoContainer.querySelector('.participant-avatar');
          if (avatar) {
            avatar.style.display = 'flex';
          }
        }
        
        // Re-create the entire UI to ensure proper layout
        this._createVideoElements();
      } catch (error) {
        console.error('Error stopping camera:', error);
      }
    },
    
    /**
     * Ensure the video grid has the proper structure for screen sharing
     * @private
     */
    _ensureVideoGridStructure: function() {
      console.log('Ensuring video grid structure is correct for screen sharing');
      
      // Find or create the video grid
      let videoGrid = document.querySelector('.video-grid');
      if (!videoGrid) {
        console.error('Video grid not found, cannot set up screen sharing');
        return;
      }
      
      // Find or create the screen shares container
      let screenSharesContainer = document.getElementById('screen-shares');
      if (!screenSharesContainer) {
        // Need to create it
        screenSharesContainer = document.createElement('div');
        screenSharesContainer.id = 'screen-shares';
        screenSharesContainer.className = 'screen-shares-section';
        screenSharesContainer.style.width = '50%';
        screenSharesContainer.style.margin = '0 auto';
        screenSharesContainer.style.height = 'fit-content';
        // Insert at the beginning
        videoGrid.insertBefore(screenSharesContainer, videoGrid.firstChild);
        console.log('Created screen shares container in video grid');
      }
      
      // Make sure it's visible if we're screen sharing
      if (this.isScreenSharing) {
        screenSharesContainer.style.display = 'grid';
        screenSharesContainer.style.visibility = 'visible';
        screenSharesContainer.style.opacity = '1';
        screenSharesContainer.style.zIndex = '10';
        console.log('Screen shares container is now visible');
      } else {
        screenSharesContainer.style.display = 'none';
        console.log('Screen shares container is hidden (not screen sharing)');
      }
      
      return screenSharesContainer;
    },
    
    /**
     * Start screen sharing
     * @returns {Promise<void>}
     */
    _startScreenShare: async function() {
      try {
        // Ensure proper video grid structure first
        this._ensureVideoGridStructure();
        
        // Open screen selector to let user choose what to share
        window.ScreenSelector.open(async (selectedSource, options) => {
          try {
            if (!selectedSource) return;

            console.log('Selected source for screen sharing:', selectedSource);
            
            let stream = null;
            
            // Handle device sources (cameras)
            if (selectedSource.type === 'device') {
              console.log('Using getUserMedia for camera device');
              try {
                stream = await navigator.mediaDevices.getUserMedia({
                  video: {
                    deviceId: { exact: selectedSource.id }
                  }
                });
                console.log('Successfully acquired camera stream');
              } catch (err) {
                console.error('Camera capture failed:', err);
                throw new Error('Failed to capture camera: ' + err.message);
              }
            } else {
              // Try multiple methods for screen capture, starting with the simplest
              console.log('Attempting to capture screen/window source:', selectedSource.id);
              
              // Method 1: Try direct getUserMedia with constraints
              try {
                console.log('Method 1: Using getUserMedia with desktop constraints');
                const constraints = {
                  audio: options?.captureAudio || false,
                  video: {
                    mandatory: {
                      chromeMediaSource: 'desktop',
                      chromeMediaSourceId: selectedSource.id
                    }
                  }
                };
                
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('Method 1 successful: Got stream with getUserMedia desktop constraints');
              } catch (method1Error) {
                console.error('Method 1 failed:', method1Error);
                
                // Method 2: Try electron.captureScreen from preload
                if (!stream && window.electron && window.electron.captureScreen) {
                  try {
                    console.log('Method 2: Using electron.captureScreen');
                    stream = await window.electron.captureScreen(selectedSource.id, {
                      captureAudio: options?.captureAudio || false
                    });
                    console.log('Method 2 successful: Got stream with electron.captureScreen');
                  } catch (method2Error) {
                    console.error('Method 2 failed:', method2Error);
                  }
                }
                
                // Method 3: Last resort - use getDisplayMedia
                if (!stream) {
                  try {
                    console.log('Method 3: Using getDisplayMedia as fallback');
                    stream = await navigator.mediaDevices.getDisplayMedia({
                      video: true,
                      audio: options?.captureAudio || false
                    });
                    console.log('Method 3 successful: Got stream with getDisplayMedia');
                  } catch (method3Error) {
                    console.error('Method 3 failed:', method3Error);
                    throw new Error('All screen capture methods failed: ' + method3Error.message);
                  }
                }
              }
            }
            
            // Validate the stream
            if (!stream) {
              throw new Error('Failed to obtain a valid media stream');
            }
            
            // Ensure it's a MediaStream
            if (!(stream instanceof MediaStream)) {
              console.error('Not a MediaStream object:', stream);
              throw new Error('Invalid media stream type');
            }
            
            // Check for video tracks
            const videoTracks = stream.getVideoTracks();
            if (!videoTracks || videoTracks.length === 0) {
              console.error('Stream has no video tracks');
              throw new Error('Invalid stream: no video tracks');
            }
            
            console.log('Final screen sharing stream is valid with', videoTracks.length, 'video tracks');
            
            // Log details of the video tracks to help with debugging
            videoTracks.forEach(track => {
              console.log('Video track:', {
                id: track.id,
                label: track.label,
                enabled: track.enabled,
                readyState: track.readyState
              });
            });

            // Set the screen stream
            this.screenStream = stream;
            console.log('Screen sharing successfully started with:', selectedSource.name);

            // Store screen sharer info
            this.screenSharerName = this.userName || 'You';
            this.screenSharerSourceName = selectedSource.name;

            // Set the screen sharing state first 
            this.isScreenSharing = true;
            
            // Make sure to call setupScreenShareVideo which will recreate the elements
            this.setupScreenShareVideo();
            
            // Make sure the UI state is updated
            this._handleScreenShareChange(true);
            
            // Update UI buttons
            const toggleScreenBtn = document.getElementById('toggle-screen');
            if (toggleScreenBtn) {
              toggleScreenBtn.classList.add('active');
            }

            const bottomToggleScreenBtn = document.getElementById('bottom-toggle-screen');
            if (bottomToggleScreenBtn) {
              bottomToggleScreenBtn.classList.add('active');
            }

            // Listen for the end of screen sharing
            this.screenStream.getTracks().forEach(track => {
              track.addEventListener('ended', () => {
                this._stopScreenShare();
              });
            });
            
            // Set a timeout to verify visibility
            setTimeout(() => {
              const screenSharesContainer = document.getElementById('screen-shares');
              if (screenSharesContainer) {
                if (screenSharesContainer.style.display === 'none') {
                  console.log('Fixing screen shares container visibility after timeout');
                  screenSharesContainer.style.display = 'block';
                }
              }
              
              // Force layout refresh
              const videoElement = document.getElementById('screen-share-video');
              if (videoElement) {
                // Update dimensions based on actual video size
                if (videoElement.videoWidth && videoElement.videoHeight) {
                  console.log('Video dimensions available, updating container', {
                    width: videoElement.videoWidth,
                    height: videoElement.videoHeight
                  });
                  this._updateContainerDimensions(videoElement);
                } else {
                  console.log('Video dimensions not yet available, waiting for metadata');
                  // If video dimensions aren't available yet, wait for metadata
                  if (!videoElement._hasLoadedMetadataListener) {
                    videoElement._hasLoadedMetadataListener = true;
                    videoElement.addEventListener('loadedmetadata', () => {
                      this._updateContainerDimensions(videoElement);
                    }, { once: true });
                  }
                }
                
                // Force a reflow to ensure dimensions are updated
                videoElement.style.width = '99%';
                setTimeout(() => {
                  videoElement.style.width = '100%';
                  // Try updating dimensions again after a slight delay
                  setTimeout(() => this._updateContainerDimensions(videoElement), 300);
                }, 10);
              }
            }, 500);
          } catch (error) {
            console.error('Error starting screen share:', error);
            alert('Failed to start screen sharing: ' + error.message);
          }
        });
      } catch (error) {
        console.error('Error in _startScreenShare:', error);
        alert('Failed to start screen sharing: ' + error.message);
      }
    },
    
    /**
     * Helper method to get the width based on resolution setting
     * @private
     */
    _getResolutionWidth: function(resolution) {
      switch(resolution) {
        case '720': return 1280;
        case '1080': return 1920;
        case '1440': return 2560;
        case 'source': return 3840; // Use a high value for source resolution
        default: return 1920; // Default to 1080p
      }
    },
    
    /**
     * Helper method to get the height based on resolution setting
     * @private
     */
    _getResolutionHeight: function(resolution) {
      switch(resolution) {
        case '720': return 720;
        case '1080': return 1080;
        case '1440': return 1440;
        case 'source': return 2160; // Use a high value for source resolution
        default: return 1080; // Default to 1080p
      }
    },
    
    /**
     * Stop screen sharing
     * @private
     */
    _stopScreenShare: function() {
      try {
        console.log('Stopping screen sharing');
        
        // Stop all tracks in the screen stream
        if (this.screenStream) {
          this.screenStream.getTracks().forEach(track => {
            track.stop();
          });
          this.screenStream = null;
        }
        
        // Reset sharing state
        this.screenSharerName = null;
        this.screenSharerSourceName = null;
        this.isScreenSharing = false;
        
        // Get video element and reset
        const videoElement = document.getElementById('screen-share-video');
        if (videoElement) {
          videoElement.srcObject = null;
          videoElement.style.display = 'none';
        }
        
        // Remove resize listener
        if (this._resizeListener) {
          window.removeEventListener('resize', this._resizeListener);
          this._resizeListener = null;
        }
        
        // Show placeholder
        const placeholder = document.getElementById('screen-share-placeholder');
        if (placeholder) {
          placeholder.style.display = 'flex';
        }
        
        // Hide screen share container and sections
      const screenShareContainer = document.querySelector('.screen-share-container');
      if (screenShareContainer) {
        screenShareContainer.style.display = 'none';
        }
        
        const screenSharesContainer = document.getElementById('screen-shares');
        if (screenSharesContainer) {
          screenSharesContainer.style.display = 'none';
        }
        
        const screenSharesSection = document.querySelector('.screen-shares-section');
        if (screenSharesSection) {
          screenSharesSection.style.display = 'none';
        }
        
        // Reset screen sharer info
        const sharerNameElement = document.getElementById('screen-sharer-name');
        if (sharerNameElement) {
          sharerNameElement.textContent = '';
        }
        
        const sharerSourceElement = document.getElementById('screen-sharer-source');
        if (sharerSourceElement) {
          sharerSourceElement.textContent = '';
        }
        
        // Remove any play buttons
        const playButtons = document.querySelectorAll('.screen-share-play-btn');
        playButtons.forEach(button => button.remove());
        
        // Remove active classes from control buttons
        const toggleScreenBtn = document.getElementById('toggle-screen');
        if (toggleScreenBtn) {
          toggleScreenBtn.classList.remove('active');
        }
        
        const bottomToggleScreenBtn = document.getElementById('bottom-toggle-screen');
        if (bottomToggleScreenBtn) {
          bottomToggleScreenBtn.classList.remove('active');
        }
        
        // Update participant UI
        const participantContainers = document.querySelectorAll('.participant-container');
        participantContainers.forEach(container => {
          container.classList.remove('with-screen-share');
        });
        
        console.log('Screen sharing stopped successfully');
      } catch (error) {
        console.error('Error stopping screen share:', error);
      }
    },
    
    /**
     * Set up voice activity detection
     * @private
     */
    _setupVoiceActivityDetection: function() {
      // Ensure we have a valid MediaStream with audio tracks
      if (!this.localStream || typeof this.localStream.getAudioTracks !== 'function') {
        console.warn('Invalid audio stream or missing getAudioTracks method');
        return;
      }
      
      const audioTracks = this.localStream.getAudioTracks();
      if (!audioTracks || !audioTracks.length) {
        console.warn('No audio tracks found in stream');
        return;
      }
      
      // Create audio context
      if (!this.audioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
      }
      
      // Create analyser
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.minDecibels = -65;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.85;
      
      // Connect microphone to analyser
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      source.connect(analyser);
      
      // Set up detection interval
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let speaking = false;
      
      this.speakingDetectionInterval = setInterval(() => {
        if (this.isMuted) {
          // Don't detect if muted
          if (speaking) {
            speaking = false;
            this._updateSpeakingState(false);
          }
          return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate volume average
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Check if speaking
        const isSpeaking = average > 20; // Threshold for speaking
        
        if (isSpeaking !== speaking) {
          speaking = isSpeaking;
          this._updateSpeakingState(speaking);
        }
      }, 100);
    },
    
    /**
     * Update speaking state in UI
     * @param {boolean} isSpeaking - Whether the user is speaking
     * @private
     */
    _updateSpeakingState: function(isSpeaking) {
      // Update video container
      const userContainer = document.querySelector(`.participant-tile[data-user-id="${AppState.get('currentUser').id}"]`);
      if (userContainer) {
        userContainer.classList.toggle('speaking', isSpeaking);
        
        // Show/hide speaking indicator
        let indicator = userContainer.querySelector('.speaking-indicator-ring');
        
        if (isSpeaking) {
          if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'speaking-indicator-ring';
            indicator.style.position = 'absolute';
            indicator.style.top = '-3px';
            indicator.style.left = '-3px';
            indicator.style.right = '-3px';
            indicator.style.bottom = '-3px';
            indicator.style.borderRadius = '10px';
            indicator.style.border = '2px solid #3BA55C';
            indicator.style.boxShadow = '0 0 8px rgba(59, 165, 92, 0.8)';
            indicator.style.zIndex = '1';
            indicator.style.pointerEvents = 'none';
            userContainer.appendChild(indicator);
          }
        } else if (indicator) {
          indicator.remove();
        }
      }
    },
    
    /**
     * Create video elements for users in the voice channel
     * @private
     */
    _createVideoElements: function() {
      // Clear existing elements
      this.videoGrid.innerHTML = '';
      
      // Get current den and channel
      const denId = AppState.get('activeDen');
      const channelId = AppState.get('activeVoiceChannel');
      if (!denId || !channelId) return;
      
      // Get members for this den
      const members = AppState.getMembersForDen(denId);
      if (!members || members.length === 0) return;
      
      // Simulate connected users based on channel data
      const channel = AppState.getActiveChannel();
      if (!channel) return;
      
      // Number of connected users
      const connectedUsers = channel.connectedUsers || 0;
      
      // Current user is always connected
      const currentUser = this._ensureUserObject(AppState.get('currentUser'));
      
      // Add current user's state properties from voice manager
      currentUser.isMuted = this.isMuted;
      currentUser.isDeafened = this.isDeafened;
      currentUser.hasVideo = this.hasVideo;
      
      const connectedMembers = [currentUser];
      
      // Add random members to simulate other users
      // In a real app, this would be based on who is actually connected
      for (let i = 0; i < Math.min(connectedUsers - 1, members.length); i++) {
        // Skip current user
        if (members[i].id === currentUser.id) continue;
        
        // Ensure member has all required properties
        const member = this._ensureUserObject(members[i]);
        connectedMembers.push(member);
        
        // Stop when we have enough users
        if (connectedMembers.length >= connectedUsers) break;
      }
      
      // Create Discord-style layout
      // 1. Screen shares section
      const screenSharesSection = document.createElement('div');
      screenSharesSection.className = 'screen-shares-section';
      
      // Create screen share element (initially hidden)
      this._createScreenShareElement();
      
      // In a real implementation, we would get all active screen shares here
      // For now, we'll simulate this with our single screen share
      const screenShareContainer = document.querySelector('.screen-share-container');
      if (screenShareContainer) {
        // Add to screen shares section
        screenSharesSection.appendChild(screenShareContainer);
        
        // If screen sharing is active, make sure it's visible
        if (this.isScreenSharing) {
          screenShareContainer.style.display = 'block';
          screenSharesSection.style.display = 'grid';
        } else {
          screenShareContainer.style.display = 'none';
          screenSharesSection.style.display = 'none';
        }
      }
      
      this.videoGrid.appendChild(screenSharesSection);
      
      // 2. Participants section (responsive grid layout)
      const participantsSection = document.createElement('div');
      participantsSection.className = 'participant-section'; // Changed from 'participants-section' to 'participant-section'
      
      // Set styles for responsive grid layout
      participantsSection.style.display = 'grid';
      participantsSection.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
      participantsSection.style.gap = '12px';
      participantsSection.style.justifyContent = 'center';
      participantsSection.style.width = '100%';
      participantsSection.style.padding = '12px';
      participantsSection.style.boxSizing = 'border-box';
      
      // Create user containers for all connected members
      connectedMembers.forEach(member => {
        const userElement = this._createUserVideoElement(member);
        if (userElement) {
          participantsSection.appendChild(userElement);
        }
      });
      
      // Force a reflow to ensure styles are applied immediately
      void participantsSection.offsetHeight;
      
      this.videoGrid.appendChild(participantsSection);
    },
    
    /**
     * Create a user video element
     * @param {Object} user - The user object
     * @returns {HTMLElement} - The video container element
     * @private
     */
    _createUserVideoElement: function(user) {
      // Create container with updated layout
      const container = document.createElement('div');
      container.className = 'participant-tile'; // Changed from 'voice-chat-video-container' to 'participant-tile'
      container.dataset.userId = user.id;
      
      // Set base styles for the participant tile
      container.style.position = 'relative';
      container.style.backgroundColor = '#36393f';
      container.style.borderRadius = '8px';
      container.style.overflow = 'hidden';
      container.style.aspectRatio = '16/9';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
      container.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
      
      // Default avatar if not provided
      const defaultAvatar = 'src/assets/images/default-avatar.svg';
      const avatarUrl = user.avatar || defaultAvatar;
      const initials = this._getInitials(user.username);
      
      // Create the avatar element - will show image if available, otherwise initials
      const avatarElement = document.createElement('div');
      avatarElement.className = 'voice-chat-avatar';
      
      // Update avatar styles to make it smaller and circular
      avatarElement.style.width = '80px';  // Smaller fixed width
      avatarElement.style.height = '80px'; // Smaller fixed height
      avatarElement.style.borderRadius = '50%'; // Perfect circle
      avatarElement.style.margin = 'auto'; // Center in the tile
      avatarElement.style.display = 'flex';
      avatarElement.style.alignItems = 'center';
      avatarElement.style.justifyContent = 'center';
      avatarElement.style.fontSize = '32px'; // Smaller font size for initials
      avatarElement.style.fontWeight = 'bold';
      avatarElement.style.color = 'white';
      avatarElement.style.textShadow = '0 2px 4px rgba(0, 0, 0, 0.3)';
      avatarElement.style.border = '2px solid rgba(255, 255, 255, 0.1)'; // Subtle border
      avatarElement.style.boxSizing = 'border-box';
      avatarElement.style.overflow = 'hidden'; // Ensure image is contained within circle
      
      if (avatarUrl && avatarUrl !== defaultAvatar) {
        // Create image element
        const avatarImg = document.createElement('img');
        avatarImg.src = avatarUrl;
        avatarImg.alt = user.username;
        avatarImg.style.width = '100%';
        avatarImg.style.height = '100%';
        avatarImg.style.objectFit = 'cover';
        
        // Handle image load error
        avatarImg.onerror = function() {
          this.style.display = 'none';
          avatarElement.innerHTML = initials;
        };
        
        avatarElement.appendChild(avatarImg);
      } else {
        // Use initials if no avatar
        avatarElement.textContent = initials;
        
        // Random background color based on username for avatar
        const colors = ['#5865F2', '#3BA55C', '#FAA61A', '#ED4245', '#EB459E'];
        const colorIndex = Math.abs(this._hashString(user.username)) % colors.length;
        avatarElement.style.backgroundColor = colors[colorIndex];
      }
      
      container.appendChild(avatarElement);
      
      // Add user info section at the bottom
      const userInfo = document.createElement('div');
      userInfo.className = 'voice-chat-user-info';
      
      // Add username
      const username = document.createElement('div');
      username.className = 'voice-chat-username';
      username.textContent = user.username;
      userInfo.appendChild(username);
      
      // Add status indicators (muted, deafened, etc.)
      const statusContainer = document.createElement('div');
      statusContainer.className = 'voice-chat-status';
      
      if (user.isMuted) {
        const muteIcon = document.createElement('span');
        muteIcon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        `;
        statusContainer.appendChild(muteIcon);
      }
      
      if (user.isDeafened) {
        const deafenIcon = document.createElement('span');
        deafenIcon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
        `;
        statusContainer.appendChild(deafenIcon);
      }
      
      userInfo.appendChild(statusContainer);
      container.appendChild(userInfo);
      
      // Add video element if user has video enabled
      if (user.hasVideo) {
        const videoElement = document.createElement('video');
        videoElement.className = 'voice-chat-video';
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.muted = user.id !== this.currentUserId; // Only mute others' videos
        
        // Position the video behind the other elements
        videoElement.style.position = 'absolute';
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        videoElement.style.zIndex = '0';
        
        // Place video at the beginning of the container
        container.insertBefore(videoElement, container.firstChild);
        
        // If this is the current user, set the local stream as source
        if (user.id === this.currentUserId && this.localStream) {
          videoElement.srcObject = this.localStream;
        }
      }
      
      return container;
    },
    
    /**
     * Calculate a simple hash for a string
     * @param {string} str - The string to hash
     * @returns {number} - A numeric hash value
     * @private
     */
    _hashString: function(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash;
    },
    
    /**
     * Show context menu for a user
     * Create a mini player for screen sharing when user is not in voice view
     * @param {Event} event - The context menu event
     * @param {Object} user - The user object
     * @private
     */
    _showContextMenu: function(event, user) {
      event.preventDefault();
      event.stopPropagation();
      
      // Ensure user has all required properties
      user = this._ensureUserObject(user);
      
      // Remove any existing context menu
      this._hideContextMenu();
      
      // Create context menu element
      const contextMenu = document.createElement('div');
      contextMenu.className = 'voice-context-menu';
      
      // Position the context menu at cursor position
      contextMenu.style.position = 'absolute';
      contextMenu.style.left = `${event.clientX}px`;
      contextMenu.style.top = `${event.clientY}px`;
      contextMenu.style.zIndex = '1000';
      
      // Generate menu items
      let menuItems = '';
      
      // Check if this is the current user
      const isCurrentUser = user.id === this.currentUserId;
      
      if (isCurrentUser) {
        // Current user options
        menuItems = `
          <div class="context-menu-item" data-action="settings">Settings</div>
          <div class="context-menu-item" data-action="share-screen">
            ${this.isScreenSharing ? 'Stop Sharing Screen' : 'Share Screen'}
          </div>
          <div class="context-menu-item" data-action="toggle-video">
            ${this.hasVideo ? 'Turn Off Video' : 'Turn On Video'}
        </div>
        `;
      } else {
        // Other user options
        menuItems = `
          <div class="context-menu-item" data-action="message" data-user-id="${user.id}">Message</div>
          <div class="context-menu-item" data-action="profile" data-user-id="${user.id}">View Profile</div>
          <div class="context-menu-item" data-action="block" data-user-id="${user.id}">Block</div>
        `;
        
        // Volume control
        menuItems += `
          <div class="context-menu-volume">
            <span>Volume: </span>
            <input type="range" class="context-menu-volume-slider" 
                   min="0" max="100" value="100" data-user-id="${user.id}">
        </div>
      `;
      
        // Add moderator options if user has permissions
        if (this._userHasModPermissions()) {
          menuItems += `
            <div class="context-menu-separator"></div>
            <div class="context-menu-section">Moderator Actions</div>
            <div class="context-menu-item" data-action="mute" data-user-id="${user.id}">Mute</div>
            <div class="context-menu-item" data-action="deafen" data-user-id="${user.id}">Deafen</div>
            <div class="context-menu-item" data-action="kick" data-user-id="${user.id}">Kick</div>
            <div class="context-menu-item" data-action="ban" data-user-id="${user.id}">Ban</div>
            <div class="context-menu-item" data-action="promote" data-user-id="${user.id}">Promote</div>
          `;
        }
      }
      
      // Set the menu items
      contextMenu.innerHTML = menuItems;
      
      // Append to document body
      document.body.appendChild(contextMenu);
      
      // Setup event listeners for the menu items
      this._setupContextMenuListeners(contextMenu);
      
      // Create and store a bound handler for click outside
      this.boundClickOutsideHandler = this._handleClickOutsideContextMenu.bind(this);
      
      // Add click outside handler after a small delay to prevent immediate closing
      setTimeout(() => {
        document.addEventListener('click', this.boundClickOutsideHandler);
        document.addEventListener('contextmenu', this.boundClickOutsideHandler);
      }, 10);
      
      return false; // Prevent default context menu
    },
    
    /**
     * Remove the mini player
     * @private
     */
    _removeMiniPlayer: function() {
      if (this.miniPlayer && this.miniPlayer.parentNode) {
        // Store current position before removing
        const rect = this.miniPlayer.getBoundingClientRect();
        this.miniPlayerPosition.x = rect.left;
        this.miniPlayerPosition.y = rect.top;
        
        // Clean up and remove
        const video = this.miniPlayer.querySelector('video');
        if (video) {
          video.srcObject = null;
        }
        this.miniPlayer.parentNode.removeChild(this.miniPlayer);
        this.miniPlayer = null;
      }
    },
    
    /**
     * Make the mini player draggable
     * @param {HTMLElement} miniPlayer - The mini player element
     * @param {HTMLElement} handle - The element to use as handle for dragging
     * @private
     */
    _makeMiniPlayerDraggable: function(miniPlayer, handle) {
      let offsetX = 0;
      let offsetY = 0;
      
      const startDrag = (e) => {
        e.preventDefault();
        
        // Get the initial mouse coordinates
        const startX = e.clientX;
        const startY = e.clientY;
        
        // Get the initial mini player coordinates
        const rect = miniPlayer.getBoundingClientRect();
        offsetX = startX - rect.left;
        offsetY = startY - rect.top;
        
        // Add event listeners for drag and end
        document.addEventListener('mousemove', dragMove);
        document.addEventListener('mouseup', dragEnd);
        
        // Add dragging class
        miniPlayer.classList.add('dragging');
      };
      
      const dragMove = (e) => {
        e.preventDefault();
        
        // Calculate new position
        const newX = e.clientX - offsetX;
        const newY = e.clientY - offsetY;
        
        // Apply constraints to keep within viewport
        const maxX = window.innerWidth - miniPlayer.offsetWidth;
        const maxY = window.innerHeight - miniPlayer.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));
        
        // Set new position
        miniPlayer.style.left = `${constrainedX}px`;
        miniPlayer.style.top = `${constrainedY}px`;
        
        // Store position
        this.miniPlayerPosition.x = constrainedX;
        this.miniPlayerPosition.y = constrainedY;
      };
      
      const dragEnd = (e) => {
        // Remove event listeners
        document.removeEventListener('mousemove', dragMove);
        document.removeEventListener('mouseup', dragEnd);
        
        // Remove dragging class
        miniPlayer.classList.remove('dragging');
      };
      
      // Add event listener to start drag
      handle.addEventListener('mousedown', startDrag);
    },
    
    /**
     * Clean up media streams
     * @private
     */
    _cleanupMediaStreams: function() {
      // Stop speaking detection
      clearInterval(this.speakingDetectionInterval);
      
      // Stop all tracks in local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }
      
      // Stop screen stream
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
        this.screenStream = null;
      }
      
      // Close audio context
      if (this.audioContext && this.audioContext.state !== 'closed') {
        this.audioContext.close();
        this.audioContext = null;
      }
      
      // Clear remote streams
      Object.values(this.remoteStreams).forEach(stream => {
        stream.getTracks().forEach(track => track.stop());
      });
      this.remoteStreams = {};
      
      console.log('Media streams cleaned up');
    },
    
    /**
     * Hide the context menu
     * @private
     */
    _hideContextMenu: function() {
      const contextMenu = document.querySelector('.voice-context-menu');
      if (contextMenu) {
        contextMenu.remove();
        
        // Remove the click outside event listener
        if (this.boundClickOutsideHandler) {
          document.removeEventListener('click', this.boundClickOutsideHandler);
          document.removeEventListener('contextmenu', this.boundClickOutsideHandler);
          this.boundClickOutsideHandler = null;
        }
      }
    },
    
    /**
     * Toggle screen sharing
     * @private
     */
    _toggleScreenSharing: function() {
      if (this.isScreenSharing) {
        this._stopScreenShare();
          } else {
        this._startScreenShare();
      }
    },
    
    /**
     * Set up the UI structure for the voice chat
     * @private
     */
    _setupUIStructure: function() {
      // Clear existing content
      this.videoGrid.innerHTML = '';
      
      // Create screen share section
      const screenShareSection = document.createElement('div');
      screenShareSection.className = 'screen-shares-section';
      this.videoGrid.appendChild(screenShareSection);
      
      // Create participants section
      const participantsSection = document.createElement('div');
      participantsSection.className = 'participant-section'; // Changed from 'participants-section' to 'participant-section'
      
      // Set styles to handle small window sizes better
      participantsSection.style.display = 'grid';
      participantsSection.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';
      participantsSection.style.gap = '12px';
      participantsSection.style.justifyContent = 'center';
      participantsSection.style.width = '100%';
      participantsSection.style.padding = '12px';
      participantsSection.style.boxSizing = 'border-box';

      this.videoGrid.appendChild(participantsSection);
      
      // Create initial screen share container
      this._createScreenShareElement();
      
      console.log('Voice chat UI structure set up with responsive participant grid');
    },
    
    /**
     * Create screen share container element if it doesn't exist
     * @private
     */
    _createScreenShareElement: function() {
      console.log('Creating or updating screen share element');
      
      // First, make sure the video grid exists
      const videoGrid = document.querySelector('.video-grid');
      if (!videoGrid) {
        console.error('Video grid not found!');
        return null;
      }
      
      // Direct DOM handling - remove any existing screen share elements to start clean
      const existingScreenShares = document.getElementById('screen-shares');
      if (existingScreenShares) {
        console.log('Removing existing screen shares container');
        existingScreenShares.remove();
      }
      
      // Create a fresh container
      const screenSharesContainer = document.createElement('div');
      screenSharesContainer.id = 'screen-shares';
      screenSharesContainer.className = 'screen-shares-section';
      screenSharesContainer.style.display = this.isScreenSharing ? 'block' : 'none';
      screenSharesContainer.style.width = '50%';
      screenSharesContainer.style.margin = '0 auto';
      screenSharesContainer.style.backgroundColor = '#202225';
      screenSharesContainer.style.borderRadius = '8px';
      screenSharesContainer.style.marginBottom = '16px';
      screenSharesContainer.style.position = 'relative';
      screenSharesContainer.style.zIndex = '10';
      screenSharesContainer.style.overflow = 'hidden';
      screenSharesContainer.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
      
      // Insert at the beginning of the video grid
      videoGrid.insertBefore(screenSharesContainer, videoGrid.firstChild);
      console.log('Inserted new screen shares container into video grid');
      
      // Create the screen share container
      const screenShareContainer = document.createElement('div');
      screenShareContainer.className = 'screen-share-container';
      screenShareContainer.style.position = 'relative';
      screenShareContainer.style.width = '100%';
      screenShareContainer.style.height = 'auto'; // Let height be determined by content & aspect ratio
      screenShareContainer.style.display = 'flex';
      screenShareContainer.style.flexDirection = 'column';
      screenShareContainer.style.backgroundColor = '#202225';
      screenShareContainer.style.borderRadius = '8px';
      screenShareContainer.style.overflow = 'hidden';
      screenShareContainer.style.transition = 'width 0.3s ease, height 0.3s ease, opacity 0.2s ease';
      
      // Create video element
      const videoElement = document.createElement('video');
      videoElement.id = 'screen-share-video';
      videoElement.className = 'screen-share-video';
      videoElement.autoplay = true;
      videoElement.muted = true; // Mute to prevent echo
      videoElement.playsinline = true;
      videoElement.controls = false;
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.objectFit = 'contain';
      videoElement.style.backgroundColor = '#202225';
      videoElement.style.display = 'block';
      
      // Create placeholder
      const placeholder = document.createElement('div');
      placeholder.id = 'screen-share-placeholder';
      placeholder.className = 'screen-share-placeholder';
      placeholder.style.position = 'absolute';
      placeholder.style.top = '0';
      placeholder.style.left = '0';
      placeholder.style.width = '100%';
      placeholder.style.height = '100%';
      placeholder.style.display = this.screenStream ? 'none' : 'flex';
      placeholder.style.flexDirection = 'column';
      placeholder.style.alignItems = 'center';
      placeholder.style.justifyContent = 'center';
      placeholder.style.backgroundColor = '#2f3136';
      placeholder.style.color = '#8e9297';
      placeholder.innerHTML = `
        <div class="placeholder-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="8" y1="21" x2="16" y2="21"></line>
            <line x1="12" y1="17" x2="12" y2="21"></line>
          </svg>
        </div>
        <div class="placeholder-text">Screen share will appear here</div>
      `;
      
      // Create info element
      const infoElement = document.createElement('div');
      infoElement.className = 'screen-share-info';
      infoElement.style.position = 'absolute';
      infoElement.style.bottom = '0';
      infoElement.style.left = '0';
      infoElement.style.right = '0';
      infoElement.style.padding = '8px 12px';
      infoElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      infoElement.style.color = 'white';
      infoElement.style.zIndex = '2';
      infoElement.style.display = 'flex';
      infoElement.style.alignItems = 'center';
      
      // Create user initial for avatar
      const userInitial = this.userName ? this.userName.charAt(0).toUpperCase() : 'U';
      
      infoElement.innerHTML = `
        <div style="display: flex; align-items: center; width: 100%;">
          <div class="screen-sharer-avatar" style="width: 24px; height: 24px; border-radius: 50%; background-color: #5865f2; color: white; display: flex; align-items: center; justify-content: center; margin-right: 8px; flex-shrink: 0;">${userInitial}</div>
          <div class="screen-sharer-details" style="flex: 1; min-width: 0;">
            <div id="screen-sharer-name" style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.screenSharerName || 'You'} are sharing screen</div>
            <div id="screen-sharer-source" style="font-size: 12px; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.screenSharerSourceName || ''}</div>
          </div>
        </div>
      `;
      
      // Append all elements to container in the correct order
      screenShareContainer.appendChild(videoElement);
      screenShareContainer.appendChild(placeholder);
      screenShareContainer.appendChild(infoElement);
      
      // Append container to screen shares container
      screenSharesContainer.appendChild(screenShareContainer);
      
      console.log('Created screen share elements with structure:', {
        videoGridFound: !!videoGrid,
        screenSharesContainerCreated: !!screenSharesContainer,
        screenShareContainerCreated: !!screenShareContainer,
        videoElementCreated: !!videoElement
      });
      
      // If we have a stream, set it up now
      if (this.screenStream) {
        console.log('Setting up screen share with existing stream');
        videoElement.srcObject = this.screenStream;
        
        // Ensure proper display state
        screenSharesContainer.style.display = 'block';
        videoElement.style.display = 'block';
        placeholder.style.display = 'none';
        
        // Setup playback
        this._setupVideoPlayback(videoElement);
      }
      
      return screenShareContainer;
    },
    
    /**
     * Set up video playback with error handling
     * @param {HTMLVideoElement} videoElement - The video element to set up
     * @private
     */
    _setupVideoPlayback: function(videoElement) {
      if (!videoElement) {
        console.error('Cannot set up playback: No video element provided');
        return;
      }
      
      console.log('Setting up video playback');
      
      // Always update dimensions when metadata is loaded
      videoElement.addEventListener('loadedmetadata', () => {
        console.log('Video metadata loaded, updating dimensions');
        this._updateContainerDimensions(videoElement);
      });
      
      // Update dimensions when playing starts
      videoElement.addEventListener('playing', () => {
        console.log('Video playing, updating dimensions');
        this._updateContainerDimensions(videoElement);
      });
      
      // Update dimensions on resize to maintain aspect ratio when window changes size
      if (!this._resizeListener) {
        this._resizeListener = () => {
          if (this.isScreenSharing && videoElement) {
            console.log('Window resized, updating screen share dimensions');
            this._updateContainerDimensions(videoElement);
          }
        };
        window.addEventListener('resize', this._resizeListener);
      }
      
      // Try to play the video
      const playVideo = () => {
        console.log('Attempting to play video');
        const playPromise = videoElement.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Video playback started successfully');
            // Update dimensions one more time after playback starts
            setTimeout(() => this._updateContainerDimensions(videoElement), 100);
          }).catch(err => {
            console.warn('Could not autoplay video:', err);
            
            // Remove any existing play buttons
            const existingButtons = document.querySelectorAll('.screen-share-play-btn');
            existingButtons.forEach(btn => btn.remove());
            
            // Add play button
            const playButton = document.createElement('button');
            playButton.textContent = 'Click to Play';
            playButton.className = 'screen-share-play-btn';
            playButton.style.position = 'absolute';
            playButton.style.top = '50%';
            playButton.style.left = '50%';
            playButton.style.transform = 'translate(-50%, -50%)';
            playButton.style.backgroundColor = 'rgba(88, 101, 242, 0.9)';
            playButton.style.color = 'white';
            playButton.style.border = 'none';
            playButton.style.borderRadius = '4px';
            playButton.style.padding = '8px 16px';
            playButton.style.cursor = 'pointer';
            playButton.style.zIndex = '100';
            
            playButton.onclick = () => {
              videoElement.play().then(() => {
                this._updateContainerDimensions(videoElement);
                playButton.remove();
              });
            };
            
            videoElement.parentNode.appendChild(playButton);
          });
        }
      };
      
      // Play video when ready
      if (videoElement.readyState >= 2) {
        playVideo();
      } else {
        videoElement.addEventListener('loadeddata', playVideo, { once: true });
        
        // Backup timeout in case the event doesn't fire
        setTimeout(() => {
          if (videoElement.readyState < 2) {
            console.log('Video not ready after timeout, trying anyway');
            playVideo();
          }
        }, 1000);
      }
    },
    
    /**
     * Set up screen share video with the current stream
     * @private
     */
    setupScreenShareVideo: function() {
      if (!this.screenStream) {
        console.error('Cannot setup screen share video: No stream available');
        return;
      }
      
      console.log('Setting up screen share video with stream');
      
      // Completely recreate the screen share elements for a clean slate
      const screenShareContainer = this._createScreenShareElement();
      
      if (!screenShareContainer) {
        console.error('Failed to create screen share container');
        return;
      }
      
      console.log('Screen share container created, video should be visible');
    },
    
    /**
     * Ensure a user object has all required properties
     * @param {Object} user - The user object to validate
     * @returns {Object} - A complete user object with default values for missing properties
     * @private
     */
    _ensureUserObject: function(user) {
      if (!user) {
        // Create a default user if none provided
        return {
          id: 'unknown-user',
          username: 'Unknown User',
          avatar: null,
          isMuted: false,
          isDeafened: false,
          hasVideo: false
        };
      }
      
      // Return a new object with all required properties, using defaults for missing ones
      return {
        id: user.id || 'unknown-user',
        username: user.username || 'Unknown User',
        avatar: user.avatar || null,
        isMuted: user.isMuted || false,
        isDeafened: user.isDeafened || false,
        hasVideo: user.hasVideo || false,
        status: user.status || 'online',
        roles: user.roles || []
      };
    },
    
    /**
     * Check if the current user has moderator permissions
     * @returns {boolean} - True if the user has moderator permissions, false otherwise
     * @private
     */
    _userHasModPermissions: function() {
      // Use the AppState method to check if the current user has mod permissions
      return AppState.userHasModPermissions ? AppState.userHasModPermissions() : false;
    },
    
    /**
     * Handle click outside context menu
     * @param {Event} event - The click event
     * @private
     */
    _handleClickOutsideContextMenu: function(event) {
      const contextMenu = document.querySelector('.voice-context-menu');
      if (contextMenu && !contextMenu.contains(event.target)) {
        this._hideContextMenu();
      }
    },
    
    /**
     * Setup context menu event listeners
     * @param {HTMLElement} contextMenu - The context menu element
     * @private
     */
    _setupContextMenuListeners: function(contextMenu) {
      // Store reference to this
      const self = this;
      
      // Add event listeners to all menu items
      const menuItems = contextMenu.querySelectorAll('.context-menu-item');
      menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
          const action = this.dataset.action;
          const userId = this.dataset.userId;
          self._handleContextMenuAction(action, userId, e);
        });
      });
      
      // Add event listener to the volume slider
      const volumeSlider = contextMenu.querySelector('.context-menu-volume-slider');
      if (volumeSlider) {
        volumeSlider.addEventListener('input', function(e) {
          const userId = this.dataset.userId;
          self._handleVolumeChange(userId, e.target.value);
          // Prevent the context menu from closing
          e.stopPropagation();
        });
        
        volumeSlider.addEventListener('click', function(e) {
          // Prevent the context menu from closing when clicking the slider
          e.stopPropagation();
        });
      }
    },
    
    /**
     * Create a mini player for screen sharing when user is not in voice view
     * @private
     */
    _createMiniPlayer: function() {
      // First remove any existing mini player
      this._removeMiniPlayer();
      
      // Check if we have screen sharing active and a valid screen stream
      if (!this.isScreenSharing || !this.screenStream) {
        console.log('Cannot create mini player: screen sharing not active');
        return;
      }
      
      console.log('Creating mini player for screen share');
      
      // Create mini player container
      const miniPlayer = document.createElement('div');
      miniPlayer.id = 'screen-share-mini-player';
      miniPlayer.className = 'screen-share-mini-player';
      
      // Set position based on saved position or default
      miniPlayer.style.left = `${this.miniPlayerPosition.x}px`;
      miniPlayer.style.top = `${this.miniPlayerPosition.y}px`;
      
      // Create header for dragging
      const header = document.createElement('div');
      header.className = 'mini-player-header';
      
      // Channel name
      const channelName = document.createElement('div');
      channelName.className = 'mini-player-channel';
      channelName.textContent = `🔊 ${this.voiceChannelName.textContent}`;
      
      // Actions
      const actions = document.createElement('div');
      actions.className = 'mini-player-actions';
      
      // Expand button
      const expandBtn = document.createElement('button');
      expandBtn.className = 'mini-player-btn';
      expandBtn.title = 'Return to voice channel';
      expandBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h6v6"></path>
          <path d="M10 14 21 3"></path>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        </svg>
      `;
      
      // Close button (closes mini player but doesn't disconnect)
      const closeBtn = document.createElement('button');
      closeBtn.className = 'mini-player-btn';
      closeBtn.title = 'Close mini player';
      closeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      `;
      
      // Add buttons to actions
      actions.appendChild(expandBtn);
      actions.appendChild(closeBtn);
      
      // Add elements to header
      header.appendChild(channelName);
      header.appendChild(actions);
      
      // Add header to mini player
      miniPlayer.appendChild(header);
      
      // Create video container
      const videoContainer = document.createElement('div');
      videoContainer.className = 'mini-player-video-container';
      
      // Create video element
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true; // Always mute the screen share video
      
      // Set the stream as source
      if (this.screenStream) {
        video.srcObject = this.screenStream;
        
        // Listen for the stream ending
        this.screenStream.getVideoTracks()[0].addEventListener('ended', () => {
          this._stopScreenShare();
        });
      }
      
      // Add video to container
      videoContainer.appendChild(video);
      miniPlayer.appendChild(videoContainer);
      
      // Add mini player to body
      document.body.appendChild(miniPlayer);
      
      // Store reference
      this.miniPlayer = miniPlayer;
      
      // Add event listeners for dragging
      this._makeMiniPlayerDraggable(miniPlayer, header);
      
      // Add event listener for expand button
      expandBtn.addEventListener('click', () => {
        // Navigate back to voice channel
        const denId = AppState.get('activeDen');
        const voiceChannelId = AppState.get('activeVoiceChannel');
        if (denId && voiceChannelId) {
          // Get the channel to navigate back to
          const channels = AppState.getChannelsForDen(denId) || [];
          const channel = channels.find(ch => ch.id === voiceChannelId);
          if (channel) {
            // Set it as active channel to navigate to it
            AppState.setActiveChannel(voiceChannelId);
            
            // Remove mini player since we're going back to the voice view
            this._removeMiniPlayer();
          }
        }
      });
      
      // Add event listener for close button
      closeBtn.addEventListener('click', () => {
        this._removeMiniPlayer();
      });
    },
    
    /**
     * Handle context menu action
     * @param {string} action - The action to handle
     * @param {string} userId - The user ID associated with the action
     * @param {Event} event - The event object
     * @private
     */
    _handleContextMenuAction: function(action, userId, event) {
      // Implement the logic to handle the context menu action
      // This is a placeholder and should be replaced with the actual implementation
      console.log(`Handling action: ${action} for user: ${userId}`);
    },
    
    /**
     * Handle volume change
     * @param {string} userId - The user ID associated with the volume change
     * @param {string} volume - The new volume level
     * @private
     */
    _handleVolumeChange: function(userId, volume) {
      // Implement the logic to handle the volume change
      // This is a placeholder and should be replaced with the actual implementation
      console.log(`Handling volume change for user: ${userId}, new volume: ${volume}`);
    },
    
    /**
     * Generate initials for a username
     * @param {string} username - The username to generate initials for
     * @returns {string} - The initials
     * @private
     */
    _getInitials: function(username) {
      if (!username) return '?';
      
      // Split by spaces and take first letter of each part
      const parts = username.trim().split(/\s+/);
      if (parts.length === 1) {
        // If only one part, take first letter
        return username.charAt(0).toUpperCase();
      }
      
      // Otherwise take first letter of first and last parts
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    },
    
    /**
     * Update container dimensions based on video dimensions
     * @param {HTMLVideoElement} videoElement - The video element
     * @private
     */
    _updateContainerDimensions: function(videoElement) {
      if (!videoElement || !this.screenStream) return;
      
      const videoWidth = videoElement.videoWidth;
      const videoHeight = videoElement.videoHeight;
      
      if (!videoWidth || !videoHeight) {
        console.log('Video dimensions not available yet, waiting for metadata');
        return;
      }
      
      // Calculate aspect ratio
      const aspectRatio = videoWidth / videoHeight;
      
      console.log('Updating container dimensions to match source:', {
        videoWidth: videoWidth,
        videoHeight: videoHeight,
        aspectRatio: aspectRatio.toFixed(4)
      });
      
      // Get container elements
      const screenShareContainer = videoElement.closest('.screen-share-container');
      const screenSharesContainer = document.getElementById('screen-shares');
      
      if (!screenShareContainer || !screenSharesContainer) {
        console.error('Container elements not found');
        return;
      }
      
      // Parent container setup - 50% width centered
      screenSharesContainer.style.width = '50%';
      screenSharesContainer.style.margin = '0 auto';
      screenSharesContainer.style.height = 'fit-content';
      
      // Set the aspect ratio on the container directly
      screenShareContainer.style.aspectRatio = `${aspectRatio}`;
      
      // Force the container to maintain this aspect ratio by setting height to auto
      screenShareContainer.style.width = '100%';
      screenShareContainer.style.height = 'auto';
      
      // Set a maximum height to prevent the container from taking up too much space
      screenShareContainer.style.maxHeight = '75vh';
      
      // Make sure video fills the container correctly
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.objectFit = 'contain';
      
      // Display setup
      screenSharesContainer.style.display = 'flex';
      screenSharesContainer.style.justifyContent = 'center';
      screenSharesContainer.style.alignItems = 'flex-start';
      
      // Force a reflow to ensure the browser applies all the style changes
      void screenShareContainer.offsetHeight;
      
      console.log('Screen share container updated with aspect ratio', {
        aspectRatio: aspectRatio.toFixed(4),
        containerWidth: screenShareContainer.offsetWidth,
        containerHeight: screenShareContainer.offsetHeight
      });
    }
  };
  
  // Export for use in other modules
  window.VoiceManager = VoiceManager;