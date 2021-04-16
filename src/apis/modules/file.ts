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

function checkCompressStatus(id:string) {
  return ajax.post<any, BaseResponse>('file/compress/status', {
    id,
  })
}
function getCompressDownUrl(key:string) {
  return ajax.post<any, BaseResponse>('file/compress/down', {
    key,
  })
}
function getCompressFileUrl(id:string):Promise<string> {
  const check = (_r:any) => {
    checkCompressStatus(id).then((r) => {
      const { code, key } = r.data
      if (code === 0) {
        getCompressDownUrl(key).then((v) => {
          const { url } = v.data
          _r(url)
        })
      } else {
        setTimeout(() => {
          check(_r)
        }, 1000)
      }
    })
  }

  return new Promise((resolve, reject) => {
    check(resolve)
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
  checkCompressStatus,
  getCompressFileUrl,
  getCompressDownUrl,
}
