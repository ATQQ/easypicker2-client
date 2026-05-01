/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable eqeqeq */
/* eslint-disable node/handle-callback-err */
import type { FWRequest } from 'flash-wolves'
import qiniu from 'qiniu'
import { getKeyInfo } from './stringUtil'
import LocalUserDB from './user-local-db'
import { addBehavior, addErrorLog } from '@/db/logDb'
import { qiniuConfig } from '@/config'
// [node-sdk文档地址](https://developer.qiniu.com/kodo/1289/nodejs#server-upload)
let privateBucketDomain = qiniuConfig.bucketDomain

const bucketZoneMap = {
  huadong: qiniu.zone.Zone_z0,
  huabei: qiniu.zone.Zone_z1,
  huanan: qiniu.zone.Zone_z2,
  beimei: qiniu.zone.Zone_na0,
  SoutheastAsia: qiniu.zone.Zone_as0,
}
let bucketZone = bucketZoneMap[qiniuConfig.bucketZone] || qiniu.zone.Zone_z2

// 12小时过期
const getDeadline = () => Math.floor(Date.now() / 1000) + 3600 * 12

let bucket = qiniuConfig.bucketName
let mac = new qiniu.auth.digest.Mac(qiniuConfig.accessKey, qiniuConfig.secretKey)
const { urlsafeBase64Encode } = qiniu.util

export async function refreshQinNiuConfig() {
  const cfg = LocalUserDB.getUserConfigByType('qiniu')
  Object.assign(qiniuConfig, cfg)
  privateBucketDomain = qiniuConfig.bucketDomain
  bucketZone = bucketZoneMap[qiniuConfig.bucketZone] || qiniu.zone.Zone_z2
  bucket = qiniuConfig.bucketName
  mac = new qiniu.auth.digest.Mac(qiniuConfig.accessKey, qiniuConfig.secretKey)
}
/**
 * 获取OSS上文件的下载链接（默认12h有效）
 * @param key 文件的key
 * @param expiredTime
 */
export function createDownloadUrl(key: string, expiredTime = getDeadline()): string {
  // 七牛云相关
  const config = new qiniu.conf.Config()
  // 鉴权的内容，请求的时候生成，避免过期
  const bucketManager = new qiniu.rs.BucketManager(mac, config)

  const paths = key.split('/')
  const url = bucketManager.privateDownloadUrl(privateBucketDomain,
    // 对最后的文件名做encode，避免文件下载失败
    paths.map((v, idx) => idx === paths.length - 1 ? encodeURIComponent(v) : v).join('/'), expiredTime)
  return url
}

export function getUploadToken(): string {
  const putPolicy = new qiniu.rs.PutPolicy({
    scope: bucket,
    // returnBody: '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize),"bucket":"$(bucket)","name":"$(x:name)"}'
    returnBody: '{"key":"$(key)","hash":"$(etag)","fsize":$(fsize)}',
  })
  return putPolicy.uploadToken(mac)
}

export function deleteFiles(prefix: string): void {
  const config = new qiniu.conf.Config()
  const bucketManager = new qiniu.rs.BucketManager(mac, config)
  bucketManager.listPrefix(bucket, {
    limit: 1000,
    prefix,
  }, (err, respBody) => {
    const files: any[] = respBody.items
    // 使用批量删除接口
    batchDeleteFiles(files.map(f => f.key))
  })
}

export function batchDeleteFiles(keys: string[], req?: FWRequest) {
  if (!keys.length)
    return
  const config = new qiniu.conf.Config()
  const delOptions = keys.map(k => qiniu.rs.deleteOp(bucket, k))
  const bucketManager = new qiniu.rs.BucketManager(mac, config)
  bucketManager.batch(delOptions, (err, respBody, respInfo) => {
    if (err) {
      console.log(err)
      addErrorLog(req, `批量删除异常: ${err.message}`, err.stack)
      // throw err;
    }
    else {
      // 200 is success, 298 is part success
      if (Number.parseInt(`${respInfo.statusCode / 100}`, 10) === 2) {
        respBody.forEach((item) => {
          if ((+item.code) !== 200) {
            if (req) {
              addErrorLog(req, `${item.code}\t${item.data.error}`, item)
            }
          }
        })
      }
      else {
        console.log(respInfo.deleteusCode)
        console.log(respBody)
        addErrorLog(req, `批量删除异常: ${respInfo.deleteusCode}`, respBody)
      }
    }
  })
}

