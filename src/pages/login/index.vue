<template>
    <div>
        <h1>登录页</h1>
        <div>
      <el-input placeholder="请输账号" v-model="account">
        <template #prepend>账号</template>
      </el-input>
    </div>
    <div>
      <el-input placeholder="请输入密码" v-model="pwd" type="password">
        <template #prepend>密码</template>
      </el-input>
    </div>
        <el-button type="primary" @click="login">登录</el-button>
    </div>
</template>
<script lang="ts">
import { UserApi } from '@/apis'
import { ElMessage } from 'element-plus'
import { defineComponent, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

export default defineComponent({
  setup() {
    const account = ref('')
    const pwd = ref('')
    const $store = useStore()
    const $router = useRouter()
    const redirectDashBoard = () => {
      $router.replace({
        name: 'dashboard',
      })
    }
    const login = () => {
      UserApi.login(account.value, pwd.value).then((res) => {
        const { token } = res.data
        $store.commit('user/setToken', token)
        ElMessage.success('登录成功')
        redirectDashBoard()
      }).catch(() => {
        ElMessage.error({
          type: 'error',
          message: '密码不正确',
        })
      })
    }

    onMounted(() => {
      const { token } = $store.state.user
      if (token) {
        redirectDashBoard()
      }
    })
    return {
      account,
      pwd,
      login,
    }
  },
})
</script>
