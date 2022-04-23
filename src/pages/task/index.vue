<template>
  <div class="task-panel">
    <div class="pc-nav">
      <div class="nav">
        <!-- LOGO -->
        <div class="logo">
          <router-link to="/">
            <img src="./../../assets/i/EasyPicker.png" alt="logo" />
          </router-link>
        </div>
        <nav>
          <div class="nav-item" v-for="(n, idx) in pcNavs" :key="idx" @click="handleNav(idx)">
            {{ n.title }}
          </div>
          <!-- TODO:重新加导航内容 -->
          <!-- 底部导航栏 -->
        </nav>
      </div>
    </div>
    <!-- 有效 -->
    <div class="panel tc" v-if="
      k
    ">
      <!-- 任务名 -->
      <h1 class="name">
        {{ taskInfo.name }}
      </h1>
      <!-- 截止时间字符串 -->
      <h2 v-if="ddlStr" class="ddl">
        截止时间:{{ ddlStr }}
        <span>
          {{
              isOver
                ? '已经结束'
                : waitTimeStr
          }}
        </span>
      </h2>
      <!-- 未设置ddl 或者 设置了还未结束 -->
      <div v-if="!ddlStr || !isOver">
        <el-divider>必要信息填写</el-divider>
        <div class="infos">
          <el-form label-width="100px">
            <el-form-item class="ellipsis" v-for="(
                info, idx
              ) in infos" :key="idx" :label="info.text">
              <el-input :maxlength="
                maxInputLength
              " clearable show-word-limit :placeholder="`请输入${info.text}`" v-model="info.value"></el-input>
            </el-form-item>
          </el-form>
        </div>
        <el-upload style="max-width: 400px; margin: 0 auto;" :drag="!isMobile" action="" ref="fileUpload"
          :on-change="handleChangeFile" :before-remove="
            handleRemoveFile
          " :on-exceed="handleExceed" :auto-upload="false" multiple :limit="limitUploadCount" :file-list="fileList">
          <el-button v-if="isMobile" type="primary">选择文件</el-button>
          <template v-else>
            <el-icon class="el-icon--upload">
              <upload-filled />
            </el-icon>
            <div class="el-upload__text">
              将文件拖于此处 or <em>直接选择文件</em>
            </div>
          </template>
          <template #tip>
            <div class="p10" v-show="!!calculateMd5Count">
              <tip>还有 {{ calculateMd5Count }} 个文件正在生成校验信息，请稍等(1G通常需要20s)</tip>
            </div>
          </template>
        </el-upload>
        <div class="p10">
          <el-button v-if="isWithdraw" size="small" @click="startWithdraw" type="warning"
            :disabled="!allowWithdraw || !!calculateMd5Count">一键撤回</el-button>
          <el-button v-else size="small" @click="submitUpload" type="success"
            :disabled="!allowUpload || !!calculateMd5Count">提交文件</el-button>
          <el-button @click="checkSubmitStatus" size="small">查询提交情况</el-button>
        </div>
        <!-- 提示信息 -->
        <div class="p10 option-tips">
          <template v-if="isWithdraw">
            <tip>① 须保证选择的文件与提交时的文件一致<br /> ② 填写表单信息一致 <br /> ③ 完全一模一样的文件的提交记录（内容md5+命名），将会一次性全部撤回</tip>
          </template>
          <template v-else>
            <tip>① 选择完文件，点击 ”提交文件“即可 <br /> ② <strong>选择大文件后需要等待一会儿才展示处理</strong></tip>
          </template>
        </div>
        <div class="withdraw">
          <el-button type="text" style="color: #85ce61" v-if="taskMoreInfo.template" size="small"
            @click="downloadTemplate">下载模板</el-button>
          <el-button v-if="isWithdraw" @click="isWithdraw = false" size="small" type="text">正常提交</el-button>
          <el-button v-else size="small" @click="isWithdraw = true" type="text">我要撤回</el-button>
        </div>
      </div>
    </div>
    <!-- 无效任务 -->
    <div class="panel tc" v-else>
      <h1 class="name">
        {{ taskInfo.name }}
      </h1>
    </div>
    <LinkDialog v-model:value="showLinkModel" title="模板文件下载链接" :link="templateLink"></LinkDialog>
  </div>
