const { app, BrowserWindow, ipcMain, shell, Menu, Tray, dialog, nativeImage, desktopCapturer, session } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { createMenu } = require('./electron/menu');
const { createTray, destroyTray } = require('./electron/tray');

// Initialize store for settings
const store = new Store();

let mainWindow;
let tray = null;

// Windows-specific optimization for game capture
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-gpu-rasterization');

// Set permissions for screen capturing
app.commandLine.appendSwitch('enable-features', 'ScreenCaptureKit');
app.commandLine.appendSwitch('enable-features', 'MediaCaptureAPI');

// Handle creating/removing shortcuts on Windows when installing/uninstalling
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch (e) {
  console.log('electron-squirrel-startup not found, skipping Windows installer events');
}

// Create the main application window
function createWindow() {
  // Load the previous window state or use defaults
  const windowState = store.get('windowState', {
    width: 1280,
    height: 800,
    x: undefined,
    y: undefined,
    maximized: false
  });

  // Get the saved theme or default to dark
  const savedTheme = store.get('foxden-theme') || 'dark';
  
  // Use the appropriate icon based on the saved theme
  const iconName = savedTheme === 'light' ? 'FENNEC_256x256.png' : 'FOX_256x256.png';
  const iconPath = path.join(__dirname, `src/assets/icons/png/${iconName}`);

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      enableRemoteModule: false,
      // Enable screen capture API
      enableBlinkFeatures: 'GetUserMedia,MediaStreamTrack',
      // Enable hardware acceleration
      enableAcceleratedCanvas: true,
      // Enable desktop capture
      enableDesktopCapture: true
    },
    icon: iconPath,
    frame: false,
    titleBarStyle: 'hidden'
  });

  // Create application menu
  createMenu(mainWindow);
  
  // Create tray icon
  try {
    tray = createTray(mainWindow);
  } catch (error) {
    console.error('Failed to create tray icon:', error);
    // Continue without tray icon
  }

  // Load the index.html
  mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

  // Apply the correct icon after the window has loaded
  mainWindow.webContents.on('did-finish-load', () => {
    const savedTheme = store.get('foxden-theme') || 'dark';
    forceTaskbarIconRefresh(savedTheme);
  });

  // Restore maximized state if needed
  if (windowState.maximized) {
    mainWindow.maximize();
  }

  // Save window state when closing
  mainWindow.on('close', () => {
    const isMaximized = mainWindow.isMaximized();
    const bounds = mainWindow.getBounds();

    store.set('windowState', {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      maximized: isMaximized
    });
  });

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App is ready - create the window
app.whenReady().then(() => {
  createWindow();

  // Set up the display media request handler for screen sharing
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    console.log('Main process: Display media request received');
    
    // Always cancel the browser's native picker because we use our own UI
    // This prevents the browser from showing its own picker and lets us use our custom UI
    callback({ cancel: true });
    
    // Get all available sources to send to our custom UI
    desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true
    }).then((sources) => {
      console.log(`Main process: Found ${sources.length} sources for display media`);
      
      // Send the sources to the renderer for our custom picker
      if (sources.length > 0 && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('screen-share-sources', sources);
      }
    }).catch((error) => {
      console.error('Main process: Error getting sources for display media:', error);
    });
  });

  app.on('activate', () => {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Screen source handler
  ipcMain.handle('get-screen-sources', async () => {
    try {
      console.log('Main: Fetching screen sources with desktopCapturer');
      // Get all available sources (windows and screens)
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 320, height: 180 },
        fetchWindowIcons: true
      });
      
      console.log(`Main: Found ${sources.length} sources`);
      
      // Process sources to proper format for renderer
      return sources.map(source => {
        // Convert thumbnail to data URL
        let thumbnail = null;
        if (source.thumbnail) {
          thumbnail = source.thumbnail.toDataURL();
        }
        
        // Convert appIcon to data URL if it exists
        let appIcon = null;
        if (source.appIcon && source.appIcon.toDataURL) {
          appIcon = source.appIcon.toDataURL();
        }
        
        // Identify source type and return object with metadata for debugging
        const sourceType = source.id.includes('screen:') ? 'screen' : 'window';
        
        return {
          id: source.id,
          name: source.name,
          thumbnail: thumbnail,
          appIcon: appIcon,
          type: sourceType,
          displayId: sourceType === 'screen' ? source.id.split(':')[1] : null
        };
      });
    } catch (error) {
      console.error('Main: Error getting screen sources:', error);
      return [];
    }
  });
  
  // Add a dedicated handler for screen capture
  ipcMain.handle('capture-screen', async (event, { sourceId, options }) => {
    console.log('Main process: Received screen capture request for source:', sourceId);
    
    try {
      // Verify the source exists
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 1, height: 1 } // Minimal size for performance
      });
      
      // Find the source
      const source = sources.find(s => s.id === sourceId);
      if (!source) {
        console.warn(`Main process: Source with ID ${sourceId} not found`);
        return { success: false, error: 'Source not found' };
      }
      
      console.log('Main process: Found source:', source.id, source.name);
      
      // The main process can only help identify if the source exists
      // The actual capture must happen in the renderer
      return { 
        success: true, 
        source: {
          id: source.id,
          name: source.name
        }
      };
    } catch (error) {
      console.error('Main process: Error in screen capture:', error);
      return { success: false, error: error.message };
    }
  });

  // Add a simplified handler to get desktop sources for screen sharing
  ipcMain.handle('get-desktop-sources', async () => {
    try {
      console.log('Main process: Getting desktop sources for screen sharing');
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 1, height: 1 } // Minimal size to improve performance
      });
      
      // Return just the essential information to improve performance
      return sources.map(source => ({
        id: source.id,
        name: source.name,
        type: source.id.includes('screen:') ? 'screen' : 'window'
      }));
    } catch (error) {
      console.error('Error getting desktop sources:', error);
      return [];
    }
  });
}).catch(error => {
  console.error('Error initializing app:', error);
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up when app quits
app.on('quit', () => {
  destroyTray();
});

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// Get display details using Electron's screen API
ipcMain.handle('get-display-info', () => {
  const { screen } = require('electron');
  const displays = screen.getAllDisplays();
  
  return displays.map(display => ({
    id: display.id,
    bounds: display.bounds,
    workArea: display.workArea,
    scaleFactor: display.scaleFactor,
    isPrimary: display.internal,
    rotation: display.rotation,
    size: display.size
  }));
});

// Notification handlers
ipcMain.on('show-notification', (event, { title, body }) => {
  const notification = {
    title,
    body,
    icon: path.join(__dirname, 'src/assets/icons/png/128x128.png')
  };
  
  new Notification(notification).show();
});

// File system handlers
ipcMain.handle('save-attachment', async (event, data, suggestedFilename) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: suggestedFilename,
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!canceled && filePath) {
    try {
      // Convert base64 data to buffer if it's a string
      let buffer;
      if (typeof data === 'string' && data.includes('base64,')) {
        const base64Data = data.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        buffer = Buffer.from(data);
      }
      
      require('fs').writeFileSync(filePath, buffer);
      return { success: true, path: filePath };
    } catch (error) {
      console.error('Error saving file:', error);
      return { success: false, error: error.message };
    }
  }
  
  return { success: false, canceled: true };
});

