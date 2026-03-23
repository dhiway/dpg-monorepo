import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface CheckUserResponse {
  userExists: boolean;
}

export interface RequestOtpResponse {
  ok: boolean;
  user: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  phoneNumberVerified: boolean;
  image: string;
  role: string;
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerifyOtpResponse {
  redirect: boolean;
  token: string;
  user: User;
}

export interface SessionResponse {
  user: User | null;
  session: {
    id: string;
    expiresAt: string;
  } | null;
}

export async function checkUser(phoneNumber: string): Promise<CheckUserResponse> {
  const response = await apiClient.post<CheckUserResponse>('/api/auth/unified-otp/check-user', {
    phoneNumber,
  });
  return response.data;
}

export async function requestOtp(phoneNumber: string): Promise<RequestOtpResponse> {
  const response = await apiClient.post<RequestOtpResponse>('/api/auth/unified-otp/request', {
    phoneNumber,
  });
  return response.data;
}

export async function verifyOtp(phoneNumber: string, otp: string, name?: string): Promise<VerifyOtpResponse> {
  const response = await apiClient.post<VerifyOtpResponse>('/api/auth/unified-otp/verify', {
    phoneNumber,
    otp,
    name: name || 'user',
  });
  return response.data;
}

export async function signOut(): Promise<void> {
  await apiClient.post('/api/auth/sign-out');
}

export async function getSession(): Promise<SessionResponse> {
  const response = await apiClient.get<SessionResponse>('/api/auth/get-session');
  return response.data;
}
