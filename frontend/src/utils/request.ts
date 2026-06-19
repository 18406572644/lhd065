import axios, { AxiosInstance, AxiosRequestConfig, Method } from 'axios';
import { message } from 'antd';

const instance: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

instance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        message.error('登录已过期，请重新登录');
        window.location.href = '/login';
      } else if (status === 403) {
        message.error('没有权限访问');
      } else if (status === 404) {
        message.error('资源不存在');
      } else if (status >= 500) {
        message.error('服务器错误，请稍后重试');
      } else if (data?.detail) {
        message.error(data.detail);
      } else {
        message.error('请求失败');
      }
    } else if (error.code === 'ECONNABORTED') {
      message.error('请求超时');
    } else {
      message.error('网络错误，请检查连接');
    }
    return Promise.reject(error);
  }
);

interface TypedAxios {
  <T = any>(config: AxiosRequestConfig): Promise<T>;
  <T = any, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<T>;
  get<T = any, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<T>;
  post<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>;
  put<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>;
  delete<T = any, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<T>;
  patch<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<T>;
  interceptors: typeof instance.interceptors;
  defaults: typeof instance.defaults;
}

const request = instance as unknown as TypedAxios;

export default request;
