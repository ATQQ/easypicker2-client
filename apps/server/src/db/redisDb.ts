// 做一层业务缓存
import storage from '@/utils/storageUtil'

import { expireKvKey, getKvValue, setKvValue } from './kvStore'

const MEMORY_CACHE_SECONDS = 60
const DEFAULT_CACHE_SECONDS = 60 * 60 * 24 * 7

export function setRedisValue(k: string, v: string, expiredTime = -1) {
  storage.setItem(k, v, expiredTime)
  return setKvValue(k, v, expiredTime).catch((err) => {
    console.warn('设置 KV 缓存失败', err.message)
  })
}

export function getRedisVal(k: string, originCallback?: any): Promise<string> {
  return new Promise((resolve) => {
    const v = storage.getItem(k)
    if (v?.value) {
      resolve(v.value)
      // 异步更新数据逻辑
      if (typeof originCallback === 'function') {
        originCallback().then((v) => {
          setRedisValue(k, JSON.stringify(v), 60 * 60 * 24 * 7)
        })
      }
      return
    }
    getKvValue(k)
      .then((reply) => {
        if (reply) {
          storage.setItem(k, reply, MEMORY_CACHE_SECONDS)
        }
        if (!reply && typeof originCallback === 'function') {
          originCallback()
            .then((v) => {
              const str = JSON.stringify(v)
              setRedisValue(k, str, DEFAULT_CACHE_SECONDS)
              resolve(str)
            })
            .catch(() => {
              resolve(reply)
            })
        }
        else {
          resolve(reply)
        }
      })
      .catch(() => {
        resolve(null)
      })
  })
}

export function getRedisValueJSON<T>(
  k: string,
  defaultValue: T,
  originCallback?: any,
): Promise<T> {
  return getRedisVal(k, originCallback).then((v) => {
    if (v) {
      return JSON.parse(v)
    }
    return defaultValue || null
  })
}

export function expiredRedisKey(k: string) {
  storage.expireItem(k)
  return expireKvKey(k).catch((err) => {
    console.warn('清理 KV 缓存失败', err.message)
  })
}
