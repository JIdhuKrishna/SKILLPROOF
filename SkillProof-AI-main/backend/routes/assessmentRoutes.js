const express = require('express');
const router = express.Router();
const { getAssessment, submitAssessment, logIntegrity } = require('../controllers/assessmentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:profileId', protect, getAssessment);
router.post('/submit', protect, submitAssessment);
router.patch('/integrity/:profileId', protect, logIntegrity);

module.exports = router;
