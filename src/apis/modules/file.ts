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
export default {
  getUploadToken,
  addFile,
  getFileList,
  getTemplateUrl,
}
