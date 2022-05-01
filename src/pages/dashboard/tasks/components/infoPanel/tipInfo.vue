<template>
    <div class="tc ddl">
        <tip :imgs="[
            'https://img.cdn.sugarat.top/mdImg/MTY0OTE0OTI4NjU5Nw==649149286597',
        ]">设置批注信息，供用户提交时查看。</tip>
        <div class="tc flex fc fac">
            <el-input v-model="textValue" :rows="4" clearable :max="500" show-word-limit type="textarea"
                placeholder="请输入要展示的批注信息" />
        </div>
        <div class="p10">
            <el-button size="default" @click="updateTip" type="success">保存</el-button>
            <el-button size="default" @click="textValue = ''" type="danger">清空</el-button>
        </div>
        <Tip v-if="needSave">
            有变动记得保存
        </Tip>
    </div>
</template>
<script lang="ts" setup>
import { computed } from '@vue/reactivity'
import {
  ref, watchEffect,
} from 'vue'
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
const initValue = ref('')
const textValue = ref('')

watchEffect(() => {
  if (props.tip) {
    initValue.value = props.tip
    textValue.value = props.tip
  } else {
    initValue.value = ''
    textValue.value = ''
  }
})
const needSave = computed(() => initValue.value !== textValue.value)

// 更新DDL
const updateTip = () => {
  updateTaskInfo(props.k, { tip: textValue.value })
  initValue.value = textValue.value
}
</script>