export function deleteObjByKey(key: string, req?: FWRequest): void {
  const config = new qiniu.conf.Config()
  const bucketManager = new qiniu.rs.BucketManager(mac, config)
  bucketManager.delete(bucket, key, (err) => {
    if (err) {
      console.log('------删除失败 start-------')
      console.log(key)
      console.log(err)
      console.log('------删除失败 end-------')
      if (req) {
        addErrorLog(req, `删除失败:${key}${err?.message}`, err?.stack)
      }
    }
  })
}

export function judgeFileIsExist(key: string): Promise<boolean> {
  return new Promise((res) => {
    const config = new qiniu.conf.Config()
    const bucketManager = new qiniu.rs.BucketManager(mac, config)
    bucketManager.stat(bucket, key, (err, respBody, respInfo) => {
      if (respInfo?.statusCode) {
        res(respInfo.statusCode !== 612)
      }
      else {
        res(false)
      }
    })
  })
}

function mergeRequest<T extends Function>(callback: T, delay = 1000) {
  const pMap = new Map<string, Promise<any>>()
  const cb: any = (...args) => {
    const key = JSON.stringify(args)
    let p = pMap.get(key)
    if (!p) {
      p = callback(...args)
      pMap.set(key, p)
      setTimeout(() => {
        pMap.delete(key)
      }, delay)
    }
    return p
  }
  return cb as T
}

// 同 prefix 缓存，避免重复请求
export const getOSSFiles = mergeRequest((prefix: string): Promise<Qiniu.ItemInfo[]> => {
  let data = []
  let marker = ''
  const ops: any = {
    limit: 1000,
    prefix,
  }
  return new Promise((res) => {
    const analyze = () => {
      const config = new qiniu.conf.Config()
      const bucketManager = new qiniu.rs.BucketManager(mac, config)
      if (ops) {
        ops.marker = marker
      }
      bucketManager.listPrefix(bucket, ops, (err, respBody) => {
        data = data.concat(respBody?.items || [])
        if (respBody?.marker) {
          marker = respBody.marker
          analyze()
        }
        else {
          res(data)
        }
      })
    }
    analyze()
  })
})

export function getFileKeys(prefix: string): Promise<Qiniu.ItemInfo[]> {
  return new Promise((res) => {
    const config = new qiniu.conf.Config()
    const bucketManager = new qiniu.rs.BucketManager(mac, config)
    bucketManager.listPrefix(bucket, {
      prefix,
    }, (err, respBody) => {
      res(respBody?.items || [])
    })
  })
}

export function makeZipByPrefixWithKeys(prefix: string, zipName: string, keys: string[] = []): Promise<string> {
  return new Promise((res) => {
    const config = new qiniu.conf.Config()
    const bucketManager = new qiniu.rs.BucketManager(mac, config)

    bucketManager.listPrefix(bucket, {
      // TODO:改进
      limit: 1000,
      prefix,
    }, (err, respBody) => {
      const files: any[] = respBody.items
      // 删除旧的压缩文件
      deleteFiles(`${prefix.slice(0, -1)}_package/`)
      const names = []
      // 上传内容,过滤掉数据库中不存在的
      const content = files.filter(file => keys.includes(file.key)).map((file) => {
        // 拼接原始url
        // 链接加密并进行Base64编码，别名去除前缀目录。
        const keyInfo = getKeyInfo(file.key)
        const { name, ext } = keyInfo
        let { base } = keyInfo

        // 判断别名是否存在,存在则后缀+数字自增
        let i = 1
        while (names.includes(base)) {
          base = `${name}_${i}${ext}`
          i += 1
        }
        names.push(base)
        // 判断别名是否存在,存在则后缀+数字自增
        const safeUrl = `/url/${urlsafeBase64Encode(createDownloadUrl(file.key))}/alias/${urlsafeBase64Encode(base)}`
        return safeUrl
      }).join('\n')
      const config = new qiniu.conf.Config({ zone: bucketZone })
      const formUploader = new qiniu.form_up.FormUploader(config)
      const putExtra = new qiniu.form_up.PutExtra()
      const key = `${Date.now()}-${~~(Math.random() * 1000)}.txt`

      formUploader.put(getUploadToken(), key, content, putExtra, (respErr, respBody, respInfo) => {
        if (respErr) {
          throw respErr
        }
        if (respInfo.statusCode == 200) {
          const { key } = respBody
          // 执行压缩
          const zipKey = urlsafeBase64Encode(`${bucket}:${prefix.substring(0, prefix.length - 1)}_package/${zipName}.zip`)

          const fops = `mkzip/4/encoding/${urlsafeBase64Encode('gbk')}|saveas/${zipKey}`
          const operManager = new qiniu.fop.OperationManager(mac, config)
          const pipeline = '' // 使用公共队列
          // 强制覆盖已有同名文件
          const options = { force: false }
          operManager.pfop(bucket, key, [fops], pipeline, options, (err, respBody, respInfo) => {
            if (err) {
              throw err
            }
            if (respInfo.statusCode == 200) {
              // 可直接通过statusUrl查询处理状态
              const statusUrl = `http://api.qiniu.com/status/get/prefop?id=${respBody.persistentId}`
              console.log(statusUrl)
              // 这里只返回任务id，转由客户端发请求查询
              res(respBody.persistentId)
            }
            else {
              console.log(respInfo.statusCode)
              console.log(respBody)
            }
          })
        }
        else {
          console.log(respInfo.statusCode)
          console.log(respBody)
        }
      })
    })
  })
}

