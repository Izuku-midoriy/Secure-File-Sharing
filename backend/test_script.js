const mongoose = require('mongoose');
const { Schema } = mongoose;
const FileSchema = new Schema({ uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' }, sharedWith: [{ user: { type: Schema.Types.ObjectId, ref: 'User' }, expiresAt: Date }] });
const File = mongoose.model('File', FileSchema);
const UserSchema = new Schema({ username: String });
const User = mongoose.model('User', UserSchema);

async function run() {
    await mongoose.connect('mongodb://localhost:27017/secure-file-share-test');
    await File.deleteMany({});
    await User.deleteMany({});

    const u1 = await User.create({ username: 'u1' });
    const u2 = await User.create({ username: 'u2' });

    // u1 uploads F1
    const f1 = await File.create({ uploadedBy: u1._id });

    // u1 shares F1 with u2
    f1.sharedWith.push({ user: u2._id, expiresAt: new Date(Date.now() + 1000000) });
    await f1.save();

    // u1 uploads F2
    const f2 = await File.create({ uploadedBy: u1._id });

    // u2 calls listFiles
    const files = await File.find({
        $or: [
            { uploadedBy: u2._id },
            {
                'sharedWith.user': u2._id,
                'sharedWith.expiresAt': { $gt: new Date() }
            }
        ]
    });

    console.log('u2 sees files:', files.length, files.map(f => f._id.toString()), 'expected to only see F1:', f1._id.toString());
    process.exit(0);
}
run().catch(console.error);