ipcMain.handle('open-file-dialog', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] },
      { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!canceled && filePaths.length > 0) {
    try {
      const filePath = filePaths[0];
      const fileData = require('fs').readFileSync(filePath);
      const fileName = path.basename(filePath);
      const fileSize = require('fs').statSync(filePath).size;
      const fileType = path.extname(filePath).toLowerCase();
      
      let mimeType;
      switch (fileType) {
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        case '.png':
          mimeType = 'image/png';
          break;
        case '.gif':
          mimeType = 'image/gif';
          break;
        case '.pdf':
          mimeType = 'application/pdf';
          break;
        case '.doc':
        case '.docx':
          mimeType = 'application/msword';
          break;
        case '.txt':
          mimeType = 'text/plain';
          break;
        default:
          mimeType = 'application/octet-stream';
      }
      
      // For images, return base64 data
      let fileContent;
      if (mimeType.startsWith('image/')) {
        fileContent = `data:${mimeType};base64,${fileData.toString('base64')}`;
      } else {
        fileContent = fileData;
      }
      
      return {
        success: true,
        file: {
          name: fileName,
          type: mimeType,
          size: fileSize,
          content: fileContent
        }
      };
    } catch (error) {
      console.error('Error reading file:', error);
      return { success: false, error: error.message };
    }
  }
  
  return { success: false, canceled: true };
});

// Settings store handlers
ipcMain.handle('store-get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store-set', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('store-delete', (event, key) => {
  store.delete(key);
  return true;
});

// Show settings handler
ipcMain.on('show-settings', () => {
  if (mainWindow) mainWindow.webContents.send('open-settings');
});

// Toggle theme handler
ipcMain.on('toggle-theme', () => {
  if (mainWindow) mainWindow.webContents.send('toggle-theme');
});

// Function to force taskbar icon refresh
function forceTaskbarIconRefresh(theme) {
  if (!mainWindow) return;
  
  const iconSize = process.platform === 'win32' ? 256 : 64;
  const iconName = theme === 'light' ? `FENNEC_${iconSize}x${iconSize}.png` : `FOX_${iconSize}x${iconSize}.png`;
  const iconPath = path.join(__dirname, `src/assets/icons/png/${iconName}`);
  
  try {
    const icon = nativeImage.createFromPath(iconPath);
    
    // Set the icon
    mainWindow.setIcon(icon);
    
    // Windows-specific additional techniques
    if (process.platform === 'win32') {
      // Flash the taskbar icon briefly (without flashing the window)
      mainWindow.flashFrame(true);
      setTimeout(() => mainWindow.flashFrame(false), 100);
      
      // Set and clear overlay icon
      mainWindow.setOverlayIcon(icon, '');
      setTimeout(() => mainWindow.setOverlayIcon(null, ''), 150);
      
      // Force a BrowserWindow reload (without reloading content)
      const bounds = mainWindow.getBounds();
      mainWindow.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height + 1
      });
      setTimeout(() => {
        mainWindow.setBounds(bounds);
      }, 200);
    }
    
    console.log(`Forced taskbar icon refresh to ${iconName}`);
  } catch (error) {
    console.error('Error forcing taskbar icon refresh:', error);
  }
}

// Theme changed handler - update application icon
ipcMain.on('theme-changed', (event, theme) => {
  if (!mainWindow) return;
  
  // Store the theme in electron-store for app restart consistency
  store.set('foxden-theme', theme);
  
  // Force taskbar icon refresh
  forceTaskbarIconRefresh(theme);
});

// Detect if running on Wayland (Linux)
ipcMain.handle('check-wayland', () => {
  return process.platform === 'linux' && 
         process.env.XDG_SESSION_TYPE === 'wayland';
});