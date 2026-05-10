<script lang="ts" setup>
import type { UploadUserFile } from 'element-plus'
import HomeFooter from '@components/HomeFooter/index.vue'
import LinkDialog from '@components/linkDialog.vue'
import { UploadFilled } from '@element-plus/icons-vue'
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
            info: JSON.stringify(infos),
            people: validModal.peopleName,
          }).then(() => {
            file.status = 'success'
            ElMessage.success(`文件:${file.name}提交成功`)
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
            info: JSON.stringify(infos),
            people: validModal.peopleName,
          }).then(() => {
            file.status = 'success'
            ElMessage.success(`文件:${file.name}提交成功`)
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
      })
        .then(() => {
          ElMessage.success(`文件:${file.name}撤回成功`)
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
  FileApi.checkSubmitStatus(k.value, infos, validModal.peopleName).then(
    (res) => {
      if (res.data.isSubmit) {
        ElMessage.success('已经提交过啦')
      }
      else {
        ElMessage.warning('还未提交过哟')
      }
    },
  )
}
const isLoadingData = ref(false)
const readyRefresh = ref(false)
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
  TaskApi.getTaskMoreInfo(k.value).then((res) => {
    Object.assign(taskMoreInfo, res.data)
    if (!isEqualInfos(infos, parseInfo(taskMoreInfo.info))) {
      infos.splice(0, infos.length)
      infos.push(...parseInfo(taskMoreInfo.info))
      if (hot) {
        ElMessage.success('表单信息有更新')
      }
    }
    refreshWaitTime(false)
    isLoadingData.value = false
  })
}
function handleBlur() {
  readyRefresh.value = true
}
function handleFocus() {
  if (readyRefresh.value && !disableForm.value) {
    readyRefresh.value = false
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

// 禁用上传
const disabledUpload = useLocalStorage('disabledUpload', false)

onMounted(() => {
  k.value = $route.params.key as string
  if (k.value) {
    isLoadingData.value = true
    TaskApi.getTaskInfo(k.value)
      .then((res) => {
        Object.assign(taskInfo, res.data)
        submitNavTasks.value = res.data.submitNavTasks ?? []
        disabledUpload.value = !!res.data.limitUpload
        if (disabledUpload.value) {
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
    isLoadingData.value = true
    TaskApi.getTaskInfo(k.value)
      .then((res) => {
        Object.assign(taskInfo, res.data)
        submitNavTasks.value = res.data.submitNavTasks ?? []
        disabledUpload.value = !!res.data.limitUpload
        if (disabledUpload.value) {
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
</style>
