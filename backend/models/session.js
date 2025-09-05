const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Session } = require('../db');
const connectdb = require('../db').connectdb;
connectdb();

// ----------------------
// API design (endpoints)
// ----------------------
// POST /session
//   - purpose: create a brand-new sessionId and return the upload URL (goes into QR)
//   - response: { sessionId, uploadUrl, expiresAt? }
//
// POST /upload/:sessionId
//   - purpose: accept file(s) for given sessionId; store files; notify waiting client
//   - behavior: store files in ../uploads/<sessionId>/ and append metadata to session
//
// GET /uploads/:filename
//   - purpose: serve stored file or provide a redirect/presigned URL
//
// GET /session/:sessionId/status  (implemented here)
//   - purpose: return session status and list of uploaded files
//   - response: { sessionId, status, uploads: [{ filename, size, url?, uploadedAt }], expiresAt }

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

// GET /session/:sessionId/status
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

  // Check expiry
  if (sess.expiresAt && new Date() > sess.expiresAt) {
    sess.status = 'expired';
    await sess.save();
  }

  // Ensure uploads array reflects disk state (best-effort)
  const diskUploads = loadUploadsForSession(sessionId);
  if (diskUploads.length !== sess.uploads.length) {
    sess.uploads = diskUploads;
    if (diskUploads.length > 0 && sess.status === 'waiting') sess.status = 'completed';
    await sess.save();
  }

  // Build response uploads with download URL path (relative)
  const uploadsResp = sess.uploads.map((u) => ({
    filename: u.filename,
    size: u.size,
    uploadedAt: u.uploadedAt,
    url: `/uploads/${encodeURIComponent(u.filename)}`,
  }));

  return res.json({
    sessionId: sess.sessionId,
    status: sess.status,
    uploads: uploadsResp,
    expiresAt: sess.expiresAt,
  });
});

// Export router and session helpers
module.exports = { router, createSession };
