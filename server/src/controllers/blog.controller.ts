import { Request, Response, NextFunction } from 'express';
import Blog from '../models/Blog';
import { AuthRequest } from '../types';
import { sendSuccess, sendError, getPagination } from '../utils/apiResponse';

export const getBlogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, category, tag, search } = req.query as Record<string, string>;
    const { page: p, limit: l, skip } = getPagination(page, limit);

    const filter: Record<string, unknown> = { isPublished: true };
    if (category) filter.category = category;
    if (tag) filter.tags = tag;
    if (search) filter.$text = { $search: search };

    const [blogs, total] = await Promise.all([
      Blog.find(filter)
        .populate('author', 'name avatar')
        .sort('-publishedAt')
        .skip(skip)
        .limit(l)
        .select('-content')
        .lean(),
      Blog.countDocuments(filter),
    ]);

    sendSuccess(res, 'Blogs fetched', blogs, 200, {
      page: p, limit: l, total, pages: Math.ceil(total / l),
    });
  } catch (err) {
    next(err);
  }
};

export const getBlogBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blog = await Blog.findOneAndUpdate(
      { slug: req.params.slug, isPublished: true },
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author', 'name avatar');

    if (!blog) { sendError(res, 'Blog not found', 404); return; }
    sendSuccess(res, 'Blog fetched', blog);
  } catch (err) {
    next(err);
  }
};

export const createBlog = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blog = await Blog.create({ ...req.body, author: req.user!._id });
    sendSuccess(res, 'Blog created', blog, 201);
  } catch (err) {
    next(err);
  }
};

export const updateBlog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!blog) { sendError(res, 'Blog not found', 404); return; }
    sendSuccess(res, 'Blog updated', blog);
  } catch (err) {
    next(err);
  }
};

export const deleteBlog = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await Blog.findByIdAndDelete(req.params.id);
    sendSuccess(res, 'Blog deleted');
  } catch (err) {
    next(err);
  }
};
