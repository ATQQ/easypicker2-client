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
export default {
  getUploadToken,
  addFile,
  getFileList,
}
