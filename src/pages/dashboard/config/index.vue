<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { CloseBold, Refresh, Select } from '@element-plus/icons-vue'
import Tip from '../tasks/components/infoPanel/tip.vue'
import { ConfigServiceAPI } from '@/apis'

const serviceList = reactive([
  {
    name: 'MySQL',
    key: 'mysql',
    logo: 'https://img.cdn.sugarat.top/mdImg/MTY1NzM1OTAyMjIwNA==657359022204',
    status: false,
    des: '存储用户数据',
    errMsg: '',
  },
  {
    name: '七牛云',
    key: 'qiniu',
    logo: 'https://img.cdn.sugarat.top/mdImg/MTY1NzM1ODcyODM0Mg==657358728342',
    status: false,
    des: '文件存储',
  },
  {
    name: 'MongoDB',
    key: 'mongodb',
    logo: 'https://img.cdn.sugarat.top/mdImg/MTY1NzM1OTA4OTc3Nw==657359089777',
    status: false,
    des: '用户数据与日志',
  },
  {
    name: 'Redis',
    key: 'redis',
    logo: 'https://img.cdn.sugarat.top/mdImg/MTY1NzM1ODgyNzM1MA==657358827350',
    status: false,
    des: '持久化缓存数据',
    error: '确保安装redis，且监听端口6379',
  },
  {
    name: '腾讯云',
    key: 'tx',
    logo: 'https://img.cdn.sugarat.top/mdImg/MTY1NzM1OTE1MzQzOQ==657359153439',
    status: false,
    des: '短信服务',
  },
])

const loading = ref(false)
const showErrorList = computed(() => serviceList.filter(item => item.errMsg))
function refreshStatus() {
  if (loading.value)
    return
  loading.value = true
  ConfigServiceAPI.getServiceOverview().then((v) => {
    const { data } = v
    serviceList.forEach((item) => {
      const { status, errMsg } = data[item.key]
      item.status = status
      item.errMsg = errMsg
    })
    ElMessage.success('服务状态刷新完成')
    loading.value = false
  })
}

const serverConfig = ref([])
function getServiceConfig() {
  ConfigServiceAPI.getServiceConfig().then((v) => {
    // console.log(v.data)
    v.data.forEach((v) => {
      v.data.forEach((v) => {
        v.disabled = true
      })
    })
    serverConfig.value = v.data
  })
}
function updateCfg(item: ConfigServiceAPITypes.ServiceConfigItem) {
  ConfigServiceAPI.updateCfg(item).then(() => {
    item.disabled = true
    ElMessage.success('更新成功')
    refreshStatus()
  })
}
onMounted(() => {
  refreshStatus()
  getServiceConfig()
})
</script>

<template>
  <div class="user">
    <div class="panel">
      <!-- 服务概况 -->
      <div>
        <h1>
          <span>服务概况</span>
          <el-icon
            :class="{
              loading,
            }"
            style="cursor: pointer; margin-left: 10px"
            @click="refreshStatus"
          >
            <Refresh />
          </el-icon>
          <span v-show="loading">数据加载中...</span>
        </h1>
        <Tip>查看各个服务的运行情况</Tip>
        <div class="service-list">
          <div
            v-for="service in serviceList"
            :key="service.key"
            class="service-item"
          >
            <img :src="service.logo" :alt="service.name">
            <!-- <p>{{ service.name }}</p> -->
            <p>
              <Tip>{{ service.des }}</Tip>
            </p>
            <el-button
              v-if="service.status"
              type="success"
              size="small"
              :icon="Select"
              circle
            />
            <el-button
              v-else
              type="danger"
              size="small"
              :icon="CloseBold"
              circle
            />
            <p v-if="!service.status && service.error">
              <Tip>{{ service.error }}</Tip>
            </p>
          </div>
        </div>
      </div>
      <div v-show="showErrorList.length" class="error-panel">
        <h1>错误信息</h1>
        <p v-for="err in showErrorList" :key="err.key">
          <strong>{{ err.name }}:</strong>
          <span class="error">{{ err.errMsg }}</span>
        </p>
      </div>
      <div>
        <h1>服务相关配置</h1>
        <Tip>
          在此面板，配置服务器运行相关参数
          <a
            href="https://docs.ep.sugarat.top/deploy/online-new.html#_5-%E6%9C%80%E5%90%8E%E6%9B%B4%E6%96%B0%E9%85%8D%E7%BD%AE"
          >
            <el-button type="primary" link>配置手册?</el-button></a>
        </Tip>
      </div>
      <div class="config-container">
        <div
          v-for="serverItem in serverConfig"
          :key="serverItem.title"
          class="config-panel"
        >
          <h2>
            {{ serverItem.title }}
          </h2>
          <el-form
            label-position="right"
            label-width="100px"
            style="max-width: 400px; margin: 0 auto"
          >
            <el-form-item
              v-for="cfgItem in serverItem.data"
              :key="cfgItem.key"
              label-width="auto"
              :label="cfgItem.label || cfgItem.key"
            >
              <div class="flex" style="flex: 1">
                <el-input
                  v-model="cfgItem.value"
                  :disabled="cfgItem.disabled"
                />
                <el-button
                  v-if="cfgItem.disabled"
                  type="primary"
                  text
                  @click="cfgItem.disabled = false"
                >
                  更新
                </el-button>
                <el-button
                  v-else
                  type="success"
                  text
                  @click="updateCfg(cfgItem)"
                >
                  完成
                </el-button>
              </div>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@media screen and (max-width: 700px) {
  .user {
    margin-top: 40px !important;
  }
}

.user {
  margin: 0 auto;
}

.panel {
  max-width: 1256px;
  padding: 1em;
  background-color: #fff;
  margin: 10px auto;
  box-sizing: border-box;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
  border-radius: 4px;
}

h1 {
  margin: 0;
  padding: 10px 0;
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
}

.service-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-around;
}

.service-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 10px;
  min-width: 120px;

  img {
    width: 80px;
  }

  p {
    text-align: center;
    padding-top: 10px;
    font-size: 14px;
  }
}

@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.loading {
  margin-left: 10px;
  animation: rotate 1s linear infinite;
}

.error-panel {
  padding: 0 20px;

  p {
    .error {
      color: red;
    }

    margin-bottom: 10px;
  }
}

.config-container {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
}

.config-panel {
  h2 {
    text-align: center;
    font-size: 16px;
    margin-bottom: 10px;
  }
}
</style>
