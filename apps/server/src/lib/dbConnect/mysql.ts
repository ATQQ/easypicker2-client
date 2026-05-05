import mysql from 'mysql'
import { mysqlConfig } from '@/config'
import LocalUserDB from '@/utils/user-local-db'
// 创建连接池
let pool: mysql.Pool

export function refreshPool() {
  const cfg = LocalUserDB.getUserConfigByType('mysql')
  pool?.end()
  mysqlConfig.host = cfg.host
  mysqlConfig.port = cfg.port
  mysqlConfig.user = cfg.user
  mysqlConfig.password = cfg.password
  mysqlConfig.database = cfg.database
  // 重新创建连接池
  pool = mysql.createPool(mysqlConfig)
  pool.on('error', (err) => {
    console.log('pool connect error')
    console.error(err)
  })
}

export function getConnection(): Promise<mysql.PoolConnection> {
  return new Promise((res, rej) => {
    pool.getConnection((err, coon) => {
      if (err) {
        console.error('------ db connection error -------')
        console.error(err.message)
        rej(err)
        return
      }
      res(coon)
    })
  })
}

type param = string | number
/**
 * 执行sql语句
 * @param sql sql语句
 * @param params 参数
 */
export function query<T>(sql: string, ...params: param[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    getConnection()
      .then((coon) => {
        coon.query(sql, params, (err, result) => {
          if (err) {
            reject(err)
            return
          }
          // 请求完就释放
          coon.release()
          resolve(result)
        })
      })
      .catch((err) => {
        reject(err)
      })
  })
}

export function getMysqlStatus() {
  return new Promise<ServiceStatus>((res, rej) => {
    pool.getConnection((err, coon) => {
      if (err) {
        res({
          errMsg: err.message,
          type: 'mysql',
          status: false
        })
        return
      }
      res({
        type: 'mysql',
        status: true
      })
      coon.release()
    })
  })
}
