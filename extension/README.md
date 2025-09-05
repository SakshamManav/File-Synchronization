# File Sync QR Extension

A Chrome extension that generates QR codes for mobile-to-laptop file synchronization.

## Features

- **Instant QR Generation**: Click the extension icon to generate a unique QR code
- **Mobile File Upload**: Scan QR with mobile to upload files
- **Auto Downloads Page**: Automatically opens downloads page when files are received
- **Session Management**: 15-minute session persistence
- **Real-time Updates**: Polls for uploaded files every 3 seconds

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. The extension icon should appear in your toolbar

## Usage

1. **Click Extension Icon**: Opens popup with QR code
2. **Scan QR on Mobile**: Use mobile camera/QR scanner
3. **Upload Files**: Select and send files from mobile
4. **Auto-Redirect**: Downloads page opens automatically on laptop
5. **Manage Session**: Generate new QR or open downloads manually

## Files

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup interface  
- `popup.js` - Main extension logic
- `background.js` - Background service worker
- `README.md` - This file

## Technical Details

- **API Endpoint**: Uses your Serveo tunnel for backend communication
- **Session Storage**: Chrome storage API for session persistence
- **QR Generation**: Google Charts QR API for code generation
- **Polling**: 3-second intervals to check for uploaded files
- **Auto-cleanup**: Expired sessions removed every 5 minutes

## Customization

To change the backend URL, update the `API_BASE_URL` in `popup.js`:

```javascript
const API_BASE_URL = 'https://your-tunnel-url.serveo.net';
```
