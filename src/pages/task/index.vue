<template>
  <div class="task-panel">
    <div class="pc-nav">
      <div class="nav">
        <!-- LOGO -->
        <div class="logo">
          <router-link to="/">
            <img
              src="./../../assets/i/EasyPicker.png"
              alt="logo"
            />
          </router-link>
        </div>
        <nav>
          <div
            class="nav-item"
            v-for="(n, idx) in pcNavs"
            :key="idx"
            @click="handleNav(idx)"
          >
            {{ n.title }}
          </div>
          <!-- TODO:重新加导航内容 -->
          <!-- <div class="nav-item">
            <a href="https://docs.ep.sugarat.top" target="_blank" rel="noopener noreferrer">应用介绍</a>
          </div>-->
        </nav>
      </div>
    </div>
    <div
      class="panel tc"
      v-if="
        k &&
        taskInfo.name &&
        taskMoreInfo.info
      "
    >
      <h1 class="name">
        {{ taskInfo.name }}
      </h1>
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
        <el-divider
          >必要信息填写</el-divider
        >
        <div class="infos">
          <el-form label-width="100px">
            <el-form-item
              class="ellipsis"
              v-for="(
                info, idx
              ) in infos"
              :key="idx"
              :label="info.text"
            >
              <el-input
                :maxlength="
                  maxInputLength
                "
                clearable
                show-word-limit
                :placeholder="`请输入${info.text}`"
                v-model="info.value"
              ></el-input>
            </el-form-item>
          </el-form>
        </div>

        <el-upload
          action="“"
          ref="fileUpload"
          :on-change="handleChangeFile"
          :before-remove="
            handleRemoveFile
          "
          :on-exceed="handleExceed"
          :auto-upload="false"
          multiple
          :limit="limitUploadCount"
          :file-list="fileList"
        >
          <el-button type="primary"
            >选择文件</el-button
          >
        </el-upload>
        <div class="p10">
          <el-button
            v-if="isWithdraw"
            size="small"
            @click="startWithdraw"
            type="warning"
            >一键撤回</el-button
          >
          <el-button
            v-else
            size="small"
            @click="submitUpload"
            type="success"
            >提交文件</el-button
          >
          <el-button
            @click="checkSubmitStatus"
            size="small"
            >查询提交情况</el-button
          >
        </div>
        <!-- TODO: -->
        <!-- <div class="p10 option-tips">
          {{isWithdraw ? '撤回提示' : '提交提示'}}
        </div> -->
        <div class="withdraw">
          <el-button
            type="text"
            style="color: #85ce61"
            v-if="taskMoreInfo.template"
            size="small"
            @click="downloadTemplate"
            >下载模板</el-button
          >
          <el-button
            v-if="isWithdraw"
            @click="isWithdraw = false"
            size="small"
            type="text"
            >正常提交</el-button
          >
          <el-button
            v-else
            size="small"
            @click="isWithdraw = true"
            type="text"
            >我要撤回</el-button
          >
        </div>
      </div>
    </div>
    <LinkDialog
      v-model:value="showLinkModel"
      title="模板文件下载链接"
      :link="templateLink"
    ></LinkDialog>
  </div>
