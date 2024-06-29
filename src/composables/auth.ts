import { onMounted } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { SuperOverviewApi } from '@/apis'

export function useSupportRegister() {
  const supportRegister = useLocalStorage('supportRegister', true)
  // 检查注册功能是否禁用
  onMounted(() => {
    SuperOverviewApi.checkDisabledRoute('/register').then((v) => {
      supportRegister.value = !v.data.status
    })
  })
  return supportRegister
}
