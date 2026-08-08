const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: ['Candidate', 'Recruiter'],
            default: 'Candidate',
        },
        // Link to the professional profile
        profile: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Profile'
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
