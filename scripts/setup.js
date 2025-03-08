/**
 * FoxDen Setup Script
 * 
 * Creates necessary directories and placeholder files for the project.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Root directory
const rootDir = path.resolve(__dirname, '..');

// Directories to create
const directories = [
  'src/assets/icons/png',
  'src/assets/icons/mac',
  'src/assets/icons/win',
  'src/assets/sounds',
  'electron',
];

// Create directories
console.log('Creating directories...');
directories.forEach(dir => {
  const fullPath = path.join(rootDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created: ${dir}`);
  } else {
    console.log(`Directory already exists: ${dir}`);
  }
});

// Create electron menu.js file
console.log('\nCreating Electron menu configuration...');
const menuJsPath = path.join(rootDir, 'electron/menu.js');
const menuJsContent = `/**
 * FoxDen Application Menu
 */
const { app, Menu, shell } = require('electron');

function createMenu(mainWindow) {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Preferences',
          click: () => {
            mainWindow.webContents.send('show-settings');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => { app.quit(); }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/foxden');
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/foxden/issues');
          }
        }
      ]
    }
  ];

  // Add macOS-specific menu items
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = { createMenu };
`;

fs.writeFileSync(menuJsPath, menuJsContent);
console.log('Created: electron/menu.js');

// Create electron tray.js file
console.log('\nCreating Electron tray configuration...');
const trayJsPath = path.join(rootDir, 'electron/tray.js');
const trayJsContent = `/**
 * FoxDen System Tray Icon
 */
const { app, Menu, Tray } = require('electron');
const path = require('path');

let trayInstance = null;

function createTray(mainWindow) {
  // Create tray icon
  const iconPath = path.join(__dirname, '../src/assets/icons/png/16x16.png');
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
  
  return trayInstance;
}

function destroyTray() {
  if (trayInstance) {
    trayInstance.destroy();
    trayInstance = null;
  }
}

module.exports = { createTray, destroyTray };
`;

fs.writeFileSync(trayJsPath, trayJsContent);
console.log('Created: electron/tray.js');

// Create basic placeholder for app icons
console.log('\nCreating placeholder icons...');

// Define placeholder icon SVG content
const placeholderIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="SIZESIZE" height="SIZESIZE" viewBox="0 0 24 24" fill="none" stroke="#FF7518" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 15L12 9L7.5 15" fill="#FF7518"/><circle cx="12" cy="13" r="8" fill="#FF7518" stroke="#FFF"/><text x="8.5" y="16" font-family="Arial" font-size="7" font-weight="bold" fill="white">FD</text></svg>`;

// Create PNG placeholder icons
[16, 32, 64, 128, 256].forEach(size => {
  const iconPath = path.join(rootDir, `src/assets/icons/png/${size}x${size}.png`);
  if (!fs.existsSync(iconPath)) {
    // Write an empty placeholder file - in a real scenario, you'd create actual PNG files
    fs.writeFileSync(iconPath, '');
    console.log(`Created placeholder: ${size}x${size}.png`);
  }
});

// Create Mac and Windows icon placeholders
const macIconPath = path.join(rootDir, 'src/assets/icons/mac/icon.icns');
const winIconPath = path.join(rootDir, 'src/assets/icons/win/icon.ico');

if (!fs.existsSync(macIconPath)) {
  fs.writeFileSync(macIconPath, '');
  console.log('Created placeholder: mac/icon.icns');
}

if (!fs.existsSync(winIconPath)) {
  fs.writeFileSync(winIconPath, '');
  console.log('Created placeholder: win/icon.ico');
}

// Create sound placeholders
const soundsDir = path.join(rootDir, 'src/assets/sounds');
['message.mp3', 'call.mp3', 'notification.mp3'].forEach(sound => {
  const soundPath = path.join(soundsDir, sound);
  if (!fs.existsSync(soundPath)) {
    fs.writeFileSync(soundPath, '');
    console.log(`Created placeholder: sounds/${sound}`);
  }
});

// Update the main.js to import menu and tray modules
console.log('\nUpdating main.js to include menu and tray modules...');
const mainJsPath = path.join(rootDir, 'main.js');
if (fs.existsSync(mainJsPath)) {
  let mainJsContent = fs.readFileSync(mainJsPath, 'utf8');
  
  // Add imports if they don't exist
  if (!mainJsContent.includes('require(\'./electron/menu\')')) {
    const menuImport = "const { createMenu } = require('./electron/menu');\n";
    const trayImport = "const { createTray, destroyTray } = require('./electron/tray');\n";
    
    // Insert after existing requires
    const lastRequireIndex = mainJsContent.lastIndexOf('require(');
    const lastRequireEndIndex = mainJsContent.indexOf('\n', lastRequireIndex);
    
    const beforeRequires = mainJsContent.substring(0, lastRequireEndIndex + 1);
    const afterRequires = mainJsContent.substring(lastRequireEndIndex + 1);
    
    mainJsContent = beforeRequires + menuImport + trayImport + afterRequires;
    
    // Add menu creation in createWindow function if it doesn't exist
    if (!mainJsContent.includes('createMenu(')) {
      mainJsContent = mainJsContent.replace(
        'function createWindow() {',
        'function createWindow() {\n  // Create application menu\n  createMenu(mainWindow);\n'
      );
    }
    
    // Save updated content
    fs.writeFileSync(mainJsPath, mainJsContent);
    console.log('Updated main.js with menu and tray imports');
  } else {
    console.log('main.js already includes the required imports');
  }
} else {
  console.log('Warning: main.js not found, skipping updates');
}

// Add npm scripts if not already present
console.log('\nUpdating package.json scripts...');
const packageJsonPath = path.join(rootDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Make sure scripts section exists
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }
  
  // Add setup script
  packageJson.scripts.setup = 'node scripts/setup.js';
  
  // Update package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Updated package.json with setup script');
} else {
  console.log('Warning: package.json not found, skipping updates');
}

console.log('\nSetup complete! You can now run the application with:');
console.log('npm run dev');