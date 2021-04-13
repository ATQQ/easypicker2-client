import { base64 } from './stringUtil'

/* eslint-disable no-restricted-syntax */
type SuccessCallback = (data:any) => void
export function jsonp(url: string, jsonpCallback: string, success:SuccessCallback) {
  const $script = document.createElement('script')
  $script.src = `${url}&callback=${jsonpCallback}`
  $script.async = true
  $script.type = 'text/javascript';
  (<any>window)[jsonpCallback] = function callback(data:any) {
    if (success) {
      success(data)
    }
  }
  document.body.appendChild($script)
}

interface UploadFileOptions{
  success?:any,
  error?:any,
  process?:any
  method?:string,
}
export function uploadFile(file:File, url:string, options?:UploadFileOptions) {
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

/**
  * 导出表格数据为xls
  * @param headers 头部
  * @param body 身体部分数据
  */
export function tableToExcel(headers:string[], body:any[], filename = 'res.xls') {
  // 列标题
  let str = `<tr>${headers.map((v) => `<th>${v}</th>`).join('')}</tr>`
  // 循环遍历，每行加入tr标签，每个单元格加td标签
  for (const row of body) {
    str += '<tr>'
    for (const cell of row) {
      // 增加\t为了不让表格显示科学计数法或者其他格式
      str += `<td>${`${cell}\t`}</td>`
    }
    str += '</tr>'
  }

  // Worksheet名
  const worksheet = 'sheet1'
  const uri = 'data:application/vnd.ms-excel;base64,'

  // 下载的表格模板数据
  const template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" \n'
          + '      xmlns:x="urn:schemas-microsoft-com:office:excel" \n'
          + '      xmlns="http://www.w3.org/TR/REC-html40">\n'
          + '      <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>\n'
          + `        <x:Name>${worksheet}</x:Name>\n`
          + '        <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet>\n'
          + '        </x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->\n'
          + `        </head><body><table>${str}</table></body></html>\n`
  // 下载模板
  const tempA = document.createElement('a')
  tempA.href = uri + base64(template)
  tempA.download = filename
  document.body.appendChild(tempA)
  tempA.click()
  document.body.removeChild(tempA)
}

/**
 * 七牛云上传
 */
export function qiniuUpload(token:string, file:File, key:string, options?:UploadFileOptions) {
  const observable = qiniu.upload(file, key, token)
  const { success, error, process } = options || {}
  const subscription = observable.subscribe({
    next(res) {
      const { total: { percent } } = res
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
