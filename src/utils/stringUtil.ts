import { ElMessage } from 'element-plus'
import { jsonp } from './networkUtil'

/**
* 将结果写入的剪贴板
* @param {String} text
*/
export function copyRes(text:string) {
  const input = document.createElement('input')
  document.body.appendChild(input)
  input.setAttribute('value', text)
  input.select()
  if (document.execCommand('copy')) {
    document.execCommand('copy')
  }
  document.body.removeChild(input)
  ElMessage.success('结果已成功复制到剪贴板')
}

/**
* 生成短地址
* @param url
*/
export function getShortUrl(text:string):Promise<string> {
  return new Promise((resolve, reject) => {
    jsonp(`https://api.suowo.cn/api.htm?format=jsonp&url=${encodeURIComponent(text)}&key=5ec8a001be96bd79a37f19b8@bf33c7483d0c6900bb7bc90a0e6dfdf0&expireDate=2030-03-31&domain=0`, 'shortLink', (res) => {
      const { url, err } = res
      if (err) {
        reject(err)
      }
      resolve(url)
    })
  })
}

export function base64(s:string) {
  return window.btoa(unescape(encodeURIComponent(s)))
}

export function formatDate(d:Date, fmt = 'yyyy-MM-dd hh:mm:ss') {
  const o:any = {
    'M+': d.getMonth() + 1, // 月份
    'd+': d.getDate(), // 日
    'h+': d.getHours(), // 小时
    'm+': d.getMinutes(), // 分
    's+': d.getSeconds(), // 秒
    'q+': Math.floor((d.getMonth() + 3) / 3), // 季度
    S: d.getMilliseconds(), // 毫秒
  }
  if (/(y+)/.test(fmt)) { fmt = fmt.replace(RegExp.$1, (`${d.getFullYear()}`).substr(4 - RegExp.$1.length)) }
  // eslint-disable-next-line no-restricted-syntax
  for (const k in o) { if (new RegExp(`(${k})`).test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : ((`00${o[k]}`).substr((`${o[k]}`).length))) }
  return fmt
}

export function getFileSuffix(str:string) {
  return str.slice(str.lastIndexOf('.'))
}
