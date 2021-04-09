<template>
  <div>
    <h1>注册页</h1>
    <div>
      <el-input placeholder="请输账号" v-model="account">
        <template #prepend>账号</template>
      </el-input>
    </div>
    <div>
      <el-input placeholder="请输入密码" v-model="pwd1" type="password">
        <template #prepend>密码</template>
      </el-input>
    </div>
    <div>
      <el-input placeholder="请再次输入" v-model="pwd2" type="password">
        <template #prepend>密码</template>
      </el-input>
    </div>
    <div>
        <el-button @click="handleRegister">注册</el-button>
    </div>
  </div>
</template>
<script lang="ts">
import { UserApi } from '@/apis'
import { defineComponent, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

export default defineComponent({
  setup() {
    const account = ref('')
    const pwd1 = ref('')
    const pwd2 = ref('')
    const $router = useRouter()
    const handleRegister = () => {
      UserApi.register(account.value, pwd1.value).then((res) => {
        if (res.code === 0) {
          ElMessage.success({
            type: 'success',
            message: '注册成功',
            onClose() {
              $router.back()
            },
          })
        } else {
          ElMessage.error({
            type: 'error',
            message: '注册失败',
          })
        }
      })
    }
    return {
      account,
      pwd1,
      pwd2,
      handleRegister,
    }
  },
})
</script>
