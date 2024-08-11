<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { reactive, ref } from 'vue'
import { useIsMobile } from '@/composables'

const showPraise = ref(false)
function openPraise() {
  showPraise.value = true
}

const praiseImg = reactive([
  {
    url: 'https://img.cdn.sugarat.top/mdImg/MTY1MTU0NzQ0MjMzNA==651547442334',
    title: '微信',
  },
  {
    url: 'https://img.cdn.sugarat.top/mdImg/MTY0Nzc1NTYyOTE5Mw==647755629193',
    title: '微信赞赏',
  },
  {
    url: 'https://img.cdn.sugarat.top/mdImg/MTY1MTU0NzQyOTg0OA==651547429848',
    title: '支付宝',
  },
])
function Thanks() {
  ElMessageBox.alert(
    `
  <p class="tc">
    <img width="140px" src="https://img.cdn.sugarat.top/mdImg/MTY1MTUwNjkwNDc4OQ==thanks.gif" />
  </p>
  <p class="tc">
    <img width="240px" src="https://img.cdn.sugarat.top/mdImg/MTY0Nzc2MDE3MzM1NA==647760173354" />
  </p>
  `,
    '💐 谢谢老板 💐',
    {
      confirmButtonText: '不客气',
      dangerouslyUseHTMLString: true,
    },
  )
}
function NextPraise() {
  showPraise.value = false
  ElMessage.success('下次一定！下次一定！')
}
const isMobile = useIsMobile()
</script>

<template>
  <span class="praise" @click="openPraise">
    <!-- 赞赏弹窗 -->
    <slot />
    <el-dialog
      v-model="showPraise"
      append-to-body
      title="😄 嘻嘻 😄"
      :fullscreen="isMobile"
    >
      <p class="praise-line">
        目前的服务开销主要在 “文件存储” 与 "资源下载"两方面
      </p>
      <p class="praise-line">存储 0.15 元/GB/月，下载0.29 元/GB</p>
      <p class="praise-line">如果你觉得应用不错，可以支持一下👍🏻</p>
      <div>
        <table>
          <thead>
            <tr>
              <th v-for="(v, idx) in praiseImg" :key="idx">{{ v.title }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td v-for="(v, idx) in praiseImg" :key="idx">
                <el-image
                  preview-teleported
                  style="width: 100px; height: 100px"
                  :src="v.url"
                  :preview-src-list="praiseImg.map((v) => v.url)"
                  :initial-index="idx"
                  fit="cover"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="success" @click="Thanks">这次一定</el-button>
          <el-button type="default" @click="NextPraise">下次一定</el-button>
        </span>
      </template>
    </el-dialog>
  </span>
</template>

<style scoped>
.praise {
  cursor: pointer;
}
.praise-line {
  margin-bottom: 10px;
}

table {
  display: block;
  border-collapse: collapse;
  margin: 1rem 0;
  overflow-x: auto;
}
tr {
  border: 1px solid #dfe2e5;
}
th,
td {
  border: 1px solid #8885;
  padding: 0.6em 1em;
}
</style>
