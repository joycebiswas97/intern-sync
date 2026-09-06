const express = require('express');
const router = express.Router();
const { createReport } = require('../controllers/reportController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, createReport);

module.exports = router;
