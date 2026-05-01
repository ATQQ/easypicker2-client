<script lang="ts" setup>
import { reactive, ref } from 'vue'
import { WishApi } from '../apis'

const formLabelWidth = '80px'
const dialogVisible = ref(false)
const formData = reactive({
  title: '',
  des: '',
  contact: '',
})
function handleOpenFeature() {
  dialogVisible.value = true
}

function vaildFormData() {
  if (formData.title.length === 0) {
    ElMessage.error('建议标题不能为空')
    return false
  }
  if (formData.des.length === 0) {
    ElMessage.error('建议详细描述，不能为空')
    return false
  }
  return true
}
function handleAddFeature() {
  // 信息校验
  if (!vaildFormData()) {
    return
  }
  dialogVisible.value = false
  // 提交信息
  WishApi.addWish(formData).then(() => {
    ElMessage.success('提交成功，感谢你的反馈')
  })
  // 初始化 表单内容
  formData.title = ''
  formData.des = ''
  formData.contact = ''
}
</script>

<template>
  <div class="wish-btn">
    <div class="btn-list">
      <el-button
        v-if="!dialogVisible"
        style="margin: 0 auto"
        size="large"
        type="success"
        @click="handleOpenFeature"
      >
        提建议 & 给反馈
      </el-button>
      <el-button
        v-else
        style="margin: 0 auto"
        size="large"
        type="warning"
        @click="dialogVisible = false"
      >
        取消
      </el-button>
    </div>
    <el-form v-show="dialogVisible" :model="formData" style="margin-top: 10px">
      <el-form-item label="建议&问题" :label-width="formLabelWidth">
        <el-input
          v-model="formData.title"
          placeholder="一句简单明了的话概括一下"
        />
      </el-form-item>
      <el-form-item label="详细描述" :label-width="formLabelWidth">
        <el-input
          v-model="formData.des"
          placeholder="用朴素的话语进一步描述你的建议"
          type="textarea"
        />
      </el-form-item>
      <el-form-item label="联系方式" :label-width="formLabelWidth">
        <el-input
          v-model="formData.contact"
          placeholder="邮箱，QQ，微信等任意方式均可"
        />
      </el-form-item>
    </el-form>
    <div v-show="dialogVisible" class="btn-list">
      <el-button type="success" @click="handleAddFeature">
        提交
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.btn-list {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
