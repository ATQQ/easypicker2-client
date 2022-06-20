<template>
  <div class="user">
    <div class="panel">
      <div class="p10 log-filter">
        <span class="item">
          <span class="label">状态</span>
          <el-select v-model="filterLogType" size="default" placeholder="请选择筛选状态">
            <el-option label="全部" :value="-1"></el-option>
            <el-option v-for="(item, idx) in logTypeList" :key="idx" :label="item.label" :value="item.type"></el-option>
          </el-select>
        </span>
        <span class="item">
          <el-input size="default" clearable placeholder="请输入要检索的内容" :prefix-icon="Search" v-model="searchWord">
          </el-input>
        </span>
      </div>
      <el-table height="550" stripe border :default-sort="{ prop: 'date', order: 'descending' }" :data="pageWishes"
        style="width: 100%">
        <el-table-column sortable prop="createDate" label="提交时间" width="190">
          <template #default="scope">{{ scope.row.createDate && formatDate(new Date(scope.row.createDate)) }}</template>
        </el-table-column>
        <el-table-column prop="title" label="标题" width="120"></el-table-column>
        <el-table-column prop="des" label="详细描述"></el-table-column>
        <el-table-column prop="contact" label="联系方式"></el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            {{ logTypeList.find(v => v.type === scope.row.status).label }}
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="操作" width="100">
          <template #default="scope">
            <div class="text-btn-list">
              <el-button @click="handleChangeStatus(scope.row.id, scope.row.status)" type="text" size="small">修改状态
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="flex fc p10">
        <el-pagination :current-page="pageCurrent" @current-change="handlePageChange" background :page-count="pageCount"
          :page-sizes="[10, 50, 100, 200]" :page-size="pageSize" @size-change="handleSizeChange"
          :total="filterWishes.length" layout="total, sizes, prev, pager, next, jumper"></el-pagination>
      </div>
    </div>
    <!-- 状态修改弹窗 -->
    <el-dialog :fullscreen="isMobile" center title="状态修改" v-model="showWishStatusDialog">
      <div class="tc">
        <el-select v-model="selectStatus" placeholder="请选择新状态">
          <el-option v-for="s in wishStatusList" :key="s.type" :label="s.label" :value="s.type"></el-option>
        </el-select>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showWishStatusDialog = false">取 消</el-button>
          <el-button type="primary" @click="handleSaveStatus">确 定</el-button>
        </span>
      </template>
    </el-dialog>

  </div>
</template>
<script lang="ts" setup>
import { ElMessage } from 'element-plus'
import {
  computed, onMounted, reactive, ref,
} from 'vue'
import { useStore } from 'vuex'
import { Search } from '@element-plus/icons-vue'
import { WishApi } from '@/apis'
import { formatDate } from '@/utils/stringUtil'
import { WishStatus } from '@/constants'

const $store = useStore()
const wishes = reactive<WishApiTypes.WishItem[]>([])
const refreshWishes = () => {
  WishApi.findAllWish().then((v) => {
    wishes.splice(0, wishes.length, ...v.data)
  })
}

// 筛选状态
const filterLogType = ref(-1)
const searchWord = ref('')
const logTypeList = reactive([
  {
    label: '待审核',
    type: WishStatus.REVIEW,
  },
  {
    label: '待开始',
    type: WishStatus.WAIT,
  },
  {
    label: '关闭',
    type: WishStatus.CLOSE,
  },
  {
    label: '已上线',
    type: WishStatus.END,
  },
  {
    label: '开发中',
    type: WishStatus.START,
  },
])

const filterWishes = computed(() => wishes
  .filter((v) => v.status === filterLogType.value || filterLogType.value === -1)
  .filter((v) => {
    const {
      createDate, title, des, contact,
    } = v
    if (searchWord.value.length === 0) return true
    return `${formatDate(new Date(createDate))} ${title} ${des} ${contact}`.includes(searchWord.value)
  }))

// 分页
const pageSize = ref(10)
const handleSizeChange = (v: number) => {
  pageSize.value = v
}
const pageCount = computed(() => {
  const t = Math.ceil(filterWishes.value.length / pageSize.value)
  return t
})
const pageCurrent = ref(1)
const pageWishes = computed(() => {
  const start = (pageCurrent.value - 1) * pageSize.value
  const end = (pageCurrent.value) * pageSize.value
  return filterWishes.value.slice(start, end)
})
const handlePageChange = (idx: number) => {
  pageCurrent.value = idx
}

// 状态修改
const showWishStatusDialog = ref(false)
const selectWishId = ref('')
const selectStatus = ref(WishStatus.REVIEW)
const wishStatusList = logTypeList
const handleChangeStatus = (wishId: string, status: WishStatus) => {
  selectWishId.value = wishId
  selectStatus.value = status
  showWishStatusDialog.value = true
}
const handleSaveStatus = () => {
  const wish = wishes.find((v) => v.id === selectWishId.value)
  wish.status = selectStatus.value
  showWishStatusDialog.value = false
  WishApi.updateWishStatus(selectWishId.value, selectStatus.value)
  ElMessage.success('修改成功')
}

onMounted(() => {
  refreshWishes()
})
const isMobile = computed(() => $store.getters['public/isMobile'])

</script>

<style scoped lang="scss">
@media screen and (max-width: 700px) {
  .user {
    margin-top: 40px !important;
  }

  .log-filter {
    justify-content: center;
  }
}

.user {
  margin: 0 auto;
}

.panel {
  max-width: 1256px;
  padding: 1em;
  background-color: #fff;
  margin: 10px auto;
  box-sizing: border-box;
  box-shadow: 0 2px 12px 0 rgb(0 0 0 / 10%);
  border-radius: 4px;
}

.log-filter {
  display: flex;
  flex-wrap: wrap;

  .item {
    margin-right: 10px;
    margin-bottom: 10px;

    .label {
      margin-right: 10px;
      font-size: 12px;
    }
  }
}

.text-btn-list {
  display: flex;
  flex-wrap: wrap;

  button {
    margin-left: 0;
  }
}
</style>
