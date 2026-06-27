<script lang="ts" setup>
import type { UploadUserFile } from 'element-plus'
import HomeFooter from '@components/HomeFooter/index.vue'
import LinkDialog from '@components/linkDialog.vue'
import { QuestionFilled, UploadFilled } from '@element-plus/icons-vue'
import { useLocalStorage } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { FileApi, PeopleApi, PublicApi, TaskApi } from '@/apis'
import InfosForm from '@/components/InfosForm/index.vue'
import { useIsMobile } from '@/composables'
import { downLoadByUrl, localTaskFileUpload, qiniuUpload } from '@/utils/networkUtil'
import {
  formatDate,
  formatSize,
  getFileMd5Hash,
  getFileSuffix,
  normalizeFileName,
  parseFileFormat,
  parseInfo,
} from '@/utils/stringUtil'
import Tip from '../dashboard/tasks/components/infoPanel/tip.vue'

const isMobile = useIsMobile()
// 顶部导航
const $router = useRouter()
const $route = useRoute()
const k = ref('')
const pcNavs = reactive([
  {
    title: '我也要收集',
    path: 'https://docs.ep.sugarat.top/',
  },
])
function handleNav(idx: number) {
  if (pcNavs[idx].path.startsWith('http')) {
    window.location.href = pcNavs[idx].path
    return
  }
  $router.push({
    path: pcNavs[idx].path,
  })
}

// 任务基本信息展示
const taskInfo = reactive({
  name: '',
  category: '',
} as TaskApiTypes.TaskInfo)
const taskMoreInfo = reactive({
  bindField: '',
} as Partial<TaskApiTypes.TaskInfo>)
const formatData = computed(() => parseFileFormat(taskMoreInfo.format))
interface SubmitNavTaskRow {
  key: string
  name: string
}
const submitNavTasks = ref([] as SubmitNavTaskRow[])

// 用于展示截止日期
const waitTime = ref(0)
// 判断是否结束
const isOver = computed(() => waitTime.value <= 0)
const waitTimeStr = computed(() => {
  let seconds = ~~(waitTime.value / 1000)
  let hour = ~~(seconds / (60 * 60))
  const day = ~~(hour / 24)
  hour %= 24
  const minute = ~~((seconds % 3600) / 60)
  seconds %= 60
  return `剩余${day}天${hour}时${minute}分${seconds}秒`
})
function refreshWaitTime(loop = true) {
  if (taskMoreInfo?.ddl) {
    const date = new Date(taskMoreInfo.ddl)
    waitTime.value = date.getTime() - Date.now()
  }
  else {
    waitTime.value = 0
  }
  if (loop) {
    setTimeout(() => {
      refreshWaitTime()
    }, 1000)
  }
}
const ddlStr = computed(() => {
  if (taskMoreInfo?.ddl) {
    const date = new Date(taskMoreInfo.ddl)
    return formatDate(date)
  }
  return ''
})

// 必填信息
const infos = reactive([] as InfoItem[])

// 文件上传部分

// 文件上传
type FileUploadRow = UploadUserFile & { md5: string, subscription: any }
const fileList = ref([] as FileUploadRow[])
const fileUpload = ref()
const disableForm = computed(
  () => fileList.value.filter(item => item.status === 'uploading').length > 0,
)
const handleRemoveFile: any = (file: any) => {
  if (file.status === 'uploading' || file.status === 'success') {
    return ElMessageBox.confirm(
      '不影响已经上传成功的，正在上传的将取消上传',
      '确定从列表移除文件吗？',
    )
      .then(() => {
        if (file.status === 'uploading') {
          ElMessage.info(`取消${file.name}的上传`)
          // 取消上传
          file.subscription.unsubscribe() // 取消上传
        }
        return true
      })
      .catch(() => false)
  }
  return true
}

// 校验表单填写
const isWriteFinish = computed(() => infos.every(item => item.value))
// 提交文件

const limitBindField = computed(() => {
  return taskMoreInfo.bindField.trim() || '姓名'
})

// 身份核验表单
const isSameFieldName = computed(() =>
  infos.find(v => v.text === limitBindField.value),
)
const showValidForm = computed(
  () => taskMoreInfo.people && !isSameFieldName.value,
)
const validModal = reactive({
  peopleName: '',
})

function validatePeopleName(rule: any, value: any, callback: any) {
  if (!value) {
    const message = `请输入${limitBindField.value}`
    callback(new Error(message))
    ElMessage.error(message)
    return
  }
  // 异步校验
  PeopleApi.checkPeopleIsExist(k.value, value).then((res) => {
    if (!res.data.exist) {
      ElMessage.error('你不在此次提交名单中,如有疑问请联系管理员')
    }
    callback(
      res.data.exist
        ? undefined
        : new Error('你不在此次提交名单中,如有疑问请联系管理员'),
    )
  })
}

const validModalRef = ref()
const validModalRules = reactive({
  peopleName: [{ validator: validatePeopleName, trigger: 'blur' }],
})
function confirmPeopleName() {
  // 处理表单必填项含有 limitBindField 的情况
  if (isSameFieldName.value) {
    const value = infos.find(v => v.text === limitBindField.value)?.value
    validModal.peopleName = value || ''
    return new Promise((resolve) => {
      validatePeopleName(null, value, resolve)
    }).then(v => !v)
  }
  return validModalRef.value.validate((isValid: boolean) => isValid)
}

