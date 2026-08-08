const express = require('express');
const router = express.Router();
const { getRecruiterStats, getCandidates, getCandidate } = require('../controllers/recruiterController');
const { protect } = require('../middleware/authMiddleware');

router.get('/stats', protect, getRecruiterStats);
router.get('/candidates', protect, getCandidates);
router.get('/candidate/:id', protect, getCandidate);

module.exports = router;
