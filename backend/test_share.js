const mongoose = require('mongoose');
const User = require('./models/User');
const File = require('./models/File');
const fs = require('fs');

async function check() {
    await mongoose.connect('mongodb://localhost:27017/secure-file-share');

    // Find kunal and izuku
    const kunal = await User.findOne({ username: 'kunal' });
    const izuku = await User.findOne({ username: 'izuku' });

    if (!kunal || !izuku) { console.log('Missing users'); return process.exit(1); }

    // Upload a dummy file for kunal
    const f = new File({
        filename: 'kunal_share_test.txt',
        originalName: 'kunal_share_test.txt',
        encryptedData: Buffer.from('data'),
        size: 100,
        mimeType: 'text/plain',
        uploadedBy: kunal._id
    });
    await f.save();

    console.log('File created by kunal:', f._id);

    // Try to share the file with izuku using the exact logic from shareFile
    const fileId = f._id;
    const userId = izuku.username; // req.body.userId comes as username from the frontend

    const file = await File.findById(fileId);

    console.log('Comparing:', typeof file.uploadedBy.toString(), file.uploadedBy.toString(), '===', typeof kunal._id.toString(), kunal._id.toString());

    if (file.uploadedBy.toString() !== kunal._id.toString()) {
        console.log('Access denied - user not file owner');
    } else {
        console.log('Owner check passed!');
    }

    process.exit(0);
}

check().catch(console.error);