// 提交密码（防误提交）
// 设计：使用页面级密码门 + localStorage 缓存（按 taskKey 分桶）
// - submitPasswordInput：当前用于提交、撤回、查询接口的密码透传
// - submitPasswordCache：本机缓存映射 taskKey -> password
// - passwordGateVisible：是否展示密码输入区块
// - passwordGateError：密码门错误提示文案
const submitPasswordInput = ref('')
const submitPasswordCache = useLocalStorage<Record<string, string>>(
  'task_submit_pwd_map',
  {},
)
const passwordGateVisible = ref(false)
const passwordGateError = ref('')
// 首次（或切换任务后）moreInfo 是否已经从服务端返回
// 用于在密码门状态确定之前，避免先渲染上传/历史区块导致闪烁
const taskMoreInfoLoaded = ref(false)

function readCachedSubmitPassword() {
  if (!k.value)
    return ''
  return submitPasswordCache.value?.[k.value] || ''
}

function saveSubmitPassword(value: string) {
  if (!k.value)
    return
  submitPasswordCache.value = {
    ...submitPasswordCache.value,
    [k.value]: value,
  }
}

function clearSubmitPassword() {
  if (!k.value)
    return
  submitPasswordInput.value = ''
  const next = { ...submitPasswordCache.value }
  delete next[k.value]
  submitPasswordCache.value = next
}

type TaskActionLogType = 'submit' | 'query' | 'withdraw'
interface TaskActionLogInfo {
  text: string
  value: string
}
interface TaskActionLogItem {
  id: string
  taskKey: string
  taskName: string
  action: TaskActionLogType
  createdAt: number
  peopleName: string
  infos: TaskActionLogInfo[]
  fileName?: string
  originName?: string
  fileSize?: number
  storage?: 'qiniu' | 'local'
  isSubmit?: boolean
}

const TASK_ACTION_LOG_STORAGE_KEY = 'ep-task-action-logs-v1'
const MAX_TASK_ACTION_LOGS = 200
const showActionLogDrawer = ref(false)

function loadTaskActionLogs(): TaskActionLogItem[] {
  try {
    const raw = localStorage.getItem(TASK_ACTION_LOG_STORAGE_KEY)
    const logs = raw ? JSON.parse(raw) : []
    return Array.isArray(logs) ? logs : []
  }
  catch {
    return []
  }
}

const taskActionLogs = ref<TaskActionLogItem[]>(loadTaskActionLogs())
const currentTaskActionLogs = computed(() =>
  taskActionLogs.value.filter(item => item.taskKey === k.value),
)
const recentTaskActionLogs = computed(() => currentTaskActionLogs.value.slice(0, 3))

function persistTaskActionLogs(logs: TaskActionLogItem[]) {
  localStorage.setItem(
    TASK_ACTION_LOG_STORAGE_KEY,
    JSON.stringify(logs.slice(0, MAX_TASK_ACTION_LOGS)),
  )
}

function getCurrentInfoSnapshot(): TaskActionLogInfo[] {
  return infos
    .filter(item => item.type !== 'text')
    .map(item => ({
      text: item.text,
      value: `${item.value || ''}`,
    }))
    .filter(item => item.text || item.value)
}

function addTaskActionLog(log: Omit<TaskActionLogItem, 'id' | 'taskKey' | 'taskName' | 'createdAt' | 'peopleName' | 'infos'>) {
  const next = [
    {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      taskKey: k.value,
      taskName: taskInfo.name,
      createdAt: Date.now(),
      peopleName: validModal.peopleName,
      infos: getCurrentInfoSnapshot(),
      ...log,
    },
    ...taskActionLogs.value,
  ].slice(0, MAX_TASK_ACTION_LOGS)
  taskActionLogs.value = next
  persistTaskActionLogs(next)
}

function recordSubmitSuccess(options: {
  fileName: string
  originName: string
  fileSize?: number
  storage?: 'qiniu' | 'local'
}) {
  addTaskActionLog({
    action: 'submit',
    ...options,
  })
}

function getActionLogTagType(log: TaskActionLogItem) {
  if (log.action === 'submit')
    return 'success'
  if (log.action === 'withdraw')
    return 'warning'
  return log.isSubmit ? 'success' : 'info'
}

function getActionLogText(log: TaskActionLogItem) {
  if (log.action === 'submit')
    return '提交'
  if (log.action === 'withdraw')
    return '撤回'
  return log.isSubmit ? '查询：已提交' : '查询：未提交'
}

function getActionLogTitle(log: TaskActionLogItem) {
  if (log.action === 'submit')
    return log.fileName ? `提交了 ${log.fileName}` : '提交了文件'
  if (log.action === 'withdraw')
    return log.fileName ? `撤回了 ${log.fileName}` : '撤回了文件'
  return log.isSubmit ? '查询到已有提交记录' : '查询到暂无提交记录'
}

function getActionLogMeta(log: TaskActionLogItem) {
  const parts = []
  if (log.peopleName)
    parts.push(`${limitBindField.value}: ${log.peopleName}`)
  if (log.fileSize)
    parts.push(formatSize(log.fileSize))
  if (log.storage)
    parts.push(log.storage === 'local' ? '本机存储' : '七牛云存储')
  return parts.join(' · ')
}

function getActionLogInfoText(log: TaskActionLogItem) {
  return log.infos
    .filter(item => item.value)
    .map(item => `${item.text}: ${item.value}`)
    .join(' / ')
}

