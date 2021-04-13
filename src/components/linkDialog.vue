<template>
    <el-dialog :title="title" :model-value="value" center>
        <!-- 链接 -->
        <div>
            <el-input disabled placeholder="生成的链接" v-model="shareLink">
                <template #prepend>
                    <el-button type="primary" @click="createShortLink">生成短链</el-button>
                </template>
                <template #append>
                    <el-button type="primary" @click="copyLink">复制</el-button>
                </template>
            </el-input>
        </div>
        <!-- 二维码 -->
        <div class="qr-code">
            <qr-code :value="shareLink"></qr-code>
        </div>
        <!-- <template #footer>
            <span class="dialog-footer">
                <el-button type="primary" @click="$emit('update:value',false)">关闭</el-button>
            </span>
        </template> -->
    </el-dialog>
</template>
<script lang="ts">
import { copyRes, getShortUrl } from '@/utils/stringUtil'
import { ElMessage } from 'element-plus'
import {
  defineComponent, ref, watchEffect,
} from 'vue'
import QrCode from '@components/QrCode.vue'

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
  },
  setup(props) {
    const shareLink = ref('')
    watchEffect(() => {
      shareLink.value = props.link
    })

    const createShortLink = () => {
      getShortUrl(shareLink.value).then((v) => {
        shareLink.value = v
        ElMessage.success('短链生成成功')
      })
    }
    const copyLink = () => {
      copyRes(shareLink.value)
    }
    return {
      shareLink,
      createShortLink,
      copyLink,
    }
  },
})
</script>
<style scoped>
.qr-code {
    margin-top: 10px;
    text-align: center;
}
</style>
