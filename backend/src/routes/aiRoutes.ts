import { Router } from 'express';
import { AiController } from '../controllers/aiController';

const router = Router();

router.post('/review', AiController.generateReview);
router.post('/chat', AiController.chatMessage);
router.post('/session/clear', AiController.clearSession);
router.post('/fixes', AiController.generateFixes);
router.post('/report/pdf', AiController.exportPdfReport);
router.post('/architecture', AiController.generateArchitecture);

export { router as aiRoutes };


