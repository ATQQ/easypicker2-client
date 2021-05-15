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

declare namespace UserApiTypes{
    interface RegisterOptions{
        account:string
        pwd:string
        bindPhone:boolean
        phone?:string
        code?:string
    }
    type register = ResponseData<{token?:string}>
    type login = ResponseData<{token?:string, openTime?:string}>
    type codeLogin = ResponseData<{token?:string, openTime?:string}>
    type resetPwd = ResponseData<{token?:string, openTime?:string}>
    type checkPower = ResponseData<boolean>
}

declare namespace TaskApiTypes{
    interface TaskLog{
        date:string
        filename:string
    }
    interface TaskItem{
        category:string
        key:string
        name:string
        recentLog:TaskLog[]
    }
    interface TaskInfo{
        ddl?:string|null
        format?:string
        info?:string
        people?:number
        rewrite?:number
        share?:string
        template?:string
    }
    type getList = ResponseData<{tasks:TaskItem[]}>
    type create = ResponseData
    type deleteOne = ResponseData
    type updateBaseInfo = ResponseData
    type getTaskInfo = ResponseData<{name:string, category:string}>
    type getTaskMoreInfo = ResponseData<TaskInfo>
    type updateTaskMoreInfo = ResponseData
}

declare namespace PublicApiTypes{
    type getCode = ResponseData
    type reportPv = ResponseData
}

declare namespace PeopleApiTypes{
    interface People{
        count:number
        id:number
        lastDate:string
        name:string
        statue:number
    }
    type importPeople = ResponseData<{success:number, fail:string[]}>
    type getPeople = ResponseData<{people:People[]}>
    type deletePeople = ResponseData
    type updatePeopleStatus = ResponseData
    type checkPeopleIsExist = ResponseData<{exist:boolean}>
}
