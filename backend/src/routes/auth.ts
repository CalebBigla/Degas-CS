import { Router } from 'express';
import { login, loginValidation, refresh, logout } from '../controllers/authController';

const router = Router();

router.post('/login', loginValidation, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;