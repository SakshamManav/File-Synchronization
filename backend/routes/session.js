

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Session } = require('../db');
const connectdb = require('../db').connectdb;
const { v4: uuidv4 } = require('uuid');
connectdb();

// Multer storage config: save files in /uploads/<sessionId>/
const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		const sessionId = req.params.sessionId;
		const uploadDir = path.join(__dirname, '..', 'uploads', sessionId);
		fs.mkdirSync(uploadDir, { recursive: true });
		cb(null, uploadDir);
	},
	filename: function (req, file, cb) {
		// Add timestamp to avoid name conflicts
		const timestamp = Date.now();
		const ext = path.extname(file.originalname);
		const nameWithoutExt = path.basename(file.originalname, ext);
		const uniqueName = `${nameWithoutExt}_${timestamp}${ext}`;
		cb(null, uniqueName);
	}
});
const upload = multer({ storage });


// POST /api/message/:sessionId
// Accepts a text message and stores it in the session's messages array
router.post('/api/message/:sessionId', async (req, res) => {
	const { sessionId } = req.params;
	const { text } = req.body;
	if (!text || typeof text !== 'string' || !text.trim()) {
		return res.status(400).json({ error: 'Message text is required' });
	}
	let sess = await Session.findOne({ sessionId });
	if (!sess) {
		return res.status(404).json({ error: 'Session not found' });
	}
	sess.messages.push({ text: text.trim() });
	await sess.save();
	res.json({ success: true });
});



// GET /preview/:sessionId/:filename - Serve file inline for preview (images, pdf, etc.)
router.get('/preview/:sessionId/:filename', (req, res) => {
	const { sessionId, filename } = req.params;
	const filePath = path.join(__dirname, '..', 'uploads', sessionId, filename);
	if (!fs.existsSync(filePath)) {
		return res.status(404).send('File not found');
	}
	res.sendFile(filePath);
});


// POST /api/upload/:sessionId
// Accepts file upload, saves to /uploads/sessionId/, updates session in DB
router.post('/api/upload/:sessionId', upload.single('file'), async (req, res) => {
  const { sessionId } = req.params;
  console.log(`[DEBUG] Upload request for sessionId: ${sessionId}`);
  
  const file = req.file;
  console.log(`[DEBUG] File received:`, file);
  
  if (!file) {
    console.log(`[DEBUG] No file in request`);
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  console.log(`[DEBUG] File details:`, {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    destination: file.destination,
    filename: file.filename,
    path: file.path
  });
  
  // Check if file was actually saved to disk
  if (fs.existsSync(file.path)) {
    console.log(`[DEBUG] File successfully saved to: ${file.path}`);
  } else {
    console.log(`[DEBUG] ERROR: File NOT found at: ${file.path}`);
  }
  
  let sess = await Session.findOne({ sessionId });
  if (!sess) {
    console.log(`[DEBUG] Session not found: ${sessionId}`);
    return res.status(404).json({ error: 'Session not found' });
  }
  
  console.log(`[DEBUG] Session found, adding file to session...`);
  
  // Add file info to session
	sess.uploads.push({
		filename: file.filename, // actual saved filename (with timestamp)
		originalname: file.originalname,
		size: file.size,
		uploadedAt: Date.now(),
	});
  sess.status = 'completed';
  await sess.save();
  
  console.log(`[DEBUG] Session updated successfully. Total uploads: ${sess.uploads.length}`);
  
  res.json({ success: true, file: file.originalname, savedTo: file.path });
});

const { renderDownloadsPage } = require('../templates/downloadsTemplate');

// GET /downloads/:sessionId - Show download page for a session
router.get('/downloads/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  console.log(`[DEBUG] Download page request for sessionId: ${sessionId}`);
  
	let sess = await Session.findOne({ sessionId });
  if (!sess) {
    return res.status(404).send('<h1>Session not found</h1>');
  }
  
	// Get actual files from disk
	const diskUploads = loadUploadsForSession(sessionId);

	// Build messages HTML
	let messagesHtml = '';
	if (sess.messages && sess.messages.length > 0) {
		messagesHtml = '<div class="messages-list" style="margin-bottom:2em;">' +
			'<h3 style="margin-bottom:0.5em;color:#1976d2;">Messages</h3>' +
			sess.messages.map(m =>
				`<div style="background:#f1f8ff;padding:0.7em 1em;border-radius:8px;margin-bottom:0.5em;max-width:90%;word-break:break-word;">
					<span style="color:#333;">${m.text}</span><br>
					<span style="font-size:0.85em;color:#888;">${new Date(m.sentAt).toLocaleString()}</span>
				</div>`
			).join('') + '</div>';
	}

	let fileListHtml = '';
	// If session expired, remove files from disk and mark session expired
	if (sess.expiresAt && new Date() > sess.expiresAt) {
		console.log(`[DEBUG] Session expired: ${sessionId} - removing uploads`);
		const uploadDir = path.join(__dirname, '..', 'uploads', sessionId);
		try {
			if (fs.existsSync(uploadDir)) {
				// remove directory and its contents
				fs.rmSync(uploadDir, { recursive: true, force: true });
				console.log(`[DEBUG] Removed upload directory: ${uploadDir}`);
			}
		} catch (err) {
			console.error(`[DEBUG] Failed to remove upload dir for ${sessionId}:`, err);
		}
		sess.status = 'expired';
		sess.uploads = [];
		await sess.save();
		fileListHtml = '<p>Session has ended and uploaded files have been removed.</p>';
		messagesHtml = '';
		const htmlExpired = renderDownloadsPage({ sessionId, status: sess.status, fileListHtml, messagesHtml });
		return res.send(htmlExpired);
	}
	if (diskUploads.length === 0) {
		fileListHtml = '<p>No files uploaded yet.</p>';
	} else {
		fileListHtml = diskUploads.map(file => 
			`<li><a href="/download/${sessionId}/${encodeURIComponent(file.filename)}" download>${file.filename}</a> (${(file.size / 1024).toFixed(1)} KB)</li>`
		).join('');
		fileListHtml = `<ul>${fileListHtml}</ul>`;
	}

	// Prepend messages above files
	const html = renderDownloadsPage({ sessionId, status: sess.status, fileListHtml, messagesHtml });
	res.send(html);
});

