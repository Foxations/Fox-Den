/**
 * FoxDen System Tray Icon
 */
const { app, Menu, Tray, ipcMain } = require('electron');
const path = require('path');

let trayInstance = null;
let currentTheme = 'dark';

function createTray(mainWindow) {
  // Create tray icon using the FOX icon for dark theme (default)
  const iconPath = path.join(__dirname, '../src/assets/icons/png/FOX_16x16.png');
  trayInstance = new Tray(iconPath);
  
  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open FoxDen', 
      click: () => { 
        mainWindow.show(); 
      } 
    },
    { 
      label: 'Status',
      submenu: [
        { 
          label: 'Online',
          type: 'radio',
          checked: true,
          click: () => {
            mainWindow.webContents.send('status-change', 'online');
          }
        },
        { 
          label: 'Away',
          type: 'radio',
          click: () => {
            mainWindow.webContents.send('status-change', 'idle');
          }
        },
        { 
          label: 'Do Not Disturb',
          type: 'radio',
          click: () => {
            mainWindow.webContents.send('status-change', 'dnd');
          }
        },
        { 
          label: 'Invisible',
          type: 'radio',
          click: () => {
            mainWindow.webContents.send('status-change', 'offline');
          }
        }
      ]
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => { 
        app.quit(); 
      } 
    }
  ]);
  
  trayInstance.setToolTip('FoxDen');
  trayInstance.setContextMenu(contextMenu);
  
  trayInstance.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
  
  // Listen for theme change events
  ipcMain.on('theme-changed', (event, theme) => {
    updateTrayIcon(theme);
  });
  
  return trayInstance;
}

function updateTrayIcon(theme) {
  if (!trayInstance) return;
  
  currentTheme = theme || currentTheme;
  
  const iconName = currentTheme === 'light' ? 'FENNEC_16x16.png' : 'FOX_16x16.png';
  const iconPath = path.join(__dirname, `../src/assets/icons/png/${iconName}`);
  
  trayInstance.setImage(iconPath);
}

function destroyTray() {
  if (trayInstance) {
    trayInstance.destroy();
    trayInstance = null;
  }
}

module.exports = { createTray, destroyTray, updateTrayIcon };
