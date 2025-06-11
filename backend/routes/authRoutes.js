import express from 'express';
import { register, login, deleteAccount } from '../controllers/authController.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Routes publiques
router.post('/register', register);
router.post('/login', login);
router.delete('/delete-account', verifyToken, deleteAccount);

// Route protégée pour tester l'authentification
router.get('/me', verifyToken, (req, res) => {
  res.json(req.user);
});

// Routes protégées par rôle
router.get('/admin-only', verifyToken, checkRole(['admin']), (req, res) => {
  res.json({ message: 'Accès admin autorisé' });
});

router.get('/teacher-only', verifyToken, checkRole(['teacher', 'admin']), (req, res) => {
  res.json({ message: 'Accès enseignant autorisé' });
});

export default router; 