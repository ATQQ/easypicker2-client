import redis, { RedisClient } from 'redis'
import { redisConfig } from '@/config'

const { port, host, password, auth } = redisConfig

export function getClient(): Promise<RedisClient> {
  return new Promise<RedisClient>((res, rej) => {
    const client = redis.createClient(
      port,
      host,
      auth
        ? {
            password
          }
        : {}
    )
    // redis 服务器启动
    client.on('ready', () => {
      res(client)
    })
    client.on('error', (err) => {
      client.quit()
      rej(err)
    })
  })
}

export function getRedisStatus() {
  return new Promise<ServiceStatus>((res, rej) => {
    getClient()
      .then((c) => {
        c.quit()
        res({
          type: 'redis',
          status: true
        })
      })
      .catch((err) => {
        res({
          errMsg: err.message,
          type: 'redis',
          status: false
        })
      })
  })
}
