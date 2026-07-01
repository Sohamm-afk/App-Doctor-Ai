import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Repository Intelligence Engine',
  });
});

export { router as healthRoutes };
