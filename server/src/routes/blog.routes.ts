import { Router } from 'express';
import { getBlogs, getBlogBySlug, createBlog, updateBlog, deleteBlog } from '../controllers/blog.controller';
import { protect, isAdmin } from '../middleware/auth';
import { blogUpload } from '../middleware/upload';
import { cache, flushCache } from '../middleware/cache';

const router = Router();
const flushBlogs = flushCache('/api/v1/blogs');

router.get('/', cache(300), getBlogs);
router.get('/:slug', cache(300), getBlogBySlug);
router.post('/', protect, isAdmin, flushBlogs, blogUpload.single('coverImage'), createBlog);
router.patch('/:id', protect, isAdmin, flushBlogs, updateBlog);
router.delete('/:id', protect, isAdmin, flushBlogs, deleteBlog);

export default router;
