<script lang="ts" setup>
import {
  computed,
  onMounted,
  reactive,
  ref,
} from 'vue'
import HomeHeader from '@components/HomeHeader/index.vue'
import HomeFooter from '@components/HomeFooter/index.vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import { WishApi } from '@/apis'
import { useIsMobile } from '@/composables'

const $store = useStore()
const isLogin = computed(() => $store.state.user.isLogin)

const isMobile = useIsMobile()

const formLabelWidth = '80px'
const dialogVisible = ref(false)
const formData = reactive({
  title: '',
  des: '',
  contact: '',
})
function handleOpenFeature() {
  dialogVisible.value = true
}

function vaildFormData() {
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
function handleAddFeature() {
  // 信息校验
  if (!vaildFormData()) {
    return
  }
  dialogVisible.value = false
  // 提交信息
  WishApi.addWish(formData).then(() => {
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

<template>
  <div class="wish">
    <!-- 顶部导航栏 -->
    <header>
      <HomeHeader />
    </header>
    <main>
      <h1 class="title">
        需求墙
      </h1>
      <p class="des">
        通过投票决定下一个新功能是什么
      </p>
      <p class="des">
        票数越多优先级越高
      </p>
      <p class="des">
        当然你也可以提出你的需求，让大家来投票
      </p>
      <div class="tip-wrap">
        <p v-if="isLogin" class="des">
          Go Go Go!
          <strong class="feature-btn" @click="handleOpenFeature">我要提需求</strong>
        </p>
        <p v-else class="des">
          提需求&投票，请先
          <strong>
            <router-link to="/login">登录</router-link>
          </strong>
        </p>
        <br>
        <p class="des">
          目前需求面板还未开发完成，
        </p>
        <p class="des">
          可先直接加群进行反馈
        </p>
        <p style="text-align: center;">
          <img style="width: 290px;" src="https://img.cdn.sugarat.top/mdImg/MTY0OTkwMDk2MzQ3OQ==649900963479" alt="QQ群">
        </p>
      </div>
    </main>

    <el-dialog v-model="dialogVisible" title="需求信息" :fullscreen="isMobile">
      <el-form :model="formData">
        <el-form-item label="需求" :label-width="formLabelWidth">
          <el-input v-model="formData.title" placeholder="一句简单明了的话概括一下" />
        </el-form-item>
        <el-form-item label="详细描述" :label-width="formLabelWidth">
          <el-input v-model="formData.des" placeholder="用朴素的话语进一步描述你的需求" type="textarea" />
        </el-form-item>
        <el-form-item label="联系方式" :label-width="formLabelWidth">
          <el-input v-model="formData.contact" placeholder="邮箱，QQ，微信等任意方式均可" />
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

<style lang="scss" scoped>
header {
  display: block;
  overflow: hidden;
}

.wish {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  background-image: linear-gradient(to top, #30cfd0 0%, #330867 100%);
  min-height: 100vh;
  main {
    min-height: 70vh;
  }
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
</style>
