import type { KvStore } from './types'
import { kvStoreConfig } from '@/config'
import { localKvStore } from './local'
import { redisKvStore } from './redis'

export function getKvStore(): KvStore {
  return kvStoreConfig.driver === 'redis' ? redisKvStore : localKvStore
}

export function setKvValue(key: string, value: string, ttlSeconds = -1) {
  return getKvStore().setValue(key, value, ttlSeconds)
}

export function getKvValue(key: string) {
  return getKvStore().getValue(key)
}

export function expireKvKey(key: string) {
  return getKvStore().expireKey(key)
}
