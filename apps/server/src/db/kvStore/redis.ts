import type { KvStore } from './types'
import { getClient } from '@/lib/dbConnect/redis'

export const redisKvStore: KvStore = {
  async setValue(key: string, value: string, ttlSeconds = -1) {
    const client = await getClient()
    await new Promise<void>((resolve, reject) => {
      client.set(key, value, (err) => {
        if (err) {
          client.quit()
          reject(err)
          return
        }
        if (ttlSeconds !== -1) {
          client.expire(key, ttlSeconds, (err) => {
            client.quit()
            err ? reject(err) : resolve()
          })
          return
        }
        client.quit()
        resolve()
      })
    })
  },

  async getValue(key: string) {
    const client = await getClient()
    return new Promise<string | null>((resolve, reject) => {
      client.get(key, (err, reply) => {
        client.quit()
        err ? reject(err) : resolve(reply)
      })
    })
  },

  async expireKey(key: string) {
    const client = await getClient()
    await new Promise<void>((resolve, reject) => {
      client.del(key, (err) => {
        client.quit()
        err ? reject(err) : resolve()
      })
    })
  },
}
