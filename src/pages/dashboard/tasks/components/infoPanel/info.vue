<template>
    <div class="tc">
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
            预期格式: <span style="color: #409EFF;">{{resFormat}}</span>
        </div>
        <!-- 必填信息区域 -->
        <div>
            <el-input
                placeholder="请在此处输入内容"
                class="info-item"
                v-for="(item,idx) in infos"
                :key="idx"
                v-model="item.text"
                :maxlength="10"
                clearable
                show-word-limit
            >
                <template #prepend>第{{ idx + 1 }}项</template>
                <template #append v-if="idx > 0">
                    <el-button @click="deleteInfo(idx)">
                        <i style="color: red;" class="el-icon-error"></i>
                    </el-button>
                </template>
            </el-input>
        </div>
        <div class="p10">
            <el-button size="small" type="primary" @click="addInfo" round>添加一项</el-button>
            <el-button size="small" type="success" @click="saveInfo" round>保存</el-button>
        </div>
    </div>
</template>
<script lang="ts">
import { ElMessage } from 'element-plus'
import {
  computed,
  defineComponent, reactive, ref, watch, watchEffect,
} from 'vue'
import { updateTaskInfo } from '../../public'

export default defineComponent({
  name: 'infoPanel',
  props: {
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
  },
  setup(props) {
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
    const addInfo = () => {
      infos.push({ text: '标题' })
    }
    const deleteInfo = (idx: number) => {
      infos.splice(idx, 1)
    }
    const saveInfo = () => {
      const data:string[] = []
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
    }
    return {
      autoRewrite,
      hanleChange,
      infos,
      addInfo,
      saveInfo,
      deleteInfo,
      resFormat,
    }
  },
})
</script>
<style scoped>
.auto-format {
    display: flex;
    justify-content: center;
}
.info-item {
    margin-top: 10px;
    width: 80%;
}
</style>
