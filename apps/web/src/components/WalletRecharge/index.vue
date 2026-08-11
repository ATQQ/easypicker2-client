<script lang="ts" setup>
import { CopyDocument } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { PayApi, UserApi } from '@/apis'
import { useIsMobile } from '@/composables'

// eslint-disable-next-line unused-imports/no-unused-vars
const props = withDefaults(defineProps<{
  /** button: 主按钮；link: 文字链；none: 不渲染入口，由父级调 open() */
  variant?: 'button' | 'link' | 'none'
  buttonText?: string
  buttonSize?: 'small' | 'default' | 'large'
  buttonType?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'default'
}>(), {
  variant: 'button',
  buttonText: '充值',
  buttonSize: 'small',
  buttonType: 'primary',
})

const emit = defineEmits<{
  'success': [payload: { wallet: string, amount: string }]
  'update:enabled': [value: boolean]
}>()

const alipayStatus = reactive({
  enabled: false,
  minAmount: 1,
  maxAmount: 5000,
  dailyLimit: 20000,
  env: 'relay' as string,
  orderExpireMinutes: 30,
})

const enabled = computed(() => alipayStatus.enabled)

watch(enabled, (v) => {
  emit('update:enabled', v)
}, { immediate: true })

const rechargeAmount = ref<number | null>(null)
const rechargeSubmitting = ref(false)
const activeOutTradeNo = ref('')
const activeQrCode = ref('')
const activeAmount = ref('')
const qrDialogVisible = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

const rechargeDialogVisible = ref(false)
const RECHARGE_PRESETS = [5, 10, 50, 100]
const rechargePreset = ref<number | 'custom'>(5)
const rechargeCustomAmount = ref<number | null>(null)

const lastWallet = ref('0.00')