function clearCurrentTaskActionLogs() {
  ElMessageBox.confirm(
    '只会清除当前浏览器里这个任务的本机记录，不会影响服务器上的提交数据。',
    '清空本机记录',
    {
      type: 'warning',
      confirmButtonText: '清空',
      cancelButtonText: '取消',
    },
  )
    .then(() => {
      const next = taskActionLogs.value.filter(item => item.taskKey !== k.value)
      taskActionLogs.value = next
      persistTaskActionLogs(next)
      ElMessage.success('本机记录已清空')
    })
    .catch(() => undefined)
}

async function startUpload() {
  const uploadFiles = fileList.value
  for (const file of uploadFiles) {
    if (!file.md5) {
      ElMessage.info(
        `文件(${file.name})的唯一指纹还在计算中,再等待一会儿再点击上传`,
      )
      setTimeout(() => {
        ElMessage.info('文件越大计算时间越长(1G通常需要20s)')
      }, 100)
    }
  }

  let uploadTokenRes: FileApiTypes.UploadToken
  try {
    const tr = await FileApi.getUploadToken()
    uploadTokenRes = tr.data
  }
  catch {
    return
  }

  for (const file of uploadFiles) {
    if (!file.md5 || file.status !== 'ready') {
      continue
    }
    file.status = 'uploading'
    let { name } = file
    const originName = name
    if (taskMoreInfo.rewrite) {
      name
        = infos.map(v => v.value).join(formatData.value.splitChar || '-')
          + getFileSuffix(name)
    }
    name = normalizeFileName(name)
    const objectKey = `easypicker2/${k.value}/${file.md5}/${name}`

    if (uploadTokenRes.storageMode === 'local') {
      const maxB = uploadTokenRes.maxUploadBytes
      if (maxB && file.raw && file.raw.size > maxB) {
        ElMessage.error(
          `「${file.name}」超过单文件上限 ${formatSize(maxB)}`,
        )
        file.status = 'fail'
        continue
      }
      if (!file.raw) {
        file.status = 'fail'
        continue
      }
      localTaskFileUpload(file.raw, {
        taskKey: k.value,
        hash: file.md5,
        name,
      }, {
        success(data: { fsize?: number }) {
          const fsize = data?.fsize ?? 0
          FileApi.addFile({
            originName,
            name,
            taskKey: k.value,
            taskName: taskInfo.name,
            size: fsize,
            hash: file.md5,
            storage: uploadTokenRes.storageMode,
            info: JSON.stringify(infos),
            people: validModal.peopleName,
            submitPassword: submitPasswordInput.value,
          }).then(() => {
            file.status = 'success'
            ElMessage.success(`文件:${file.name}提交成功`)
            recordSubmitSuccess({
              fileName: name,
              originName,
              fileSize: fsize,
              storage: uploadTokenRes.storageMode,
            })
            if (taskMoreInfo.people) {
              PeopleApi.updatePeopleStatus(
                k.value,
                name,
                validModal.peopleName,
                file.md5,
              )
            }
          }).catch(() => {
            file.status = 'fail'
          })
        },
        error(_err, subscription) {
          file.status = 'fail'
          void subscription
        },
        process(per: number, _data: any, subscription: any) {
          file.percentage = Math.floor(Number(per))
          file.subscription = subscription
        },
      })
    }
    else {
      qiniuUpload(uploadTokenRes.token, file.raw!, objectKey, {
        success(data: any) {
          const { fsize } = data
          FileApi.addFile({
            originName,
            name,
            taskKey: k.value,
            taskName: taskInfo.name,
            size: fsize,
            hash: file.md5,
            storage: uploadTokenRes.storageMode,
            info: JSON.stringify(infos),
            people: validModal.peopleName,
            submitPassword: submitPasswordInput.value,
          }).then(() => {
            file.status = 'success'
            ElMessage.success(`文件:${file.name}提交成功`)
            recordSubmitSuccess({
              fileName: name,
              originName,
              fileSize: fsize,
              storage: uploadTokenRes.storageMode,
            })
            if (taskMoreInfo.people) {
              PeopleApi.updatePeopleStatus(
                k.value,
                name,
                validModal.peopleName,
                file.md5,
              )
            }
          })
        },
        process(per: number, data: any, subscription: any) {
          file.percentage = Math.floor(per)
          file.subscription = subscription
        },
        error(_err: any, subscription: any) {
          file.status = 'fail'
          void subscription
        },
      })
    }
  }
}

async function submitUpload() {
  if (!isWriteFinish.value) {
    ElMessage.warning('请先完成必要信息的填写')
    return
  }

  if (taskMoreInfo.people) {
    const isValid = await confirmPeopleName()
    if (!isValid) {
      return
    }
  }
  startUpload()
}

// 是否允许上传
const allowUpload = computed(() => {
  for (const file of fileList.value) {
    if (file.status === 'ready') {
      return true
    }
  }
  return false
})

// 是否允许撤回
const allowWithdraw = computed(() => {
  for (const file of fileList.value) {
    if (['success', 'ready'].includes(file.status)) {
      return true
    }
  }
  return false
})

// 添加文件
// 正在计算MD5值的文件个数
const calculateMd5Count = ref(0)
function handleChangeFile(file: any) {
  // 校验文件后缀名
  const { name } = file
  if (formatData.value.format.length && formatData.value.status) {
    const suffix = getFileSuffix(name)
    if (
      !formatData.value.format.some(v => suffix.toLowerCase().endsWith(v))
    ) {
      ElMessage.error(`${name} 格式不符合要求`)
      fileUpload.value.handleRemove(file)
      return
    }
  }

  // 校验文件大小
  if (formatData.value.size && formatData.value.size < file.size) {
    ElMessage.error(`${name} 大小${formatSize(file.size)} 不符合要求`)
    fileUpload.value.handleRemove(file)
    return
  }

  calculateMd5Count.value += 1
  // 计算md5 hash
  getFileMd5Hash(file.raw).then((str) => {
    file.md5 = str
    calculateMd5Count.value -= 1
  })
}

