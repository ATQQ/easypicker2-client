<template>
  <div class="wish">
    <!-- 顶部导航栏 -->
    <header>
      <HomeHeader />
    </header>
    <h1 class="title">需求墙</h1>
    <p class="des">通过投票决定下一个新功能是什么</p>
    <p class="des">票数越多优先级越高</p>
    <p class="des">当然你也可以提出你的需求，让大家来投票</p>
    <div class="tip-wrap">
      <p v-if="isLogin" class="des">
        Go Go Go!
        <strong @click="handleOpenFeature" class="feature-btn">我要提需求</strong>
      </p>
      <p v-else class="des">
        提需求&投票，请先
        <strong>
          <router-link to="/login">登录</router-link>
        </strong>
      </p>
    </div>

    <el-dialog title="需求信息" v-model="dialogVisible" :fullscreen="isMobile">
      <el-form :model="formData">
        <el-form-item label="需求" :label-width="formLabelWidth">
          <el-input placeholder="一句简单明了的话概括一下" v-model="formData.title"></el-input>
        </el-form-item>
        <el-form-item label="详细描述" :label-width="formLabelWidth">
          <el-input placeholder="用朴素的话语进一步描述你的需求" type="textarea" v-model="formData.des"></el-input>
        </el-form-item>
        <el-form-item label="联系方式" :label-width="formLabelWidth">
          <el-input placeholder="邮箱，QQ，微信等任意方式均可" v-model="formData.contact"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取 消</el-button>
          <el-button type="primary" @click="handleAddFeature">确 定</el-button>
        </span>
      </template>
    </el-dialog>
    <footer>
      <!-- 底部导航栏 -->
      <HomeFooter />
    </footer>
  </div>
</template>
<script lang="ts" setup>
import {
  ref, onMounted, computed, reactive,
} from 'vue'
import HomeHeader from '@components/HomeHeader/index.vue'
import HomeFooter from '@components/HomeFooter/index.vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import { WishApi } from '@/apis'

const $store = useStore()
const isLogin = computed(() => $store.state.user.isLogin)
const isMobile = computed(() => $store.getters['public/isMobile'])

const formLabelWidth = '80px'
const dialogVisible = ref(false)
const formData = reactive({
  title: '',
  des: '',
  contact: '',
})
const handleOpenFeature = () => {
  dialogVisible.value = true
}

const vaildFormData = () => {
  if (formData.title.length === 0) {
    ElMessage.error('需求标题不能为空')
    return false
  }
  if (formData.des.length === 0) {
    ElMessage.error('需求详细描述，不能为空')
    return false
  }
  return true
}
const handleAddFeature = () => {
  // 信息校验
  if (!vaildFormData()) {
    return
  }
  dialogVisible.value = false
  // 提交信息
  WishApi.addWish(formData).then((res) => {
    ElMessage.success('提交成功，感谢你的反馈（需求进入审核阶段）')
  })
  // 初始化 表单内容
  formData.title = ''
  formData.des = ''
  formData.contact = ''
}

onMounted(() => {
  $store.dispatch('user/getLoginStatus')
})
</script>

<style lang="scss" scoped>
header {
  display: block;
  overflow: hidden;
}
.wish {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  background-image: linear-gradient(to top, #30cfd0 0%, #330867 100%);
  min-height: 100vh;
}
.title {
  color: aliceblue;
  text-align: center;
  font-weight: lighter;
  font-size: 48px;
  padding-top: 5vh;
}
.des {
  color: aliceblue;
  text-align: center;
  font-weight: lighter;
  font-size: 16px;
  padding: 0 10px 10px 10px;
  a {
    color: aliceblue;
  }
}
.feature-btn {
  cursor: pointer;
}
footer {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
}
</style>
