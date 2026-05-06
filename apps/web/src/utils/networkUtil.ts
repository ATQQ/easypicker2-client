type SuccessCallback = (data: any) => void
export function jsonp(
  url: string,
  jsonpCallback: string,
  success: SuccessCallback,
) {
  const $script = document.createElement('script')
  $script.src = `${url}&callback=${jsonpCallback}`
  $script.async = true
  $script.type = 'text/javascript'
  ;(<any>window)[jsonpCallback] = function callback(data: any) {
    if (success) {
      success(data)
    }
  }
  document.body.appendChild($script)
}

interface UploadFileOptions {
  success?: any
  error?: any
  process?: any
  method?: string
}
export function uploadFile(
  file: File,
  url: string,
  options?: UploadFileOptions,
) {
  const form = new FormData()
  // ajax对象
  const xhr = new XMLHttpRequest()
  // 添加文件到表单中
  form.append('file', file)
  // 设置请求方式 路径  是否异步
  xhr.open(options?.method || 'post', url, true)
  // 设置请求头参数的方式,如果没有可忽略此行代码
  xhr.setRequestHeader('token', localStorage.getItem('token') as string)
  if (options?.success) {
    // 上传完成
    xhr.onload = (e) => {
      const target = e?.currentTarget as any
      if (target.response) {
        options.success(JSON.parse(target.response))
        return
      }
      options.success()
    }
  }
  if (options?.error) {
    // 上传出错
    xhr.onerror = options.error
  }
  if (options?.process) {
    // 上传中
    xhr.onprogress = (e) => {
      const { total, loaded, lengthComputable } = e
      if (lengthComputable) {
        options.process((loaded / total).toFixed(2))
      }
    }
  }

  // 发送请求
  xhr.send(form)
}

export interface tableItem {
  value: string
  col?: number
  row?: number
}
/**
 * 导出表格数据为xls
 * @param headers 头部
 * @param body 身体部分数据
 */
export function tableToExcel(
  headers: (string | tableItem)[],
  body: any[],
  filename = 'res.xlsx',
) {
  // 列标题
  let str = `<tr>${headers
    .map((v) => {
      if (v instanceof Object) {
        const { value, col = 1, row = 1 } = v
        return `<th colspan="${col}" rowspan="${row}">${value}</th>`
      }
      return `<th>${v}</th>`
    })
    .join('')}</tr>`
  // 循环遍历，每行加入tr标签，每个单元格加td标签
  for (const row of body) {
    str += '<tr>'
    for (const cell of row) {
      if (cell instanceof Object) {
        const { value, col = 1, row = 1 } = cell
        str += `<td colspan="${col}" rowspan="${row}">${value}</td>`
      }
      // 增加\t为了不让表格显示科学计数法或者其他格式
      str += `<td>${`${cell}\t`}</td>`
    }
    str += '</tr>'
  }

  // Worksheet名
  // const worksheet = 'sheet1'
  // const uri = 'data:application/vnd.ms-excel;base64,'

  // // 下载的表格模板数据
  // const template =
  //   '<html xmlns:o="urn:schemas-microsoft-com:office:office" \n' +
  //   '      xmlns:x="urn:schemas-microsoft-com:office:excel" \n' +
  //   '      xmlns="http://www.w3.org/TR/REC-html40">\n' +
  //   '      <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>\n' +
  //   `        <x:Name>${worksheet}</x:Name>\n` +
  //   '        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>\n' +
  //   '        </x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->\n' +
  //   `        </head><body><table>${str}</table></body></html>\n`
  // 下载模板
  // const tempA = document.createElement('a')
  // tempA.href = uri + base64(template)
  // tempA.download = filename
  // document.body.appendChild(tempA)
  // tempA.click()
  // document.body.removeChild(tempA)
  const tableElement = document.createElement('table')
  tableElement.innerHTML = str
  const wb = XLSX.utils.table_to_book(tableElement)
  XLSX.writeFile(wb, filename)
}

