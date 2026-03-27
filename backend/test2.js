const mongoose = require('mongoose');
const User = require('./models/User');
const File = require('./models/File');

async function test() {
    await mongoose.connect('mongodb://localhost:27017/secure-file-share');

    const izuku = await User.findOne({ username: 'izuku' });
    const kunal = await User.findOne({ username: 'kunal' });

    if (!izuku || !kunal) { console.log('Users not found'); return process.exit(0); }

    const izukuFiles = await File.find({
        $or: [
            { uploadedBy: izuku._id },
            {
                sharedWith: {
                    $elemMatch: {
                        user: izuku._id,
                        expiresAt: { $gt: new Date() }
                    }
                }
            }
        ]
    }).populate('uploadedBy', 'username');

    const kunalFiles = await File.find({
        $or: [
            { uploadedBy: kunal._id },
            {
                sharedWith: {
                    $elemMatch: {
                        user: kunal._id,
                        expiresAt: { $gt: new Date() }
                    }
                }
            }
        ]
    }).populate('uploadedBy', 'username');

    console.log('--- IZUKU SEES ---');
    izukuFiles.forEach(f => console.log(f.originalName, f.uploadedBy.username));

    console.log('--- KUNAL SEES ---');
    kunalFiles.forEach(f => console.log(f.originalName, f.uploadedBy.username));

    process.exit(0);
}
test().catch(console.error);
