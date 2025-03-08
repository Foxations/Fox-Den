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
     */
    init: function() {
      if (this.initialized) return;
      
      // Cache DOM elements
      this.voiceContainer = document.getElementById('voice-container');
      this.videoGrid = document.getElementById('video-grid');
      this.voiceChannelName = document.getElementById('voice-channel-name');
      this.voiceBottomPanel = document.getElementById('voice-bottom-panel');
      this.voiceBottomChannelName = document.getElementById('voice-bottom-channel-name');
      
      // Track state
      this.isConnected = false;
      this.isMuted = false;
      this.isDeafened = false;
      this.hasVideo = false;
      this.isScreenSharing = false;
      
      // Set up event listeners
      this._setupEventListeners();
      
      // Subscribe to state changes
      AppState.subscribe('activeChannel', (channelId) => this._handleActiveChannelChange(channelId));
      AppState.subscribe('activeVoiceChannel', (channelId) => this._handleActiveVoiceChannelChange(channelId));
      AppState.subscribe('connectedToVoice', (isConnected) => this._handleConnectionStateChange(isConnected));
      AppState.subscribe('micMuted', (isMuted) => this._handleMicMuteChange(isMuted));
      AppState.subscribe('deafened', (isDeafened) => this._handleDeafenedChange(isDeafened));
      AppState.subscribe('videoEnabled', (hasVideo) => this._handleVideoChange(hasVideo));
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
        this.toggleVideo();
      });
      
      document.getElementById('toggle-screen').addEventListener('click', () => {
        this.toggleScreenShare();
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
        this.toggleVideo();
      });
      
      document.getElementById('bottom-toggle-screen').addEventListener('click', () => {
        this.toggleScreenShare();
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
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
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
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
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
      this.isScreenSharing = isScreenSharing;
      
      // Toggle screen sharing state in UI
      const toggleScreenBtn = document.getElementById('toggle-screen');
      const bottomToggleScreenBtn = document.getElementById('bottom-toggle-screen');
      
      toggleScreenBtn.classList.toggle('active', isScreenSharing);
      bottomToggleScreenBtn.classList.toggle('active', isScreenSharing);
      
      // Update screen share container visibility
      const screenShareContainer = document.querySelector('.screen-share-container');
      if (screenShareContainer) {
        screenShareContainer.style.display = isScreenSharing ? 'block' : 'none';
      } else if (isScreenSharing) {
        // Create screen share container if it doesn't exist
        this._createScreenShareElement();
      }
      
      // Update screen share indicator
      const screenShareIndicator = document.getElementById('screen-sharer-name');
      if (screenShareIndicator) {
        screenShareIndicator.textContent = isScreenSharing ? 'You' : '';
      }
      
      // Enable or disable screen sharing
      if (isScreenSharing) {
        this._startScreenShare();
      } else {
        this._stopScreenShare();
        // Remove mini player if it exists
        this._removeMiniPlayer();
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
     * Toggle video state
     */
    toggleVideo: function() {
      AppState.set('videoEnabled', !this.hasVideo);
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
    _updateVideoStream: async function(enable) {
      try {
        if (enable) {
          // Request camera access
          try {
            console.log("Attempting to enable video");
            
            // Make sure we have a local stream for audio
            if (!this.localStream) {
              console.log("Creating new local stream");
              this.localStream = new MediaStream();
              
              // Get audio as well if we don't have a stream yet
              try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                audioStream.getAudioTracks().forEach(track => {
                  this.localStream.addTrack(track);
                });
              } catch (audioError) {
                console.warn("Could not get audio when initializing video:", audioError);
              }
            }
            
            console.log("Getting video stream directly");
            // Always use direct getUserMedia for video to avoid context bridge issues
            const videoStream = await navigator.mediaDevices.getUserMedia({ 
              video: true 
            });
            
            console.log("Video stream obtained:", videoStream);
            
            // Get video tracks safely
            if (!videoStream) {
              throw new Error('No video stream received');
            }
            
            // Get and add all video tracks to our local stream
            const videoTracks = videoStream.getTracks().filter(track => track.kind === 'video');
            console.log(`Found ${videoTracks.length} video tracks`);
            
            if (videoTracks.length === 0) {
              throw new Error('No video tracks available in stream');
            }
            
            videoTracks.forEach(track => {
              try {
                console.log(`Adding video track to local stream: ${track.id}`);
                this.localStream.addTrack(track);
              } catch (e) {
                console.warn("Could not add track to stream (might already exist):", e);
              }
            });
            
            // Show video in user container
            const userContainer = document.querySelector(`.video-container[data-user-id="${AppState.get('currentUser').id}"]`);
            if (userContainer) {
              const video = document.createElement('video');
              video.srcObject = this.localStream;
              video.autoplay = true;
              video.muted = true; // Avoid feedback
              video.playsInline = true;
              
              // Replace placeholder
              const placeholder = userContainer.querySelector('.video-placeholder');
              if (placeholder) {
                placeholder.style.display = 'none';
              }
              
              // Add video element
              userContainer.appendChild(video);
              
              // Update status text
              const statusElement = userContainer.querySelector('.video-status');
              if (statusElement) {
                statusElement.textContent = 'Video On';
              }
            }
            
            console.log('Camera initialized successfully');
          } catch (err) {
            console.error('Failed to get video stream:', err);
            throw err; // Re-throw to be caught by outer catch block
          }
        } else {
          // Remove video tracks
          if (this.localStream) {
            const videoTracks = this.localStream.getTracks().filter(track => track.kind === 'video');
            
            videoTracks.forEach(track => {
              console.log(`Stopping video track: ${track.id}`);
              track.stop();
              try {
                this.localStream.removeTrack(track);
              } catch (e) {
                console.warn("Could not remove track from stream:", e);
              }
            });
          }
          
          // Show placeholder in user container
          const userContainer = document.querySelector(`.video-container[data-user-id="${AppState.get('currentUser').id}"]`);
          if (userContainer) {
            const video = userContainer.querySelector('video');
            if (video) {
              video.remove();
            }
            
            // Show placeholder
            const placeholder = userContainer.querySelector('.video-placeholder');
            if (placeholder) {
              placeholder.style.display = 'flex';
            }
            
            // Update status text
            const statusElement = userContainer.querySelector('.video-status');
            if (statusElement) {
              statusElement.textContent = this.isMuted ? 'Muted' : 'Talking';
            }
          }
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        Utils.showToast('Could not access camera. Please check permissions.', 'error');
        
        // Disable video state
        AppState.set('videoEnabled', false);
      }
    },
    
    /**
     * Start screen sharing
     * @private
     */
    _startScreenShare: async function() {
      try {
        // Show screen selection dialog first
        const selection = await ScreenSelector.showSelectionDialog();
        
        // If user canceled, abort
        if (!selection) {
          console.log('Screen sharing canceled by user');
          AppState.set('screenShareEnabled', false);
          return;
        }
        
        console.log('Starting screen share with source:', selection.sourceName);
        
        // Request screen sharing with selected source
        try {
          // Try using navigator.mediaDevices.getUserMedia directly - most reliable way
          const constraints = {
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: selection.sourceId,
                maxWidth: selection.options.width || 1920,
                maxHeight: selection.options.height || 1080,
                maxFrameRate: selection.options.frameRate || 30
              }
            },
            audio: selection.options.captureAudio || false
          };
          
          console.log("Requesting screen share with constraints:", constraints);
          
          // Try direct access first - best approach in Electron
          try {
            this.screenStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log("Got screen stream directly:", this.screenStream);
          } catch (directError) {
            console.error("Direct screen sharing failed:", directError);
            
            // Fall back to context bridge
            if (window.media && window.media.getScreenStream) {
              console.log("Falling back to context bridge for screen sharing");
              this.screenStream = await window.media.getScreenStream(
                selection.sourceId, 
                selection.options
              );
              console.log("Got screen stream through context bridge:", this.screenStream);
            } else {
              // Final fallback for browsers
              console.log("Falling back to getDisplayMedia API");
              this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { 
                  cursor: 'always',
                  displaySurface: selection.sourceType === 'screen' ? 'monitor' : 'window',
                },
                audio: selection.options.captureAudio
              });
              console.log("Got screen stream through getDisplayMedia:", this.screenStream);
            }
          }
          
          // Ensure we have a valid MediaStream object
          if (!this.screenStream || typeof this.screenStream !== 'object') {
            throw new Error('Invalid screen stream received');
          }
          
          // Check if getVideoTracks or getTracks methods exist
          if (typeof this.screenStream.getVideoTracks !== 'function' && 
              typeof this.screenStream.getTracks !== 'function') {
            console.warn("Screen stream is missing standard methods, might be a serialization issue");
            
            // If we got tracks directly instead of a stream object, create a new MediaStream
            if (Array.isArray(this.screenStream)) {
              console.log("Converting track array to MediaStream");
              const newStream = new MediaStream();
              this.screenStream.forEach(track => newStream.addTrack(track));
              this.screenStream = newStream;
            } else {
              // Something's wrong, throw an error
              throw new Error('Screen stream does not have required methods and is not an array of tracks');
            }
          }
          
          // Get the first video track to monitor for stop events
          let videoTrack;
          if (typeof this.screenStream.getVideoTracks === 'function') {
            videoTrack = this.screenStream.getVideoTracks()[0];
          } else if (typeof this.screenStream.getTracks === 'function') {
            videoTrack = this.screenStream.getTracks().find(track => track.kind === 'video');
          }
          
          if (videoTrack) {
            // Handle stream ending (user stops sharing)
            videoTrack.onended = () => {
              console.log("Screen sharing stopped by track end event");
              AppState.set('screenShareEnabled', false);
            };
          }
            
          // Update screen share container
          const screenContainer = document.querySelector('#screen-share-container');
          console.log("Screen container found:", screenContainer ? "yes" : "no");
          
          if (!screenContainer) {
            console.error("Screen share container not found in DOM");
            this._createScreenShareElement(); // Try to recreate it
            const newContainer = document.querySelector('#screen-share-container');
            if (!newContainer) {
              throw new Error('Could not create screen share container');
            } else {
              console.log("Created new screen share container");
            }
          }
          
          // Get the container again (whether it existed or was just created)
          const container = document.querySelector('#screen-share-container');
          if (container) {
            // Create video element with explicit styling
            const video = document.createElement('video');
            video.srcObject = this.screenStream;
            video.autoplay = true;
            video.playsInline = true;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'contain';
            video.style.backgroundColor = '#000';
            video.id = 'screen-share-video';
            
            // Remove any existing video
            const existingVideo = container.querySelector('video');
            if (existingVideo) {
              console.log("Removing existing video element");
              existingVideo.srcObject = null;
              existingVideo.remove();
            }
            
            // Remove all placeholder content for a fresh start
            const placeholders = container.querySelectorAll('div:not(.screen-share-indicator)');
            placeholders.forEach(element => {
              console.log("Removing placeholder element");
              element.remove();
            });
            
            // Add source name
            const sourceInfo = document.createElement('div');
            sourceInfo.className = 'screen-share-source-name';
            sourceInfo.textContent = selection.sourceName;
            
            // Add video element
            console.log("Appending video element to screen share container");
            container.appendChild(video);
            container.appendChild(sourceInfo);
            
            // Make screen share container visible
            container.style.display = 'block';
            
            // Log success and add an event listener to confirm video is playing
            video.onloadedmetadata = () => {
              console.log("Video metadata loaded, dimensions:", video.videoWidth, "x", video.videoHeight);
            };
            
            video.onplay = () => {
              console.log("Screen share video is now playing");
            };
            
            video.onerror = (e) => {
              console.error("Video error:", e);
            };
          } else {
            throw new Error('Screen share container not found after creation attempt');
          }
          
          console.log('Screen sharing started successfully');
          
          // Monitor screen share performance
          this._monitorScreenSharePerformance();
        } catch (streamError) {
          console.error('Failed to get screen stream:', streamError);
          Utils.showToast('Failed to share screen: ' + streamError.message, 'error');
          AppState.set('screenShareEnabled', false);
          return;
        }
      } catch (error) {
        console.error('Error in screen sharing process:', error);
        Utils.showToast('Could not share screen. Please try again.', 'error');
        
        // Disable screen sharing state
        AppState.set('screenShareEnabled', false);
      }
    },
    
    /**
     * Stop screen sharing
     * @private
     */
    _stopScreenShare: function() {
      // Stop all screen sharing tracks safely
      if (this.screenStream) {
        console.log("Stopping screen share");
        
        try {
          // Safely stop tracks based on what method is available
          if (typeof this.screenStream.getTracks === 'function') {
            this.screenStream.getTracks().forEach(track => {
              track.stop();
              console.log(`Stopped screen track: ${track.kind} (${track.id})`);
            });
          } else if (typeof this.screenStream.getVideoTracks === 'function') {
            this.screenStream.getVideoTracks().forEach(track => {
              track.stop();
              console.log(`Stopped video track: ${track.id}`);
            });
          } else {
            console.warn("Could not stop tracks: stream methods not available");
          }
        } catch (e) {
          console.warn("Error stopping screen tracks:", e);
        }
        
        this.screenStream = null;
      }
      
      // Hide screen share container and clear content
      const screenContainer = document.querySelector('#screen-share-container');
      if (screenContainer) {
        console.log("Hiding screen share container");
        screenContainer.style.display = 'none';
        
        // Remove video and reset its source
        const video = screenContainer.querySelector('video');
        if (video) {
          console.log("Removing video element");
          video.srcObject = null;
          video.remove();
        }
        
        // Re-add the placeholder content
        this._createScreenShareElement();
      } else {
        console.warn("Screen share container not found when trying to stop sharing");
      }
      
      // Clear performance monitor
      if (this.performanceMonitor) {
        clearInterval(this.performanceMonitor);
        this.performanceMonitor = null;
      }
      
      // Remove mini player if it exists
      this._removeMiniPlayer();
      
      console.log('Screen sharing stopped');
    },
    
    /**
     * Adjust screen share quality based on performance
     * @private
     */
    _monitorScreenSharePerformance: function() {
      if (!this.screenStream) return;
      
      // Check every 5 seconds
      this.performanceMonitor = setInterval(() => {
        // Get current CPU usage through main process
        // This would require implementing a CPU monitoring feature
        const cpuUsage = AppState.get('cpuUsage') || 0;
        
        // Adjust video quality if needed
        try {
          let videoTrack;
          if (typeof this.screenStream.getVideoTracks === 'function') {
            videoTrack = this.screenStream.getVideoTracks()[0];
          } else if (typeof this.screenStream.getTracks === 'function') {
            videoTrack = this.screenStream.getTracks().find(track => track.kind === 'video');
          }
          
          if (videoTrack && videoTrack.applyConstraints) {
            if (cpuUsage > 80) {
              // High CPU usage, reduce quality
              videoTrack.applyConstraints({
                width: 1280,
                height: 720,
                frameRate: 15
              }).catch(e => console.log('Could not adjust constraints:', e));
            } else if (cpuUsage < 30) {
              // Low CPU usage, can increase quality
              videoTrack.applyConstraints({
                width: 1920,
                height: 1080,
                frameRate: 30
              }).catch(e => console.log('Could not adjust constraints:', e));
            }
          }
        } catch (e) {
          console.warn("Error adjusting screen share quality:", e);
        }
      }, 5000);
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
      const userContainer = document.querySelector(`.video-container[data-user-id="${AppState.get('currentUser').id}"]`);
      if (userContainer) {
        userContainer.classList.toggle('speaking', isSpeaking);
        
        // Show/hide speaking indicator
        let indicator = userContainer.querySelector('.speaking-indicator');
        
        if (isSpeaking) {
          if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'speaking-indicator';
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
      const currentUser = AppState.get('currentUser');
      const connectedMembers = [currentUser];
      
      // Add random members to simulate other users
      // In a real app, this would be based on who is actually connected
      for (let i = 0; i < Math.min(connectedUsers - 1, members.length); i++) {
        // Skip current user
        if (members[i].id === currentUser.id) continue;
        
        connectedMembers.push(members[i]);
        
        // Stop when we have enough users
        if (connectedMembers.length >= connectedUsers) break;
      }
      
      // Create screen share container
      this._createScreenShareElement();
      
      // Create video containers for each user
      connectedMembers.forEach(member => {
        this._createUserVideoElement(member);
      });
    },
    
    /**
     * Create a user video element
     * @param {Object} user - The user data
     * @private
     */
    _createUserVideoElement: function(user) {
      const container = document.createElement('div');
      container.className = 'video-container';
      container.dataset.userId = user.id;
      
      // Generate avatar initials
      const initials = Utils.getInitials(user.username);
      
      // User is current user
      const isCurrentUser = user.id === AppState.get('currentUser').id;
      
      // Create placeholder content
      container.innerHTML = `
        <div class="video-placeholder">
          <div class="video-user-avatar" style="background-color: ${Utils.getRandomAvatarColor()}">
            ${user.avatar || initials}
          </div>
          <div class="video-username">${user.username}</div>
          <div class="video-status">${isCurrentUser ? 'You' : 'Talking'}</div>
        </div>
        <div class="video-controls">
          <div class="video-controls-left">
            <div class="video-username-small">${user.username}${isCurrentUser ? ' (You)' : ''}</div>
          </div>
          <div class="video-controls-right">
            ${isCurrentUser ? `
              <div class="video-control ${this.isMuted ? 'muted' : ''}" id="mic-indicator">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </div>
            ` : ''}
          </div>
        </div>
      `;
      
      // Add to grid
      this.videoGrid.appendChild(container);
    },
    
    /**
     * Create the screen share element
     * @private
     */
    _createScreenShareElement: function() {
      // Check if container already exists
      let container = document.getElementById('screen-share-container');
      if (container) {
        console.log("Screen share container already exists, clearing it");
        container.innerHTML = ''; // Clear existing content for a fresh start
      } else {
        console.log("Creating new screen share container");
        container = document.createElement('div');
        container.className = 'screen-share-container';
        container.id = 'screen-share-container';
        container.style.display = 'none'; // Hidden by default
      }
      
      // Add the indicator for who is sharing
      const indicator = document.createElement('div');
      indicator.className = 'screen-share-indicator';
      indicator.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
        <span id="screen-sharer-name">You</span> is sharing their screen
      `;
      container.appendChild(indicator);
      
      // Add placeholder for when no screen is shared
      const placeholderDiv = document.createElement('div');
      placeholderDiv.className = 'screen-share-placeholder';
      placeholderDiv.style.width = '100%';
      placeholderDiv.style.height = '100%';
      placeholderDiv.style.display = 'flex';
      placeholderDiv.style.alignItems = 'center';
      placeholderDiv.style.justifyContent = 'center';
      placeholderDiv.style.backgroundColor = '#2e3136';
      placeholderDiv.style.position = 'relative';
      placeholderDiv.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
        <div style="position:absolute;color:rgba(255,255,255,0.5);font-size:14px;margin-top:80px;">
          Screen sharing will appear here
        </div>
      `;
      container.appendChild(placeholderDiv);
      
      // Add to video grid if it's not already there
      if (!container.parentElement) {
        console.log("Adding screen share container to video grid");
        
        // Check if video grid exists
        const videoGrid = document.getElementById('video-grid');
        if (videoGrid) {
          // Add as the first child
          if (videoGrid.firstChild) {
            videoGrid.insertBefore(container, videoGrid.firstChild);
          } else {
            videoGrid.appendChild(container);
          }
        } else {
          console.error("Video grid not found, cannot add screen share container");
        }
      }
      
      return container;
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
      video.muted = this.isDeafened; // Respect deafen state
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'contain';
      
      // Set the stream as source
      if (this.screenStream) {
        video.srcObject = this.screenStream;
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
        // Save the screen stream reference before mini player removal
        const screenStream = this.screenStream;
        
        // Stop the video in the mini-player to avoid potential issues
        const miniPlayerVideo = this.miniPlayer.querySelector('video');
        if (miniPlayerVideo) {
          console.log('Detaching video from mini-player');
          const tempStream = miniPlayerVideo.srcObject;
          miniPlayerVideo.srcObject = null;
          miniPlayerVideo.pause();
        }
        
        // First store the current position for future use
        if (this.miniPlayer) {
          const rect = this.miniPlayer.getBoundingClientRect();
          this.miniPlayerPosition.x = rect.left;
          this.miniPlayerPosition.y = rect.top;
        }
        
        console.log('Removing mini player before navigation');
        // Remove mini player - this cleans up but doesn't affect the screen stream
        this._removeMiniPlayer();
        
        // Navigate back to voice channel
        const denId = AppState.get('activeDen');
        const voiceChannelId = AppState.get('activeVoiceChannel');
        if (denId && voiceChannelId) {
          // Get the channel to navigate back to
          const channels = AppState.getChannelsForDen(denId) || [];
          const voiceChannel = channels.find(ch => ch.id === voiceChannelId);
          if (voiceChannel) {
            console.log('Switching back to voice channel:', voiceChannel.name);
            // Switch back to voice channel - this will show the voice container
            AppState.setActiveChannel(voiceChannelId);
            
            // Ensure the screen share container is visible and properly set up
            // Increase timeout to ensure DOM is fully updated
            setTimeout(() => {
              console.log('Restoring screen share in main container, stream valid:', !!screenStream);
              
              // Validate that we still have a valid screen stream
              if (!screenStream || !screenStream.active) {
                console.error('Screen stream is no longer valid or active');
                return;
              }
              
              // Validate that screenStream tracks are active
              const videoTracks = screenStream.getVideoTracks();
              if (videoTracks.length === 0) {
                console.error('No video tracks in screen stream');
                return;
              }
              
              if (!videoTracks[0].enabled) {
                console.log('Video track was disabled, enabling it');
                videoTracks[0].enabled = true;
              }
              
              // Find or create the screen share container
              let screenContainer = document.querySelector('#screen-share-container');
              if (!screenContainer) {
                console.log('Creating new screen share container');
                screenContainer = this._createScreenShareElement();
              }
              
              if (screenContainer) {
                // Make sure container is visible
                screenContainer.style.display = 'block';
                
                // Remove any existing video
                const existingVideo = screenContainer.querySelector('video');
                if (existingVideo) {
                  existingVideo.srcObject = null;
                  existingVideo.remove();
                }
                
                // Remove placeholder elements
                const placeholders = screenContainer.querySelectorAll('.screen-share-placeholder');
                placeholders.forEach(element => {
                  element.remove();
                });
                
                // Create new video with the screen stream
                const video = document.createElement('video');
                video.autoplay = true;
                video.playsInline = true;
                video.muted = false;
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'contain';
                video.style.backgroundColor = '#000';
                video.id = 'screen-share-video';
                
                // Add event listeners for debugging
                video.onloadedmetadata = () => {
                  console.log('Video metadata loaded successfully:', video.videoWidth, 'x', video.videoHeight);
                };
                
                video.onplay = () => {
                  console.log('Video started playing successfully');
                };
                
                video.onerror = (err) => {
                  console.error('Error in video playback:', err);
                };

                // Set the stream - very important!
                video.srcObject = screenStream;
                
                // Add to container
                screenContainer.appendChild(video);
                
                // Clean up any other placeholder content
                const otherPlaceholders = screenContainer.querySelectorAll('div:not(.screen-share-indicator)');
                otherPlaceholders.forEach(element => {
                  if (!element.classList.contains('screen-share-source-name') && 
                      !element.classList.contains('screen-share-indicator')) {
                    element.remove();
                  }
                });
                
                console.log('Screen share restored in main container');
              } else {
                console.error('Could not find or create screen share container');
              }
            }, 250); // Increased timeout to ensure DOM has time to update
          }
        }
      });
      
      // Add event listener for close button
      closeBtn.addEventListener('click', () => {
        this._removeMiniPlayer();
      });
      
      return miniPlayer;
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
    }
  };
  
  // Export for use in other modules
  window.VoiceManager = VoiceManager;