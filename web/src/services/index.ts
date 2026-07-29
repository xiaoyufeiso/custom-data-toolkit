import { config } from '@/config';
import { get } from '@/shared/utils/request';
import type { UserInfo } from './types';

// 示例：用户相关接口,用不到可以删除
export const getUserInfo = () => get<UserInfo>(`${config.auth}/user/info`);