const qrImageUrl = computed(() => {
  if (!activeQrCode.value)
    return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(activeQrCode.value)}`
})

const isMobile = useIsMobile()

const isMobileUA = computed(() => {
  if (typeof navigator === 'undefined')
    return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|MicroMessenger|AlipayClient/i.test(navigator.userAgent)
})

async function copyPayLink() {
  const text = activeQrCode.value
  if (!text) {
    ElMessage.warning('暂无支付链接可复制')
    return
  }
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    }
    else {
      const input = document.createElement('textarea')
      input.value = text
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    ElMessage.success('支付链接已复制')
  }
  catch {
    ElMessage.error('复制失败，请手动选择文本进行复制')
  }
}

function openPayLink() {
  if (!activeQrCode.value) {
    ElMessage.warning('暂无支付链接')
    return
  }
  window.open(activeQrCode.value, '_blank', 'noopener,noreferrer')
}

function open() {
  if (!alipayStatus.enabled) {
    ElMessage.warning('支付宝支付未启用')
    return
  }
  rechargePreset.value = 5
  rechargeCustomAmount.value = null
  rechargeDialogVisible.value = true
}

async function confirmRecharge() {
  const amount
    = rechargePreset.value === 'custom'
      ? Number(rechargeCustomAmount.value)
      : Number(rechargePreset.value)
  rechargeAmount.value = amount
  const ok = await submitRecharge()
  if (ok)
    rechargeDialogVisible.value = false
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function fetchWallet(): Promise<string> {
  try {
    const res = await UserApi.usage()
    if (res?.data) {
      lastWallet.value = String(res.data.wallet ?? '0.00')
      return lastWallet.value
    }
  }
  catch { /* ignore */ }
  return lastWallet.value
}

async function loadAlipayStatus() {
  try {
    const res = await PayApi.getAlipayStatus()
    if (res?.data)
      Object.assign(alipayStatus, res.data)
  }
  catch { /* ignore */ }
}

async function onPaidSuccess(amount: string) {
  const walletBefore = lastWallet.value
  let wallet = await fetchWallet()
  if (wallet === walletBefore) {
    await new Promise(r => setTimeout(r, 800))
    wallet = await fetchWallet()
  }
  if (wallet === walletBefore) {
    await new Promise(r => setTimeout(r, 1500))
    wallet = await fetchWallet()
  }
  emit('success', { wallet, amount })
}

async function pollOrderStatus(outTradeNo: string, maxSeconds = 300) {
  stopPolling()
  activeOutTradeNo.value = outTradeNo
  const start = Date.now()

  const tick = async () => {
    if (!activeOutTradeNo.value)
      return
    if ((Date.now() - start) / 1000 > maxSeconds) {
      stopPolling()
      ElMessage.warning('支付确认超时，请手动刷新查看订单状态')
      return
    }
    try {
      const res = await PayApi.getAlipayOrder(outTradeNo)
      const status = res?.data?.status
      if (status === 'paid') {
        stopPolling()
        qrDialogVisible.value = false
        activeQrCode.value = ''
        activeOutTradeNo.value = ''
        ElMessage.success(`充值成功 ￥${res.data.amount}`)
        await onPaidSuccess(String(res.data.amount))
      }
      else if (status === 'closed') {
        stopPolling()
        qrDialogVisible.value = false
        activeQrCode.value = ''
        activeOutTradeNo.value = ''
        ElMessage.warning('订单已关闭')
      }
    }
    catch { /* ignore */ }
  }

  await tick()
  if (activeOutTradeNo.value && qrDialogVisible.value)
    pollTimer = setInterval(tick, 1000)
}

function closeQrDialog() {
  qrDialogVisible.value = false
  stopPolling()
  activeQrCode.value = ''
  activeOutTradeNo.value = ''
}

async function submitRecharge(): Promise<boolean> {
  if (!alipayStatus.enabled) {
    ElMessage.warning('支付宝支付未启用')
    return false
  }
  const amount = Number(rechargeAmount.value)
  if (!Number.isFinite(amount) || amount <= 0) {
    ElMessage.warning('请输入正确的充值金额')
    return false
  }
  if (amount < alipayStatus.minAmount) {
    ElMessage.warning(`单笔充值金额需 ≥ ${alipayStatus.minAmount} 元`)
    return false
  }
  if (amount > alipayStatus.maxAmount) {
    ElMessage.warning(`单笔充值金额需 ≤ ${alipayStatus.maxAmount} 元`)
    return false
  }
  try {
    await ElMessageBox.confirm(
      `确认充值 ￥${amount.toFixed(2)} 到账户余额？下一步将展示支付宝收款二维码。`,
      '充值确认',
      { type: 'info', confirmButtonText: '生成二维码', cancelButtonText: '取消' },
    )
  }
  catch {
    return false
  }
  rechargeSubmitting.value = true
  try {
    const res = await PayApi.createAlipayOrder(amount, 'EasyPicker 钱包充值')
    if (res?.data?.qrCode) {
      activeQrCode.value = res.data.qrCode
      activeAmount.value = res.data.amount
      qrDialogVisible.value = true
      pollOrderStatus(res.data.outTradeNo)
      if (isMobileUA.value) {
        window.open(res.data.qrCode, '_blank', 'noopener,noreferrer')
        ElMessage.info('已尝试唤起支付宝，若未打开可点击「打开支付链接」')
      }
      return true
    }
    ElMessage.error(res?.msg || '创建订单失败')
    return false
  }
  catch (err: any) {
    ElMessage.error(err?.msg || err?.message || '创建订单失败')
    return false
  }
  finally {
    rechargeSubmitting.value = false
  }
}

onMounted(() => {
  loadAlipayStatus()
  fetchWallet()
})

onUnmounted(() => {
  stopPolling()
})

defineExpose({
  open,
  enabled,
})
</script>

<template>
  <template v-if="enabled">
    <el-button
      v-if="variant === 'button'"
      :type="buttonType"
      :size="buttonSize"
      @click="open"
    >
      {{ buttonText }}
    </el-button>
    <button
      v-else-if="variant === 'link'"
      class="wallet-recharge-link"
      type="button"
      @click="open"
    >
      {{ buttonText }}
    </button>
  </template>

  <el-dialog
    v-model="rechargeDialogVisible"
    title="钱包充值"
    width="440px"
    align-center
    destroy-on-close
    :fullscreen="isMobile"
  >
    <div class="recharge-dialog">
      <p class="recharge-dialog__tip">
        通过支付宝充值到账户余额，单笔 ￥{{ alipayStatus.minAmount }} ~ ￥{{ alipayStatus.maxAmount }}
      </p>
      <div class="recharge-presets">
        <div
          v-for="value in RECHARGE_PRESETS"
          :key="value"
          class="recharge-preset"
          :class="{ active: rechargePreset === value }"
          @click="rechargePreset = value"
        >
          ￥{{ value }}
        </div>
        <div
          class="recharge-preset"
          :class="{ active: rechargePreset === 'custom' }"
          @click="rechargePreset = 'custom'"
        >
          自定义
        </div>
      </div>
      <el-input-number
        v-if="rechargePreset === 'custom'"
        v-model="rechargeCustomAmount"
        :min="alipayStatus.minAmount"
        :max="alipayStatus.maxAmount"
        :precision="2"
        :step="10"
        placeholder="请输入充值金额"
        style="width: 100%; margin-top: 12px;"
      />
    </div>
    <template #footer>
      <el-button @click="rechargeDialogVisible = false">
        取消
      </el-button>
      <el-button
        type="primary"
        :loading="rechargeSubmitting"
        @click="confirmRecharge"
      >
        支付宝支付
      </el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="qrDialogVisible"
    title="支付宝扫码支付"
    width="360px"
    align-center
    :close-on-click-modal="false"
    :before-close="closeQrDialog"
    :fullscreen="isMobile"
  >
    <div class="qr-dialog">
      <p class="qr-dialog__amount">
        充值金额 <strong>￥{{ activeAmount }}</strong>
      </p>
      <div class="qr-dialog__image">
        <img
          v-if="qrImageUrl"
          :src="qrImageUrl"
          alt="支付宝收款二维码"
        >
      </div>
      <p class="qr-dialog__tip">
        请使用支付宝 App 扫描二维码完成支付
      </p>
      <div class="qr-dialog__link">
        <el-button
          type="primary"
          link
          class="qr-dialog__link-btn"
          @click="openPayLink"
        >
          打开支付链接
        </el-button>
        <el-tooltip content="复制支付链接" placement="top">
          <el-button
            :icon="CopyDocument"
            circle
            size="small"
            @click="copyPayLink"
          />
        </el-tooltip>
      </div>
      <p class="qr-dialog__tip qr-dialog__tip--muted">
        订单号：{{ activeOutTradeNo }}
      </p>
      <el-tag v-if="alipayStatus.env === 'sandbox'" type="warning" size="small">
        沙箱模式
      </el-tag>
    </div>
    <template #footer>
      <el-button @click="closeQrDialog">
        关闭
      </el-button>
      <el-button plain @click="fetchWallet">
        刷新余额
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
.wallet-recharge-link {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #409eff;
  font-size: inherit;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.recharge-dialog {
  &__tip {
    margin: 0 0 12px;
    color: #909399;
    font-size: 13px;
  }
}

.qr-dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 4px 0 8px;
  text-align: center;

  &__amount {
    margin: 0;
    color: #606266;
    font-size: 14px;

    strong {
      color: #f56c6c;
      font-size: 20px;
      margin-left: 4px;
    }
  }

  &__image {
    width: 240px;
    height: 240px;
    padding: 8px;
    box-sizing: border-box;
    border: 1px solid #ebeef5;
    border-radius: 6px;
    background-color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  &__tip {
    margin: 0;
    color: #303133;
    font-size: 14px;

    &--muted {
      color: #909399;
      font-size: 12px;
      word-break: break-all;
    }
  }

  &__link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    max-width: 100%;
  }

  &__link-btn {
    max-width: 220px;
    padding: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}

.recharge-presets {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.recharge-preset {
  padding: 12px 0;
  text-align: center;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  color: #303133;
  font-size: 15px;
  cursor: pointer;
  user-select: none;
  transition:
    border-color 0.2s,
    color 0.2s,
    background-color 0.2s;

  &:hover {
    border-color: #409eff;
    color: #409eff;
  }

  &.active {
    border-color: #409eff;
    color: #409eff;
    background-color: #ecf5ff;
  }
}
</style>
