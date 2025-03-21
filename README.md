# FoxDen - Discord-Style Voice Channel with Screen/Camera Sharing

This repository contains an implementation of a Discord-style voice channel interface with screen sharing and camera sharing functionality.

## Features

### Voice Channel Interface
- Dark theme design similar to Discord
- Grid layout for participants
- Screen sharing support
- Camera sharing support
- Mute/deafen controls
- Status indicators

### Screen Sharing
- Discord-style selection modal with tabs for:
  - Applications
  - Screens
  - Capture devices
- Quality settings screen with:
  - Resolution options (720p, 1080p, 1440p, Source)
  - Frame rate options (15fps, 30fps, 60fps)
  - Quality presets (Smoother Video, Clearer Video)
- System audio capture option
- Proper UI for displaying screen shares

### Camera Sharing
- Camera can be toggled on/off
- Displays in a participant container with proper styling
- Automatic UI adjustments when camera is active

## Usage

### Screen Sharing
1. Click the 'Share Screen' button in the voice channel controls
2. Select an application, screen, or capture device to share
3. Click "Go Live" to proceed to quality settings
4. Configure your desired quality settings
5. Click "Go Live" again to start sharing
6. To stop sharing, click the 'Share Screen' button again

### Camera Sharing
1. Click the 'Toggle Camera' button in the voice channel controls
2. Grant camera permissions when prompted
3. Your camera will appear in your participant container
4. To turn off your camera, click the 'Toggle Camera' button again

## Implementation Notes

- The screen selection modal uses CSS to create Discord-like styling
- Placeholder icons are used for applications and screens
- Camera sharing uses the browser's getUserMedia API
- The voice.js component handles both screen and camera sharing logic
- UI is automatically adjusted based on active sharing state

## Running the Application

```
npm install
npm start
```

## Known Limitations

- This is a UI demo and may not fully implement all backend functionality
- Some features may require an Electron environment for full functionality
- Screen capture requires proper permissions from the operating system 