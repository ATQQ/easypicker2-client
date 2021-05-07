<template>
  <div>
    <el-dialog :fullscreen="isMobile" @close="handleClose" :title="title" v-model="showModel" center>
      <!-- 链接 -->
      <div>
        <el-input placeholder="生成的链接" v-model="shareLink">
          <template #prepend>
            <el-button type="primary" @click="createShortLink">生成短链</el-button>
          </template>
          <template #append>
            <el-button type="primary" @click="copyLink">复制</el-button>
          </template>
        </el-input>
      </div>
      <!-- 二维码 -->
      <div style="margin-top: 10px;text-align: center;">
        <qr-code :value="shareLink"></qr-code>
      </div>
      <!-- <template #footer>
          <span class="dialog-footer">
              <el-button type="primary" @click="$emit('update:value',false)">关闭</el-button>
          </span>
      </template>-->
    </el-dialog>
  </div>
</template>
<script lang="ts">
import { copyRes, getShortUrl } from '@/utils/stringUtil'
import { ElMessage } from 'element-plus'
import {
  computed,
  defineComponent, ref, watchEffect,
} from 'vue'
import QrCode from '@components/QrCode.vue'
import { useStore } from 'vuex'

export default defineComponent({
  name: 'linkDialog',
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
  },
  setup(props, context) {
    const shareLink = ref('')
    const showModel = ref(false)
    const copyLink = () => {
      copyRes(shareLink.value)
    }
    watchEffect(() => {
      shareLink.value = props.link
    })
    watchEffect(() => {
      showModel.value = props.value
      if (showModel.value && props.download) {
        setTimeout(() => {
          ElMessage.success('如未自动开始下载，请复制链接到浏览器中执行下载(12h有效)')
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

    const $store = useStore()
    const isMobile = computed(() => $store.getters['public/isMobile'])

    return {
      shareLink,
      createShortLink,
      copyLink,
      handleClose,
      showModel,
      isMobile,
    }
  },
})
</script>
