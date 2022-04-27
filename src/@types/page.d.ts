interface DownloadItem {
    url: string,
    filename: string,
    mimeType: string,
    status: 'ready' | 'downloading' | 'done' | 'error',
    percentage: number,
    size: number,
}

interface InfoItem {
    type?: 'input' | 'radio' | 'text' | string,
    // 描述信息
    text?: string,
    // 表单项的值
    value?: string,
    children?: InfoItem[]
}
