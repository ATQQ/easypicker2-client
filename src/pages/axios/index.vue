<template>
    <div>
        <h1>Axios Page</h1>
        <input type="number" v-model="phone">
        <button @click="getCode">获取验证码</button>
    </div>
</template>
<script lang="ts">
import { AxiosInstance } from 'axios'
import { defineComponent, ref, inject } from 'vue'
import { publicApi } from '../../apis'

export default defineComponent({
  setup() {
    const phone = ref('12345678901')
    const $http = inject<AxiosInstance>('$http')

    const getCode = () => {
      publicApi.getCode(phone.value).then((v) => {
        console.log(v)
      })
    }
    return {
      phone,
      getCode,
    }
  },
})
</script>
