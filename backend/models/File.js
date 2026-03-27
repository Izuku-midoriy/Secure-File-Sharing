// Mongoose model for File with ownership and sharing
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// GridFS file schema for metadata
const fileSchema = new Schema({
    filename: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    filePath: {
        type: String
    },
    encryptedData: {
        type: Schema.Types.Buffer
    },
    size: {
        type: Number,
        required: true
    },
    mimeType: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sharedWith: [{
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        permission: {
            type: String,
            enum: ['download'],
            default: 'download'
        },
        grantedAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date
        }
    }],
    temporaryLinks: [{
        token: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date,
            required: true
        },
        maxDownloads: {
            type: Number,
            default: 1
        },
        downloadCount: {
            type: Number,
            default: 0
        },
        password: {
            type: String,
            default: null
        }
    }],
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    downloadTokens: [{
        token: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        expiresAt: {
            type: Date,
            required: true
        },
        downloaded: {
            type: Boolean,
            default: false
        }
    }]
});

// Auto-cleanup used to drop entire documents via TTL index, removed due to data loss risks.
// A node-cron job now handles token cleanup instead.

// Middleware to automatically delete the physical file when a document is deleted
fileSchema.post('findOneAndDelete', async function(doc) {
    if (doc && doc.filePath) {
        const fs = require('fs');
        try {
            if (fs.existsSync(doc.filePath)) {
                fs.unlinkSync(doc.filePath);
                console.log(`[File Cleanup] Deleted orphaned file from disk: ${doc.filePath}`);
            }
        } catch (error) {
            console.error(`[File Cleanup] Error deleting file from disk: ${error.message}`);
        }
    }
});

fileSchema.post('deleteOne', { document: true, query: false }, async function(doc) {
    if (doc && doc.filePath) {
        const fs = require('fs');
        try {
            if (fs.existsSync(doc.filePath)) {
                fs.unlinkSync(doc.filePath);
                console.log(`[File Cleanup] Deleted orphaned file from disk: ${doc.filePath}`);
            }
        } catch (error) {
            console.error(`[File Cleanup] Error deleting file from disk: ${error.message}`);
        }
    }
});

module.exports = mongoose.model('File', fileSchema);
