import { Response } from 'express';

export const sendSuccess = (
  res: Response,
  message: string,
  data?: unknown,
  statusCode = 200,
  pagination?: { page: number; limit: number; total: number; pages: number }
) => {
  const response: Record<string, unknown> = { success: true, message };
  if (data !== undefined) response.data = data;
  if (pagination) response.pagination = pagination;
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errors?: unknown
) => {
  const response: Record<string, unknown> = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

export const getPagination = (page: string | undefined, limit: string | undefined) => {
  const p = Math.max(1, parseInt(page || '1'));
  const l = Math.min(100, Math.max(1, parseInt(limit || '20')));
  return { page: p, limit: l, skip: (p - 1) * l };
};