export function makeZipWithKeys(keys: string[], zipName: string): Promise<string> {
  return new Promise((res) => {
    const names = []
    const content = keys.map((key) => {
      // 拼接原始url
      // 链接加密并进行Base64编码，别名去除前缀目录。
      const keyInfo = getKeyInfo(key)
      const { name, ext } = keyInfo
      let { base } = keyInfo

      // 判断别名是否存在,存在则后缀+数字自增
      let i = 1
      while (names.includes(base)) {
        base = `${name}_${i}${ext}`
        i += 1
      }
      // 处理特殊情况
      const specialCharsReplaceMap = [['•', '·']]
      specialCharsReplaceMap.forEach(([pre, post]) => {
        base = base.replace(new RegExp(pre, 'g'), post)
      })
      names.push(base)
      const safeUrl = `/url/${urlsafeBase64Encode(createDownloadUrl(key))}/alias/${urlsafeBase64Encode(base)}`
      return safeUrl
    }).join('\n')
    const config = new qiniu.conf.Config({ zone: bucketZone })
    const formUploader = new qiniu.form_up.FormUploader(config)
    const putExtra = new qiniu.form_up.PutExtra()
    const inputKey = `${Date.now()}-${~~(Math.random() * 1000)}.txt`
    // 择机删除不然越来越多
    // 上传文本内容触发归档任务
    formUploader.put(getUploadToken(), inputKey, content, putExtra, (respErr, respBody, respInfo) => {
      if (respErr) {
        throw respErr
      }
      if (respInfo.statusCode == 200) {
        const { key } = respBody
        // 执行压缩
        const zipKey = urlsafeBase64Encode(`${bucket}:` + 'easypicker2/' + `temp_package/${Date.now()}/${zipName}.zip`)

        const fops = `mkzip/4/encoding/${urlsafeBase64Encode('gbk')}|saveas/${zipKey}`
        const operManager = new qiniu.fop.OperationManager(mac, config)
        const pipeline = '' // 使用公共队列
        // 强制覆盖已有同名文件
        const options = { force: false }
        operManager.pfop(bucket, key, [fops], pipeline, options, (err, respBody, respInfo) => {
          if (err) {
            throw err
          }
          if (respInfo.statusCode == 200) {
            // 可直接通过statusUrl查询处理状态
            const statusUrl = `http://api.qiniu.com/status/get/prefop?id=${respBody.persistentId}`
            console.log(statusUrl)
            // 这里只返回任务id，转由客户端发请求查询
            res(respBody.persistentId)
          }
          else {
            console.log(respInfo.statusCode)
            console.log(respBody)
          }
        })
      }
      else {
        console.log(respInfo.statusCode)
        console.log(respBody)
      }
    })
  })
}

