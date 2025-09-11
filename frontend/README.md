# File Sync QR - Frontend Web Application

This is a web-based version of the File Sync QR system that allows you to use QR code functionality without needing to deploy a Chrome extension.

## Features

- **Generate QR Codes**: Create QR codes for mobile devices to upload files
- **Scan QR Codes**: Scan existing QR codes and transfer data to other websites
- **No Extension Required**: Works directly in web browsers
- **Mobile Friendly**: Responsive design for all devices
- **Real-time Updates**: Live status updates and automatic file detection

## Files Structure

```
frontend/
├── home.html          # Landing page with navigation options
├── index.html         # QR code generator (main file sync functionality)
├── scanner.html       # QR code scanner for redirecting data
├── app.js            # Main application logic for QR generation
├── scanner.js        # QR scanner functionality
├── styles.css        # Styles for QR generator
├── scanner-styles.css # Styles for QR scanner
├── sw.js             # Service worker for offline support
└── README.md         # This file
```

## How to Use

### 1. QR Code Generator (File Transfer)
1. Open `index.html` in your browser
2. A QR code will be automatically generated
3. Scan the QR code with your mobile device
4. Upload files from your mobile
5. Files will be automatically available for download

### 2. QR Code Scanner (Data Transfer)
1. Open `scanner.html` in your browser
2. Click "Start Scanner" to activate your camera
3. Point your camera at any QR code
4. Enter the target website URL where you want to send the data
5. Choose how to transfer the data:
   - **POST Request**: Send data via HTTP POST
   - **URL Parameters**: Add data as URL parameters
   - **New Tab**: Open target site with data in sessionStorage

### 3. Navigation
- Use `home.html` as the main landing page to choose between functionalities

## Setup and Deployment

### Local Development
1. Simply open the HTML files in a web browser
2. For full functionality, serve the files through a web server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   
   # Using PHP
   php -S localhost:8000
   ```

### Web Deployment
1. Upload all files in the `frontend/` folder to your web hosting service
2. Access `home.html` as the main entry point
3. Ensure HTTPS is enabled for camera access in the scanner

## API Configuration

The application is configured to work with the backend API at:
```
https://file-synchronization.onrender.com
```

To change the API endpoint, modify the `API_BASE_URL` constant in `app.js`:
```javascript
const API_BASE_URL = 'your-backend-url-here';
```

## Browser Compatibility

- **QR Generator**: Works in all modern browsers
- **QR Scanner**: Requires browsers with camera API support:
  - Chrome 53+
  - Firefox 36+
  - Safari 11+
  - Edge 12+

## Security Notes

- Camera access requires HTTPS in production
- QR scanner respects browser security policies
- Data transfer methods include proper error handling
- Session data is stored locally and expires automatically

## Troubleshooting

### Camera Not Working
- Ensure HTTPS is enabled
- Grant camera permissions when prompted
- Check if camera is being used by another application

### QR Code Not Generating
- Check internet connection
- Verify backend API is accessible
- Check browser console for errors

### File Transfer Issues
- Ensure backend server is running
- Check if session has expired (15 minutes)
- Verify API endpoint configuration

## Customization

### Styling
- Modify `styles.css` for QR generator appearance
- Edit `scanner-styles.css` for scanner interface
- Both files use CSS custom properties for easy theming

### Functionality
- Add new transfer methods in `scanner.js`
- Modify session handling in `app.js`
- Extend API integration as needed

## Benefits Over Chrome Extension

1. **No Installation Required**: Works immediately in any browser
2. **Cross-Platform**: Runs on desktop, mobile, and tablets
3. **No Store Approval**: Deploy instantly without app store review
4. **Easy Updates**: Update files directly on your server
5. **Cost-Effective**: No Chrome Web Store developer fees
