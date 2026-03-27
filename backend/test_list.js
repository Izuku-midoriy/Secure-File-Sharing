const mongoose = require('mongoose');
const User = require('./models/User');
const File = require('./models/File');

async function test() {
    await mongoose.connect('mongodb://localhost:27017/secure-file-share-test');
    await User.deleteMany({});
    await File.deleteMany({});

    // Register User 1
    const u1 = await User.create({ username: 'user1', email: 'u1@test.com', password: 'password123' });
    // Register User 2
    const u2 = await User.create({ username: 'user2', email: 'u2@test.com', password: 'password123' });

    console.log('User 1 ID:', u1._id);
    console.log('User 2 ID:', u2._id);

    // User 1 uploads File A
    const fileA = await File.create({
        filename: 'fileA.txt',
        originalName: 'fileA.txt',
        encryptedData: Buffer.from('data'),
        size: 100,
        mimeType: 'text/plain',
        uploadedBy: u1._id
    });

    // User 1 shares File A with User 2
    fileA.sharedWith.push({
        user: u2._id,
        permission: 'download',
        grantedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000)
    });
    await fileA.save();

    // User 1 uploads File B
    const fileB = await File.create({
        filename: 'fileB.txt',
        originalName: 'fileB.txt',
        encryptedData: Buffer.from('data'),
        size: 100,
        mimeType: 'text/plain',
        uploadedBy: u1._id
    });

    // List files for User 2 exactly as in listFiles controller
    const files = await File.find({
        $or: [
            { uploadedBy: u2._id.toString() },
            {
                'sharedWith.user': u2._id.toString(),
                'sharedWith.expiresAt': { $gt: new Date() }
            }
        ]
    }).select('-encryptedData -downloadTokens -temporaryLinks');

    console.log('User 2 sees files:', files.map(f => f.originalName));
    process.exit(0);
}
test().catch(console.error);
