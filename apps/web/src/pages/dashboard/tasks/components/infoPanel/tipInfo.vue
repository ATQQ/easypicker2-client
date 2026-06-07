<!-- eslint-disable ts/ban-ts-comment -->
<script lang="ts" setup>
import type { UploadProps, UploadUserFile } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'
import { FileApi, PublicApi, TaskApi } from '@/apis'
import { localManagedFileUpload, qiniuUpload } from '@/utils/networkUtil'
import { formatSize, getTipImageKey } from '@/utils/stringUtil'
import { updateTaskInfo } from '../../public'
import Tip from './tip.vue'

const props = defineProps({
  tip: {
    type: String,
    default: '',
    required: false,
  },
  k: {
    type: String,
    default: '',
  },
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
  imgs: [],
})
const MaxImgCount = ref(3)
const imageList = ref<UploadUserFile[]>([])
const previewList = computed(() => {
  // @ts-expect-error
  return imageList.value.map(v => v!.preview || v.url)
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
          url: 'https://img.cdn.sugarat.top/mdImg/MTY3NzkxMDI1NTU1Nw==20140524124237518.gif',
        }
      })
      if (imageList.value.length) {
        // 异步填充url
        PublicApi.getTipImageUrl(
          props.k,
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
    }
    catch {
      tipData.text = props.tip || ''
      tipData.imgs = []
      imageList.value = []
    }

    // 外部变动
    if (tipData.text) {
      textValue.value = tipData.text
    }
    else {
      textValue.value = ''
    }
  },
  {
    immediate: true,
  },
)
const needSave = computed(() => tipData.text !== textValue.value)

// 更新批注信息
function updateTip(notify = true) {
  if (tipData.text !== textValue.value) {
    tipData.text = textValue.value
  }
  updateTaskInfo(props.k, { tip: JSON.stringify(tipData) }, notify)
}

const imageViewerVisible = ref(false)
function handleChangeFile(file: UploadUserFile) {
  if (!props.k) {
    return
  }
  if (!file.raw) {
    ElMessage.error('图片文件不存在')
    return
  }
  const { name, uid } = file
  const key = getTipImageKey(props.k, name, uid)
  if (file.status === 'ready') {
    file.status = 'uploading'
    FileApi.getUploadToken().then((res) => {
      const markSuccess = () => {
        file.status = 'success'
        tipData.imgs.push({
          uid,
          name,
        })
        updateTip()
      }
      const markFail = (err?: any) => {
        file.status = 'fail'
        ElMessage.error(err?.message || '图片上传失败')
      }
      if (res.data.storageMode === 'local') {
        const maxB = res.data.maxUploadBytes
        if (maxB && file.raw!.size > maxB) {
          ElMessage.error(`图片超过单文件上限 ${formatSize(maxB)}`)
          file.status = 'fail'
          return
        }
        localManagedFileUpload(file.raw!, '/task_info/tip/image/upload', {
          taskKey: props.k,
          uid,
          name,
        }, {
          success() {
            markSuccess()
          },
          error(err) {
            markFail(err)
          },
        })
        return
      }
      qiniuUpload(res.data.token, file.raw!, key, {
        success() {
          markSuccess()
        },
        error(err) {
          markFail(err)
        },
      })
    }).catch(() => {
      file.status = 'fail'
      ElMessage.error('获取上传参数失败')
    })
  }
}
const handleRemove: UploadProps['onRemove'] = (file) => {
  const { uid, name } = file
  const idx = tipData.imgs.findIndex(v => v.uid === uid)
  if (idx >= 0) {
    tipData.imgs.splice(idx, 1)
    updateTip()
    TaskApi.delTipImage(props.k, uid, name)
  }
}

function handlePictureCardPreview(file) {
  imageViewerVisible.value = true
  const idx = imageList.value.findIndex(v => v.uid === file.uid)
  previewIdx.value = idx
}
// 超出选择的文件个数
function handleExceedFile() {
  ElMessage.error(`只能选择${MaxImgCount.value}个图片,可删除后重新选择`)
}
</script>

<template>
  <div class="config-panel">
    <section class="panel-tip">
      <div>
        <h4>提交页批注</h4>
        <p>用于在提交页展示说明、注意事项和图片提示，保存后建议打开预览确认展示效果。</p>
      </div>
      <Tip
        :imgs="[
          'https://img.cdn.sugarat.top/mdImg/MTY1MTQ5NjI2OTI0MQ==651496269241',
        ]"
      >
        查看示例
      </Tip>
    </section>

    <section class="setting-card">
      <div class="setting-header">
        <div>
          <h4>文字说明</h4>
          <p>建议控制换行和字数，避免在移动端展示过长。</p>
        </div>
        <el-tag v-if="needSave" type="warning" effect="light">
          待保存
        </el-tag>
      </div>
      <el-input
        v-model="textValue"
        class="tip-textarea"
        :rows="7"
        clearable
        :max="500"
        show-word-limit
        type="textarea"
        placeholder="请输入要展示的批注信息"
      />
      <div class="actions">
        <el-button type="success" @click="updateTip()">
          保存批注
        </el-button>
        <el-button type="danger" plain @click="textValue = ''">
          清空
        </el-button>
      </div>
    </section>

    <section class="setting-card">
      <div class="setting-header">
        <div>
          <h4>图片说明</h4>
          <p>最多上传 3 张图片，适合补充截图、流程图或填写示例。</p>
        </div>
        <el-tag type="info" effect="plain">
          {{ imageList.length }}/{{ MaxImgCount }}
        </el-tag>
      </div>
      <el-upload
        v-model:file-list="imageList"
        class="image-upload"
        accept="image/*"
        :limit="MaxImgCount"
        action=""
        list-type="picture-card"
        :on-change="handleChangeFile"
        :on-exceed="handleExceedFile"
        :on-preview="handlePictureCardPreview"
        :on-remove="handleRemove"
        :auto-upload="false"
      >
        <el-icon><Plus /></el-icon>
      </el-upload>
    </section>
    <ElImageViewer
      v-if="imageViewerVisible"
      hide-on-click-modal
      :initial-index="previewIdx"
      :url-list="previewList"
      teleported
      @close="imageViewerVisible = false"
    />
  </div>
</template>

<style scoped lang="scss">
.config-panel {
  display: grid;
  gap: 16px;
}

.panel-tip,
.setting-card {
  padding: 18px;
  background-color: #fff;
  border: 1px solid #edf2f7;
  border-radius: 14px;
}

.panel-tip,
.setting-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h4 {
    margin: 0;
    font-size: 16px;
    color: #1f2d3d;
  }

  p {
    margin: 8px 0 0;
    font-size: 13px;
    color: #909399;
    line-height: 1.6;
  }
}

.panel-tip {
  background-color: #f8fbff;
}

.tip-textarea,
.image-upload {
  margin-top: 16px;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 16px;
}

@media screen and (max-width: 700px) {
  .panel-tip,
  .setting-header,
  .actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