</template>
<script lang="ts" setup>
import filenamify from 'filenamify'
import {
  ElMessage,
  ElMessageBox,
} from 'element-plus'
import type {
  UploadUserFile,
  UploadInstance,
} from 'element-plus'
import {
  computed,
  onMounted,
  reactive,
  ref,
} from 'vue'
import {
  useRoute,
  useRouter,
} from 'vue-router'
import LinkDialog from '@components/linkDialog.vue'
import { UploadFilled } from '@element-plus/icons-vue'
import { useStore } from 'vuex'
import {
  formatDate,
  getFileMd5Hash,
  getFileSuffix,
} from '@/utils/stringUtil'
import {
  downLoadByUrl,
  qiniuUpload,
} from '@/utils/networkUtil'
import {
  FileApi,
  PeopleApi,
  TaskApi,
} from '@/apis'
import Tip from '../dashboard/tasks/components/infoPanel/tip.vue'

const maxInputLength = +import.meta.env
  .VITE_APP_INPUT_MAX_LENGTH || 10

const $store = useStore()
const isMobile = computed(() => $store.getters['public/isMobile'])
// 顶部导航
const $router = useRouter()
const $route = useRoute()
const pcNavs = reactive([
  {
    title: '我也要收集',
    path: '/',
  },
])
const handleNav = (idx: number) => {
  $router.push({
    path: pcNavs[idx].path,
  })
}

// 任务基本信息展示
const taskInfo = reactive<TaskApiTypes.TaskInfo>({ name: '', category: '' })
const taskMoreInfo = reactive<Partial<TaskApiTypes.TaskInfo>>({})
const k = ref('')

// 用于展示截止日期
const waitTime = ref(0)
// 判断是否结束
const isOver = computed(
  () => waitTime.value <= 0,
)
const waitTimeStr = computed(() => {
  let seconds = ~~(
    waitTime.value / 1000
  )
  let hour = ~~(seconds / (60 * 60))
  const day = ~~(hour / 24)
  hour %= 24
  const minute = ~~(
    (seconds % 3600)
    / 60
  )
  seconds %= 60
  return `剩余${day}天${hour}时${minute}分${seconds}秒`
})
const refreshWaitTime = (loop = true) => {
  if (taskMoreInfo?.ddl) {
    const date = new Date(
      taskMoreInfo.ddl,
    )
    waitTime.value = date.getTime() - Date.now()
  } else {
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
    const date = new Date(
      taskMoreInfo.ddl,
    )
    return formatDate(date)
  }
  return ''
})

// 必填信息
const infos = reactive<TaskApiTypes.TaskFormInfoItem[]>([])

// 文件上传部分

// 文件上传
const fileList = reactive<(UploadUserFile & { md5: string, subscription: any })[]>([])
const fileUpload = ref<UploadInstance>()

const handleRemoveFile: any = (
  file: any,
) => {
  if (file.status === 'uploading' || file.status === 'success') {
    return ElMessageBox.confirm(
      '不影响已经上传成功的，正在上传的将取消上传',
      '确定从列表移除文件吗？',
    ).then(() => {
      if (file.status === 'uploading') {
        ElMessage.info(
          `取消${file.name}的上传`,
        )
        // 取消上传
        file.subscription.unsubscribe() // 取消上传
      }
      return true
    }).catch(() => false)
  }
  return true
}

// 校验表单填写
const isWriteFinish = computed(() => infos.every(
  (item) => item.value,
))
// 提交文件
const peopleName = ref('')
const confirmPeopleName = () => ElMessageBox.prompt(
  '请输入你的姓名',
  '姓名核验',
  {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    draggable: true,
  },
)
  .then(({ value }) => value)
  .catch(() => {
    ElMessage.info('取消')
    return ''
  })

