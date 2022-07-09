<template>
    <div  class="not-found">
        <h1>404 Not Found</h1>
        <h2>
          糟糕页面走丢了
        </h2>
        <h3>
          {{time}}s后<a @click="handleToHome">回到首页</a>
        </h3>
    </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const time = ref(3)
const timer = ref(null)
const router = useRouter()
const handleToHome = () => {
  clearInterval(timer.value)
  router.replace('/')
}
onMounted(() => {
  timer.value = setInterval(() => {
    if (time.value === 1) {
      clearInterval(timer.value)
      router.replace('/')
    }
    time.value -= 1
  }, 1000)
})
</script>
<style lang="scss" scoped>
.not-found {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  background-image: linear-gradient(to top, #30cfd0 0%, #330867 100%);
  min-height: 100vh;
}
h1,h2,h3,a {
  color: aliceblue;
  text-align: center;
  font-weight: lighter;
}
a{
  margin-left: 10px;
  border-bottom: 2px solid aliceblue;
}
h1{
  font-size: 48px;
  padding-top: 10%;
}
h2{
  font-size: 30px;
  padding-top: 2vh;
}
h3{
  font-size: 28px;
  padding-top: 1vh;
}
</style>
