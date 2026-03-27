// Encryption utilities for secure file handling using Streams (Fix for Memory Exhaustion DoS)
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

// Encryption configuration
const algorithm = 'aes-256-cbc';
const secretKey = process.env.ENCRYPTION_KEY || 'your-secret-key-here-change-in-production-32-chars';
// Use a secure key derivation function if needed, but for now stick to original hash logic
const key = crypto.createHash('sha256').update(String(secretKey)).digest('base64').substring(0, 32);

// Encrypt file using Streams
exports.encryptFile = async (filePath) => {
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);

        const encryptedFilePath = filePath + '.encrypted';

        const readStream = fs.createReadStream(filePath);
        const writeStream = fs.createWriteStream(encryptedFilePath);

        // Write the raw 16-byte IV to the beginning of the file
        writeStream.write(iv);

        // Pipe the file data through the cipher to the write stream
        await pipeline(readStream, cipher, writeStream);

        // Delete original file asynchronously
        fs.unlink(filePath, (err) => { if (err) console.error('Error deleting file:', err); });

        return encryptedFilePath;
    } catch (error) {
        throw new Error('Streaming encryption failed: ' + error.message);
    }
};

// Decrypt file using Streams
exports.decryptFile = async (encryptedFilePath, responseStream) => {
    try {
        // Read the first 16 bytes for the IV
        const fileDescriptor = fs.openSync(encryptedFilePath, 'r');
        const iv = Buffer.alloc(16);
        fs.readSync(fileDescriptor, iv, 0, 16, 0);
        fs.closeSync(fileDescriptor);

        const decipher = crypto.createDecipheriv(algorithm, key, iv);

        // Create read stream skipping the first 16 bytes (IV)
        const readStream = fs.createReadStream(encryptedFilePath, { start: 16 });

        if (responseStream) {
            // Pipe directly to HTTP response
            await pipeline(readStream, decipher, responseStream);
            return null;
        } else {
            // Write to disk
            const decryptedFilePath = encryptedFilePath.replace('.encrypted', '.decrypted');
            const writeStream = fs.createWriteStream(decryptedFilePath);
            await pipeline(readStream, decipher, writeStream);
            return decryptedFilePath;
        }
    } catch (error) {
        throw new Error('Streaming decryption failed: ' + error.message);
    }
};

// Generate encryption key
exports.generateKey = () => {
    return crypto.randomBytes(32).toString('hex');
};
