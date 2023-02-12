// 接口的响应值类型定义
type ResponseData<T = any> = Promise<BaseResponse<T>>
declare namespace FileApiTypes {
  interface UploadToken {
    token: string
  }
  interface FileOptions {
    size: number
    taskKey: string
    taskName: string
    originName: string
    categoryKey?: string
    name: string
    info: string
    hash: string
    people?: string
  }
  interface File {
    id: number
    info: string
    name: string
    people: string
    size: number
    task_key: string
    task_name: string
    user_id: number
    category_key: string
    origin_name: string
    date: string
    hash: string
    cover?: string
    preview?: string
  }
  interface WithdrawFileOptions {
    taskKey: string
    taskName: string
    filename: string
    hash: string
    peopleName: string
    info: string
  }
  type getUploadToken = ResponseData<UploadToken>
  type addFile = ResponseData<any>
  type getFileList = ResponseData<{ files: File[] }>
  type getTemplateUrl = ResponseData<{ link: string }>
  type getOneFileUrl = ResponseData<{ link: string; mimeType: string }>
  type deleteOneFile = ResponseData
  type batchDownload = ResponseData<{ k: string }>
  type batchDel = ResponseData
  type checkCompressStatus = ResponseData<{ code: number; key?: string }>
  type getCompressDownUrl = ResponseData<{ url: string }>
  type withdrawFile = ResponseData
  type checkSubmitStatus = ResponseData<{ isSubmit: boolean; txt?: string }>
  type checkImageFilePreviewUrl = ResponseData<
    { cover: string; preview: string }[]
  >
  type updateFilename = ResponseData
}

declare namespace UserApiTypes {
  interface RegisterOptions {
    account: string
    pwd: string
    bindPhone: boolean
    phone?: string
    code?: string
  }
  type register = ResponseData<{ token?: string }>
  type login = ResponseData<{
    token?: string
    openTime?: string
    system: boolean
  }>
  type codeLogin = ResponseData<{ token?: string; openTime?: string }>
  type resetPwd = ResponseData<{ token?: string; openTime?: string }>
  type checkPower = ResponseData<{
    power: boolean
    name: string
    system: boolean
  }>
  type logout = ResponseData
  type checkLoginStatus = ResponseData<boolean>
}

declare namespace TaskApiTypes {
  interface TaskLog {
    date: string
    filename: string
  }
  interface TaskItem {
    category: string
    key: string
    name: string
    recentLog: TaskLog[]
  }
  interface TaskInfo {
    ddl?: string | null
    format?: string
    info?: string
    people?: number
    rewrite?: number
    share?: string
    template?: string
    name?: string
    category?: string
    tip?: string
    size?: number
  }

  type getList = ResponseData<{ tasks: TaskItem[] }>
  type create = ResponseData
  type deleteOne = ResponseData
  type updateBaseInfo = ResponseData
  type getTaskInfo = ResponseData<TaskInfo>
  type getTaskMoreInfo = ResponseData<TaskInfo>
  type updateTaskMoreInfo = ResponseData
  type getUsefulTemplate = ResponseData<
    { taskKey: string; name: string; info: string }[]
  >
}

declare namespace PublicApiTypes {
  type getCode = ResponseData
  type reportPv = ResponseData
  type checkPhone = ResponseData
}

declare namespace PeopleApiTypes {
  interface People {
    count: number
    id: number
    lastDate: string
    name: string
    statue: number
  }
  type importPeople = ResponseData<{ success: number; fail: string[] }>
  type getPeople = ResponseData<{ people: People[] }>
  type deletePeople = ResponseData
  type updatePeopleStatus = ResponseData
  type checkPeopleIsExist = ResponseData<{ exist: boolean }>
  type getUsefulTemplate = ResponseData<
    { taskKey: string; name: string; count: number }[]
  >
  type importFromTpl = ResponseData<{ fail: string[]; success: number }>
}

declare namespace CateGoryApiTypes {
  interface CategoryItem {
    id: number
    name: string
    k: string
  }
  type getList = ResponseData<{ categories: CategoryItem[] }>
  type createNew = ResponseData
  type deleteOne = ResponseData
}

declare namespace OverviewApiTypes {
  interface CountLog {
    sum: number
    recent?: number
    uv?: number
    size?: string
  }
  interface LogItem {
    date: string
    ip: string
    msg: string
    type: string
  }
  type getCount = ResponseData<{
    file: {
      server: CountLog
      oss: CountLog
    }
    log: CountLog
    pv: {
      all: CountLog
      today: CountLog
    }
    user: CountLog
    compress: {
      all: CountLog
      expired: CountLog
    }
  }>
  type getAllLogMsg = ResponseData<{ logs: LogItem[] }>
  type getLogMsg = ResponseData<{
    logs: LogItem[]
    sum: number
    pageIndex: number
    pageSize: number
  }>
  type disabledStatus = ResponseData<{ status: boolean }>
}

declare namespace SuperUserApiTypes {
  interface UserItem {
    account: string
    id: number
    join_time: string
    login_count: number
    login_time: string
    open_time: string
    phone: string
    status: number
  }
  type getUserList = ResponseData<{ list: UserItem[] }>
  type updateUserStatus = ResponseData
}

declare namespace WishApiTypes {
  interface Wish {
    id: string
    title: string
    /**
     * 详细描述
     */
    des: string
    /**
     * 联系方式
     */
    contact?: string
    /**
     * 当前进度
     */
    status: number
    startDate: Date
    endDate: Date
  }

  type addWish = ResponseData

  type WishItem = Wish & {
    createDate: number
  }
  type allWishData = ResponseData<WishItem[]>

  type updateWish = ResponseData

  type DocsWishItem = {
    id: string
    title: string
    des: string
    status: number
    startDate?: string
    count: number
    alreadyPraise: boolean
  }
  type allDocsWishData = ResponseData<DocsWishItem[]>
}

declare namespace ConfigServiceAPITypes {
  interface ServiceOverviewItem {
    status: boolean
  }
  type getServiceOverview = ResponseData<{
    qiniu: ServiceOverviewItem
    tx: ServiceOverviewItem
    redis: ServiceOverviewItem
    mysql: ServiceOverviewItem
    mongodb: ServiceOverviewItem
  }>

  interface ServiceConfigItem {
    key: string
    value: string
    type: string
    disabled?: boolean
    label?: string
  }
  interface ConfigData {
    title: string
    data: ServiceConfigItem[]
  }
  type getServiceConfig = ResponseData<ConfigData[]>
}

declare namespace ActionApiTypes {
  interface DownloadActionData {
    id: string
    type: number
    url: string
    status: number
    tip: string
    date: number
    size: number
  }

  type getDownloadActions = ResponseData<{
    sum: number
    pageSize: number
    pageIndex: number
    actions: DownloadActionData[]
  }>
}
