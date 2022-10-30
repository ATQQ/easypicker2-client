<template>
  <div class="wish-btn">
    <div class="btn-list">
      <el-button
        v-if="!dialogVisible"
        @click="handleOpenFeature"
        style="margin: 0 auto"
        size="large"
        type="success"
        >提建议 & 给反馈</el-button
      >
      <el-button
        v-else
        @click="dialogVisible = false"
        style="margin: 0 auto"
        size="large"
        type="warning"
        >取消
      </el-button>
    </div>
    <el-form :model="formData" v-show="dialogVisible" style="margin-top: 10px">
      <el-form-item label="建议&问题" :label-width="formLabelWidth">
        <el-input
          placeholder="一句简单明了的话概括一下"
          v-model="formData.title"
        ></el-input>
      </el-form-item>
      <el-form-item label="详细描述" :label-width="formLabelWidth">
        <el-input
          placeholder="用朴素的话语进一步描述你的建议"
          type="textarea"
          v-model="formData.des"
        ></el-input>
      </el-form-item>
      <el-form-item label="联系方式" :label-width="formLabelWidth">
        <el-input
          placeholder="邮箱，QQ，微信等任意方式均可"
          v-model="formData.contact"
        ></el-input>
      </el-form-item>
    </el-form>
    <div class="btn-list" v-show="dialogVisible">
      <el-button type="success" @click="handleAddFeature">提交</el-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ElButton, ElMessage, ElFormItem, ElInput, ElForm } from 'element-plus'
import { ref, reactive } from 'vue'
import { WishApi } from '../apis'

const formLabelWidth = '80px'
const dialogVisible = ref(false)
const formData = reactive({
  title: '',
  des: '',
  contact: ''
})
const handleOpenFeature = () => {
  dialogVisible.value = true
}

const vaildFormData = () => {
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
const handleAddFeature = () => {
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

<style lang="scss" scoped>
.btn-list {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
