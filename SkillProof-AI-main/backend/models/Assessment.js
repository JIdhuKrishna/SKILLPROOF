const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema(
    {
        profileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Profile',
            required: true,
        },
        status: {
            type: String,
            enum: ['Pending', 'Completed'],
            default: 'Pending',
        },
        questions: [
            {
                type: {
                    type: String,
                    enum: ['mcq', 'coding'],
                    default: 'mcq',
                    required: true
                },
                category: {
                    type: String,
                    enum: ['technical', 'logical', 'critical'],
                    required: true,
                    default: 'technical'
                },
                questionText: { type: String }, // For MCQ
                options: [{ type: String }], // For MCQ
                correctAnswer: { type: String }, // For MCQ
                problemStatement: { type: String }, // For Coding
                initialCode: { type: String }, // For Coding
                expectedOutputDescription: { type: String }, // For Coding
                userAnswer: { type: String, default: '' },
            }
        ],
        finalScore: {
            type: Number
        },
        technicalScore: { type: Number, default: 0 },
        logicalScore: { type: Number, default: 0 },
        criticalScore: { type: Number, default: 0 },
        industry: { type: String },
        startTime: {
            type: Date,
        },
        endTime: {
            type: Date,
        },
        tabSwitchCount: {
            type: Number,
            default: 0,
        },
        copyPasteCount: {
            type: Number,
            default: 0,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Assessment', assessmentSchema);
