const express = require('express');
const router = express.Router();
const { getProfile } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getProfile);

module.exports = router;