const limitUploadCount = computed(() => formatData.value.limit || 10)
function handleExceed() {
  ElMessage.warning(
    `一次提交最多只能选择${limitUploadCount.value}个文件，请移除已经上传成功的或刷新页面`,
  )
}
const showLinkModel = ref(false)
const templateLink = ref('')
function runWithdraw() {
  const uploadFiles = fileList.value
  for (const file of uploadFiles) {
    if (!file.md5) {
      ElMessage.info(
        `文件(${file.name})的唯一指纹还在计算中,再等待一会儿再点击上传`,
      )
      setTimeout(() => {
        ElMessage.info('文件越大计算时间越长(1G通常需要20s)')
      }, 100)
    }
    else if (!['fail', 'uploading'].includes(file.status)) {
      // 准备开始撤回
      let { name } = file

      // 如果开启了自动重命名,这里重命名一下
      if (taskMoreInfo.rewrite) {
        name
          = infos.map(v => v.value).join(formatData.value.splitChar || '-')
            + getFileSuffix(name)
      }

      FileApi.withdrawFile({
        taskKey: k.value,
        taskName: taskInfo.name,
        filename: name,
        hash: file.md5,
        info: JSON.stringify(infos),
        peopleName: validModal.peopleName,
        submitPassword: submitPasswordInput.value,
      })
        .then(() => {
          ElMessage.success(`文件:${file.name}撤回成功`)
          addTaskActionLog({
            action: 'withdraw',
            fileName: name,
            originName: file.name,
            fileSize: file.size,
          })
          file.name += ' - (已撤回 ✅ )'
          file.status = 'fail'
        })
        .catch(() => {
          ElMessage.error(`撤回失败: 没有文件:${file.name}对应提交记录`)
        })
    }
  }
}
function downloadTemplate() {
  FileApi.getTemplateUrl(taskMoreInfo.template, k.value)
    .then((res) => {
      showLinkModel.value = true
      const { link } = res.data
      templateLink.value = link
      downLoadByUrl(link, taskMoreInfo.template)
    })
    .catch(() => {
      ElMessage.warning('文件已从服务器上移除,请联系管理员重新上传')
    })
}

// 撤回相关逻辑
const isWithdraw = ref(false)
async function startWithdraw() {
  // 校验表单填写
  if (!isWriteFinish.value) {
    ElMessage.warning('请先完成必要信息的填写')
    return
  }
  if (taskMoreInfo.people) {
    const isValid = await confirmPeopleName()
    if (!isValid) {
      return
    }
  }
  runWithdraw()
}

// 查询提交情况
async function checkSubmitStatus() {
  // 校验表单填写
  if (!isWriteFinish.value) {
    ElMessage.warning('请先完成必要信息的填写,需和提交时信息完全一致')
    return
  }
  // 卡控人员限制
  if (taskMoreInfo.people) {
    const isValid = await confirmPeopleName()
    if (!isValid) {
      return
    }
  }
  FileApi.checkSubmitStatus(k.value, infos, validModal.peopleName, submitPasswordInput.value).then(
    (res) => {
      addTaskActionLog({
        action: 'query',
        isSubmit: res.data.isSubmit,
      })
      if (res.data.isSubmit) {
        ElMessage.success('已经提交过啦')
      }
      else {
        ElMessage.warning('还未提交过哟')
      }
    },
  ).catch((err) => {
    if (err?.code === 3002 && taskMoreInfo.needSubmitPassword) {
      // 密码已被任务所有者修改，回到密码门
      clearSubmitPassword()
      passwordGateError.value = '提交密码已变更，请重新输入'
      passwordGateVisible.value = true
      ElMessage.error('提交密码已变更，请重新输入')
    }
  })
}
const isLoadingData = ref(false)
const readyRefresh = ref(false)
// 禁用上传
const disabledUpload = useLocalStorage('disabledUpload', false)
function refreshTaskInfo(showLimitAlert = true) {
  if (!k.value)
    return Promise.resolve()

  return TaskApi.getTaskInfo(k.value)
    .then((res) => {
      Object.assign(taskInfo, res.data)
      submitNavTasks.value = res.data.submitNavTasks ?? []
      disabledUpload.value = !!res.data.limitUpload
      if (showLimitAlert && disabledUpload.value) {
        ElMessageBox.alert(
          '任务存储空间容量已达到上限，已经无法进行上传，请联系发起人扩容空间',
        )
      }
    })
    .catch((err) => {
      if (err.code === 4001) {
        ElMessage.error('任务不存在')
        k.value = ''
        taskInfo.name = '任务不存在'
      }
    })
}
function isEqualInfos(a: InfoItem[] = [], b: InfoItem[] = []) {
  if (a.length !== b.length) {
    return false
  }
  return a.every(
    (v, i) =>
      v.type === b[i].type
      && v.text === b[i].text
      && isEqualInfos(v.children, b[i].children),
  )
}
function refreshTaskMoreInfo(hot = false) {
  // 进入密码门时，使用本地缓存（或当前输入）作为请求凭证
  const cached = readCachedSubmitPassword()
  if (cached && !submitPasswordInput.value) {
    submitPasswordInput.value = cached
  }
  const passwordForRequest = submitPasswordInput.value || cached
  TaskApi.getTaskMoreInfo(k.value, passwordForRequest, 'submit').then((res) => {
    const data = res.data || {}
    // 密码门拦截：需要密码且未通过，则展示密码输入区
    if (data.needSubmitPassword && data.passwordValid === false) {
      // 服务端拒绝缓存密码 -> 说明任务所有者已变更密码
      if (cached) {
        clearSubmitPassword()
        passwordGateError.value = '提交密码已变更，请重新输入'
      }
      else {
        passwordGateError.value = ''
      }
      passwordGateVisible.value = true
      // 清掉本地已渲染过的敏感数据，避免残留泄漏
      infos.splice(0, infos.length)
      Object.assign(taskMoreInfo, {
        template: undefined,
        rewrite: undefined,
        format: undefined,
        info: undefined,
        share: undefined,
        ddl: undefined,
        people: undefined,
        tip: undefined,
        bindField: '',
        needSubmitPassword: true,
        passwordValid: false,
      } as Partial<TaskApiTypes.TaskInfo>)
      isLoadingData.value = false
      taskMoreInfoLoaded.value = true
      return
    }
    // 通过校验，正常合并
    passwordGateVisible.value = false
    passwordGateError.value = ''
    Object.assign(taskMoreInfo, data)
    if (!isEqualInfos(infos, parseInfo(taskMoreInfo.info))) {
      infos.splice(0, infos.length)
      infos.push(...parseInfo(taskMoreInfo.info))
      if (hot) {
        ElMessage.success('表单信息有更新')
      }
    }
    refreshWaitTime(false)
    isLoadingData.value = false
    taskMoreInfoLoaded.value = true
  }).catch((err) => {
    // 兜底：任何网络/服务异常都不能让 loading 与「未加载完成」状态卡死，
    // 否则首屏只展示 v-loading 转圈，用户无法重试。
    console.error('[refreshTaskMoreInfo]', err)
    ElMessage.error('任务信息加载失败，请稍后重试')
    isLoadingData.value = false
    taskMoreInfoLoaded.value = true
  })
}

