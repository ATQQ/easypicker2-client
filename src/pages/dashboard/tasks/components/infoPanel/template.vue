<template>
  <div class="tc info-panel">
      <tip
      :imgs="[
        'https://img.cdn.sugarat.top/mdImg/MTY1MDE4MjY3MjUxNw==650182672517',
      ]"
    >设置的模板文件，可供用户在提交页下载。</tip>
    <el-button
      v-if="template"
      :disabled="!template"
      @click="deleteTemplate"
      size="default"
      round
      type="danger"
    >删除</el-button>
    <div class="p10">{{ template || '尚未设置模板文件' }}</div>
    <div class="upload-file" v-if="!template">
      <el-upload
        accetp="text/plain"
        action=""
        ref="elUpload"
        :on-exceed="handleExceedFile"
        :on-remove="clearFiles"
        :auto-upload="false"
        :limit="1"
        :file-list="fileList"
      >
        <template #trigger>
          <el-button size="small" type="primary">选取文件</el-button>
        </template>
        <el-button
          @click="submitUploadPeople"
          style="margin-left: 10px;"
          size="small"
          type="success"
        >设为模板</el-button>
        <template #tip>
          <div class="el-upload__tip">选择模板文件,然后点击上传</div>
        </template>
      </el-upload>
    </div>
  </div>
</template>
<script lang="ts">
import { ElMessage, UploadUserFile } from 'element-plus'
import {
  defineComponent, reactive, ref, watchEffect,
} from 'vue'
import { FileApi } from '@/apis'
import { qiniuUpload } from '@/utils/networkUtil'
import { updateTaskInfo } from '../../public'
import Tip from './tip.vue'

export default defineComponent({
  name: 'templatePanel',
  props: {
    value: {
      type: String,
      default: '',
    },
    k: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const template = ref()
    watchEffect(() => {
      if (props.value) {
        template.value = props.value
      } else {
        template.value = ''
      }
    })
    const percentage = ref(0)
    // 删除模板
    const deleteTemplate = () => {
      if (template.value) {
        updateTaskInfo(props.k, { template: '' })
        template.value = ''
        percentage.value = 0
      }
    }
    // 文件上传
    const fileList = reactive<UploadUserFile[]>([])
    const elUpload = ref()
    // 超出选择的文件个数
    const handleExceedFile = () => {
      ElMessage.error('只能选择一个文件,可删除后重新选择')
    }
    // 清空文件
    const clearFiles = () => {
      elUpload.value.clearFiles()
    }
    // 开始上传
    const submitUploadPeople = () => {
      fileList.forEach((file) => {
        if (!props.k) {
          return
        }
        const { name } = file
        const key = `easypicker2/${props.k}_template/${name}`
        if (file.status === 'ready') {
          file.status = 'uploading'
          // qiniu上传
          FileApi.getUploadToken().then((res) => {
            qiniuUpload(res.data.token, file.raw, key, {
              success(data: any) {
                ElMessage.success('上传成功')
                updateTaskInfo(props.k, { template: name })
                // 清理上传完成的
                clearFiles()
                template.value = name
                file.status = 'success'
                // hash,key
                // console.log(data)
              },
              process(per: number) {
                file.percentage = ~~(per)
              },
            })
          })
        }
      })
    }
    return {
      template,
      deleteTemplate,
      fileList,
      handleExceedFile,
      clearFiles,
      submitUploadPeople,
      elUpload,
      percentage,
    }
  },
  components: { Tip },
})
</script>

<style lang="scss" scoped>
.info-panel :deep(.el-upload-list__item-name){
  justify-content:center;
}
</style>
