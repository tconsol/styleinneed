import jwt, { SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '../types';

export const generateAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload as object, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'],
  });

export const generateRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload as object, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  });

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as JwtPayload;
