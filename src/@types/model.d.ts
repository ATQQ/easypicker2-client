interface TaskInfo{
    template?:string
    rewrite?:number
    format?:number
    info?:string
    share?:string
    ddl?:string
    people?:number
}

declare namespace qiniu {
    interface Subscription {
        close(): void
    }

    interface SubscriptionConfig {
        next(res: any): void,
        error(err:any): void,
        complete(res:any): void
    }
    interface Observable {
        subscribe(cf: SubscriptionConfig): Subscription
    }

    type upload = (file: File, key: string, token: string) => Observable
    const upload: upload
}
