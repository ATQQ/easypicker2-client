interface DownloadItem{
    url:string,
    filename:string,
    mimeType:string,
    status:'ready'|'downloading'|'done'|'error',
    percentage:number,
    size: number,
}