const startUpload = () => {
  const uploadFiles = fileList
  for (const file of uploadFiles) {
    if (!file.md5) {
      ElMessage.info(
        `文件(${file.name})的唯一指纹还在计算中,再等待一会儿再点击上传`,
      )
      setTimeout(() => {
        ElMessage.info(
          '文件越大计算时间越长(1G通常需要20s)',
        )
      }, 100)
    } else if (
      file.status === 'ready'
    ) {
      // 开始上传
      file.status = 'uploading'
      let { name } = file

      // 如果开启了自动重命名,这里重命名一下
      if (taskMoreInfo.rewrite) {
        name = infos
          .map((v) => v.value)
          .join('-')
          + getFileSuffix(name)
      }
      // 替换不合法的字符
      name = filenamify(name, {
        replacement: '_',
      })

      const key = `easypicker2/${k.value}/${file.md5}/${name}`

      FileApi.getUploadToken().then(
        (res) => {
          qiniuUpload(
            res.data.token,
            file.raw,
            key,
            {
              success(data: any) {
                file.status = 'success'
                const { fsize } = data
                FileApi.addFile({
                  name,
                  taskKey: k.value,
                  taskName:
                    taskInfo.name,
                  size: fsize,
                  hash: file.md5,
                  info: JSON.stringify(
                    infos,
                  ),
                  people:
                    peopleName.value,
                }).then(() => {
                  ElMessage.success(
                    `文件:${file.name}提交成功`,
                  )
                  if (
                    taskMoreInfo.people
                  ) {
                    // 无感知更新一下
                    PeopleApi.updatePeopleStatus(
                      k.value,
                      name,
                      peopleName.value,
                      file.md5,
                    )
                  }
                })
              },
              process(
                per: number,
                data: any,
                subscription: any,
              ) {
                file.percentage = Math.floor(per)
                // 挂载取消上传的方法
                file.subscription = subscription
              },
            },
          )
        },
      )
    }
  }
}

const submitUpload = async () => {
  if (!isWriteFinish.value) {
    ElMessage.warning(
      '请先完成必要信息的填写',
    )
    return
  }

  if (taskMoreInfo.people) {
    const name = await confirmPeopleName()
    if (!name) {
      return
    }
    const {
      data: { exist },
    } = await PeopleApi.checkPeopleIsExist(
      k.value,
      name,
    )
    if (!exist) {
      ElMessage.warning(
        '你不在此次提交名单中,如有疑问请联系管理员',
      )
      return
    }
    peopleName.value = name
  }
  startUpload()
}

// 是否允许上传
const allowUpload = computed(() => {
  for (const file of fileList) {
    if (
      file.status === 'ready'
    ) {
      return true
    }
  }
  return false
})

// 是否允许撤回
const allowWithdraw = computed(() => {
  for (const file of fileList) {
    if (
      [
        'success',
        'ready',
      ].includes(file.status)
    ) {
      return true
    }
  }
  return false
})

