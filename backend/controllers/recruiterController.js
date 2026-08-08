const Assessment = require('../models/Assessment');
const User = require('../models/User');
const Profile = require('../models/Profile'); // Added Profile model

// @desc    Get recruiter analytics
// @route   GET /api/recruiter/stats
const getRecruiterStats = async (req, res) => {
    try {
        // Total Candidates: Total count of users with the 'Candidate' role.
        const totalCandidates = await User.countDocuments({ role: 'Candidate' });

        const assessments = await Assessment.find({ status: 'Completed' });

        let totalScore = 0;
        let completedCount = 0;
        let zeroTabSwitches = 0;

        assessments.forEach(assessment => {
            if (assessment.finalScore !== undefined && assessment.finalScore !== null) {
                totalScore += assessment.finalScore;
                completedCount++;
            }
            if (assessment.tabSwitchCount === 0) {
                zeroTabSwitches++;
            }
        });

        // Average Skill Score: The mean of all finalScore values in the collection.
        const averageSkillScore = completedCount > 0 ? (totalScore / completedCount) : 0;

        // Global Integrity Rate: The percentage of completed assessments with 0 tabSwitchCount.
        const globalIntegrityRate = completedCount > 0 ? (zeroTabSwitches / completedCount) * 100 : 0;

        // AI Risk: Average AI Dependency Index across profiles
        const profiles = await Profile.find({});
        let totalAiIndex = 0;
        let profileCount = 0;
        profiles.forEach(p => {
            if (p.aiDependencyIndex !== undefined && p.aiDependencyIndex !== null) {
                totalAiIndex += p.aiDependencyIndex;
                profileCount++;
            }
        });
        const averageAiDependency = profileCount > 0 ? (totalAiIndex / profileCount) : 0;

        res.json({
            totalCandidates,
            averageSkillScore,
            globalIntegrityRate,
            averageAiDependency
        });
    } catch (error) {
        console.error('Error getting recruiter stats:', error);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
};

// @desc    Get all candidates
// @route   GET /api/recruiter/candidates
const getCandidates = async (req, res) => {
    try {
        const users = await User.find({ role: 'Candidate' }).select('-password');
        const profiles = await Profile.find();

        const candidates = users.map(user => {
            const profile = profiles.find(p => p.userId.toString() === user._id.toString());
            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                profile: profile || null
            };
        });

        // Only return candidates with a profile (or all of them, depending on requirements. Let's return all).
        res.json(candidates.filter(c => c.profile));
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ message: 'Server error fetching candidates' });
    }
};

// @desc    Get candidate detail
// @route   GET /api/recruiter/candidate/:id
const getCandidate = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const profile = await Profile.findOne({ userId: req.params.id });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        const assessment = await Assessment.findOne({ profileId: profile._id });

        res.json({
            user,
            profile,
            assessment
        });
    } catch (error) {
        console.error('Error fetching candidate detail:', error);
        res.status(500).json({ message: 'Server error fetching candidate detail' });
    }
};

module.exports = {
    getRecruiterStats,
    getCandidates,
    getCandidate
};
