import request from '@/utils/request';
import { CookingRecord, CookingRecordCreate, CookingRecordUpdate, CookingCalendarData } from '@/types';

export const createCookingRecord = (data: CookingRecordCreate) => {
  return request<CookingRecord>({
    url: '/cooking-records',
    method: 'post',
    data,
  });
};

export const updateCookingRecord = (id: number, data: CookingRecordUpdate) => {
  return request<CookingRecord>({
    url: `/cooking-records/${id}`,
    method: 'put',
    data,
  });
};

export const getCookingRecords = (limit: number = 50, offset: number = 0) => {
  return request<CookingRecord[]>({
    url: '/cooking-records/list',
    method: 'get',
    params: { limit, offset },
  });
};

export const getCookingRecord = (id: number) => {
  return request<CookingRecord>({
    url: `/cooking-records/${id}`,
    method: 'get',
  });
};

export const getCookingCalendar = (year?: number, month?: number) => {
  return request<CookingCalendarData>({
    url: '/cooking-records/calendar',
    method: 'get',
    params: { year, month },
  });
};
