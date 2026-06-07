import type { Middleware } from 'flash-wolves'
import type { IncomingMessage } from 'node:http'
import fs, { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import formidable from 'formidable'
import { uploadFileDir } from '@/constants'
import { getClientIp } from '@/db/logDb'
import { BOOLEAN } from '@/db/model/public'
import { selectTasks } from '@/db/taskDb'
import { localObjectAbsPath, localObjectRelPath } from '@/utils/localFilePath'
import { getMaxUploadBytes, getStorageMode } from '@/utils/storageMode'
import { getTipImageKey } from '@/utils/stringUtil'
import { getUserInfo } from '@/utils/userUtil'

// 允许跨域访问的源
const allowOrigins = [
  'http://localhost:8080',
  'https://ep2.sugarat.top',
  'https://ep2.dev.sugarat.top',
]

function normalizePathname(url = '') {
  const pathOnly = url.split('?')[0] || '/'
  return pathOnly.length > 1 ? pathOnly.replace(/\/+$/, '') : pathOnly
}

function isLocalUploadPath(pathname: string) {
  return pathname === '/api/file/upload' || pathname === '/file/upload'
}

function isPublicUploadPath(pathname: string) {
  return pathname === '/api/public/upload' || pathname === '/public/upload'
}

function isTemplateUploadPath(pathname: string) {
  return pathname === '/api/task_info/template/upload' || pathname === '/task_info/template/upload'
}

function isTipImageUploadPath(pathname: string) {
  return pathname === '/api/task_info/tip/image/upload' || pathname === '/task_info/tip/image/upload'
}

function pickField(fields: formidable.Fields, key: string) {
  const v = fields[key]
  if (Array.isArray(v))
    return v[0]
  return v
}

function pickFile(files: formidable.Files) {
  const f = files.file || files.files
  return Array.isArray(f) ? f[0] : f
}

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

  const pathOnly = normalizePathname(req.url)
  if (
    method === 'POST'
    && isLocalUploadPath(pathOnly)
    && getStorageMode() === 'local'
  ) {
    const maxB = getMaxUploadBytes()
    const form = formidable({
      maxFileSize: maxB,
      multiples: false,
    })
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
      const taskKey = String(pickField(fields, 'taskKey') || '')
      const hash = String(pickField(fields, 'hash') || '')
      const name = String(pickField(fields, 'name') || '')
      const fileItem = pickFile(files)
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

  if (
    method === 'POST'
    && (isTemplateUploadPath(pathOnly) || isTipImageUploadPath(pathOnly))
  ) {
    const endJson = (code: number, msg: string, data?: unknown) => {
      res.writeHead(code >= 400 ? code : 200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(data !== undefined ? { code, msg, data } : { code, msg }))
    }
    if (getStorageMode() !== 'local') {
      endJson(400, 'local storage disabled')
      return
    }
    const user = await getUserInfo(req)
    if (!user?.id) {
      endJson(401, 'not login')
      return
    }
    const form = formidable({
      maxFileSize: getMaxUploadBytes(),
      multiples: false,
    })
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
      const taskKey = String(pickField(fields, 'taskKey') || '')
      const name = String(pickField(fields, 'name') || '')
      const uid = String(pickField(fields, 'uid') || '')
      const fileItem = pickFile(files)
      if (!taskKey || !name || !fileItem) {
        endJson(400, 'missing taskKey, name or file')
        return
      }
      if (isTipImageUploadPath(pathOnly) && !uid) {
        endJson(400, 'missing uid')
        return
      }
      const tasks = await selectTasks({
        k: taskKey,
        userId: user.id,
        del: BOOLEAN.FALSE,
      })
      if (!tasks.length) {
        endJson(403, 'task not found')
        return
      }
      const rel = isTemplateUploadPath(pathOnly)
        ? `easypicker2/${taskKey}_template/${name}`
        : getTipImageKey(taskKey, name, uid)
      const abs = localObjectAbsPath(rel)
      mkdirSync(path.dirname(abs), { recursive: true })
      fs.renameSync(fileItem.filepath, abs)
      const st = fs.statSync(abs)
      endJson(0, 'ok', { fsize: st.size, key: rel })
    }
    catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      endJson(500, msg || 'upload failed')
    }
    return
  }

  // 处理文件上传
  // 单独抽离文件上传API
  if (method === 'POST' && isPublicUploadPath(pathOnly)) {
    const form = formidable({
      multiples: true,
      uploadDir: uploadFileDir,
      keepExtensions: true,
    })
    const p = new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(err)
          return
        }
        const file = Array.isArray(files.file) ? files.file[0] : files.file
        if (!file) {
          reject(new Error('missing file'))
          return
        }
        res.writeHead(200, { 'Content-Type': 'application/json' })
        const data = {
          name: file.newFilename,
          size: file.size,
          type: file.mimetype,
        }
        res.end(JSON.stringify({ code: 0, data, msg: 'ok' }, null, 2))
        resolve('ok')
      })
    })
    try {
      await p
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      res.end(JSON.stringify({ code: 500, msg }))
    }
    return
  }

  // 添加ip，供 @ReqIp 取用
  Object.defineProperty(req, '_ip', {
    value: getClientIp(req),
  })

  // 添加userInfo，供@ReqUserInfo
  Object.defineProperty(req, '_userinfo', {
    value: await getUserInfo(req),
  })
}
export default interceptor
