const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');

// CRUD routes for users
router.get('/user/:id', verifyToken, userController.getUser); // Read
router.put('/user/:id', verifyToken, userController.updateUser); // Update
router.delete('/delete-user/:id', verifyToken, userController.deleteUserId); // Delete
router.put('/change-username', verifyToken, userController.changeUsername);
router.put('/change-password', verifyToken, userController.changePassword);
router.delete('/delete-user', verifyToken, userController.deleteUser);
router.post('/validate-password', verifyToken, userController.validatePassword);
router.get('/role', verifyToken, userController.getUserRole);
router.get('/non-admin-users', verifyToken, userController.getNonAdminUsers);
router.post('/create',verifyToken, userController.createUser);

module.exports = router;