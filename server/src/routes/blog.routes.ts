import { Router, Request, Response, NextFunction } from 'express';
import { getBlogs, getBlogBySlug, createBlog, updateBlog, deleteBlog } from '../controllers/blog.controller';
import { protect, isAdmin } from '../middleware/auth';
import { cache, flushCache } from '../middleware/cache';

const router = Router();
const flushBlogs = flushCache('/api/v1/blogs');

// Requests asking for unpublished drafts must never be cached — a cached
// response here would leak admin-only draft content to the next caller who
// hits the same URL, or would resurface stale published-only data to admins.
const cacheBlogs = cache(300);
const cacheUnlessIncludingUnpublished = (req: Request, res: Response, next: NextFunction): void => {
  if (req.query.includeUnpublished) { next(); return; }
  void cacheBlogs(req, res, next);
};

router.get('/', cacheUnlessIncludingUnpublished, getBlogs);
router.get('/:slug', cache(300), getBlogBySlug);
// Cover images are uploaded separately via /cms/upload and posted here as a
// URL — the controller never read req.file, so the multer step did nothing.
router.post('/', protect, isAdmin, flushBlogs, createBlog);
router.patch('/:id', protect, isAdmin, flushBlogs, updateBlog);
router.delete('/:id', protect, isAdmin, flushBlogs, deleteBlog);

export default router;
