import { ElMessage } from 'element-plus'
import SparkMD5 from 'spark-md5'
import copy from 'clipboard-copy'
import { jsonp } from './networkUtil'
/**
 * 将结果写入的剪贴板
 * @param {string} text
 */
export function copyRes(text: string, msg = '结果已成功复制到剪贴板') {
  // 自定义
  // const input = document.createElement('input')
  // document.body.appendChild(input)
  // input.setAttribute('value', text)
  // input.select()
  // if (document.execCommand('copy')) {
  //   document.execCommand('copy')
  // }
  // document.body.removeChild(input)

  // 第三方
  copy(text)
    .then(() => {
      if (msg) {
        ElMessage.success(msg)
      }
    })
    .catch((err) => {
      ElMessage.error(err?.message || '无粘贴板权限')
      ElMessage.warning('不支持自动复制，请手动选择复制')
    })
}

/**
 * 生成短地址
 * @param url
 */
export function getShortUrl(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    jsonp(
      `https://api.suowo.cn/api.htm?format=jsonp&url=${encodeURIComponent(
        text,
      )}&key=5ec8a001be96bd79a37f19b8@bf33c7483d0c6900bb7bc90a0e6dfdf0&expireDate=2030-03-31&domain=0`,
      'shortLink',
      (res) => {
        const { url, err } = res
        if (err) {
          reject(err)
        }
        resolve(url)
      },
    )
  })
}

export function base64(s: string) {
  return window.btoa(unescape(encodeURIComponent(s)))
}

export function formatDate(d: any, fmt = 'yyyy-MM-dd hh:mm:ss') {
  if (!(d instanceof Date)) {
    d = new Date(d)
  }
  const o: any = {
    'M+': d.getMonth() + 1, // 月份
    'd+': d.getDate(), // 日
    'h+': d.getHours(), // 小时
    'm+': d.getMinutes(), // 分
    's+': d.getSeconds(), // 秒
    'q+': Math.floor((d.getMonth() + 3) / 3), // 季度
    'S': d.getMilliseconds(), // 毫秒
  }
  if (/(y+)/.test(fmt)) {
    fmt = fmt.replace(
      RegExp.$1,
      `${d.getFullYear()}`.substr(4 - RegExp.$1.length),
    )
  }

  for (const k in o) {
    if (new RegExp(`(${k})`).test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length === 1 ? o[k] : `00${o[k]}`.substr(`${o[k]}`.length),
      )
    }
  }
  return fmt
}

export function getFileSuffix(str: string) {
  const startIndex = str.lastIndexOf('.')
  return startIndex >= 0 ? str.slice(startIndex) : ''
}

export function getFileMd5Hash(file: File) {
  return new Promise((resolve, reject) => {
    const blobSlice = File.prototype.slice
    const chunkSize = 2097152 // Read in chunks of 2MB
    const chunks = Math.ceil(file.size / chunkSize)
    let currentChunk = 0
    const spark = new SparkMD5.ArrayBuffer()
    const fileReader = new FileReader()

    function loadNext() {
      const start = currentChunk * chunkSize
      const end = start + chunkSize >= file.size ? file.size : start + chunkSize

      fileReader.readAsArrayBuffer(blobSlice.call(file, start, end))
    }
    fileReader.onload = function (e) {
      // console.log('read chunk nr', currentChunk + 1, 'of', chunks)
      spark.append(e?.target?.result) // Append array buffer
      currentChunk += 1

      if (currentChunk < chunks) {
        loadNext()
      }
      else {
        // console.log('finished loading')
        const hashResult = spark.end()
        // console.info('computed hash', hashResult) // Compute hash
        resolve(hashResult)
      }
    }

    fileReader.onerror = function () {
      reject(new Error('oops, something went wrong.'))
    }

    loadNext()
  })
}

export function formatSize(
  size: number,
  pointLength?: number,
  units?: string[],
) {
  let unit
  units = units || ['B', 'K', 'M', 'G', 'TB', 'PB']
  // eslint-disable-next-line no-cond-assign
  while ((unit = units.shift()) && size > 1024) {
    size /= 1024
  }
  return (
    (unit === 'B'
      ? size
      : size.toFixed(pointLength === undefined ? 2 : pointLength)) + unit
  )
}

/**
 * 浏览器支持预览的类型
 */
function getSupportPreviewType() {
  const types = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'video/mp4',
  ]
  const supportTypes = []
  types.forEach((type) => {
    if (
      typeof FileReader !== 'undefined'
      && typeof FileReader.prototype.readAsDataURL !== 'undefined'
    ) {
      const fileReader = new FileReader()
      if (fileReader.readAsDataURL) {
        try {
          fileReader.readAsDataURL(new Blob([new ArrayBuffer(1)], { type }))
          supportTypes.push(type)
        }
        catch (e) {
          // console.log(e)
        }
      }
    }
  })
  return supportTypes
}

export function isSupportPreview(type: string) {
  const supportTypes = getSupportPreviewType()
  return supportTypes.includes(type)
}

export function parseInfo(info: string): InfoItem[] {
  return JSON.parse(info).map((v: string | InfoItem) => {
    // 兼容旧表单数据
    if (typeof v === 'string') {
      return { type: 'input', text: v, value: '' }
    }
    // 兼容旧数据展示
    if (!v.type) {
      v.type = 'input'
    }
    v.value = v.value || ''
    return v
  })
}

/**
 * 文件名合法化
 */
export function normalizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, '-')
}

export function getDefaultFormat() {
  return {
    size: 0,
    sizeUnit: 'MB',
    status: false,
    format: [],
    limit: 10,
    splitChar: '-',
  }
}
export function parseFileFormat(format: string) {
  const formatData = getDefaultFormat()
  try {
    const v = JSON.parse(format)
    Object.keys(v).forEach((key) => {
      formatData[key] = v[key] || formatData[key]
      // format 小写去重
      if (key === 'format') {
        formatData[key] = Array.from(
          new Set(formatData[key].map(v => v.toLowerCase())),
        )
      }
    })
  }
  catch (_) {
    return formatData
  }
  return formatData
}

export function getTipImageKey(
  key: string,
  name: string,
  uid?: number | string,
) {
  return `easypicker2/tip/${key}/${uid || Date.now()}/${name}`
}


export function shareCopyLink(url: string){

}