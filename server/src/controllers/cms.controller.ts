import { Request, Response, NextFunction } from 'express';
import CmsPage from '../models/CmsPage';
import { AuthRequest } from '../types';
import { sendSuccess, sendError } from '../utils/apiResponse';

export const getCmsPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = await CmsPage.findOne({ key: req.params.key });
    // Return empty page structure rather than 404 — admin can create it
    sendSuccess(res, 'CMS page fetched', page || { key: req.params.key, title: '', content: {} });
  } catch (err) {
    next(err);
  }
};

export const upsertCmsPage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { key } = req.params;
    const { title, content } = req.body;

    const page = await CmsPage.findOneAndUpdate(
      { key },
      { title, content, lastUpdatedBy: req.user!._id },
      { new: true, upsert: true, runValidators: true }
    );

    sendSuccess(res, 'CMS page saved', page);
  } catch (err) {
    next(err);
  }
};

export const listCmsPages = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const pages = await CmsPage.find().select('-content').lean();
    sendSuccess(res, 'CMS pages fetched', pages);
  } catch (err) {
    next(err);
  }
};