// GET /download/:sessionId/:filename - Download individual file
router.get('/download/:sessionId/:filename', (req, res) => {
	const { sessionId, filename } = req.params;
	const filePath = path.join(__dirname, '..', 'uploads', sessionId, filename);
	console.log(`[DEBUG] Download request for file: ${filePath}`);
	if (!fs.existsSync(filePath)) {
		return res.status(404).send('File not found');
	}
		// Always force download in browser
		res.download(filePath, filename);
});

// POST /
// Creates a new session and returns sessionId, uploadUrl, and expiry
router.post('/', async (req, res) => {
	try {
	const sessionId = uuidv4();
	const ttlSeconds = 60 * 15; // 15 minutes
	const sess = await createSession(sessionId, ttlSeconds);
	const uploadUrl = `https://file-synchronization.onrender.com/api/upload/${sessionId}`;
		res.json({
			sessionId,
			uploadUrl,
			expiresAt: sess.expiresAt,
		});
	} catch (err) {
		res.status(500).json({ error: 'Failed to create session', details: err.message });
	}
});

// GET /:sessionId/status
// Returns session status and list of uploaded files. If session not found, returns 404.
router.get('/:sessionId/status', async (req, res) => {
	const { sessionId } = req.params;
	let sess = await Session.findOne({ sessionId });

	// If session doesn't exist, try to recover by checking uploads folder
	if (!sess) {
		const uploads = loadUploadsForSession(sessionId);
		if (uploads.length > 0) {
	sess = await createSession(sessionId);
	sess.uploads = uploads;
	sess.status = 'completed';
			await sess.save();
		} else {
			return res.status(404).json({ error: 'session not found' });
		}
	}

		// If this status request came from a mobile/browser (not the extension), mark connection_created
		try {
			const origin = req.get('origin') || '';
			const ua = (req.get('user-agent') || '').toLowerCase();
			const isExtension = origin.startsWith('chrome-extension://') || ua.includes('chrome-extension');
			if (!sess.connection_created && !isExtension) {
				sess.connection_created = true;
				await sess.save();
				console.log(`[DEBUG] Marked connection_created=true for session ${sessionId}`);
			}
		} catch (e) {
			// ignore
		}

		// Check expiry
	if (sess.expiresAt && new Date() > sess.expiresAt) {
		sess.status = 'expired';
		await sess.save();
	}

	// Ensure uploads array reflects disk state (best-effort)
	const diskUploads = loadUploadsForSession(sessionId);
	if (diskUploads.length !== sess.uploads.length) {
		let newStatus = sess.status;
		if (diskUploads.length > 0 && sess.status === 'waiting') newStatus = 'completed';
		await Session.findOneAndUpdate(
			{ sessionId },
			{ uploads: diskUploads, status: newStatus },
			{ new: true }
		);
		// Reload session after update
		sess = await Session.findOne({ sessionId });
	}
	// Build response uploads with download URL path (relative)
	const uploadsResp = sess.uploads.map((u) => ({
		filename: u.filename,
	size: u.size,
	uploadedAt: u.uploadedAt,
	url: `/download/${sessionId}/${encodeURIComponent(u.filename)}`,
	}));

	return res.json({
	sessionId: sess.sessionId,
	status: sess.status,
	connection_created: !!sess.connection_created,
	uploads: uploadsResp,
		expiresAt: sess.expiresAt,
		messages: (sess.messages || []).map(m => ({
			text: m.text,
			sentAt: m.sentAt
		}))
	});
});

// Helper: create a session in DB
async function createSession(sessionId, ttlSeconds = 60 * 15) {
	const now = new Date();
	const expiresAt = ttlSeconds ? new Date(now.getTime() + ttlSeconds * 1000) : null;
	const sess = new Session({
		sessionId,
	createdAt: now,
	expiresAt,
	uploads: [],
		status: 'waiting',
	});
	await sess.save();
	return sess;
}

// Helper: load uploads from disk for a session (if folder exists)
function loadUploadsForSession(sessionId) {
	const uploadDir = path.join(__dirname, '..', 'uploads', sessionId);
	if (!fs.existsSync(uploadDir)) return [];
	try {
		const files = fs.readdirSync(uploadDir);
		return files.map((f) => {
			const stat = fs.statSync(path.join(uploadDir, f));
			return { filename: f, size: stat.size, uploadedAt: stat.mtimeMs };
		});
	} catch (err) {
		return [];
	}
}

// Export router and session helpers
module.exports = { router, createSession };