// 密码门提交
function submitPasswordGate() {
  const value = (submitPasswordInput.value || '').trim()
  if (value.length < 4) {
    passwordGateError.value = '密码至少 4 位'
    return
  }
  submitPasswordInput.value = value
  saveSubmitPassword(value)
  passwordGateError.value = ''
  isLoadingData.value = true
  refreshTaskMoreInfo()
}
function handleBlur() {
  readyRefresh.value = true
}
function handleFocus() {
  if (readyRefresh.value && !disableForm.value) {
    readyRefresh.value = false
    refreshTaskInfo(false)
    refreshTaskMoreInfo(true)
  }
}

// 展示的时间提示文案
const timeInfo = computed(() => {
  if (!isOver.value) {
    return ddlStr.value + waitTimeStr.value
  }
  return ddlStr.value
})

// tip
interface TipImg {
  uid: number
  name: string
}
interface TipDataShape {
  text: string
  imgs: TipImg[]
}
const tipData = reactive({
  text: '',
  imgs: [],
} as TipDataShape)
interface TaskPreviewImage {
  name: string
  uid: number
  preview?: string
  url: string
}
const imageList = ref([] as TaskPreviewImage[])

function syncTipFromMoreInfo() {
  const raw = taskMoreInfo.tip
  if (!raw) {
    tipData.text = ''
    tipData.imgs = []
    imageList.value = []
    return
  }
  let parsed: { imgs?: TipImg[], text?: string }
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    tipData.text = ''
    tipData.imgs = []
    imageList.value = []
    return
  }
  tipData.imgs = parsed.imgs ?? []
  tipData.text = parsed.text || ''
  imageList.value = tipData.imgs.map((v) => {
    return {
      ...v,
      url: 'https://img.cdn.sugarat.top/mdImg/MTY3NzkxMDI1NTU1Nw==20140524124237518.gif',
    }
  })
  if (!imageList.value.length)
    return
  PublicApi.getTipImageUrl(
    k.value,
    imageList.value.map(v => ({
      uid: v.uid,
      name: v.name,
    })),
  ).then((v) => {
    v.data.forEach((url, idx) => {
      imageList.value[idx].url = url.cover
      Object.assign(imageList.value[idx], {
        preview: url.preview,
      })
    })
  })
}

watch(
  () => taskMoreInfo.tip,
  () => syncTipFromMoreInfo(),
)

onMounted(() => {
  k.value = $route.params.key as string
  if (k.value) {
    isLoadingData.value = true
    refreshTaskInfo()
    refreshTaskMoreInfo()
    refreshWaitTime()
  }
  // 页面隐藏
  window.addEventListener('blur', handleBlur)

  // 页面展示
  window.addEventListener('focus', handleFocus)
})

onUnmounted(() => {
  // 页面隐藏
  window.removeEventListener('blur', handleBlur)
  // 页面展示
  window.removeEventListener('focus', handleFocus)
})

watch(
  () => $route.params.key,
  (newKey) => {
    const key = typeof newKey === 'string' ? newKey : ''
    if (!key || key === k.value)
      return
    k.value = key
    fileList.value = []
    // 切换任务时清除上一个任务的密码门残留状态，让新任务重新走密码门流程
    submitPasswordInput.value = ''
    passwordGateVisible.value = false
    passwordGateError.value = ''
    taskMoreInfoLoaded.value = false
    isLoadingData.value = true
    refreshTaskInfo()
    refreshTaskMoreInfo()
    refreshWaitTime()
  },
)
</script>

