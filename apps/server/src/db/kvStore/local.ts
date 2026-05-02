import type { Storage } from 'node-persist'
import type { KvStore } from './types'
import { create } from 'node-persist'
import { kvStoreConfig } from '@/config'

let storage: Storage
let initPromise: Promise<void>

function getStorage() {
  if (!storage) {
    storage = create()
    initPromise = storage.init({
      dir: kvStoreConfig.dir,
      expiredInterval: 2 * 60 * 1000,
      logging: false,
    })
  }
  return initPromise.then(() => storage)
}

export const localKvStore: KvStore = {
  async setValue(key: string, value: string, ttlSeconds = -1) {
    const storage = await getStorage()
    if (ttlSeconds === 0) {
      await storage.removeItem(key)
      return
    }
    await storage.setItem(
      key,
      value,
      ttlSeconds > 0 ? { ttl: ttlSeconds * 1000 } : undefined,
    )
  },

  async getValue(key: string) {
    const storage = await getStorage()
    const value = await storage.getItem<string>(key)
    return value === undefined ? null : value
  },

  async expireKey(key: string) {
    const storage = await getStorage()
    await storage.removeItem(key)
  },
}
