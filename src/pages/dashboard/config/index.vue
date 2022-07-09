<template>
  <div class="user">
    <div class="panel">
      <!-- 服务概况 -->
      <div>
        <h1>
          <span>服务概况</span>
          <el-icon :class="{
            loading,
          }" @click="refreshStatus" style="cursor:pointer;margin-left: 10px;">
            <Refresh />
          </el-icon>
        </h1>
        <Tip>查看各个服务的运行情况</Tip>
        <div class="service-list">
          <div v-for="service in serviceList" :key="service.key" class="service-item">
            <img :src="service.logo" :alt="service.name">
            <p>{{ service.name }}</p>
            <p>
              <Tip>{{ service.des }}</Tip>
            </p>
            <el-button v-if="service.status" type="success" size="small" :icon="Select" circle />
            <el-button v-else type="danger" size="small" :icon="CloseBold" circle />
            <p v-if="!service.status && service.error">
              <Tip>{{ service.error }}</Tip>
            </p>
          </div>
        </div>
      </div>
      <!-- MYSQL -->
      <!-- 七牛云 -->
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import {
  computed, onMounted, reactive, ref,
} from 'vue'
import { useStore } from 'vuex'
import { Select, CloseBold, Refresh } from '@element-plus/icons-vue'
import { ConfigServiceAPI } from '@/apis'
import { formatDate } from '@/utils/stringUtil'
import { WishStatus } from '@/constants'
import Tip from '../tasks/components/infoPanel/tip.vue'

const serviceList = reactive([
  {
    name: 'MySQL',
    key: 'mysql',
    logo: 'https://img.cdn.sugarat.top/mdImg/MTY1NzM1OTAyMjIwNA==657359022204',
    status: false,
    des: '存储用户数据',
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
    error: '请在下方正确配置相关参数',
  },
])
const $store = useStore()
const loading = ref(false)
const refreshStatus = () => {
  loading.value = true
  ConfigServiceAPI
    .getServiceOverview()
    .then((v) => {
      const { data } = v
      serviceList.forEach((item) => {
        item.status = data[item.key].status
      })
      ElMessage.success('服务状态刷新完成')
      loading.value = false
    })
}
onMounted(() => {
  refreshStatus()
})
const isMobile = computed(() => $store.getters['public/isMobile'])

</script>

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
  0%{
    transform: rotate(0deg);
  }
  100%{
    transform: rotate(360deg);
  }
}
.loading{
  margin-left: 10px;
  animation: rotate 1s linear infinite;
}

</style>
