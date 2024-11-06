<script lang="ts">
import { ElMessage } from 'element-plus'
import { computed, defineComponent, ref, watchEffect } from 'vue'
import QrCode from '@components/QrCode.vue'
import { copyRes, getShortUrl } from '@/utils/stringUtil'
import { useIsMobile, useSiteConfig } from '@/composables'

export default defineComponent({
  name: 'LinkDialog',
  components: {
    QrCode,
  },
  props: {
    title: {
      type: String,
      default: '链接面板',
    },
    value: {
      type: Boolean,
    },
    link: {
      type: String,
      default: '',
    },
    download: {
      type: Boolean,
      default: true,
    },
    shareTextPrefix: {
      type: String,
      default: '',
    },
  },
  emits: ['update:value'],
  setup(props, context) {
    const shareLink = ref('')
    const showModel = ref(false)
    const isMobile = useIsMobile()
    const copyLink = () => {
      copyRes(shareLink.value)
    }
    const { value: siteConfig } = useSiteConfig()

    watchEffect(() => {
      shareLink.value = props.link
    })
    watchEffect(() => {
      showModel.value = props.value
      if (showModel.value && props.download) {
        setTimeout(() => {
          ElMessage.success('如未自动开始下载，请复制链接到浏览器中执行下载')
        }, 200)
      }
    })
    const handleClose = () => {
      context.emit('update:value', false)
    }
    const createShortLink = () => {
      getShortUrl(shareLink.value).then((v) => {
        shareLink.value = v
        ElMessage.success('短链生成成功')
      })
    }
    const appName = computed(() => siteConfig.value.appName)
    const shareText = computed(() => {
      return `${appName.value && `【${appName.value}】`}${props.shareTextPrefix} ${shareLink.value}`
    })
    const copyShareText = () => {
      copyRes(shareText.value)
    }

    const showShareTextPanel = computed(() => !!props.shareTextPrefix)
    return {
      shareLink,
      createShortLink,
      copyLink,
      handleClose,
      showModel,
      isMobile,
      shareText,
      copyShareText,
      showShareTextPanel,
    }
  },
})
</script>

<template>
  <div>
    <el-dialog v-model="showModel" :fullscreen="isMobile" :title="title" center @close="handleClose">
      <!-- 链接 -->
      <div>
        <el-input v-model="shareLink" placeholder="生成的链接">
          <template #append>
            <el-button type="primary" @click="copyLink">
              复制
            </el-button>
          </template>
        </el-input>
      </div>
      <!-- 二维码 -->
      <div class="center">
        <QrCode :value="shareLink" />
      </div>
      <div class="center">
        <el-button type="primary" @click="createShortLink">
          生成短链
        </el-button>
      </div>
      <template v-if="showShareTextPanel">
        <div class="center">
          <el-input
            :value="shareText" style="width: 300px" :autosize="{ minRows: 3, maxRows: 10 }" type="textarea"
            placeholder="分享信息"
          />
        </div>
        <div class="center">
          <el-button type="success" round @click="copyShareText">
            复制分享信息
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss" scoped>
.center {
  text-align: center;
  margin-top: 10px;
}
</style>
