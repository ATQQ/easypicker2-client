<template>
  <div class="user">
    <div class="panel">
      <el-divider>部分路由管理</el-divider>
      <ul class="routes">
        <li v-for="r in showRoutes" :key="r.name">
          <el-switch @change="handleChangeRoute(r)" :value="!r.disabled" style="
              --el-switch-on-color: #13ce66;
              --el-switch-off-color: #ff4949;
            " />
          <span class="title">{{ r.title }}</span>
          <span class="path">{{ r.path }}{{ r.path === '/register' ? ' 关闭后将同时禁用注册功能' : '' }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { SuperOverviewApi } from '@/apis'

const $store = useStore()
const $router = useRouter()
const routes = computed(() =>
  $router.options.routes.filter((v) => v.meta?.allowDisabled)
)
const showRoutes = reactive<
  {
    path: string
    name: string
    title: string
    disabled: boolean
  }[]
>([])

const handleChangeRoute = (r: (typeof showRoutes)[0]) => {
  SuperOverviewApi.addDisabledRoute(r.path, !r.disabled).then(() => {
    r.disabled = !r.disabled
    ElMessage.success('切换成功')
  })
}
onMounted(() => {
  for (const r of routes.value) {
    SuperOverviewApi.checkDisabledRoute(r.path).then((v) => {
      showRoutes.push({
        path: r.path,
        name: r.name.toString(),
        title: r.meta.title,
        disabled: !!v.data?.status
      })
    })
  }
})
const isMobile = computed(() => $store.getters['public/isMobile'])
</script>

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
</style>
