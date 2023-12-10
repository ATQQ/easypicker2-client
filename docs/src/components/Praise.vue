<template>
  <span class="praise">
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
              hide-on-click-modal
              preview-teleported
              style="width: 200px; height: 200px"
              :src="v.url"
              :preview-src-list="praiseImg.map((v) => v.url)"
              :initial-index="idx"
              fit="cover"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </span>
</template>
<script setup lang="ts">
import { ElImage } from 'element-plus'
import { reactive } from 'vue'

const praiseImg = reactive([
  {
    url: 'https://img.cdn.sugarat.top/mdImg/MTY1MTU0NzQ0MjMzNA==651547442334',
    title: '微信'
  },
  {
    url: 'https://img.cdn.sugarat.top/mdImg/MTY0Nzc1NTYyOTE5Mw==647755629193',
    title: '微信赞赏'
  },
  {
    url: 'https://img.cdn.sugarat.top/mdImg/MTY1MTU0NzQyOTg0OA==651547429848',
    title: '支付宝'
  }
])
</script>
<style scoped>
.praise {
  cursor: pointer;
}

.praise-line {
  margin-bottom: 10px;
}
</style>
