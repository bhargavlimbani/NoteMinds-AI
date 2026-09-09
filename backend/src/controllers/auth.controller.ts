import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';

export async function register(req: Request, res: Response) {
  const result = await authService.register(req.body);
  sendSuccess(res, result, 201, 'Account created successfully');
}

export async function login(req: Request, res: Response) {
  const result = await authService.login(req.body);
  sendSuccess(res, result, 200, 'Logged in successfully');
}

/** JWTs are stateless: logout simply lets the client discard the token. */
export async function logout(_req: Request, res: Response) {
  sendSuccess(res, { loggedOut: true }, 200, 'Logged out');
}

export async function me(req: Request, res: Response) {
  sendSuccess(res, await authService.getCurrentUser(req.user!.id));
}

export async function updateProfile(req: Request, res: Response) {
  sendSuccess(res, await authService.updateProfile(req.user!.id, req.body), 200, 'Profile updated');
}

export async function changePassword(req: Request, res: Response) {
  sendSuccess(res, await authService.changePassword(req.user!.id, req.body), 200, 'Password changed');
}
