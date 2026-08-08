const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        rawText: {
            type: String,
            required: true,
        },
        fullName: {
            type: String,
            default: '',
        },
        email: {
            type: String,
            default: '',
        },
        extractedSkills: {
            type: [String],
            default: [],
        },
        experienceSummary: {
            type: String,
            default: '',
        },
        education: [
            {
                institution: String,
                degree: String,
            }
        ],
        suggestedRole: {
            type: String,
            default: '',
        },
        detectedIndustry: {
            type: String,
            default: '',
        },
        overallScore: {
            type: Number,
            default: 0,
        },
        trustScore: {
            type: Number,
            default: 100,
        },
        aiDependencyIndex: {
            type: Number,
            default: 0,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Profile', profileSchema);
