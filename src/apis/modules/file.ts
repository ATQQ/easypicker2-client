import ajax from '../ajax'

function getUploadToken():FileApiTypes.getUploadToken {
  return ajax.get('file/token')
}

function addFile(options:FileApiTypes.FileOptions):FileApiTypes.addFile {
  return ajax.post('file/info', options)
}

function getFileList():FileApiTypes.getFileList {
  return ajax.get('file/list')
}

function getTemplateUrl(template:string, key:string):FileApiTypes.getTemplateUrl {
  return ajax.get('file/template', {
    params: {
      template,
      key,
    },
  })
}

function getOneFileUrl(id:number):FileApiTypes.getOneFileUrl {
  return ajax.get('file/one', {
    params: {
      id,
    },
  })
}

function deleteOneFile(id:number):FileApiTypes.deleteOneFile {
  return ajax.delete('file/one', {
    params: {
      id,
    },
  })
}

function batchDownload(ids:number[], zipName?:string):FileApiTypes.batchDownload {
  return ajax.post('file/batch/down', {
    ids,
    zipName,
  })
}

function batchDel(ids:number[]):FileApiTypes.batchDel {
  return ajax.delete('file/batch/del', {
    params: {
      ids,
    },
  })
}

function checkCompressStatus(id:string):FileApiTypes.checkCompressStatus {
  return ajax.post('file/compress/status', {
    id,
  })
}
function getCompressDownUrl(key:string):FileApiTypes.getCompressDownUrl {
  return ajax.post('file/compress/down', {
    key,
  })
}
function getCompressFileUrl(id:string):Promise<string> {
  const check = (_r:any, _rej) => {
    checkCompressStatus(id).then((r) => {
      const { code, key } = r.data
      if (code === 0) {
        getCompressDownUrl(key ?? '').then((v) => {
          const { url } = v.data
          _r(url)
        })
      } else {
        setTimeout(() => {
          check(_r, _rej)
        }, 1000)
      }
    }).catch((err) => {
      _rej(err)
    })
  }

  return new Promise((resolve, rej) => {
    check(resolve, rej)
  })
}

function withdrawFile(options:FileApiTypes.WithdrawFileOptions):FileApiTypes.withdrawFile {
  return ajax.delete('file/withdraw', {
    params: options,
  })
}

function checkSubmitStatus(taskKey:string, info:any):FileApiTypes.checkSubmitStatus {
  return ajax.post('file/submit/people', {
    taskKey,
    info,
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
  checkSubmitStatus,
}
