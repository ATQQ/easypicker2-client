// 接口的响应值类型定义
type ResponseData<T = any> = Promise<BaseResponse<T>>
declare namespace FileApiTypes {
  interface UploadToken {
    token: string
    storageMode?: 'qiniu' | 'local'
    maxUploadBytes?: number
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
    downloadCount?: number
  }
  interface FilePageOptions {
    pageIndex: number
    pageSize: number
    categoryKey?: string
    taskKey?: string
    keyword?: string
  }
  interface BatchDownloadByQueryOptions {
    taskKey?: string
    categoryKey?: string
    keyword?: string
    zipName?: string
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
  type getFilePage = ResponseData<{
    files: File[]
    pageIndex: number
    pageSize: number
    total: number
    pageCount: number
    totalSize: number
    filterSize: number
  }>
  type getTemplateUrl = ResponseData<{ link: string }>
  type getOneFileUrl = ResponseData<{ link: string, mimeType: string }>
  type deleteOneFile = ResponseData
  type batchDownload = ResponseData<{ k: string }>
  type batchDel = ResponseData
  type checkCompressStatus = ResponseData<{ code: number, key?: string }>
  type getCompressDownUrl = ResponseData<{ url: string }>
  type withdrawFile = ResponseData
  type checkSubmitStatus = ResponseData<{ isSubmit: boolean, txt?: string }>
  type checkImageFilePreviewUrl = ResponseData<
    { cover: string, preview: string }[]
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
    bindWithEmail?: boolean
    email?: string
    emailCode?: string
  }
  type register = ResponseData<{ token?: string }>
  type login = ResponseData<{
    token?: string
    openTime?: string
    system: boolean
  }>
  type codeLogin = ResponseData<{ token?: string, openTime?: string }>
  type loginByEmailCode = ResponseData<{ token?: string, openTime?: string }>
  type resetPwd = ResponseData<{ token?: string, openTime?: string }>
  interface UserProfile {
    email: string
    emailVerified: boolean
    notifyOnSubmit: boolean
  }
  type getProfile = ResponseData<UserProfile>
  type setProfileNotify = ResponseData<{ ok: boolean }>
  type bindProfileEmail = ResponseData<{ ok: boolean }>
  type checkPower = ResponseData<{
    power: boolean
    name: string
    system: boolean
  }>
  type logout = ResponseData
  type usage = ResponseData<{
    size: number
    usage: number
    limitUpload: boolean
    wallet: string
    cost: string
    limitSpace: boolean
    limitWallet: boolean
    price: {
      storage: string
      download: string
    }
  }>
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
    /** 库里 JSON 列：接口响应里常为已解析数组；表单侧仍为 JSON 字符串 */
    info?: string | InfoItem[]
    people?: number
    rewrite?: number
    share?: string
    template?: string
    name?: string
    category?: string
    tip?: string
    size?: number
    bindField?: string
    /** 同分类下可在提交页切换的关联任务 */
    submitNavTasks?: { key: string, name: string }[]
  }

  type getList = ResponseData<{ tasks: TaskItem[] }>
  type create = ResponseData
  type deleteOne = ResponseData
  type updateBaseInfo = ResponseData
  type getTaskInfo = ResponseData<TaskInfo & { limitUpload: boolean }>
  type getTaskMoreInfo = ResponseData<TaskInfo>
  type updateTaskMoreInfo = ResponseData
  type getUsefulTemplate = ResponseData<
    { taskKey: string, name: string, info: string | InfoItem[] }[]
  >
}

declare namespace PublicApiTypes {
  type getCode = ResponseData
  type getEmailCode = ResponseData
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
  type importPeople = ResponseData<{ success: number, fail: string[] }>
  type getPeople = ResponseData<{ people: People[] }>
  type deletePeople = ResponseData
  type updatePeopleStatus = ResponseData
  type checkPeopleIsExist = ResponseData<{ exist: boolean }>
  type getUsefulTemplate = ResponseData<
    { taskKey: string, name: string, count: number }[]
  >
  type importFromTpl = ResponseData<{ fail: string[], success: number }>
}

