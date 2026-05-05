import { Middleware } from 'flash-wolves'
import formidable from 'formidable'
import { existsSync, mkdirSync } from 'fs'
import { uploadFileDir } from '@/constants'
import { getClientIp } from '@/db/logDb'
import { getUserInfo } from '@/utils/userUtil'

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
