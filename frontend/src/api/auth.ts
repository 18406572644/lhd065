import request from '@/utils/request';
import { LoginForm, RegisterForm, User } from '@/types';

export interface AuthResult {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
}

export const login = async (username: string, password: string): Promise<AuthResult> => {
  try {
    const res = await request.post<any, { access_token: string; token_type: string }>(
      '/auth/login/json',
      { username, password }
    );
    const token = res.access_token;
    localStorage.setItem('token', token);
    const user = await fetchCurrentUser();
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    window.dispatchEvent(new Event('auth-change'));
    return { success: true, token, user: user || undefined };
  } catch (error: any) {
    const msg = error?.response?.data?.detail || error?.message || '登录失败';
    return { success: false, message: msg };
  }
};

export const register = async (formData: RegisterForm): Promise<AuthResult> => {
  try {
    const res = await request.post<any, { access_token: string; token_type: string }>(
      '/auth/register',
      {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      }
    );
    const token = res.access_token;
    localStorage.setItem('token', token);
    const user = await fetchCurrentUser();
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    window.dispatchEvent(new Event('auth-change'));
    return { success: true, token, user: user || undefined };
  } catch (error: any) {
    const msg = error?.response?.data?.detail || error?.message || '注册失败';
    return { success: false, message: msg };
  }
};

export const fetchCurrentUser = async (): Promise<User | null> => {
  try {
    const res = await request.get<any, any>('/auth/me');
    return {
      id: res.id,
      username: res.username,
      email: res.email,
      avatar: res.avatar || undefined,
    };
  } catch {
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('auth-change'));
  return Promise.resolve({ success: true });
};

export const getCurrentUser = (): User | null => {
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      return JSON.parse(stored) as User;
    }
  } catch {}
  return null;
};
