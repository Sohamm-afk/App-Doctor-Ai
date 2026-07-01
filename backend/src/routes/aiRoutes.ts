import { Router } from 'express';
import { AiController } from '../controllers/aiController';

const router = Router();

router.post('/review', AiController.generateReview);
router.post('/chat', AiController.chatMessage);
router.post('/fixes', AiController.generateFixes);
router.post('/report/pdf', AiController.exportPdfReport);

export { router as aiRoutes };
