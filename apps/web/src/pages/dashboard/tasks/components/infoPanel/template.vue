<script lang="ts">
import type { UploadUserFile } from 'element-plus'
import { ElMessage } from 'element-plus'
import { defineComponent, ref, watchEffect } from 'vue'
import { FileApi } from '@/apis'
import { qiniuUpload } from '@/utils/networkUtil'
import { updateTaskInfo } from '../../public'
import Tip from './tip.vue'

export default defineComponent({
  name: 'TemplatePanel',
  components: { Tip },
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
      }
      else {
        template.value = ''
      }
    })
    const percentage = ref(0)
    // 删除模板
    const deleteTemplate = () => {
      if (template.value) {
        // 移除文件，避免空间被长时间占用
        updateTaskInfo(props.k, { template: '' })
        template.value = ''
        percentage.value = 0
      }
    }
    // 文件上传
    const fileList = ref<UploadUserFile[]>([])
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
      fileList.value.forEach((file) => {
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
              success() {
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
                file.percentage = ~~per
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
})
</script>

<template>
  <div class="config-panel info-panel">
    <section class="panel-tip">
      <div>
        <h4>模板文件</h4>
        <p>上传后，用户可以在提交页下载模板文件，再按模板要求填写或提交。</p>
      </div>
      <Tip
        :imgs="[
          'https://img.cdn.sugarat.top/mdImg/MTY1MDE4MjY3MjUxNw==650182672517',
        ]"
      >
        查看示例
      </Tip>
    </section>

    <section class="setting-card">
      <div class="setting-header">
        <div>
          <h4>当前模板</h4>
          <p>{{ template ? '模板文件已生效，可在提交页下载。' : '尚未设置模板文件。' }}</p>
        </div>
        <el-button
          v-if="template"
          :disabled="!template"
          type="danger"
          plain
          @click="deleteTemplate"
        >
          删除模板
        </el-button>
      </div>
      <div class="template-file" :class="{ empty: !template }">
        {{ template || '暂无模板文件' }}
      </div>
    </section>

    <section v-if="!template" class="setting-card">
      <div class="setting-header">
        <div>
          <h4>上传模板</h4>
          <p>选择一个文件后点击“设为模板”，同一任务仅保留一个模板文件。</p>
        </div>
      </div>
      <el-upload
        ref="elUpload"
        v-model:file-list="fileList"
        action=""
        class="upload-file"
        :on-exceed="handleExceedFile"
        :on-remove="clearFiles"
        :auto-upload="false"
        :limit="1"
      >
        <template #trigger>
          <el-button type="primary" plain>
            选取文件
          </el-button>
        </template>
        <el-button
          class="upload-action"
          type="success"
          :disabled="!fileList.length"
          @click="submitUploadPeople"
        >
          设为模板
        </el-button>
        <template #tip>
          <div class="el-upload__tip">
            选择模板文件，然后点击设为模板。
          </div>
        </template>
      </el-upload>
    </section>
  </div>
</template>

<style lang="scss" scoped>
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

.template-file {
  margin-top: 16px;
  padding: 12px 14px;
  color: #303133;
  background-color: #f5f7fa;
  border-radius: 10px;
  word-break: break-all;

  &.empty {
    color: #c0c4cc;
  }
}

.upload-file {
  margin-top: 16px;
}

.upload-action {
  margin-left: 10px;
}

.info-panel :deep(.el-upload-list__item-name) {
  justify-content: flex-start;
}

@media screen and (max-width: 700px) {
  .panel-tip,
  .setting-header {
    align-items: stretch;
    flex-direction: column;
  }

  .upload-action {
    display: block;
    width: 100%;
    margin: 10px 0 0;
  }
}
</style>