export function checkFopTaskStatus(persistentId: string): Promise<{ code: number, key?: string, desc?: string, error?: string }> {
  const config = new qiniu.conf.Config()
  const operManager = new qiniu.fop.OperationManager(null, config)
  return new Promise((res) => {
    operManager.prefop(persistentId, (err, respBody, respInfo) => {
      if (err) {
        console.log(err)
        throw err
      }
      if (respInfo.statusCode == 200) {
        // 结构 ![图片](http://img.cdn.sugarat.top/mdImg/MTYxMjg0MTQyODQ1Mg==612841428452)
        const item = respBody.items[0]
        const { code, key, desc, error } = item
        res({ code, key, desc, error })
      }
      else {
        console.log(respInfo.statusCode)
        console.log(respBody)
      }
    })
  })
}
interface FileStat {
  code: number
  data: {
    md5?: string
    error?: string
    hash?: string
    mimeType?: string
    putTime?: number
    type?: number
    fsize?: number
  }
}
/**
 * 批量查询文件状态
 */
export function batchFileStatus(keys: string[]): Promise<FileStat[]> {
  return new Promise((resolve, reject) => {
    if (keys.length === 0) {
      return []
    }
    const statOperations = keys.map(k => qiniu.rs.statOp(bucket, k))
    const config = new qiniu.conf.Config()
    const bucketManager = new qiniu.rs.BucketManager(mac, config)
    bucketManager.batch(statOperations, (err, respBody, respInfo) => {
      if (err) {
        reject(err)
      }
      else {
        // 200 is success, 298 is part success
        if (Number.parseInt(`${respInfo.statusCode / 100}`) == 2) {
          resolve(respBody)
        }
        else {
          console.log(respInfo.statusCode)
          console.log(respBody)
        }
      }
    })
  })
}

export function getQiniuStatus() {
  return new Promise<ServiceStatus>((res) => {
    if (!qiniuConfig.bucketDomain.startsWith('http')) {
      res({
        type: 'qiniu',
        status: false,
        errMsg: '域名配置错误，必须包含协议 http:/// 或 https://',
      })
      return
    }
    const config = new qiniu.conf.Config({ zone: bucketZone })

    const checkRegion = new Promise((res, rej) => {
      const formUploader = new qiniu.form_up.FormUploader(config)
      const putExtra = new qiniu.form_up.PutExtra()
      const key = `${Date.now()}-${~~(Math.random() * 1000)}.txt`
      formUploader.put(getUploadToken(), key, 'status test', putExtra, (respErr, respBody, respInfo) => {
        const err = respErr || respBody?.error
        if (err) {
          rej(err)
          return
        }
        deleteObjByKey(key)
        res(key)
      })
    })

    const bucketManager = new qiniu.rs.BucketManager(mac, config)
    bucketManager.listPrefix(bucket, {
      prefix: 'easypicker2/',
      limit: 1,
    }, (err, respBody) => {
      const errMsg = err?.message || respBody?.error
      if (errMsg) {
        res({
          type: 'qiniu',
          status: false,
          errMsg,
        })
        return
      }
      checkRegion
        .then(() => {
          res({
            type: 'qiniu',
            status: true,
          })
        })
        .catch((err) => {
          res({
            type: 'qiniu',
            status: false,
            errMsg: `${err}，存储区域配置不正确，请参看文档重新选择`,
          })
        })
    })
  })
}

export function mvOssFile(oldKey: string, newKey: string, req?: FWRequest) {
  const config = new qiniu.conf.Config()
  const bucketManager = new qiniu.rs.BucketManager(mac, config)
  const srcBucket = qiniuConfig.bucketName
  const destBucket = qiniuConfig.bucketName
  // 强制覆盖已有同名文件
  const options = {
    force: false,
  }
  return new Promise((resolve, reject) => {
    bucketManager.move(srcBucket, oldKey, destBucket, newKey, options, (
      err,
      respBody,
      respInfo,
    ) => {
      if (err) {
        console.log(err)
        if (req) {
          // 日志埋点
          addBehavior(req, {
            module: 'file',
            msg: `资源重命名失败：${srcBucket}:${oldKey} -> ${destBucket}:${newKey}`,
            data: {
              oldKey,
              newKey,
              err,
            },
          })
        }
        reject(err)
      }
      else {
        resolve(true)
        // 200 is success
        if (req) {
          // 日志埋点
          // TODO:埋点优化
          addBehavior(req, {
            module: 'file',
            msg: `OSS资源重命名成功：${srcBucket}:${oldKey} -> ${destBucket}:${newKey}`,
            data: {
              oldKey,
              newKey,
              respBody,
              respInfo,
            },
          })
        }
      }
    })
  })
}
