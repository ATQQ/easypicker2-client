<script lang="ts" setup>
import type { AlipayOrder } from '@/apis/modules/pay'
import { ElMessage } from 'element-plus'
import { ref } from 'vue'
import { PayApi } from '@/apis'
import { useIsMobile } from '@/composables'
import { formatDate } from '@/utils/stringUtil'

const visible = ref(false)
const loading = ref(false)
const list = ref<AlipayOrder[]>([])
const isMobile = useIsMobile()

const STATUS_MAP: Record<AlipayOrder['status'], { label: string, type: 'info' | 'success' | 'warning' | 'danger' }> = {
  pending: { label: '待支付', type: 'warning' },
  paid: { label: '已支付', type: 'success' },
  closed: { label: '已关闭', type: 'info' },
  refunded: { label: '已退款', type: 'danger' },
}

function statusMeta(status: AlipayOrder['status']) {
  return STATUS_MAP[status] || { label: status, type: 'info' as const }
}

function formatTime(value: string | null | undefined) {
  if (!value)
    return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime()))
    return '-'
  return formatDate(d)
}

async function loadOrders() {
  loading.value = true
  try {
    const res = await PayApi.getAlipayOrders()
    list.value = res?.data?.list || []
  }
  catch (err: any) {
    list.value = []
    ElMessage.error(err?.msg || err?.message || '加载订单失败')
  }
  finally {
    loading.value = false
  }
}

function open() {
  visible.value = true
  loadOrders()
}

defineExpose({ open })
</script>

<template>
  <el-dialog
    v-model="visible"
    title="充值历史订单"
    width="760px"
    align-center
    destroy-on-close
    :fullscreen="isMobile"
  >
    <el-table
      v-loading="loading"
      :data="list"
      stripe
      empty-text="暂无充值订单"
      max-height="480"
      style="width: 100%"
    >
      <el-table-column label="创建时间" min-width="160">
        <template #default="{ row }">
          {{ formatTime(row.createTime) }}
        </template>
      </el-table-column>
      <el-table-column label="金额" width="100">
        <template #default="{ row }">
          ￥{{ row.amount }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusMeta(row.status).type" size="small">
            {{ statusMeta(row.status).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="outTradeNo" label="订单号" min-width="180" show-overflow-tooltip />
      <el-table-column label="支付宝交易号" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.tradeNo || '-' }}
        </template>
      </el-table-column>
      <el-table-column label="支付时间" min-width="160">
        <template #default="{ row }">
          {{ formatTime(row.paidTime) }}
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="visible = false">
        关闭
      </el-button>
      <el-button type="primary" :loading="loading" @click="loadOrders">
        刷新
      </el-button>
    </template>
  </el-dialog>
</template>
