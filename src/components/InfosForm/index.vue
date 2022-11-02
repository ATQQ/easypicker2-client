<template>
  <el-form :disabled="disabled" :label-position="labelPosition || 'top'">
    <el-form-item
      class="ellipsis"
      v-for="(info, idx) in infos"
      :key="idx"
      :label="info.type === 'text' ? '' : info.text"
    >
      <div class="fixed-text" v-if="info.type === 'text'">
        {{ info.text }}
      </div>
      <el-input
        v-if="info.type === 'input'"
        :maxlength="maxInputLength"
        clearable
        show-word-limit
        :placeholder="`请输入 ${info.text}`"
        v-model="info.value"
      ></el-input>
      <el-radio-group v-if="info.type === 'radio'" v-model="info.value">
        <el-radio
          v-for="(r, idx) in info.children"
          :key="idx"
          :label="r.text"
          >{{ r.text }}</el-radio
        >
      </el-radio-group>
      <el-select
        default-first-option
        clearable
        filterable
        v-if="info.type === 'select'"
        v-model="info.value"
        :placeholder="`请选择 ${info.text}`"
      >
        <el-option
          v-for="(r, idx) in info.children"
          :key="idx"
          :label="r.text"
          :value="r.text"
        />
      </el-select>
    </el-form-item>
  </el-form>
</template>
<script setup lang="ts">
defineProps<{
  infos: InfoItem[]
  disabled: boolean
  labelPosition?: 'left' | 'right' | 'top'
}>()

const maxInputLength = +import.meta.env.VITE_APP_INPUT_MAX_LENGTH || 10
</script>
<style scoped lang="scss">
:deep(div.el-form-item > label) {
  font-weight: bold;
  &::before {
    content: '* ';
    color: red;
  }
}

:deep(div.el-form-item__content > .el-select) {
  flex: 1;
}
.fixed-text {
  background-color: #f5f7fa;
  padding: 0 10px;
  width: 100%;
  text-align: left;
}
</style>