declare namespace CateGoryApiTypes {
  interface CategoryItem {
    id: number
    name: string
    k: string
    submitNavKeys?: string[]
  }
  type getList = ResponseData<{ categories: CategoryItem[] }>
  type createNew = ResponseData
  type deleteOne = ResponseData
  type updateSubmitNav = ResponseData
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
  interface RequestMetricItem {
    time: number
    count: number
    tp9999: number
    tp999: number
    tp99: number
    tp95: number
    avg: number
  }
  interface RequestMetricGroup {
    key: string
    label: string
    method: string
    path: string
    total: number
    series: RequestMetricItem[]
  }
  interface RequestMetricPathOption {
    label: string
    value: string
    method: string
    count: number
  }
  interface MonitorCountMetricItem {
    time: number
    count: number
    uv: number
  }
  interface MonitorTopItem {
    path: string
    msg: string
    count: number
  }
  type getRequestMetrics = ResponseData<{
    startTime: number
    endTime: number
    bucketMs: number
    total: number
    series: RequestMetricItem[]
    groups: RequestMetricGroup[]
    paths: RequestMetricPathOption[]
  }>
  type getMonitorMetrics = ResponseData<{
    startTime: number
    endTime: number
    bucketMs: number
    pv: {
      total: number
      uv: number
      series: MonitorCountMetricItem[]
      top: MonitorTopItem[]
    }
    error: {
      total: number
      affectedIp: number
      series: MonitorCountMetricItem[]
      top: MonitorTopItem[]
    }
  }>
  type disabledStatus = ResponseData<{ status: boolean }>
  interface GlobalSiteConfig {
    maxInputLength: number
    openPraise: boolean
    feedbackEntryEnabled: boolean
    formLength: number
    downloadOneExpired: number
    downloadCompressExpired: number
    compressSizeLimit: number
    needBindPhone: boolean
    enableCodeLogin: boolean
    enableEmailCodeLogin: boolean
    supportCodeLogin?: boolean
    supportEmailCodeLogin?: boolean
    storageMode: 'qiniu' | 'local'
    maxUploadSizeMB: number
    limitSpace: boolean
    limitWallet: boolean
    qiniuOSSPrice: number
    qiniuCDNPrice: number
    qiniuBackhaulTrafficPrice: number
    qiniuBackhaulTrafficPercentage: number
    qiniuCompressPrice: number
    moneyStartDay: number
    appName: string
    filePagePraiseText: string
    filePagePraiseLinkText: string
    filePagePraiseLink: string
    filePageContactText: string
    filePageContactLinkText: string
    filePageContactLink: string
    filePageFloatingContactEnabled: boolean
    filePageLimitText: string
    filePageSponsorText: string
    filePageSponsorLinkText: string
    filePageSponsorLink: string
    filePageSponsorSuffix: string
    filePageSelfHostLinkText: string
    filePageSelfHostLink: string
  }
  type getGlobalConfig = ResponseData<GlobalSiteConfig>
}

declare namespace SuperUserApiTypes {
  interface UserItem {
    account: string
    id: number
    joinTime: string
    loginCount: number
    loginTime: string
    openTime: string
    phone: string
    status: number
    // 补充信息
    fileCount: number
    limitSize: string
    limitUpload: boolean
    percentage: string
    resources: string
    monthAgoSize: string
    quarterAgoSize: string
    halfYearSize: string
    onlineCount: number
    usage: number
    lastLoginTime: number
    price: {
      backhaulTrafficPrice: string
      cdnPrice: string
      compressPrice: string
      ossPrice: string
      total: string
    }
  }
  interface MessageItem {
    id: string
    type: number
    style: number
    date: string
    text: string
    read: boolean
  }
  type getUserList = ResponseData<{ list: UserItem[], sumCost: string }>
  type getMessageList = ResponseData<MessageItem[]>
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

