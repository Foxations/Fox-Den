const { app, BrowserWindow, ipcMain, shell, Menu, Tray, dialog, nativeImage, desktopCapturer } = require('electron');
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

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, 'src/assets/icons/png/FOX_64x64.png'),
    titleBarStyle: 'hidden',
    frame: false,
    backgroundColor: '#121212'
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

  app.on('activate', () => {
    // On macOS it's common to re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
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

// Screen sharing source detection
ipcMain.handle('get-screen-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true
    });
    
    // Process sources to add additional metadata
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      displayId: source.display_id,
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null,
      thumbnail: source.thumbnail.toDataURL(),
      type: source.id.includes('screen') ? 'screen' : 'window',
    }));
  } catch (error) {
    console.error('Error getting screen sources:', error);
    return [];
  }
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

// Detect if running on Wayland (Linux)
ipcMain.handle('check-wayland', () => {
  return process.platform === 'linux' && 
         process.env.XDG_SESSION_TYPE === 'wayland';
});