// 添加文件
// 正在计算MD5值的文件个数
const calculateMd5Count = ref(0)
const handleChangeFile = (
  file: any,
) => {
  calculateMd5Count.value += 1
  // 计算md5 hash
  getFileMd5Hash(file.raw).then(
    (str) => {
      file.md5 = str
      calculateMd5Count.value -= 1
    },
  )
}
// TODO:上传个数限制可设置
const limitUploadCount = ref(10)
const handleExceed = () => {
  ElMessage.warning(
    `一次提交最多只能选择${limitUploadCount.value}个文件，请移除已经上传成功的或刷新页面`,
  )
}
const showLinkModel = ref(false)
const templateLink = ref('')
const runWithdraw = () => {
  const uploadFiles = fileList
  for (const file of uploadFiles) {
    if (!file.md5) {
      ElMessage.info(
        `文件(${file.name})的唯一指纹还在计算中,再等待一会儿再点击上传`,
      )
      setTimeout(() => {
        ElMessage.info(
          '文件越大计算时间越长(1G通常需要20s)',
        )
      }, 100)
    } else if (
      ![
        'fail',
        'uploading',
      ].includes(file.status)
    ) {
      // 准备开始撤回
      let { name } = file

      // 如果开启了自动重命名,这里重命名一下
      if (taskMoreInfo.rewrite) {
        name = infos
          .map((v) => v.value)
          .join('-')
          + getFileSuffix(name)
      }

      FileApi.withdrawFile({
        taskKey: k.value,
        taskName: taskInfo.name,
        filename: name,
        hash: file.md5,
        info: JSON.stringify(infos),
        peopleName: peopleName.value,
      })
        .then(() => {
          ElMessage.success(
            `文件:${file.name}撤回成功`,
          )
          file.name += ' - (已撤回 ✅ )'
          file.status = 'fail'
        })
        .catch(() => {
          ElMessage.error(
            `撤回失败: 没有文件:${file.name}对应提交记录`,
          )
        })
    }
  }
}
const downloadTemplate = () => {
  FileApi.getTemplateUrl(
    taskMoreInfo.template,
    k.value,
  )
    .then((res) => {
      showLinkModel.value = true
      const { link } = res.data
      templateLink.value = link
      downLoadByUrl(
        link,
        taskMoreInfo.template,
      )
    })
    .catch(() => {
      ElMessage.warning(
        '文件已从服务器上移除,请联系管理员重新上传',
      )
    })
}

// 撤回相关逻辑
const isWithdraw = ref(false)
const startWithdraw = async () => {
  // 校验表单填写
  if (!isWriteFinish.value) {
    ElMessage.warning(
      '请先完成必要信息的填写',
    )
    return
  }
  if (taskMoreInfo.people) {
    const name = await confirmPeopleName()
    if (!name) {
      return
    }
    const {
      data: { exist },
    } = await PeopleApi.checkPeopleIsExist(
      k.value,
      name,
    )
    if (!exist) {
      ElMessage.warning(
        '你不在此次提交名单中,如有疑问请联系管理员',
      )
      return
    }
    peopleName.value = name
  }
  runWithdraw()
}

// 查询提交情况
const checkSubmitStatus = async () => {
  // 校验表单填写
  if (!isWriteFinish.value) {
    ElMessage.warning(
      '请先完成必要信息的填写,需和提交时信息完全一致',
    )
    return
  }
  // 卡控人员限制
  if (taskMoreInfo.people) {
    const name = await confirmPeopleName()
    if (!name) {
      ElMessage.warning(
        '请填写有效的姓名',
      )
      return
    }
    const {
      data: { exist },
    } = await PeopleApi.checkPeopleIsExist(
      k.value,
      name,
    )
    if (!exist) {
      ElMessage.warning(
        '你不在此次提交名单中,如有疑问请联系管理员',
      )
      return
    }
    peopleName.value = name
  }
  FileApi.checkSubmitStatus(
    k.value,
    infos,
    peopleName.value,
  ).then((res) => {
    if (res.data.isSubmit) {
      ElMessage.success('已经提交过啦')
    } else {
      ElMessage.warning('还未提交过哟')
    }
  })
}

onMounted(() => {
  k.value = $route.params.key as string
  if (k.value) {
    TaskApi.getTaskInfo(k.value).then(
      (res) => {
        Object.assign(
          taskInfo,
          res.data,
        )
      },
    ).catch((err) => {
      if (err.code === 4001) {
        ElMessage.error('任务不存在')
        k.value = ''
        taskInfo.name = '任务不存在'
      }
    })

    TaskApi.getTaskMoreInfo(
      k.value,
    ).then((res) => {
      Object.assign(
        taskMoreInfo,
        res.data,
      )
      infos.push(
        ...JSON.parse(
          (taskMoreInfo?.info) || '[]',
        ).map((v: string) => ({
          text: v,
          value: '',
        })),
      )
      refreshWaitTime(false)
    })
    refreshWaitTime()
  }
})
</script>
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

.task-panel {
  background-color: #f3f6f8;
  padding-bottom: 1rem;
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
    max-width: 400px;
    margin: auto;

    >div {
      margin-bottom: 10px;
    }
  }
}

.withdraw {
  text-align: right;
}
</style>
