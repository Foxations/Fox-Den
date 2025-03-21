const { contextBridge, ipcRenderer, desktopCapturer } = require('electron');

// Simple UUID generator function to replace the uuid package
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, 
          v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Expose protected methods that allow the renderer process to use IPC
contextBridge.exposeInMainWorld('electron', {
  // Window controls
  windowControls: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close')
  },
  
  // Notifications
  notification: {
    show: (title, body) => ipcRenderer.send('show-notification', { title, body })
  },
  
  // File system operations
  fileSystem: {
    saveAttachment: (data, filename) => ipcRenderer.invoke('save-attachment', data, filename),
    openFile: () => ipcRenderer.invoke('open-file-dialog')
  },
  
  // User settings and data
  store: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key)
  },
  
  // Generate a unique ID (using our custom function instead of uuidv4)
  generateId: () => generateUUID(),
  
  // Status change listeners
  onStatusChange: (callback) => {
    ipcRenderer.on('status-change', (_, status) => callback(status));
  },
  
  // IPC functions
  send: (channel, data) => {
    // whitelist channels
    const validChannels = ['toMain', 'app-close', 'app-minimize', 'app-maximize'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    const validChannels = ['fromMain', 'app-maximized', 'app-unmaximized'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  
  // App info
  appVersion: process.env.npm_package_version,
  
  // Desktop capturer functions
  getDesktopCapturerSources: async (options) => {
    return await desktopCapturer.getSources(options);
  },
  
  // Screen sharing method directly using desktopCapturer
  captureScreen: async (sourceId, options = {}) => {
    try {
      console.log('preload: Using captureScreen with sourceId:', sourceId);
      
      if (!sourceId) {
        throw new Error('Source ID is required for screen capture');
      }
      
      // Instead of trying to use desktopCapturer directly, use our IPC invoke
      // to communicate with the main process which has access to desktopCapturer
      try {
        // Create the proper constraints
        const constraints = {
          audio: options?.captureAudio || false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: sourceId
            }
          }
        };
        
        console.log('Using constraints:', JSON.stringify(constraints));
        
        // Get the media stream
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Verify it has video tracks
        if (!stream) {
          throw new Error('Null stream returned from getUserMedia');
        }
        
        const videoTracks = stream.getVideoTracks();
        console.log('Stream video tracks:', videoTracks.length);
        
        if (videoTracks.length === 0) {
          throw new Error('Stream has no video tracks');
        }
        
        // Log track details
        videoTracks.forEach(track => {
          console.log('Video track:', { 
            id: track.id, 
            kind: track.kind, 
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState
          });
        });
        
        return stream;
      } catch (error) {
        console.error('preload: Error in primary screen capture method:', error);
        
        // Try alternate approach using IPC to main process
        console.log('preload: Trying screen capture via IPC');
        
        // Request the main process to help with screen capture
        const result = await ipcRenderer.invoke('capture-screen', {
          sourceId: sourceId,
          options: options
        });
        
        // If the main process handled it directly and returned success, 
        // use system getDisplayMedia as fallback
        console.log('preload: Falling back to getDisplayMedia');
        return await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: options?.captureAudio || false
        });
      }
    } catch (error) {
      console.error('preload: Error capturing screen:', error);
      throw error;
    }
  },
  
  // IPC invoke method for promise-based communication
  invoke: async (channel, ...args) => {
    // whitelist channels
    const validChannels = ['get-screen-sources', 'get-display-info', 'store-get', 'store-set', 'store-delete', 'open-file-dialog', 'save-attachment', 'check-wayland', 'capture-screen', 'get-desktop-sources'];
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, ...args);
    } else {
      throw new Error(`Invalid channel: ${channel}`);
    }
  }
});

// Also expose APIs for voice/video functionality
contextBridge.exposeInMainWorld('media', {
  // Request user media permissions
  getAudioStream: async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return stream;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error; // Throw error instead of returning null
    }
  },
  
  getVideoStream: async () => {
    try {
      console.log("preload: Requesting video access");
      // Simplified constraints for better compatibility
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true 
      });
      
      console.log("preload: Video access granted");
      return stream;
    } catch (error) {
      console.error('preload: Error accessing camera:', error);
      throw error;
    }
  },
  
  getScreenStream: async (sourceId = null, options = {}) => {
    try {
      console.log("preload: Getting screen stream for source ID:", sourceId);
      
      // Use the most basic approach for better compatibility
      try {
        console.log("preload: Trying getDisplayMedia with simple constraints");
        return await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: options.captureAudio || false
        });
      } catch (simpleErr) {
        console.error('preload: Simple getDisplayMedia failed:', simpleErr.name, simpleErr.message);
        
        // If we have a sourceId, try with the Electron desktop capturer approach
        if (sourceId) {
          try {
            console.log("preload: Trying desktop capturer approach");
            const sources = await desktopCapturer.getSources({
              types: ['window', 'screen'],
              thumbnailSize: { width: 20, height: 20 },
            });
            
            // Find the matching source
            const source = sources.find(s => s.id === sourceId);
            if (!source) {
              throw new Error(`Source with ID ${sourceId} not found`);
            }
            
            console.log("preload: Found source:", source.id, source.name);
            
            // Create constraints that work with Electron
            const constraints = {
              audio: options.captureAudio || false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: source.id
                }
              }
            };
            
            // Get the stream
            return await navigator.mediaDevices.getUserMedia(constraints);
          } catch (captureErr) {
            console.error('preload: Desktop capturer approach failed:', captureErr);
            
            // Final fallback approach
            console.log("preload: Using final fallback approach");
            return await navigator.mediaDevices.getDisplayMedia({
              video: true,
              audio: options.captureAudio || false
            });
          }
        } else {
          // No sourceId, use system picker
          console.log("preload: No sourceId, using system picker");
          return await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: options.captureAudio || false
          });
        }
      }
    } catch (error) {
      console.error('preload: All screen capture methods failed:', error);
      throw error;
    }
  },
  
  // Get available screen sharing sources
  getScreenSources: async () => {
    try {
      return await ipcRenderer.invoke('get-screen-sources');
    } catch (error) {
      console.error('Error getting screen sources:', error);
      return [];
    }
  },
  
  // Get display information
  getDisplayInfo: async () => {
    try {
      return await ipcRenderer.invoke('get-display-info');
    } catch (error) {
      console.error('Error getting display info:', error);
      return [];
    }
  },
  
  // Media device enumeration
  getAudioDevices: async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput');
    } catch (error) {
      console.error('Error getting audio devices:', error);
      return [];
    }
  }
});

// Listen for screen share sources
ipcRenderer.on('screen-share-sources', (event, sources) => {
  console.log('preload: Received screen share sources from main process');
  window.dispatchEvent(new CustomEvent('screen-share-sources', { 
    detail: sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      appIcon: source.appIcon?.toDataURL?.() || null,
      type: source.id.includes('screen:') ? 'screen' : 'window'
    }))
  }));
});

// Load state from main process when preload finishes
window.addEventListener('DOMContentLoaded', () => {
  // We can send a ready event to the main process
  ipcRenderer.send('app-ready');
});