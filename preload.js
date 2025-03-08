const { contextBridge, ipcRenderer } = require('electron');

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
      const constraints = {
        audio: options.captureAudio || false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            maxWidth: options.maxWidth || 4096,
            maxHeight: options.maxHeight || 2160,
            maxFrameRate: options.frameRate || 60
          }
        }
      };
      
      // If we have a specific source ID
      if (sourceId) {
        constraints.video.mandatory.chromeMediaSourceId = sourceId;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Return the stream directly - no need to wrap anything
      return stream;
    } catch (error) {
      console.error('preload: Error sharing screen:', error);
      throw error; // Throw error to be handled in the renderer process
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

// Load state from main process when preload finishes
window.addEventListener('DOMContentLoaded', () => {
  // We can send a ready event to the main process
  ipcRenderer.send('app-ready');
});