<template>
  <div class="task-panel">
    <div class="pc-nav">
      <div class="nav">
        <!-- LOGO -->
        <div class="logo">
          <router-link to="/">
            <img
              style="height: 40px; width: 170px"
              src="https://img.cdn.sugarat.top/easypicker/EasyPicker.png"
              alt="logo"
            >
          </router-link>
        </div>
        <nav>
          <div
            v-for="(n, idx) in pcNavs"
            :key="idx"
            class="nav-item"
            @click="handleNav(idx)"
          >
            {{ n.title }}
          </div>
        </nav>
      </div>
    </div>
    <!-- 有效 -->
    <div
      v-if="k"
      v-loading="isLoadingData"
      element-loading-text="Loading..."
      class="panel tc"
    >
      <!-- 任务名 -->
      <h1 class="name">
        {{ taskInfo.name }}
      </h1>
      <!-- 提交密码门：开启了密码且未通过校验时拦截后续渲染 -->
      <div v-if="taskMoreInfoLoaded && passwordGateVisible" class="submit-password-gate">
        <el-divider>提交密码</el-divider>
        <p class="gate-tip">
          当前任务设置了提交密码，请输入密码后查看内容并提交
        </p>
        <el-form @submit.prevent="submitPasswordGate">
          <el-form-item>
            <el-input
              v-model="submitPasswordInput"
              type="password"
              show-password
              maxlength="64"
              placeholder="请输入提交密码（至少 4 位）"
              @keyup.enter="submitPasswordGate"
            />
          </el-form-item>
          <el-form-item class="gate-submit-item">
            <el-button type="success" @click="submitPasswordGate">
              确定
            </el-button>
          </el-form-item>
          <p v-if="passwordGateError" class="gate-error">
            {{ passwordGateError }}
          </p>
        </el-form>
      </div>
      <template v-else-if="taskMoreInfoLoaded && !passwordGateVisible">
        <div
          v-if="submitNavTasks.length > 1"
          class="task-nav-switch"
          style="max-width: 400px; margin: 12px auto"
        >
          <span style="margin-right: 8px">切换任务</span>
          <el-select
            :model-value="k"
            filterable
            style="width: 260px"
            @update:model-value="(key) => $router.replace({ name: 'task', params: { key } })"
          >
            <el-option
              v-for="t in submitNavTasks"
              :key="t.key"
              :label="t.name"
              :value="t.key"
            />
          </el-select>
        </div>
        <h2 v-if="disabledUpload" style="color: red">
          任务存储空间容量已达到上限，已经无法进行上传，请联系发起人扩容空间
        </h2>
        <!-- 提示信息 -->
        <!-- 时间截止了也不再展示 -->
        <template v-if="tipData.text && (ddlStr ? !isOver : true)">
          <el-divider>⚠️ 注意事项 ⚠️</el-divider>
          <Tip>
            <div class="tip-wrapper">
              <p v-for="(t, i) in tipData.text.split('\n')" :key="i">
                {{ t.replace(/\s/g, '&nbsp;') }}
              </p>
            </div>
          </Tip>
        </template>
        <template v-if="imageList.length && (ddlStr ? !isOver : true)">
          <el-image
            v-for="(img, idx) in imageList"
            :key="img.uid"
            hide-on-click-modal
            style="width: 100px; height: 100px; margin: 10px"
            :src="img.url"
            :zoom-rate="1.2"
            :preview-src-list="imageList.map((v) => v.preview)"
            :initial-index="idx"
            fit="contain"
          />
        </template>
        <!-- 截止时间字符串 -->
        <template v-if="ddlStr">
          <el-divider>截止时间</el-divider>
          <h2 class="ddl">
            {{ timeInfo }}
          </h2>
          <div v-if="isOver">
            <el-empty description="已经结束啦！" />
          </div>
        </template>
        <!-- 未设置ddl 或者 设置了还未结束 -->
        <div v-if="!ddlStr || !isOver">
          <el-divider>必要信息填写</el-divider>
          <div class="infos">
            <div v-show="taskMoreInfo.people">
              <Tip>“{{ limitBindField }}”在参与名单里才能正常提交</Tip>
            </div>
            <div v-if="showValidForm">
              <div class="infos">
                <el-form
                  ref="validModalRef"
                  :rules="validModalRules"
                  status-icon
                  :model="validModal"
                  :disabled="disableForm"
                  label-position="top"
                >
                  <el-form-item prop="peopleName" :label="limitBindField">
                    <el-input
                      v-model="validModal.peopleName"
                      :maxlength="14"
                      clearable
                      show-word-limit
                      :placeholder="`请输入 ${limitBindField}`"
                    />
                  </el-form-item>
                </el-form>
              </div>
            </div>
            <InfosForm :infos="infos" :disabled="disableForm" />
          </div>
          <el-upload
            ref="fileUpload"
            v-model:file-list="fileList"
            style="max-width: 400px; margin: 0 auto"
            :drag="!isMobile"
            action=""
            :on-change="handleChangeFile"
            :before-remove="handleRemoveFile"
            :on-exceed="handleExceed"
            :auto-upload="false"
            multiple
            :limit="limitUploadCount"
          >
            <el-button v-if="isMobile" type="primary">
              选择文件
            </el-button>
            <template v-else>
              <el-icon class="el-icon--upload">
                <UploadFilled />
              </el-icon>
              <div class="el-upload__text">
                将文件拖于此处 or <em>直接选择文件</em>
              </div>
            </template>
            <template #tip>
              <div v-show="!!calculateMd5Count" class="p10">
                <Tip>
                  还有
                  {{ calculateMd5Count }}
                  个文件正在生成校验信息，请稍等(1G通常需要20s)
                </Tip>
              </div>
            </template>
          </el-upload>
          <div class="p10">
            <el-button
              v-if="isWithdraw"
              size="default"
              type="warning"
              :disabled="!allowWithdraw || !!calculateMd5Count"
              @click="startWithdraw"
            >
              一键撤回
            </el-button>
            <el-button
              v-else-if="!disabledUpload"
              size="default"
              type="success"
              :disabled="!allowUpload || !!calculateMd5Count"
              @click="submitUpload"
            >
              提交文件
            </el-button>
            <el-button size="default" @click="checkSubmitStatus">
              查询提交情况
            </el-button>
          </div>
          <!-- 提示信息 -->
          <div class="p10 option-tips">
            <Tip v-if="formatData.status && formatData.format.length">
              限制格式为:
              <span style="color: red">{{
                formatData.format.join(', ')
              }}</span>
            </Tip>
            <Tip v-if="formatData.size">
              限制文件大小不超过:
              <span style="color: red">{{
                formatSize(formatData.size)
              }}</span>
            </Tip>
            <template v-if="isWithdraw">
              <Tip>
                ① 须保证选择的文件与提交时的文件一致<br>
                ② 填写表单信息一致 <br>
                ③
                完全一模一样的文件的提交记录（内容md5+命名），将会一次性全部撤回
              </Tip>
            </template>
            <template v-else>
              <Tip>
                <strong>查询提交情况，需填写和提交时一样的表单信息</strong>
              </Tip>
              <Tip>
                ① 选择完文件，点击 ”提交文件“即可 <br>
                ② <strong>选择大文件后需要等待一会儿才展示处理</strong>
                <template v-if="taskMoreInfo.template && !disabledUpload">
                  <br>
                  ③
                  <strong>
                    <el-button
                      type="primary"
                      text
                      style="color: #85ce61"
                      size="small"
                      @click="downloadTemplate"
                    >右下角可 “查看提交示例”
                    </el-button>
                  </strong>
                </template>
              </Tip>
            </template>
          </div>
          <div class="withdraw">
            <el-button
              v-if="taskMoreInfo.template && !disabledUpload"
              type="primary"
              text
              style="color: #85ce61"
              size="small"
              @click="downloadTemplate"
            >
              查看提交示例
            </el-button>
            <el-button
              v-if="isWithdraw"
              size="small"
              type="primary"
              text
              @click="isWithdraw = false"
            >
              正常提交
            </el-button>
            <el-button
              v-else
              size="small"
              type="primary"
              text
              @click="isWithdraw = true"
            >
              我要撤回
            </el-button>
          </div>
        </div>
        <section v-if="currentTaskActionLogs.length" class="local-log-section">
          <div class="local-log-section-head">
            <div class="local-log-section-title">
              <strong>最近操作记录</strong>
              <el-tooltip
                effect="dark"
                placement="top"
                content="记录只保存在当前浏览器 localStorage，用来提示你在这台设备上的提交、查询和撤回操作；换设备、换浏览器或清理数据后不会同步。"
              >
                <el-icon class="local-log-help">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </div>
            <el-button
              v-if="currentTaskActionLogs.length"
              size="small"
              text
              @click="showActionLogDrawer = true"
            >
              更多
            </el-button>
          </div>

          <div class="local-log-compact-list">
            <article
              v-for="log in recentTaskActionLogs"
              :key="log.id"
              class="local-log-compact-item"
            >
              <div class="local-log-compact-main">
                <el-tag size="small" :type="getActionLogTagType(log)" effect="plain">
                  {{ getActionLogText(log) }}
                </el-tag>
                <span class="local-log-compact-title">{{ getActionLogTitle(log) }}</span>
              </div>
              <time>{{ formatDate(log.createdAt, 'MM-dd hh:mm') }}</time>
            </article>
          </div>
        </section>
      </template>
    </div>
    <!-- 无效任务 -->
    <div v-else class="panel tc">
      <h1 class="name">
        {{ taskInfo.name }}
      </h1>
    </div>
    <LinkDialog
      v-model:value="showLinkModel"
      title="示例文件下载链接"
      :link="templateLink"
    />
    <el-dialog
      v-model="showActionLogDrawer"
      title="本机操作记录"
      :fullscreen="isMobile"
      width="420px"
    >
      <div class="local-log-drawer">
        <div class="local-log-hint">
          记录仅存在当前浏览器本地，用来帮助你回想自己是否在这台设备上提交、查询或撤回过；它不会同步到其它设备，也不代表服务器最终数据。
        </div>
        <el-empty
          v-if="!currentTaskActionLogs.length"
          description="暂无本机操作记录"
        />
        <div v-else class="local-log-list">
          <article
            v-for="log in currentTaskActionLogs"
            :key="log.id"
            class="local-log-item"
          >
            <div class="local-log-item-head">
              <el-tag size="small" :type="getActionLogTagType(log)">
                {{ getActionLogText(log) }}
              </el-tag>
              <span>{{ formatDate(log.createdAt) }}</span>
            </div>
            <h4>{{ getActionLogTitle(log) }}</h4>
            <p v-if="getActionLogMeta(log)">
              {{ getActionLogMeta(log) }}
            </p>
            <p v-if="getActionLogInfoText(log)">
              {{ getActionLogInfoText(log) }}
            </p>
          </article>
        </div>
        <div v-if="currentTaskActionLogs.length" class="local-log-footer">
          <el-button type="danger" plain @click="clearCurrentTaskActionLogs">
            清空当前任务记录
          </el-button>
        </div>
      </div>
    </el-dialog>
    <div style="padding-top: 20px">
      <HomeFooter type="task" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.task-panel :deep(ul.el-upload-list) {
  border: 1px dashed #d4d4d4;
  padding: 10px;

  &::before {
    content: '此处展示选择文件列表';
    font-size: 12px;
    position: relative;
    bottom: 4px;
  }
}

