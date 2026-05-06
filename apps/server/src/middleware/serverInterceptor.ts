import type { IncomingMessage } from 'http'
import { Middleware } from 'flash-wolves'
import formidable from 'formidable'
import fs from 'node:fs'
import path from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { uploadFileDir } from '@/constants'
import { getClientIp } from '@/db/logDb'
import { selectTasks } from '@/db/taskDb'
import { getUserInfo } from '@/utils/userUtil'
import { getMaxUploadBytes, getStorageMode } from '@/utils/storageMode'
import { localObjectAbsPath, localObjectRelPath } from '@/utils/localFilePath'

// 允许跨域访问的源
const allowOrigins = [
  'http://localhost:8080',
  'https://ep2.sugarat.top',
  'https://ep2.dev.sugarat.top'
]

if (!existsSync(uploadFileDir)) {
  mkdirSync(uploadFileDir)
}

const interceptor: Middleware = async (req, res) => {
  // 开启CORS
  const { method } = req
  req.startTime = Date.now()
  if (allowOrigins.includes(req.headers.origin)) {
    // 允许跨域
  }
  // 设置响应头
  res.setHeader('Content-Type', 'application/json;charset=utf-8')
  // 对预检请求放行
  if (method === 'OPTIONS') {
    res.statusCode = 204
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', '*')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.end()
    return
  }

  const pathOnly = (req.url || '').split('?')[0]
  if (
    method === 'POST'
    && pathOnly === '/api/file/upload'
    && getStorageMode() === 'local'
  ) {
    const maxB = getMaxUploadBytes()
    const form = formidable({
      maxFileSize: maxB,
      multiples: false,
    })
    const pick = (fields: formidable.Fields, key: string) => {
      const v = fields[key]
      if (Array.isArray(v))
        return v[0]
      return v
    }
    const endJson = (code: number, msg: string, data?: unknown) => {
      res.writeHead(code >= 400 ? code : 200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data !== undefined ? { code, msg, data } : { code, msg }))
    }
    try {
      const { fields, files } = await new Promise<{
        fields: formidable.Fields
        files: formidable.Files
      }>((resolve, reject) => {
        form.parse(req as IncomingMessage, (err, fields, files) => {
          if (err)
            reject(err)
          else
            resolve({ fields, files })
        })
      })
      const taskKey = String(pick(fields, 'taskKey') || '')
      const hash = String(pick(fields, 'hash') || '')
      const name = String(pick(fields, 'name') || '')
      const f = files.file || files.files
      const fileItem = Array.isArray(f) ? f[0] : f
      if (!taskKey || !hash || !name || !fileItem) {
        endJson(400, 'missing taskKey, hash, name or file')
        return
      }
      const tasks = await selectTasks({ k: taskKey, del: 0 })
      if (!tasks.length) {
        endJson(400, 'task not exist')
        return
      }
      const rel = localObjectRelPath(taskKey, hash, name)
      const abs = localObjectAbsPath(rel)
      mkdirSync(path.dirname(abs), { recursive: true })
      fs.renameSync(fileItem.filepath, abs)
      const st = fs.statSync(abs)
      endJson(0, 'ok', { fsize: st.size })
    }
    catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      endJson(500, msg || 'upload failed')
    }
    return
  }

  // 处理文件上传
  // 单独抽离文件上传API
  if (req.url === '/public/upload') {
    const form = formidable({
      multiples: true,
      uploadDir: uploadFileDir,
      keepExtensions: true
    })
    const p = new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(err)
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        const data = {
          name: files.file.newFilename,
          size: files.file.size,
          type: files.file.mimetype
        }
        res.end(JSON.stringify({ code: 0, data, msg: 'ok' }, null, 2))
        resolve('ok')
      })
    })
    try {
      await p
    } catch (error) {
      res.end(JSON.stringify({ code: 500, msg: error }))
    }
  }

  // 添加ip，供 @ReqIp 取用
  Object.defineProperty(req, '_ip', {
    value: getClientIp(req)
  })

  // 添加userInfo，供@ReqUserInfo
  Object.defineProperty(req, '_userinfo', {
    value: await getUserInfo(req)
  })
}
export default interceptor
