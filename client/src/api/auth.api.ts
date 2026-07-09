import client from './client';

export const authApi = {
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    client.post('/auth/register', data),

  verifyEmail: (data: { email: string; otp: string }) =>
    client.post('/auth/verify-email', data),

  resendOtp: (email: string) =>
    client.post('/auth/resend-otp', { email }),

  login: (data: { email: string; password: string }) =>
    client.post('/auth/login', data),

  logout: (refreshToken: string) =>
    client.post('/auth/logout', { refreshToken }),

  forgotPassword: (email: string) =>
    client.post('/auth/forgot-password', { email }),

  resetPassword: (data: { token: string; password: string }) =>
    client.post('/auth/reset-password', data),

  getMe: () => client.get('/auth/me'),

  updateProfile: (data: { name?: string; phone?: string }) =>
    client.patch('/auth/me', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    client.patch('/auth/change-password', data),

  googleAuth: (credential: string) =>
    client.post('/auth/google', { credential }),

  manageAddresses: (data: { action: string; addressId?: string; address?: object }) =>
    client.post('/auth/addresses', data),
};