.task-panel :deep(.el-upload-list__item-name) {
  display: block;
  overflow: hidden;
  max-width: 290px;
  text-overflow: ellipsis;
  word-break: keep-all;
}

.task-panel :deep(.is-ready .el-icon--close) {
  display: block;
  color: black;
}

.task-panel {
  background-color: #f3f6f8;
  padding-bottom: 1rem;
  position: relative;
}

.pc-nav {
  background-color: #fff;
  display: flex;
  padding: 10px;
  justify-content: space-between;
  align-items: center;

  .exit {
    cursor: pointer;
  }

  .nav {
    display: flex;

    nav {
      display: flex;
      align-items: center;

      .nav-item {
        font-size: 1rem;
        color: #595959;
        padding: 10px;
        cursor: pointer;

        &.active {
          color: #409eff !important;
          font-weight: 600;
        }
      }
    }

    .exit {
      color: #595959;
    }
  }

  .logo {
    width: 180px;
    margin: 0 10px;

    img {
      height: 40px;
    }
  }
}

.panel {
  max-width: 1024px;
  padding: 1em;
  background-color: #fff;
  margin: 10px auto;
  box-sizing: border-box;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
  border-radius: 4px;

  .name {
    text-align: center;
  }

  .ddl {
    margin-top: 10px;
    color: #919191;
    font-size: 14px;
  }

  .submit-password-gate {
    max-width: 360px;
    margin: 12px auto 0;
    text-align: center;

    .gate-tip {
      color: #606266;
      margin: 8px 0 16px;
      font-size: 14px;
    }

    :deep(.el-form-item) {
      margin-bottom: 14px;
    }

    :deep(.el-form-item__content) {
      justify-content: center;
    }

    .gate-submit-item {
      margin-bottom: 0;

      :deep(.el-form-item__content) {
        justify-content: center;
      }

      .el-button {
        min-width: 120px;
      }
    }

    .gate-error {
      color: #f56c6c;
      margin: 8px 0 0;
      font-size: 13px;
    }
  }

  .infos {
    max-width: 460px;
    margin: auto;
    overflow: hidden;
    :deep(div.el-form-item > label) {
      font-weight: bold;
      &::before {
        content: '* ';
        color: red;
      }
    }
  }
}

