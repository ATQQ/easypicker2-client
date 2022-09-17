interface DownloadItem {
  url: string
  filename: string
  mimeType: string
  status: 'ready' | 'downloading' | 'done' | 'error'
  percentage: number
  size: number
}

type InfoItemType = 'input' | 'radio' | 'text' | 'select'
interface InfoItem {
  type?: InfoItemType
  // 描述信息
  text?: string
  // 表单项的值
  value?: string
  children?: InfoItem[]
}
