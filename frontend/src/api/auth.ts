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
    const data: LoginForm = { username, password };
    const result = await mockLogin(data);
    const res = result as { token: string; user: User };
    if (res.token && res.user) {
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      return { success: true, token: res.token, user: res.user };
    }
    return { success: false, message: '用户名或密码错误' };
  } catch (error: any) {
    return { success: false, message: error.message || '登录失败' };
  }
};

export const register = async (formData: any): Promise<AuthResult> => {
  try {
    const result = await mockRegister(formData as RegisterForm);
    const res = result as { token: string; user: User };
    if (res.token && res.user) {
      return { success: true, token: res.token, user: res.user };
    }
    return { success: false, message: '注册失败' };
  } catch (error: any) {
    return { success: false, message: error.message || '注册失败' };
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
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

export const mockLogin = async (data: LoginForm) => {
  const user: User = {
    id: 1,
    username: data.username,
    email: `${data.username}@example.com`,
    token: 'mock-token-' + Date.now(),
  };
  return new Promise((resolve) => {
    setTimeout(() => resolve({ token: user.token, user }), 300);
  });
};

export const mockRegister = async (data: RegisterForm) => {
  const user: User = {
    id: 1,
    username: data.username,
    email: data.email,
    token: 'mock-token-' + Date.now(),
  };
  return new Promise((resolve) => {
    setTimeout(() => resolve({ token: user.token, user }), 300);
  });
};
