import { Router } from 'express';
import { AnalyzeController } from '../controllers/analyzeController';
import { analyzeValidator } from '../middlewares/validator';

const router = Router();

router.post('/', analyzeValidator, AnalyzeController.analyze);

export { router as analyzeRoutes };
