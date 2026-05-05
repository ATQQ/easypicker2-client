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
  return getRedisVal(k, originCallback).then(async (v) => {
    if (!v) {
      return (defaultValue ?? null) as T
    }
    try {
      return JSON.parse(v) as T
    }
    catch (err) {
      console.warn(
        `[kv] JSON 解析失败，将丢弃缓存并尽力重建: ${k}`,
        err instanceof Error ? err.message : err,
      )
      await expiredRedisKey(k)
      if (typeof originCallback === 'function') {
        try {
          const fresh = await originCallback()
          const str = JSON.stringify(fresh)
          await setRedisValue(k, str, DEFAULT_CACHE_SECONDS)
          return fresh as T
        }
        catch (e) {
          console.warn(`[kv] 缓存重建失败: ${k}`, e instanceof Error ? e.message : e)
        }
      }
      return (defaultValue ?? null) as T
    }
  })
}

export function expiredRedisKey(k: string) {
  storage.expireItem(k)
  return expireKvKey(k).catch((err) => {
    console.warn('清理 KV 缓存失败', err.message)
  })
}
