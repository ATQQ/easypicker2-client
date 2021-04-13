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
          <div
            class="nav-item"
            v-for="(n, idx) in pcNavs"
            :key="idx"
            @click="handleNav(idx)"
          >{{ n.title }}</div>
        </nav>
      </div>
    </div>
    <div class="panel tc" v-if="k && taskInfo.name && taskMoreInfo.info">
      <h1 class="name">{{ taskInfo.name }}</h1>
      <h2 v-if="ddlStr" class="ddl">
        截止时间:{{ ddlStr }}
        <span>{{ isOver ? '已经结束' : waitTimeStr }}</span>
      </h2>
      <!-- 未设置ddl 或者 设置了还未结束 -->
      <div v-if="!ddlStr || !isOver">
        <el-divider>必要信息填写</el-divider>
        <div class="infos">
          <el-input
            :maxlength="10"
            clearable
            show-word-limit
            v-for="(info,idx) in infos"
            :key="idx"
            :placeholder="`请输入${info.text}`"
            v-model="info.value"
          >
            <template #prepend>{{ info.text }}</template>
          </el-input>
        </div>
        <div class="p10">
          <el-button type="warning">撤回已上传文件</el-button>
          <el-button @click="submitUpload" type="success">开始上传</el-button>
        </div>
        <el-upload
          action
          ref="fileUpload"
          :on-change="handleChangeFile"
          :before-remove="handleRemoveFile"
          :on-exceed="handleExceed"
          :auto-upload="false"
          multiple
          :limit="5"
          :file-list="fileList"
        >
          <el-button type="primary">选择文件</el-button>
        </el-upload>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import { FileApi, TaskApi } from '@/apis'
import { qiniuUpload } from '@/utils/networkUtil'
import { formatDate, getFileMd5Hash, getFileSuffix } from '@/utils/stringUtil'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  computed,
  defineComponent, onMounted, reactive, ref,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'

export default defineComponent({
  setup() {
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
    const refreshWaitTime = () => {
      setTimeout(() => {
        if (taskMoreInfo?.ddl) {
          const date = new Date(taskMoreInfo.ddl)
          waitTime.value = date.getTime() - Date.now()
        } else {
          waitTime.value = 0
        }
        refreshWaitTime()
      }, 1000)
    }
    const ddlStr = computed(() => {
      if (taskMoreInfo?.ddl) {
        const date = new Date(taskMoreInfo.ddl)
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

    const handleRemoveFile = (file: any) => ElMessageBox.confirm('确认删除', '提示').then(() => {
      if (file.status === 'uploading') {
        ElMessage.info(`取消${file.name}的上传`)
        // 取消上传
        file.subscription.unsubscribe() // 取消上传
      }
      return true
    })

    // 开始上传
    const submitUpload = () => {
      const { uploadFiles } = fileUpload.value
      // 校验表单填写
      for (const info of infos) {
        if (!info.value) {
          ElMessage.warning('请先完成必要信息的填写')
          return
        }
      }

      // TODO:校验提交人员?
      // TODO:弹窗输入名字
      for (const file of uploadFiles) {
        if (!file.md5) {
          ElMessage.info(`文件(${file.name})的唯一指纹还在计算中,再等待一会儿再点击上传`)
          setTimeout(() => {
            ElMessage.info('文件越大计算时间越长(1G通常需要20s)')
          }, 100)
        } else if (file.status === 'ready') {
          // 开始上传
          file.status = 'uploading'
          let { name } = file

          // 如果开启了自动重命名,这里重命名一下
          if (taskMoreInfo.rewrite) {
            name = infos.map((v) => v.value).join('-') + getFileSuffix(name)
          }

          const key = `easypicker2/${k.value}/${file.md5}/${name}`

          // 挂载取消上传的方法
          FileApi.getUploadToken().then((res) => {
            qiniuUpload(res.data.token, file.raw, key, {
              success(data: any) {
                file.status = 'success'
                const { fsize } = data
                FileApi.addFile({
                  name,
                  taskKey: k.value,
                  taskName: taskInfo.name,
                  size: fsize,
                  hash: file.md5,
                  info: JSON.stringify(infos),
                }).then(() => {
                  ElMessage.success(`文件:${file.name}提交成功`)
                })
              },
              process(per: number, data:any, subscription: any) {
                file.percentage = ~~(per)
                file.subscription = subscription
              },
            })
          })
        }
      }
    }

    // 添加文件
    const handleChangeFile = (file: any) => {
      // 计算md5 hash
      getFileMd5Hash(file.raw).then((str) => {
        file.md5 = str
      })
    }

    const handleExceed = () => {
      ElMessage.warning('一次提交最多只能选择5个文件')
    }
    onMounted(() => {
      k.value = $route.params.key as string
      if (k.value) {
        TaskApi.getTaskInfo(k.value).then((res) => {
          Object.assign(taskInfo, res.data)
        })
        TaskApi.getTaskMoreInfo(k.value).then((res) => {
          Object.assign(taskMoreInfo, res.data)
          infos.push(...JSON.parse(taskMoreInfo.info).map((v: string) => ({ text: v, value: '' })))
        })
        refreshWaitTime()
      }
    })
    return {
      pcNavs,
      handleNav,
      taskInfo,
      taskMoreInfo,
      k,
      ddlStr,
      isOver,
      waitTime,
      waitTimeStr,
      infos,
      fileList,
      handleChangeFile,
      handleRemoveFile,
      fileUpload,
      submitUpload,
      handleExceed,
    }
  },
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
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
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
</style>
