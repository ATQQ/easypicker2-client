import { computed, onMounted, ref } from 'vue'
import { useSiteConfig } from './form'
import { UserApi } from '@/apis'
import { formatSize } from '@/utils/stringUtil'

export function useSpaceUsage() {
  const { value: siteConfig } = useSiteConfig()
  // 实际使用空间
  const usage = ref(0)
  // 总空间
  const size = ref(0)
  const percentage = computed(() => `${(usage.value / size.value * 100).toFixed(2)}%`)
  const limitDownload = computed(() => siteConfig.value.limitSpace && size.value < usage.value)

  const spaceUsageText = computed(() => {
    return `已用空间 ${percentage.value}: ${formatSize(usage.value)} / ${formatSize(size.value)}`
  })

  const moneyUsageText = computed(() => {
    return `可用余额：2 ￥，累计费用 ，每月免费 2￥`
  })

  onMounted(() => {
    UserApi.usage().then((res) => {
      usage.value = res.data.usage
      size.value = res.data.size
    })
  })
  return {
    usage,
    size,
    percentage,
    limitDownload,
    spaceUsageText,
    moneyUsageText,
  }
}
