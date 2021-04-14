import ajax from '../ajax'

function getUploadToken() {
  return ajax.get<any, BaseResponse>('file/token')
}

function addFile(options:DbFile) {
  return ajax.post<any, BaseResponse>('file/info', options)
}

function getFileList() {
  return ajax.get<any, BaseResponse>('file/list')
}

function getTemplateUrl(template:string, key:string) {
  return ajax.get<any, BaseResponse>('file/template', {
    params: {
      template,
      key,
    },
  })
}

interface WithdrawFileOptions{
  taskKey:string
  taskName:string
  filename:string
  hash:string
  peopleName:string
  info:string
}
function withdrawFile(options:WithdrawFileOptions) {
  return ajax.delete('file/withdraw', {
    params: options,
  })
}
export default {
  getUploadToken,
  addFile,
  getFileList,
  getTemplateUrl,
  withdrawFile,
}
