const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe, logoutUser } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const validate = require('../middleware/validate.middleware');
const { registerSchema, loginSchema } = require('../validations/auth.validation');

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.post('/logout', logoutUser);
router.get('/me', protect, getMe);

module.exports = router;
