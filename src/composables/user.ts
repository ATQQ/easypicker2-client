import { computed, onMounted, reactive, ref } from 'vue'
import { UserApi } from '@/apis'
import { formatSize } from '@/utils/stringUtil'

export function useSpaceUsage() {
  const usageData = reactive({
    size: 0,
    usage: 0,
    limitUpload: false,
    wallet: '0:00',
    cost: '0.00',
    limitSpace: false,
    limitWallet: false,
    price: {
      storage: '0:00',
      download: '0:00',
    },
  })
  const usage = computed(() => usageData.usage)
  const size = computed(() => usageData.size)
  const percentage = computed(() => `${(usageData.usage / usageData.size * 100).toFixed(2)}%`)
  const walletPercentage = computed(() => `${(+usageData.cost / +usageData.wallet * 100).toFixed(2)}%`)
  const limitDownload = computed(() => usageData.limitUpload)
  const limitSpace = computed(() => usageData.limitSpace)
  const limitWallet = computed(() => usageData.limitWallet)
  const spaceUsageText = computed(() => {
    return `空间 ${percentage.value}: ${formatSize(usageData.usage)} / ${formatSize(usageData.size)}`
  })
  const moneyUsageText = computed(() => {
    return `钱包 ${walletPercentage.value}: ${usageData.cost} / ${usageData.wallet}￥`
  })
  const priceText = computed(() => {
    return `存储 ${usageData.price.storage}￥ + 下载 ${usageData.price.download}￥`
  })

  onMounted(() => {
    UserApi.usage().then((res) => {
      Object.assign(usageData, res.data)
    })
  })
  return {
    usage,
    size,
    percentage,
    limitDownload,
    limitSpace,
    limitWallet,
    spaceUsageText,
    moneyUsageText,
    priceText,
  }
}
