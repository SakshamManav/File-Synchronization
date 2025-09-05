# File Synchronization Backend

A basic Express.js server for handling file uploads and synchronization.

## Features

- ✅ File upload (single and multiple)
- ✅ Photo upload from camera (base64)
- ✅ File listing and management
- ✅ File download
- ✅ File deletion
- ✅ CORS enabled for frontend integration
- ✅ Error handling and validation
- ✅ Health check endpoint

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### File Operations
- `GET /api/files` - List all uploaded files
- `POST /api/upload/single` - Upload single file
- `POST /api/upload/multiple` - Upload multiple files
- `POST /api/upload/photo` - Upload photo from camera (base64)
- `GET /api/download/:filename` - Download file
- `DELETE /api/files/:filename` - Delete file

### Sync Status
- `GET /api/sync/status` - Get synchronization status

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

## Configuration

Edit the `.env` file to customize:
- Server port
- File size limits
- Upload directory
- CORS settings

## File Storage

Uploaded files are stored in the `uploads/` directory with unique filenames to prevent conflicts.

## Usage with Frontend

The server is configured to work with your file synchronization frontend. Make sure to update the frontend API calls to point to `https://fcd4e92ceb59f1d1316efb497ce3341f.serveo.net/api/` endpoints.
