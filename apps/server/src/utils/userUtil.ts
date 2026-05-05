import { FWRequest } from 'flash-wolves'
import tokenUtil from './tokenUtil'

export async function getUserInfo(req: FWRequest) {
  if (!req.headers.token) {
    return null
  }
  return tokenUtil.getUserInfo(req.headers.token as string)
}

/**
 * 获取实际可以使用的大小，以字节为单位
 */
export function calculateSize(size: number) {
  // 换算成GB
  return size * 1024 * 1024 * 1024
}

/**
 * 获取qiniu云存储文件url的过期时间
 * @param duration 有效时间（分钟）
 * @returns 过期时间(秒)
 */
export function getQiniuFileUrlExpiredTime(duration: number) {
  return Math.floor(Date.now() / 1000) + 60 * duration
}
