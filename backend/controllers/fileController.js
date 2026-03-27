// Controller for file operations with MongoDB storage and sharing
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { encryptFile, decryptFile } = require('../utils/encryption');
const File = require('../models/File');
const User = require('../models/User');
const { hashPassword, comparePassword } = require('../utils/auth');

// Configure multer to use disk storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const userDir = path.join('uploads', String(req.user._id));
        if (!fs.existsSync(userDir)) {
            fs.mkdirSync(userDir, { recursive: true });
        }
        cb(null, userDir);
    },
    filename: function (req, file, cb) {
        cb(null, String(req.user._id) + '_' + Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'))
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

// Generate secure download token
const generateDownloadToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Encrypt buffer data
const encryptBuffer = (buffer) => {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const secretKey = process.env.ENCRYPTION_KEY || 'your-secret-key-here-change-in-production-32-chars';
    const key = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substr(0, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(buffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    // Store IV + encrypted data
    return Buffer.concat([iv, encrypted]);
};

// Decrypt buffer data
const decryptBuffer = (encryptedBuffer) => {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const secretKey = process.env.ENCRYPTION_KEY || 'your-secret-key-here-change-in-production-32-chars';
    const key = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substr(0, 32);

    // Extract IV and encrypted data
    const iv = encryptedBuffer.slice(0, 16);
    const encrypted = encryptedBuffer.slice(16);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted;
};

// Upload file
exports.uploadFile = async (req, res) => {
    try {
        upload.single('file')(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: 'File upload failed: ' + err.message });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            try {
                // Encrypt the file using streams to disk
                const encryptedFilePath = await encryptFile(req.file.path);

                // Save file metadata to MongoDB with user ownership
                const fileDoc = new File({
                    filename: req.file.filename,
                    originalName: `${req.user.username}_${req.file.originalname}`,
                    filePath: encryptedFilePath,
                    size: req.file.size,
                    mimeType: req.file.mimetype,
                    uploadedBy: req.user._id
                });

                await fileDoc.save();

                // Update user's uploaded files
                await User.findByIdAndUpdate(req.user._id, {
                    $push: { uploadedFiles: fileDoc._id }
                });

                res.status(201).json({
                    message: 'File uploaded and encrypted successfully',
                    fileId: fileDoc._id,
                    originalName: req.file.originalname,
                    storedIn: 'mongodb'
                });
            } catch (encryptError) {
                console.error('Encryption error:', encryptError);
                res.status(500).json({ error: 'Encryption failed: ' + encryptError.message });
            }
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Server error during file upload' });
    }
};

// Share file with user
exports.shareFile = async (req, res) => {
    try {
        console.log('shareFile called');
        const { fileId } = req.params;
        const { userId, expiresInHours } = req.body;

        console.log('Request params:', { fileId, userId, expiresInHours });
        console.log('User ID from token:', req.user.id);
        console.log('Requesting user ID type:', typeof req.user.id);

        const file = await File.findById(fileId);

        if (!file) {
            console.log('File not found:', fileId);
            return res.status(404).json({ error: 'File not found' });
        }

        console.log('File found:', file);
        console.log('File uploadedBy:', file.uploadedBy);
        console.log('File uploadedBy type:', typeof file.uploadedBy);
        console.log('File uploadedBy.toString():', file.uploadedBy.toString());
        console.log('req.user.id:', req.user.id);
        console.log('req.user.id type:', typeof req.user.id);

        // Check if user is the file owner
        if (file.uploadedBy.toString() !== req.user._id.toString()) {
            console.log('Access denied - user not file owner');
            console.log('Comparison result:', file.uploadedBy.toString() !== req.user._id.toString());
            console.log('File owner ID:', file.uploadedBy.toString());
            console.log('Requesting user ID:', req.user._id.toString());
            return res.status(403).json({ error: 'Only file owner can share files' });
        }

        console.log('User is file owner, proceeding with sharing');

        // Check if user exists - try by ObjectId first, then by username
        let targetUser;
        try {
            // First try to find by ObjectId
            targetUser = await User.findById(String(userId));
        } catch (error) {
            console.log('Invalid ObjectId, trying username lookup');
        }

        if (!targetUser) {
            // If not found by ObjectId, try by username
            targetUser = await User.findOne({ username: String(userId) });
        }

        if (!targetUser) {
            console.log('Target user not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('Target user found:', targetUser);
        console.log('Target user ID:', targetUser._id);
        console.log('Target user ID type:', typeof targetUser._id);

        // Check if already shared
        const alreadyShared = file.sharedWith.some(
            share => share.user.toString() === targetUser._id.toString()
        );

        if (alreadyShared) {
            console.log('File already shared with this user');
            return res.status(400).json({ error: 'File already shared with this user' });
        }

        // Add sharing permission
        const expiresAt = new Date(Date.now() + (expiresInHours || 24) * 60 * 60 * 1000);

        console.log('Adding sharing permission, expires at:', expiresAt);

        file.sharedWith.push({
            user: targetUser._id,
            permission: 'download',
            grantedAt: new Date(),
            expiresAt
        });

        await file.save();
        console.log('File saved with sharing permission');

        // Update target user's shared files
        await User.findByIdAndUpdate(targetUser._id, {
            $push: { sharedWithMe: fileId }
        });
        console.log('Target user updated with shared file');

        res.json({
            message: 'File shared successfully',
            sharedWith: targetUser.username,
            expiresAt
        });
        console.log('Response sent successfully');
    } catch (error) {
        console.error('Error in shareFile:', error);
        res.status(500).json({ error: 'Server error sharing file' });
    }
};

// Create temporary link
exports.createTemporaryLink = async (req, res) => {
    try {
        console.log('createTemporaryLink called');
        const { fileId } = req.params;
        const { expiresInHours, maxDownloads, password } = req.body;

        console.log('Request params:', { fileId, expiresInHours, maxDownloads, password });
        console.log('User ID:', req.user.id);

        const file = await File.findById(fileId);

        if (!file) {
            console.log('File not found:', fileId);
            return res.status(404).json({ error: 'File not found' });
        }

        // Check if user is the file owner
        if (file.uploadedBy.toString() !== req.user._id.toString()) {
            console.log('Access denied - user not file owner');
            console.log('File owner:', file.uploadedBy.toString());
            console.log('Requesting user:', req.user._id.toString());
            return res.status(403).json({ error: 'Only file owner can create temporary links' });
        }

        console.log('User is file owner, proceeding with link creation');

        // Generate temporary link token
        const token = generateDownloadToken();
        const expiresAt = new Date(Date.now() + (expiresInHours || 24) * 60 * 60 * 1000);

        console.log('Generated token:', token);
        console.log('Expires at:', expiresAt);

        let processedPassword = null;
        if (password) {
            processedPassword = await hashPassword(String(password));
        }

        file.temporaryLinks.push({
            token,
            expiresAt,
            maxDownloads: maxDownloads || 1,
            password: processedPassword
        });

        await file.save();
        console.log('File saved with temporary link');

        res.json({
            message: 'Temporary link created successfully',
            shareUrl: `${process.env.PUBLIC_URL || 'http://localhost:5000'}/api/files/temporary/${token}`,
            expiresAt,
            maxDownloads: maxDownloads || 1,
            hasPassword: !!password
        });
        console.log('Response sent successfully');
    } catch (error) {
        console.error('Error in createTemporaryLink:', error);
        res.status(500).json({ error: 'Server error creating temporary link' });
    }
};

// Download via temporary link
exports.downloadByTemporaryLink = async (req, res) => {
    try {
        const { token } = req.params;
        const password = req.body.password || req.query.password;

        // Find file with valid temporary link
        const file = await File.findOne({
            'temporaryLinks.token': token,
            'temporaryLinks.expiresAt': { $gt: new Date() }
        });

        if (!file) {
            return res.status(404).json({ error: 'Invalid or expired temporary link' });
        }

        // Find the specific temporary link
        const tempLink = file.temporaryLinks.find(link => link.token === token);

        // Check download limit
        if (tempLink.downloadCount >= tempLink.maxDownloads) {
            return res.status(403).json({ error: 'Download limit exceeded' });
        }

        // Check password if required
        if (tempLink.password) {
            const renderPrompt = (title, message, isError = false) => `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: "Courier New", Courier, monospace; background: #000; color: #0f0; padding: 50px; text-align: center; }
                        h2 { color: ${isError ? '#f00' : '#0f0'}; }
                        input { background: #111; color: #0f0; border: 1px solid ${isError ? '#f00' : '#0f0'}; padding: 10px; margin: 10px; width: 250px; font-family: monospace; }
                        input:focus { outline: none; background: #222; }
                        button { background: #0f0; color: #000; border: none; padding: 10px 20px; cursor: pointer; font-weight: bold; font-family: monospace; text-transform: uppercase; }
                        button:hover { background: #fff; }
                        .container { border: 1px solid #0f0; display: inline-block; padding: 40px; border-radius: 4px; box-shadow: 0 0 15px rgba(0,255,0,0.2); }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>$ ${title}</h2>
                        <p>${message}</p>
                        <form method="GET">
                            <input type="password" name="password" placeholder="Enter password_" autofocus required />
                            <br><br>
                            <button type="submit">Unlock File</button>
                        </form>
                    </div>
                </body>
                </html>
            `;

            if (!password) {
                if (req.method === 'GET') {
                    return res.send(renderPrompt('Secure File Transfer', 'This temporary link is password protected.'));
                }
                return res.status(401).json({ error: 'Password required' });
            }

            const isMatch = await comparePassword(String(password), tempLink.password);
            if (!isMatch) {
                if (req.method === 'GET') {
                    return res.send(renderPrompt('ACCESS DENIED', 'Invalid password. The stream was blocked.', true));
                }
                return res.status(401).json({ error: 'Invalid password' });
            }
        }

        // Increment download count
        tempLink.downloadCount += 1;
        await file.save();

        // Set appropriate headers
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);

        // Stream decrypted file data
        if (file.filePath) {
            await decryptFile(file.filePath, res);
        } else if (file.encryptedData) {
            const decryptedBuffer = decryptBuffer(file.encryptedData);
            res.setHeader('Content-Length', decryptedBuffer.length);
            res.send(decryptedBuffer);
        } else {
            return res.status(404).json({ error: 'File data not found' });
        }

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Server error during file download' });
    }
};

// Generate download token for a file
exports.generateDownloadToken = async (req, res) => {
    try {
        const { fileId } = req.params;
        const file = await File.findById(fileId);

        if (!file) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Check if user has access (owner or shared)
        const hasAccess = file.uploadedBy.toString() === req.user._id.toString() ||
            file.sharedWith.some(share =>
                share.user.toString() === req.user._id.toString() &&
                (!share.expiresAt || share.expiresAt > new Date())
            );

        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Generate new download token (valid for 1 hour)
        const token = generateDownloadToken();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        file.downloadTokens.push({
            token: token,
            expiresAt: expiresAt
        });

        await file.save();

        res.json({
            downloadToken: token,
            expiresAt: expiresAt,
            downloadUrl: `/api/files/download/${token}`,
            fileName: file.originalName,
            storedIn: 'mongodb'
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error generating download token' });
    }
};

// Download file using token
exports.downloadFileByToken = async (req, res) => {
    try {
        const { token } = req.params;

        // Find file with valid, non-expired token
        const file = await File.findOne({
            'downloadTokens.token': token,
            'downloadTokens.expiresAt': { $gt: new Date() },
            'downloadTokens.downloaded': false
        });

        if (!file) {
            return res.status(404).json({ error: 'Invalid or expired download token' });
        }

        // Mark token as used
        const tokenIndex = file.downloadTokens.findIndex(t => t.token === token);
        file.downloadTokens[tokenIndex].downloaded = true;
        await file.save();

        // Stream decrypted file data
        if (file.filePath) {
            await decryptFile(file.filePath, res);
        } else if (file.encryptedData) {
            const decryptedBuffer = decryptBuffer(file.encryptedData);
            res.setHeader('Content-Length', decryptedBuffer.length);
            res.send(decryptedBuffer);
        } else {
            return res.status(404).json({ error: 'File data not found' });
        }

    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Server error during file download' });
    }
};

// List files
exports.listFiles = async (req, res) => {
    try {
        console.log('listFiles called for user:', req.user._id);

        // Find files uploaded by user OR shared with user (not expired)
        const files = await File.find({
            $or: [
                { uploadedBy: req.user._id },
                {
                    sharedWith: {
                        $elemMatch: {
                            user: req.user._id,
                            expiresAt: { $gt: new Date() }
                        }
                    }
                }
            ]
        }).select('-encryptedData -downloadTokens -temporaryLinks')
            .populate('uploadedBy', 'username email')
            .populate('sharedWith.user', 'username email')
            .exec();

        console.log('Files found:', files.length);

        // Log each file with ownership info
        files.forEach(file => {
            console.log('File:', file.originalName);
            console.log('- uploadedBy:', file.uploadedBy);
            console.log('- sharedWith:', file.sharedWith);
            console.log('- is owner:', file.uploadedBy && file.uploadedBy._id && file.uploadedBy._id.toString() === req.user.id);
            console.log('- is shared:', file.sharedWith.some(share =>
                share.user && share.user.toString() === req.user.id &&
                (!share.expiresAt || share.expiresAt > new Date())
            ));
        });

        res.json(files);
    } catch (error) {
        console.error('Error in listFiles:', error);
        res.status(500).json({ error: 'Server error fetching files' });
    }
};

// Delete file
exports.deleteFile = async (req, res) => {
    try {
        console.log('deleteFile called');
        const { fileId } = req.params;
        console.log('Request params:', { fileId });
        console.log('User ID from token:', req.user.id);

        const file = await File.findById(fileId);

        if (!file) {
            console.log('File not found:', fileId);
            return res.status(404).json({ error: 'File not found' });
        }

        console.log('File found:', file.originalName);
        console.log('File uploadedBy:', file.uploadedBy.toString());

        // Check if user is the file owner
        if (file.uploadedBy.toString() !== req.user._id.toString()) {
            console.log('Access denied - user not file owner');
            console.log('File owner ID:', file.uploadedBy.toString());
            console.log('Requesting user ID:', req.user._id.toString());
            return res.status(403).json({ error: 'Only file owner can delete files' });
        }

        console.log('User is file owner, proceeding with deletion');

        // Delete file record from MongoDB and disk
        await File.findByIdAndDelete(fileId);
        if (file.filePath) {
            fs.unlink(file.filePath, (err) => {
                if (err) console.error('Error deleting file from disk:', err);
            });
        }
        console.log('File deleted from database and disk');

        // Update user's uploaded files
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { uploadedFiles: fileId }
        });
        console.log('User updated - file removed from uploadedFiles');

        res.json({
            message: 'File deleted successfully',
            storedIn: 'mongodb'
        });
        console.log('Response sent successfully');
    } catch (error) {
        console.error('Error in deleteFile:', error);
        res.status(500).json({ error: 'Server error deleting file' });
    }
};
