// Routes for file operations with authentication and sharing
const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { authenticateToken } = require('../utils/auth');
const { strictLimiter } = require('../utils/rateLimiters');

// Download file using token (publicly accessible via unique generated URL)
router.get('/download/:token', fileController.downloadFileByToken);

// Download via temporary link with strict rate limiting for password protection
router.post('/temporary/:token', strictLimiter, fileController.downloadByTemporaryLink);
router.get('/temporary/:token', strictLimiter, fileController.downloadByTemporaryLink);

// All remaining file operations require JWT authentication
router.use(authenticateToken);

// Upload file
router.post('/upload', fileController.uploadFile);

// Share file with user
router.post('/:fileId/share', fileController.shareFile);

// Create temporary link
router.post('/:fileId/temporary-link', fileController.createTemporaryLink);

// Generate download token for a file
router.post('/:fileId/token', fileController.generateDownloadToken);

// List files (user's own + shared with user)
router.get('/list', fileController.listFiles);

// Delete file
router.delete('/:fileId', fileController.deleteFile);

module.exports = router;
