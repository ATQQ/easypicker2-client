/* eslint-disable node/handle-callback-err */
import type { Context } from 'flash-wolves'
import { Inject, InjectCtx, Provide } from 'flash-wolves'
import qiniu from 'qiniu'
import BehaviorService from './behaviorService'
import { getTipImageKey } from '@/utils/stringUtil'
import { qiniuConfig } from '@/config'
import type { File } from '@/db/model/file'
import SuperService from '@/service/super'

@Provide()
export default class QiniuService {
  @InjectCtx()
  private ctx: Context

  @Inject(BehaviorService)
  private behaviorService: BehaviorService

  private config = qiniuConfig

  get bucket() {
    return this.config.bucketName
  }

  get mac() {
    return new qiniu.auth.digest.Mac(
      this.config.accessKey,
      this.config.secretKey,
    )
  }

  deleteObjByKey(key: string) {
    const config = new qiniu.conf.Config()
    const bucketManager = new qiniu.rs.BucketManager(this.mac, config)

    bucketManager.delete(this.bucket, key, (err) => {
      if (err) {
        console.log('------删除失败 start-------')
        console.log(key)
        console.log(err)
        console.log('------删除失败 end-------')
        if (this.ctx) {
          this.behaviorService.error(
            `删除失败:${key}${err?.message}`,
            err?.stack,
          )
        }
      }
    })
  }

  getTipImageKey(key: string, name: string, uid: number) {
    return getTipImageKey(key, name, uid)
  }

  deleteFiles(prefix: string): void {
    const config = new qiniu.conf.Config()
    const bucketManager = new qiniu.rs.BucketManager(this.mac, config)
    bucketManager.listPrefix(
      this.bucket,
      {
        limit: 1000,
        prefix,
      },
      (err, respBody) => {
        const files: any[] = respBody.items
        // 使用批量删除接口
        this.batchDeleteFiles(files.map(f => f.key))
      },
    )
  }

  batchDeleteFiles(keys: string[]) {
    if (!keys.length)
      return
    const { bucket, mac } = this
    const config = new qiniu.conf.Config()
    const delOptions = keys.map(k => qiniu.rs.deleteOp(bucket, k))
    const bucketManager = new qiniu.rs.BucketManager(mac, config)
    bucketManager.batch(delOptions, (err, respBody, respInfo) => {
      if (err) {
        console.log(err)
        this.behaviorService.error(`批量删除异常: ${err.message}`, err.stack)
        // throw err;
      }
      else {
        // 200 is success, 298 is part success

        if (Number.parseInt(`${respInfo.statusCode / 100}`, 10) === 2) {
          respBody.forEach((item) => {
            if (+item.code !== 200) {
              this.behaviorService.error(
                `${item.code}\t${item.data.error}`,
                item,
              )
            }
          })
        }
        else {
          console.log(respInfo.deleteusCode)
          console.log(respBody)
          this.behaviorService.error(
            `批量删除异常: ${respInfo.deleteusCode}`,
            respBody,
          )
        }
      }
    })
  }

  async getFilesMap(files: File[]) {
    const filesMap = new Map<string, Qiniu.ItemInfo>()
    const startTime = Date.now()
    const ossFiles = await SuperService.getOssFiles()

    ossFiles.forEach((v) => {
      filesMap.set(v.key, v)
    })

    // 兼容ep1网站数据
    const oldPrefixList = new Set(
      files
        .filter(v => v.category_key)
        .map((v) => {
          return v.category_key.split('/')[0]
        })
        .filter(v => !v.includes('"'))
        .filter(v => !v.startsWith('easypicker2')),
    )

    for (const prefix of oldPrefixList) {
      const ossSources = await SuperService.getOssFilesByPrefix(`${prefix}/`)
      ossSources.forEach((v) => {
        filesMap.set(v.key, v)
      })
    }
    const expireTime = Date.now() - startTime
    this.behaviorService.add('file', `查询OSS文件信息 - ${expireTime}ms`, {
      time: expireTime,
    })

    return filesMap
  }
}
