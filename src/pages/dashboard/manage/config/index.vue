<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { SuperOverviewApi } from '@/apis'
import { useSiteAllConfig } from '@/composables'

const $router = useRouter()
const routes = computed(() =>
  $router.options.routes.filter(v => v.meta?.allowDisabled),
)
const showRoutes = reactive<
  {
    path: string
    name: string
    title: string
    disabled: boolean
  }[]
>([])

function handleChangeRoute(r: (typeof showRoutes)[0]) {
  SuperOverviewApi.addDisabledRoute(r.path, !r.disabled).then(() => {
    r.disabled = !r.disabled
    ElMessage.success('切换成功')
  })
}

const editConfig = ref(false)
const { value: jsonData, updateValue: updateJsonData } = useSiteAllConfig()

const editJSON = ref('')

function handleEditConfig() {
  editConfig.value = true
  editJSON.value = JSON.stringify(jsonData.value, null, 2)
}
async function handleSaveConfig() {
  try {
    const data = JSON.parse(editJSON.value)
    jsonData.value = data
    await updateJsonData()
    editConfig.value = false
    ElMessage.success('保存成功')
  }
  catch (e) {
    return ElMessage.error('JSON 格式错误')
  }
}
onMounted(() => {
  for (const r of routes.value) {
    SuperOverviewApi.checkDisabledRoute(r.path).then((v) => {
      showRoutes.push({
        path: r.path,
        name: r.name.toString(),
        title: r.meta.title,
        disabled: !!v.data?.status,
      })
    })
  }
})
</script>

<template>
  <div class="user">
    <div class="panel">
      <el-divider>禁用路由管理</el-divider>
      <ul class="routes">
        <li v-for="r in showRoutes" :key="r.name">
          <el-switch
            :model-value="!r.disabled" style="
              --el-switch-on-color: #13ce66;
              --el-switch-off-color: #ff4949;
            " @change="handleChangeRoute(r)"
          />
          <span class="title">{{ r.title }}</span>
          <span class="path">{{ r.path }}{{ r.path === '/register' ? ' 关闭后将同时禁用注册功能' : '' }}</span>
        </li>
      </ul>
      <el-divider>全局配置管理（JSON）</el-divider>
      <div class="config-btn">
        <el-button v-if="!editConfig" size="small" type="primary" @click="handleEditConfig">
          更新
        </el-button>
        <template v-else>
          <el-button size="small" type="danger" @click="editConfig = false">
            取消
          </el-button>
          <el-button size="small" type="success" @click="handleSaveConfig">
            保存
          </el-button>
        </template>
      </div>
      <div class="config-panel">
        <json-viewer
          v-if="!editConfig"
          :value="jsonData"
          :expand-depth="5"
          copyable
          boxed
          sort
        />
        <!-- TODO: JSON editor -->
        <el-input
          v-else
          v-model="editJSON"
          :autosize="{ minRows: 2, maxRows: 30 }"
          type="textarea"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@media screen and (max-width: 700px) {
  .user {
    margin-top: 40px !important;
  }
}

.user {
  margin: 0 auto;
}

.panel {
  max-width: 1256px;
  padding: 1em;
  background-color: #fff;
  margin: 10px auto;
  box-sizing: border-box;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
  border-radius: 4px;
}

.routes {
  max-width: 500px;
  margin: 0 auto;

  li {
    display: flex;
    padding: 20px;
    align-items: center;

    .title {
      font-weight: bold;
      margin: 0 10px;
    }
  }
}
.config-btn {
  text-align: center;
}
.config-panel {
  max-width: 500px;
  margin: 0 auto;
}
</style>
