import { Request, Response, NextFunction } from 'express';
import { validationResult, body } from 'express-validator';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array(),
    });
    return;
  }
  next();
};

export const analyzeValidator = [
  body('github_url')
    .exists()
    .withMessage('github_url is required')
    .isURL()
    .withMessage('github_url must be a valid URL'),
  validateRequest,
];
