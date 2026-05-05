<script setup lang="ts">
import { computed } from 'vue'
import { useSiteConfig } from '@/composables'

defineProps<{
  infos: InfoItem[]
  disabled: boolean
  labelPosition?: 'left' | 'right' | 'top'
}>()

const { value: siteConfig } = useSiteConfig()
const maxInputLength = computed(() => siteConfig.value.maxInputLength)
</script>

<template>
  <el-form :disabled="disabled" :label-position="labelPosition || 'top'">
    <el-form-item
      v-for="(info, idx) in infos"
      :key="idx"
      class="ellipsis"
      :label="info.type === 'text' ? '' : info.text"
    >
      <div v-if="info.type === 'text'" class="fixed-text">
        {{ info.text }}
      </div>
      <el-input
        v-if="info.type === 'input'"
        v-model="info.value"
        :maxlength="maxInputLength"
        clearable
        show-word-limit
        :placeholder="`请输入 ${info.text}`"
      />
      <el-radio-group v-if="info.type === 'radio'" v-model="info.value">
        <el-radio
          v-for="(r, idx) in info.children"
          :key="idx"
          :label="r.text"
        >
          {{ r.text }}
        </el-radio>
      </el-radio-group>
      <el-select
        v-if="info.type === 'select'"
        v-model="info.value"
        default-first-option
        clearable
        filterable
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
