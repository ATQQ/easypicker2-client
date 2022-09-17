<template>
  <div class="wish-panel" v-show="data.length">
    <div class="tips">
      <div>
        <i class="circle"></i>
        <span>规划中</span>
      </div>
      <div>
        <i class="circle start"></i>
        <span>开发中</span>
      </div>
      <div>
        <i class="circle end"></i>
        <span>已上线</span>
      </div>
    </div>
    <ul>
      <li v-for="d in showData" :key="d.id">
        <hr />
        <div class="wish">
          <div class="content">
            <div class="title">
              <i class="circle" :class="d.status" />
              <span>{{ d.title }}</span>
            </div>
            <div class="des">
              <span>{{ d.des }}</span>
            </div>
          </div>
          <el-button type="primary" @click="praise(d.id, d.alreadyPraise)">
            <el-icon>
              <Flag />
            </el-icon>
            {{ d.count }}票
          </el-button>
        </div>
      </li>
    </ul>
  </div>
</template>
<script lang="ts" setup>
import { computed, onMounted, reactive } from 'vue'
import { ElButton, ElIcon, ElMessage } from 'element-plus'
import { Flag } from '@element-plus/icons-vue'
import { WishStatus } from '@/constants'
import { WishApi } from '../apis'

const data = reactive<WishApiTypes.DocsWishItem[]>([])

const showData = computed(() =>
  data.map((v) => ({
    ...v,
    status: WishStatus[v.status].toLowerCase()
  }))
)

const praise = (id: string, alreadyPraise: boolean) => {
  if (alreadyPraise) {
    ElMessage.error('你已经投过票了')
    return
  }
  const wish = data.find((v) => v.id === id)!
  wish.alreadyPraise = true
  WishApi.praiseWish(id)
    .then(() => {
      ElMessage.success('投票成功')
      wish.count += 1
    })
    .catch(() => {
      ElMessage.error('你已经投过票了')
    })
}

onMounted(() => {
  WishApi.getDocsWish().then((res) => {
    data.push(...res.data)
  })
})
</script>
<style lang="scss" scoped>
.wish-panel {
  ul {
    list-style: none;
  }

  .wish {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 40px;

    .content {
      display: flex;
      flex-direction: column;
      max-width: 70%;

      .title {
        display: flex;
        align-items: center;
      }

      .des {
        margin-top: 5px;
        font-size: 14px;
        color: #999;
      }
    }
  }

  .circle {
    display: inline-block;
    background-color: #f5222d;
    min-width: 10px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 10px;

    &.end {
      background-color: #52c41a;
    }

    &.start {
      background-color: #1890ff;
    }
  }

  .tips {
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    margin-top: 10px;
  }
}
</style>
