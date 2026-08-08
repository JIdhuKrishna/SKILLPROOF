const express = require('express');
const router = express.Router();
const multer = require('multer');
const Profile = require('../models/Profile');
const Assessment = require('../models/Assessment');
const { extractResumeData, generateUniversalAssessment } = require('../utils/aiHandler');
const { protect } = require('../middleware/authMiddleware');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    // Increased to 10MB to handle high-resolution professional PDFs/scans
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
});

// @desc    Upload resume, parse PDF and save to Profile
// @route   POST /api/upload/resume
router.post('/resume', protect, upload.single('resume'), async (req, res) => {
    try {
        console.log("\n📥 [ROUTE] POST /api/upload/resume hit at", new Date().toLocaleTimeString());

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log('Processing file for user:', req.user._id);

        // Confirmation log for multimodal extraction
        const resumeText = "Extracted directly via Gemini Multimodal PDF Understanding";

        let aiData;
        try {
            // Call AI specialized utility to extract resume data from PDF Buffer directly
            aiData = await extractResumeData(req.file.buffer);
        } catch (aiError) {
            console.error('AI API Timeout or Parsing Error:', aiError.message);
            return res.status(502).json({
                success: false,
                message: 'Error processing resume due to AI service failure or malformed response',
                error: aiError.message
            });
        }

        // Save or Update the Profile in MongoDB
        // FIXED: Using returnDocument: 'after' to resolve Mongoose deprecation warning
        const profile = await Profile.findOneAndUpdate(
            { userId: req.user._id },
            {
                rawText: resumeText,
                fullName: aiData.fullName || 'Not specified',
                email: aiData.email || 'Not specified',
                extractedSkills: aiData.skills || [],
                experienceSummary: aiData.experienceSummary || '',
                education: aiData.education || [],
                suggestedRole: aiData.suggestedRole || 'Not specified',
                detectedIndustry: aiData.industry || 'General',
                overallScore: 0
            },
            {
                upsert: true,
                returnDocument: 'after' // Replaces 'new: true' for Mongoose 8/9+
            }
        );

        // Generate Assessment Questions
        let assessmentQuestions = [];
        try {
            if (aiData.skills && aiData.skills.length > 0) {
                process.stdout.write(`\n[${new Date().toLocaleTimeString()}] Task Started: Generating Universal Assessment Questions...\n`);
                assessmentQuestions = await generateUniversalAssessment(aiData.skills, aiData.industry || 'General');
                process.stdout.write(`[${new Date().toLocaleTimeString()}] Task Completed: Assessment Questions Generated successfully.\n\n`);
            }
        } catch (genError) {
            console.error('Failed to generate assessment questions:', genError.message);
            // Non-fatal, will just save an empty assessment if failed
        }

        // Save Assessment to DB
        await Assessment.findOneAndUpdate(
            { profileId: profile._id },
            {
                status: 'Pending',
                questions: assessmentQuestions,
                finalScore: null,
                startTime: null,
                endTime: null,
                tabSwitchCount: 0,
                copyPasteCount: 0
            },
            { upsert: true }
        );

        res.json({
            success: true,
            message: 'Resume uploaded, processed, and assessment generated successfully via Gemini.',
            profileId: profile._id,
            data: aiData
        });

    } catch (error) {
        console.error('SERVER ERROR:', error.message);
        res.status(500).json({
            message: 'Error processing resume',
            error: error.message
        });
    }
});

module.exports = router;