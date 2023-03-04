<template>
  <div class="tc ddl">
    <tip
      :imgs="[
        'https://img.cdn.sugarat.top/mdImg/MTY1MTQ5NjI2OTI0MQ==651496269241'
      ]"
      >设置注意事项，供用户提交时查看</tip
    >
    <tip>注意控制字数和换行，避免展示异常，建议内容不超过5行</tip>
    <div class="tc flex fc fac">
      <el-input
        v-model="textValue"
        :rows="5"
        clearable
        :max="500"
        show-word-limit
        type="textarea"
        placeholder="请输入要展示的批注信息"
      />
    </div>
    <div class="p10">
      <el-button size="default" @click="updateTip" type="success"
        >保存</el-button
      >
      <el-button size="default" @click="textValue = ''" type="danger"
        >清空</el-button
      >
    </div>
    <tip v-if="needSave"> 有变动记得保存 </tip>
    <tip> 可以设置图片啦↓ 最多3张 </tip>
    <el-upload
      accept="image/*"
      :limit="MaxImgCount"
      v-model:file-list="imageList"
      action=""
      ref="imgUpload"
      list-type="picture-card"
      :on-change="handleChangeFile"
      :on-exceed="handleExceedFile"
      :on-preview="handlePictureCardPreview"
      :on-remove="handleRemove"
      :auto-upload="false"
    >
      <el-icon><Plus /></el-icon>
    </el-upload>
    <ElImageViewer
      hide-on-click-modal
      :initial-index="previewIdx"
      :url-list="previewList"
      @close="imageViewerVisible = false"
      teleported
      v-if="imageViewerVisible"
    />
  </div>
</template>
<script lang="ts" setup>
import { ref, watch, computed, reactive } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, UploadProps, UploadUserFile } from 'element-plus'
import { updateTaskInfo } from '../../public'
import Tip from './tip.vue'
import { FileApi, PublicApi, TaskApi } from '@/apis'
import { qiniuUpload } from '@/utils/networkUtil'
import { getTipImageKey } from '@/utils/stringUtil'

const props = defineProps({
  tip: {
    type: String,
    default: '',
    required: false
  },
  k: {
    type: String,
    default: ''
  }
})
const textValue = ref('')

const tipData = reactive<{
  text: string
  imgs: {
    uid: number
    name: string
  }[]
}>({
  text: '',
  imgs: []
})
const MaxImgCount = ref(3)
const imageList = ref<UploadUserFile[]>([])
const previewList = computed(() => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return imageList.value.map((v) => v!.preview || v.url)
})
const previewIdx = ref(0)

watch(
  () => props.tip,
  () => {
    // 初始化
    try {
      const parseData = JSON.parse(props.tip)
      tipData.imgs = parseData.imgs
      tipData.text = parseData.text || ''
      imageList.value = tipData.imgs.map((v) => {
        return {
          ...v,
          url: 'https://img.cdn.sugarat.top/mdImg/MTY3NzkxMDI1NTU1Nw==20140524124237518.gif'
        }
      })
      if (imageList.value.length) {
        // 异步填充url
        PublicApi.getTipImageUrl(
          props.k,
          imageList.value.map((v) => ({
            uid: v.uid,
            name: v.name
          }))
        ).then((v) => {
          v.data.forEach((url, idx) => {
            imageList.value[idx].url = url.cover
            Object.assign(imageList.value[idx], {
              preview: url.preview
            })
          })
        })
      }
    } catch {
      tipData.text = props.tip || ''
      tipData.imgs = []
      imageList.value = []
    }

    // 外部变动
    if (tipData.text) {
      textValue.value = tipData.text
    } else {
      textValue.value = ''
    }
  },
  {
    immediate: true
  }
)
const needSave = computed(() => tipData.text !== textValue.value)

// 更新批注信息
const updateTip = (notify = true) => {
  if (tipData.text !== textValue.value) {
    tipData.text = textValue.value
  }
  updateTaskInfo(props.k, { tip: JSON.stringify(tipData) }, notify)
}

const imageViewerVisible = ref(false)
const handleChangeFile = (file: UploadUserFile) => {
  if (!props.k) {
    return
  }
  const { name, uid } = file
  const key = getTipImageKey(props.k, name, uid)
  if (file.status === 'ready') {
    file.status = 'success'
    // qiniu上传
    FileApi.getUploadToken().then((res) => {
      qiniuUpload(res.data.token, file.raw, key, {
        success() {
          tipData.imgs.push({
            uid,
            name
          })
          updateTip()
        }
      })
    })
  }
}
const handleRemove: UploadProps['onRemove'] = (file) => {
  const { uid, name } = file
  const idx = tipData.imgs.findIndex((v) => v.uid === uid)
  tipData.imgs.splice(idx, 1)
  updateTip()
  TaskApi.delTipImage(props.k, uid, name)
}

const handlePictureCardPreview = (file) => {
  imageViewerVisible.value = true
  const idx = imageList.value.findIndex((v) => v.uid === file.uid)
  previewIdx.value = idx
}
// 超出选择的文件个数
const handleExceedFile = () => {
  ElMessage.error(`只能选择${MaxImgCount.value}个图片,可删除后重新选择`)
}
</script>
