// 接口的响应值类型定义
type ResponseData<T=any> = Promise<BaseResponse<T>>
declare namespace FileApiTypes{
    interface UploadToken{
        token:string
    }
    interface FileOptions{
        size:number
        taskKey:string
        taskName:string
        categoryKey?:string
        name:string
        info:string
        hash:string
        people?:string
    }
    interface File{
        id:number
        info:string
        name:string
        people:string
        size:number
        task_key:string
        task_name:string
        user_id:number
        category_key:string
        date:string
        hash:string
    }
    interface WithdrawFileOptions{
        taskKey:string
        taskName:string
        filename:string
        hash:string
        peopleName:string
        info:string
      }
    type getUploadToken = ResponseData<UploadToken>
    type addFile = ResponseData<any>
    type getFileList = ResponseData<{files:File[]}>
    type getTemplateUrl = ResponseData<{link:string}>
    type getOneFileUrl = ResponseData<{link:string}>
    type deleteOneFile = ResponseData
    type batchDownload = ResponseData<{k:string}>
    type batchDel = ResponseData
    type checkCompressStatus = ResponseData<{code:number, key?:string}>
    type getCompressDownUrl = ResponseData<{url:string}>
    type withdrawFile = ResponseData
    type checkSubmitStatus = ResponseData<{isSubmit:boolean, txt?:string}>
}
