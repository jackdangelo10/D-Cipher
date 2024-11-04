const express = require('express');
const router = express.Router();
const passwordController = require('../controllers/passwordController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/create', verifyToken, passwordController.createPassword);
router.get('/visible', verifyToken, passwordController.getVisiblePasswords);
router.put('/update/:id', verifyToken, passwordController.updatePassword);
router.delete('/delete/:id', verifyToken, passwordController.deletePassword);
router.get('/search/:serviceName', verifyToken, passwordController.getPasswordsByService);
router.put('/update-password/:id', verifyToken, passwordController.updatePasswordOnly);
router.put('/update-username/:id', verifyToken, passwordController.updateUsernameOnly);

module.exports = router;