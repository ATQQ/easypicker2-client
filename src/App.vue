<template>
  <router-view></router-view>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue'
import { useStore } from 'vuex'

export default defineComponent({
  name: 'App',
  setup() {
    const $store = useStore()
    const refreshWidth = () => {
      const clientWIdth = window.document.body.clientWidth
      $store.commit('public/setWidth', clientWIdth)
    }
    onMounted(() => {
      window.addEventListener('load', refreshWidth)
      window.addEventListener('resize', refreshWidth)
    })
  },
})
</script>

<style>
*{
  padding:0;
  margin:0;
}
a{
  text-decoration: none;
}
.tc{
  text-align: center;
}
.p10{
  padding: 10px;
}

@media screen and (max-width:700px) {
  .el-message-box{
    width: auto;
  }
  .el-pagination{
    white-space:break-spaces;
  }
  .el-pagination >*{
    margin-bottom: 10px;
  }
}
</style>
