import { Router, Request, Response, NextFunction } from 'express';
import Promotion from '../models/Promotion';
import { protect, isAdminOrManager } from '../middleware/auth';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);
    const [items, total] = await Promise.all([
      Promotion.find().sort('-createdAt').skip(skip).limit(l).lean(),
      Promotion.countDocuments(),
    ]);
    sendSuccess(res, 'Promotions fetched', items, 200, { page: p, limit: l, total, pages: Math.ceil(total / l) });
  } catch (err) { next(err); }
});

router.use(protect, isAdminOrManager);

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promo = await Promotion.create(req.body);
    sendSuccess(res, 'Promotion created', promo, 201);
  } catch (err) { next(err); }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const promo = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!promo) { sendError(res, 'Not found', 404); return; }
    sendSuccess(res, 'Promotion updated', promo);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Promotion.findByIdAndDelete(req.params.id);
    sendSuccess(res, 'Promotion deleted');
  } catch (err) { next(err); }
});

export default router;