.withdraw {
  text-align: right;
}

.local-log-section {
  max-width: 520px;
  margin: 18px auto 0;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
  text-align: left;
}

.local-log-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.local-log-section-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  strong {
    color: #303133;
    font-size: 14px;
  }
}

.local-log-help {
  color: #909399;
  cursor: help;
  font-size: 16px;
}

.local-log-compact-list {
  display: grid;
  gap: 6px;
}

.local-log-compact-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 34px;
  padding: 6px 0;
  border-top: 1px solid #f2f3f5;

  &:first-child {
    border-top: 0;
  }

  time {
    flex-shrink: 0;
    color: #a8abb2;
    font-size: 12px;
  }
}

.local-log-compact-main {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.local-log-compact-title {
  overflow: hidden;
  color: #606266;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.local-log-drawer {
  display: flex;
  min-height: 100%;
  flex-direction: column;
}

.local-log-hint {
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}

.local-log-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.local-log-item {
  padding: 12px 14px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 2px 8px rgb(31 41 55 / 4%);

  h4 {
    margin: 8px 0 6px;
    color: #303133;
    font-size: 15px;
    line-height: 1.4;
    word-break: break-all;
  }

  p {
    margin: 4px 0 0;
    color: #606266;
    font-size: 13px;
    line-height: 1.5;
    word-break: break-all;
  }
}

.local-log-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  span {
    color: #909399;
    font-size: 12px;
  }
}

.local-log-footer {
  margin-top: auto;
  padding-top: 16px;
}

.tip-wrapper {
  line-height: 20px;
  text-align: left;
  word-break: break-all;
  // max-height: 100px;
  overflow: hidden;
  padding: 0 20px;
  color: #e6a23c;
  max-width: 320px;
  font-size: 14px;
}

@media (max-width: 640px) {
  .pc-nav {
    .nav {
      width: 100%;
      justify-content: space-between;
      gap: 8px;

      nav {
        flex-shrink: 0;
      }
    }

    .logo {
      width: 150px;
      margin: 0;

      img {
        max-width: 150px;
        object-fit: contain;
      }
    }
  }

  .panel {
    margin: 8px;
    padding: 12px;
  }

  .local-log-section {
    max-width: none;
    padding: 10px;
  }

  .local-log-compact-item {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .local-log-compact-title {
    white-space: normal;
  }
}
</style>
