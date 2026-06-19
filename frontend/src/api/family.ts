import request from '@/utils/request';
import { FamilyMember } from '@/types';

export const getFamilyMembers = () => {
  return request<FamilyMember[]>({
    url: '/family',
    method: 'get',
  });
};

export const getFamilyMember = (id: number) => {
  return request<FamilyMember>({
    url: `/family/${id}`,
    method: 'get',
  });
};

export const createFamilyMember = (data: Omit<FamilyMember, 'id'>) => {
  return request<FamilyMember>({
    url: '/family',
    method: 'post',
    data,
  });
};

export const updateFamilyMember = (id: number, data: Partial<FamilyMember>) => {
  return request<FamilyMember>({
    url: `/family/${id}`,
    method: 'put',
    data,
  });
};

export const deleteFamilyMember = (id: number) => {
  return request({
    url: `/family/${id}`,
    method: 'delete',
  });
};

export const mockFamilyMembers: FamilyMember[] = [
  {
    id: 1,
    name: '爸爸',
    relation: '父亲',
    age: 45,
    gender: 'male',
    dietary_restrictions: ['少盐'],
    preferences: ['家常菜', '汤羹'],
  },
  {
    id: 2,
    name: '妈妈',
    relation: '母亲',
    age: 42,
    gender: 'female',
    dietary_restrictions: ['低糖'],
    preferences: ['甜点', '凉菜'],
  },
  {
    id: 3,
    name: '小明',
    relation: '儿子',
    age: 12,
    gender: 'male',
    dietary_restrictions: [],
    preferences: ['家常菜', '主食'],
  },
  {
    id: 4,
    name: '小红',
    relation: '女儿',
    age: 8,
    gender: 'female',
    dietary_restrictions: ['不吃辣'],
    preferences: ['甜点', '水果'],
  },
];

export const mockGetFamilyMembers = async () => {
  return new Promise(resolve => setTimeout(() => resolve([...mockFamilyMembers]), 300));
};
