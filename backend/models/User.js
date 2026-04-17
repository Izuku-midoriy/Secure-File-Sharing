// User model for authentication and file ownership
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    uploadedFiles: [{
        type: Schema.Types.ObjectId,
        ref: 'File'
    }],
    sharedWithMe: [{
        type: Schema.Types.ObjectId,
        ref: 'File'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    sessionVersion: {
        type: Number,
        default: 0
    },
    sessionExpiresAt: {
        type: Date,
        default: null
    }
});

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