</template>
<script lang="ts" setup>
import filenamify from 'filenamify'
import {
  ElMessage,
  ElMessageBox,
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

const maxInputLength = +import.meta.env
  .VITE_APP_INPUT_MAX_LENGTH || 10

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
const taskInfo: any = reactive({})
const taskMoreInfo: any = reactive({})
const k = ref('')

// 截止日期
const waitTime = ref(0)
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
const infos: any[] = reactive([])

// 文件上传部分

// 文件上传
const fileList: any[] = reactive([])
const fileUpload: any = ref()

const handleRemoveFile: any = (
  file: any,
) => ElMessageBox.confirm(
  '不影响已经上传成功的，正在上传的将取消上传',
  '确认移除此文件吗',
).then(() => {
  if (file.status === 'uploading') {
    ElMessage.info(
      `取消${file.name}的上传`,
    )
    // 取消上传
    file.subscription.unsubscribe() // 取消上传
  }
  return true
})

// 开始上传
const peopleName = ref('')
const submitUpload = () => {
  const { uploadFiles } = fileUpload.value
  // 校验表单填写
  for (const info of infos) {
    if (!info.value) {
      ElMessage.warning(
        '请先完成必要信息的填写',
      )
      return
    }
  }
  const startUpload = () => {
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
                  file.percentage = ~~per
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
  // TODO: 优化代码
  if (taskMoreInfo.people) {
    ElMessageBox.prompt(
      '请输入你的姓名',
      '姓名核验',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        draggable: true,
      },
    )
      .then(async ({ value }) => {
        const {
          data: { exist },
        } = await PeopleApi.checkPeopleIsExist(
          k.value,
          value,
        )
        if (exist) {
          peopleName.value = value
          startUpload()
        } else {
          ElMessage.warning(
            '你不在此次提交名单中,如有疑问请联系管理员',
          )
        }
      })
      .catch(() => {
        ElMessage.info('取消')
      })
  } else {
    startUpload()
  }
}

// 添加文件
const handleChangeFile = (
  file: any,
) => {
  // 计算md5 hash
  getFileMd5Hash(file.raw).then(
    (str) => {
      file.md5 = str
    },
  )
}
const limitUploadCount = ref(10)
const handleExceed = () => {
  ElMessage.warning(
    `一次提交最多只能选择${limitUploadCount.value}个文件，请移除已经上传成功的或刷新页面`,
  )
}
const showLinkModel = ref(false)
const templateLink = ref('')
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
const startWithdraw = () => {
  const { uploadFiles } = fileUpload.value
  // 校验表单填写
  for (const info of infos) {
    if (!info.value) {
      ElMessage.warning(
        '请先完成必要信息的填写,需和提交时信息完全一致',
      )
      return
    }
  }
  const start = () => {
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
        file.status !== 'uploading'
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
          })
          .catch(() => {
            ElMessage.error(
              `撤回失败: 没有文件:${file.name}对应提交记录`,
            )
          })
      }
    }
  }
  // TODO: 优化代码
  if (taskMoreInfo.people) {
    ElMessageBox.prompt(
      '请输入你的姓名',
      '姓名核验',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        draggable: true,
      },
    )
      .then(async ({ value }) => {
        const {
          data: { exist },
        } = await PeopleApi.checkPeopleIsExist(
          k.value,
          value,
        )
        if (exist) {
          peopleName.value = value
          start()
        } else {
          ElMessage.warning(
            '你不在提交名单中,无法进行撤回操作,如有疑问请联系管理员',
          )
        }
      })
      .catch(() => {
        ElMessage.info('取消')
      })
  } else {
    start()
  }
}

// 查询提交情况
const checkSubmitStatus = () => {
  // 校验表单填写
  for (const info of infos) {
    if (!info.value) {
      ElMessage.warning(
        '请先完成必要信息的填写,需和提交时信息完全一致',
      )
      return
    }
  }
  FileApi.checkSubmitStatus(
    k.value,
    infos,
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
    )
    TaskApi.getTaskMoreInfo(
      k.value,
    ).then((res) => {
      Object.assign(
        taskMoreInfo,
        res.data,
      )
      infos.push(
        ...JSON.parse(
          taskMoreInfo.info,
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
  box-shadow: 0 2px 12px 0
    rgb(0 0 0 / 10%);
  border-radius: 4px;
  .name {
    text-align: center;
  }
  .ddl {
    margin-top: 10px;
    color: #919191;
    font-size: 1rem;
  }
  .infos {
    max-width: 400px;
    margin: auto;
    > div {
      margin-bottom: 10px;
    }
  }
}

.withdraw {
  text-align: right;
}
</style>
