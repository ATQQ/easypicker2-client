import { UserApi } from "@/apis";
import { formatSize } from "@/utils/stringUtil";
import { computed, onMounted, ref } from "vue";

export function useSpaceUsage() {
    // 实际使用空间
    const usage = ref(0)
    // 总空间
    const size = ref(-1)
    const percentage = computed(() => `${(usage.value / size.value * 100).toFixed(2)}%`)
    const limitDownload = computed(() => size.value < usage.value)

    const spaceUsageText = computed(() => {
        return `已用空间 ${percentage.value}: ${formatSize(usage.value)} / ${formatSize(size.value)}`
    })

    onMounted(()=>{
        UserApi.usage().then(res=>{
            usage.value = res.data.usage
            size.value = res.data.size
        })
    })
    return {
        usage,
        size,
        percentage,
        limitDownload,
        spaceUsageText
    }
}