  interface DocsWishItem {
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
  type ServiceType = 'mysql' | 'mongo' | 'redis' | 'qiniu' | 'tx'
  interface ServiceOverviewItem {
    type: ServiceType
    title: string
    description: string
    required: boolean
    status: boolean
    errMsg?: string
  }
  type getServiceOverview = ResponseData<ServiceOverviewItem[]>

  interface ServiceConfigItem {
    key: string
    value: string | number | boolean
    type: ServiceType
    disabled?: boolean
    label?: string
    isSecret?: boolean
  }
  interface ConfigData {
    type: ServiceType
    title: string
    description: string
    required: boolean
    data: ServiceConfigItem[]
  }
  type getServiceConfig = ResponseData<ConfigData[]>

  interface MysqlSchemaOverview {
    autoCreateDatabase: boolean
    autoSyncSchemaOnStartup: boolean
    pending: boolean
    missingTables: string[]
    missingColumns: Array<{ table: string, column: string }>
    typeMismatches: Array<{
      table: string
      column: string
      expectedComparable: string
      actualComparable: string
    }>
    error?: string
  }

  interface MysqlSchemaApplyResult extends MysqlSchemaOverview {
    ok: boolean
  }

  interface MysqlSchemaExportPayload {
    sql: string
    description?: string
    error?: string
  }

  type getMysqlSchema = ResponseData<MysqlSchemaOverview>
  type getMysqlSchemaExportSql = ResponseData<MysqlSchemaExportPayload>
  type applyMysqlSchema = ResponseData<MysqlSchemaApplyResult>

  interface MysqlLiveIndexColumn {
    seq: number
    column: string
    subPart: number | null
  }
  interface MysqlLiveIndex {
    name: string
    unique: boolean
    indexType: string
    columns: MysqlLiveIndexColumn[]
  }
  interface MysqlLiveColumn {
    ordinal: number
    name: string
    columnType: string
    nullable: boolean
    key: string
    default: string | null
    extra: string
    comment: string
  }
  interface MysqlLiveTable {
    name: string
    engine: string | null
    collation: string | null
    comment: string
    rowEstimate: number | null
    dataLength: number | null
    indexLength: number | null
    createSql: string
    columns: MysqlLiveColumn[]
    indexes: MysqlLiveIndex[]
  }
  interface MysqlLiveIntrospection {
    database: string
    mysqlVersion: string
    tables: MysqlLiveTable[]
    error?: string
  }
  type getMysqlLiveIntrospect = ResponseData<MysqlLiveIntrospection>

  interface MysqlCheckDatabaseBody {
    host?: string
    port?: number | string
    user?: string
    password?: string
    database?: string
  }
  interface MysqlCheckDatabaseResult {
    canConnect: boolean
    databaseExists: boolean
    hasCoreTables: boolean
    error?: string
  }
  type checkMysqlDatabase = ResponseData<MysqlCheckDatabaseResult>

  interface ConfigAdminUserRow {
    id: number
    account: string
    phoneMasked: string
    power: number
    powerLabel: string
    status: number
    joinTime: string | null
    loginTime: string | null
  }
  type listConfigAdminUsers = ResponseData<{ list: ConfigAdminUserRow[] }>

  interface CreateConfigAdminUserBody {
    account: string
    pwd: string
    bindPhone?: boolean
    phone?: string
    code?: string
  }
  interface CreateConfigAdminUserResult {
    ok: boolean
    error?: string
    id?: number
  }
  type createConfigAdminUser = ResponseData<CreateConfigAdminUserResult>

  interface ResetConfigAdminUserPasswordBody {
    id: number
    pwd: string
  }
  interface ResetConfigAdminUserPasswordResult {
    ok: boolean
    error?: string
  }
  type resetConfigAdminUserPassword = ResponseData<ResetConfigAdminUserPasswordResult>
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