export function localTaskFileUpload(
  file: File,
  meta: { taskKey: string, hash: string, name: string },
  options?: UploadFileOptions,
) {
  const rawBase = import.meta.env.VITE_APP_AXIOS_BASE_URL || '/api/'
  const base = rawBase.replace(/\/?$/, '')
  const url = `${base}/file/upload`
  const xhr = new XMLHttpRequest()
  const form = new FormData()
  form.append('file', file)
  form.append('taskKey', meta.taskKey)
  form.append('hash', meta.hash)
  form.append('name', meta.name)
  xhr.open('POST', url, true)
  const token = localStorage.getItem('token')
  if (token)
    xhr.setRequestHeader('token', token)

  const { success, error, process } = options || {}
  const subscription = {
    unsubscribe: () => {
      xhr.abort()
    },
  }

  xhr.upload.onprogress = (e) => {
    if (process && e.lengthComputable && e.total > 0) {
      const percent = ((e.loaded / e.total) * 100).toFixed(2)
      process(percent, e, subscription)
    }
  }

  xhr.onload = () => {
    try {
      const res = JSON.parse(xhr.responseText || '{}')
      if (res.code === 0) {
        success?.(res.data, subscription)
      }
      else {
        error?.(new Error(res.msg || 'upload failed'), subscription)
      }
    }
    catch (e) {
      error?.(e, subscription)
    }
  }
  xhr.onerror = () => error?.(new Error('network'), subscription)
  xhr.send(form)
  return xhr
}

/**
 * 七牛云上传
 */
export function qiniuUpload(
  token: string,
  file: File,
  key: string,
  options?: UploadFileOptions,
) {
  const observable = qiniu.upload(file, key, token)
  const { success, error, process } = options || {}
  const subscription = observable.subscribe({
    next(res) {
      const {
        total: { percent },
      } = res
      if (process) {
        process(percent.toFixed(2), res, subscription)
      }
    },
    error(err) {
      if (error) {
        error(err, subscription)
      }
    },
    complete(res) {
      if (success) {
        success(res, subscription)
      }
    },
  })
  // subscription.close() // 取消上传
}

export function downLoadByUrl(url: string, filename = `${Date.now()}`) {
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.download = filename
  a.click()
}

/**
 * 解决图片被预览的问题
 * @param url
 * @param filename
 */
export function downLoadByXhr(
  url: string,
  filename = `${Date.now()}`,
  options?: {
    progress: (loaded: number, total: number) => void
    success: (res) => void
  },
) {
  const { progress, success } = options || {}
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url)
  // 设置返回数据的类型为blob
  xhr.responseType = 'blob'

  // 增加的代码
  xhr.onprogress = function (e) {
    const { total, loaded } = e
    if (typeof progress === 'function') {
      progress(loaded, total)
    }
  }

  // 资源完成下载
  xhr.onload = function () {
    let name = filename
    // 获取响应的blob对象
    const blob = xhr.response
    const a = document.createElement('a')
    // 设置下载的文件名字
    name = name || blob.name || 'download'
    a.download = name

    // 解决安全问题，新页面的window.opener 指向前一个页面的window对象
    // 使用noopener使 window.opener 获取的值为null
    a.rel = 'noopener'

    // 创建一个DOMString指向这个blob
    // 简单理解就是为这个blob对象生成一个可访问的链接
    a.href = URL.createObjectURL(blob)

    // 40s后移除这个临时链接
    setTimeout(() => {
      URL.revokeObjectURL(a.href)
    }, 4e4) // 40s
    // 触发a标签，执行下载
    setTimeout(() => {
      a.dispatchEvent(new MouseEvent('click'))
      success(xhr)
    }, 0)
  }
  // 发送请求
  xhr.send()
}

export function mergeRequest<T extends (...args: any[]) => any>(callback: T, delay = 1000) {
  const pMap = new Map<string, Promise<any>>()
  const cb = ((...args: Parameters<T>) => {
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
  }) as T
  return cb as T
}
