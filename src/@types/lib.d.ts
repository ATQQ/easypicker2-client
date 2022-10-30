// 第三方库的类型定义
declare namespace qiniu {
  interface Subscription {
    unsubscribe(): void
  }

  interface SubscriptionConfig {
    next(res: any): void
    error(err: any): void
    complete(res: any): void
  }
  interface Observable {
    subscribe(cf: SubscriptionConfig): Subscription
  }

  type upload = (file: File, key: string, token: string) => Observable
  const upload: upload
}

declare namespace XLSX {
  interface utils {
    table_to_book: (dom: HTMLElement) => any
  }
  const utils: utils
  const writeFile: (wb: any, filename: string) => void
}
