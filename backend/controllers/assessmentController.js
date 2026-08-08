const Assessment = require('../models/Assessment');
const Profile = require('../models/Profile');

// @desc    Get assessment questions for a profile
// @route   GET /api/assessment/:profileId
const getAssessment = async (req, res) => {
    try {
        const assessment = await Assessment.findOne({ profileId: req.params.profileId });

        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        if (!assessment.startTime) {
            assessment.startTime = new Date();

            // Dynamic Generation: When an assessment is initialized
            const profile = await Profile.findById(assessment.profileId);
            if (profile && profile.extractedSkills.length > 0) {
                const { generateUniversalAssessment } = require('../utils/aiHandler');
                const industry = profile.detectedIndustry || 'General';
                try {
                    const newQuestions = await generateUniversalAssessment(profile.extractedSkills, industry);
                    assessment.questions = newQuestions;
                    assessment.industry = industry;
                } catch (genError) {
                    console.error('Failed to dynamically generate universal assessment:', genError);
                }
            }
            await assessment.save();
        }

        // Return questions without the correct answers for the frontend to render securely
        const safeQuestions = assessment.questions.map(q => ({
            _id: q._id,
            type: q.type || 'mcq',
            category: q.category || 'technical',
            questionText: q.questionText,
            options: q.options,
            problemStatement: q.problemStatement,
            initialCode: q.initialCode,
            expectedOutputDescription: q.expectedOutputDescription
        }));

        res.json({
            status: assessment.status,
            questions: safeQuestions
        });

    } catch (error) {
        console.error('Error fetching assessment:', error);
        res.status(500).json({ message: 'Server error fetching assessment' });
    }
};

// @desc    Submit assessment answers
// @route   POST /api/assessment/submit
const submitAssessment = async (req, res) => {
    try {
        const { profileId, answers } = req.body;

        const assessment = await Assessment.findOne({ profileId });
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        if (assessment.status === 'Completed') {
            return res.status(400).json({ message: 'Assessment already completed' });
        }

        let technicalCorrect = 0; let technicalTotal = 0;
        let logicalCorrect = 0; let logicalTotal = 0;
        let criticalCorrect = 0; let criticalTotal = 0;

        // Ensure answers are handled as an array of simple strings
        let simpleAnswers = [];
        if (answers && Array.isArray(answers)) {
            // Map correctly whether frontend sent simple strings or formatted objects (like selectedOption)
            simpleAnswers = answers.map(a => (typeof a === 'object' && a !== null) ? (a.selectedOption || '') : a);
        }

        let correctCount = 0;
        const total = assessment.questions.length;

        // Grade user's answers
        for (let i = 0; i < assessment.questions.length; i++) {
            const q = assessment.questions[i];
            q.userAnswer = String(simpleAnswers[i] || '');

            let isCorrect = false;

            if (q.type === 'coding') {
                // For coding questions (which lack a correctAnswer), auto-score based on code presence
                const uCode = q.userAnswer.trim();
                const iCode = (q.initialCode || '').trim();
                isCorrect = uCode.length > 5 && uCode !== iCode;
            } else {
                // Compare userAnswer directly with correctAnswer for MCQs
                isCorrect = q.userAnswer && q.correctAnswer && String(q.correctAnswer).trim().toLowerCase() === q.userAnswer.trim().toLowerCase();
            }

            if (isCorrect) correctCount++;

            if (q.category === 'technical') {
                technicalTotal++;
                if (isCorrect) technicalCorrect++;
            } else if (q.category === 'logical') {
                logicalTotal++;
                if (isCorrect) logicalCorrect++;
            } else if (q.category === 'critical') {
                criticalTotal++;
                if (isCorrect) criticalCorrect++;
            }
        }

        const technicalScore = technicalTotal > 0 ? (technicalCorrect / technicalTotal) * 100 : 0;
        const logicalScore = logicalTotal > 0 ? (logicalCorrect / logicalTotal) * 100 : 0;
        const criticalScore = criticalTotal > 0 ? (criticalCorrect / criticalTotal) * 100 : 0;

        // Weighted Submission: 40% Technical, 30% Logical, 30% Critical
        let finalScore = (technicalScore * 0.40) + (logicalScore * 0.30) + (criticalScore * 0.30);

        // Integrity Penalty: tabSwitchCount still applies a penalty to the final overallScore
        const tabSwitchPenalty = (assessment.tabSwitchCount || 0) * 5;
        finalScore = Math.max(0, finalScore - tabSwitchPenalty); // don't go below 0

        assessment.technicalScore = technicalScore;
        assessment.logicalScore = logicalScore;
        assessment.criticalScore = criticalScore;
        assessment.finalScore = finalScore;
        assessment.status = 'Completed';
        assessment.endTime = new Date();

        let timeTakenMinutes = 0;
        let aiDependencyIndex = 0;
        if (assessment.startTime) {
            timeTakenMinutes = (assessment.endTime - assessment.startTime) / (1000 * 60);
        }

        if (timeTakenMinutes > 0 && finalScore > 0) {
            aiDependencyIndex = parseFloat((finalScore / timeTakenMinutes).toFixed(2));
        }

        try {
            await assessment.save();
        } catch (saveError) {
            console.error('Mongoose ValidationError saving assessment:', saveError);
            return res.status(500).json({ message: 'Error saving assessment', error: saveError.message });
        }

        // Update Profile overallScore and aiDependencyIndex
        await Profile.findByIdAndUpdate(profileId, {
            overallScore: finalScore,
            aiDependencyIndex: aiDependencyIndex
        });

        res.json({
            message: 'Assessment submitted successfully',
            score: finalScore,
            technicalScore,
            logicalScore,
            criticalScore,
            correctCount,
            total
        });

    } catch (error) {
        console.error('Error submitting assessment:', error);
        res.status(500).json({ message: 'Server error submitting assessment' });
    }
};

// @desc    Update assessment integrity metrics
// @route   PATCH /api/assessment/integrity/:profileId
const logIntegrity = async (req, res) => {
    try {
        const { profileId } = req.params;
        const { type } = req.body;

        const assessment = await Assessment.findOne({ profileId });

        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Increment the counters directly and save
        if (type === 'copy_paste') {
            assessment.copyPasteCount = (assessment.copyPasteCount || 0) + 1;
        } else {
            assessment.tabSwitchCount = (assessment.tabSwitchCount || 0) + 1;
        }

        await assessment.save();

        res.json({ message: 'Integrity logged successfully' });
    } catch (error) {
        console.error('Error logging integrity:', error);
        res.status(500).json({ message: 'Server error logging integrity' });
    }
};

module.exports = {
    getAssessment,
    submitAssessment,
    logIntegrity
};
