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

function getOneFileUrl(id:number) {
  return ajax.get<any, BaseResponse>('file/one', {
    params: {
      id,
    },
  })
}

function deleteOneFile(id:number) {
  return ajax.delete<any, BaseResponse>('file/one', {
    params: {
      id,
    },
  })
}

function batchDownload(ids:number[]) {
  return ajax.post<any, BaseResponse>('file/batch/down', {
    ids,
  })
}

function batchDel(ids:number[]) {
  return ajax.delete<any, BaseResponse>('file/batch/del', {
    params: {
      ids,
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
  getOneFileUrl,
  deleteOneFile,
  batchDownload,
  batchDel,
}
