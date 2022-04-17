<template>
  <div class="tc">
    <tip :imgs="[
      'https://img.cdn.sugarat.top/mdImg/MTY1MDE4MzM3NjUyNg==650183376526',
    ]">上传文件必填表单信息</tip>
    <div class="auto-format">
      <span>文件自动重命名:</span>
      <el-switch
        style="display: block"
        v-model="autoRewrite"
        active-color="#13ce66"
        inactive-color="#ff4949"
        active-text="开"
        @change="hanleChange"
        inactive-text="关"
      ></el-switch>
    </div>
    <div v-if="autoRewrite" class="p10">
      预期格式:
      <span style="color: #409EFF;">{{ resFormat }}</span>
    </div>
    <!-- 必填信息区域 -->
    <div>
      <el-form label-width="40px">
        <el-form-item v-for="(item, idx) in infos" :key="idx">
          <template #label>
            <div class="num-wrapper">
              <div>{{ idx + 1 }}</div>
            </div>
          </template>
          <el-input
            placeholder="输入内容"
            v-model="item.text"
            :maxlength="maxInputLength"
            clearable
            show-word-limit
          >
            <template #append v-if="idx > 0">
              <el-button @click="deleteInfo(idx)">
                <el-icon color="red">
                  <CircleCloseFilled />
                </el-icon>
              </el-button>
            </template>
          </el-input>
        </el-form-item>
      </el-form>
    </div>
    <div class="p10">
      <el-button
        size="small"
        type="primary"
        @click="addInfo"
        round
        v-if="infos.length < 6
        "
      >添加一项</el-button>
      <el-button size="small" type="success" @click="saveInfo" round>保存</el-button>
    </div>
    <div v-if="needSave">有变动，请记得点击保存</div>
  </div>
</template>
<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import {
  computed, reactive, ref, watch, watchEffect,
} from 'vue'
import { CircleCloseFilled } from '@element-plus/icons-vue'
import { updateTaskInfo } from '../../public'
import Tip from './tip.vue'

const props = defineProps({
  rewrite: {
    type: Number,
    default: 0,
  },
  info: {
    typs: String,
    default: '[]',
  },
  k: {
    type: String,
    default: '',
  },
})

const maxInputLength = +import.meta.env.VITE_APP_INPUT_MAX_LENGTH || 10

const autoRewrite = ref(false)
const infos: any[] = reactive([])

// 负责清空
watch(() => props.info, () => {
  infos.splice(0, infos.length)
})
// 负责更新
watchEffect(() => {
  infos.push(...JSON.parse(props.info).map((v: string) => ({ text: v })))
})

// 预计格式
const resFormat = computed(() => `${infos.map((v) => v.text).join('-')}.后缀`)
watchEffect(() => {
  autoRewrite.value = !!props.rewrite
})
const hanleChange = (v: boolean) => {
  updateTaskInfo(props.k, {
    rewrite: +v,
  })
}

const needSave = ref(false)
const addInfo = () => {
  infos.push({ text: '标题' })
  needSave.value = true
}
const deleteInfo = (idx: number) => {
  infos.splice(idx, 1)
  needSave.value = true
}

const saveInfo = () => {
  const data: string[] = []
  // eslint-disable-next-line no-restricted-syntax
  for (const v of infos) {
    if (!v.text) {
      ElMessage.warning('不能有空项')
      return
    }
    data.push(v.text)
  }
  updateTaskInfo(props.k, {
    info: JSON.stringify(data),
  })
  needSave.value = false
}
</script>
<style scoped>
.auto-format {
  display: flex;
  justify-content: center;
}
:deep(.el-form-item__label) {
  display: flex;
  align-items: center;
  justify-content: center;
}
.num-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #000;
  text-align: center;
}
</style>
