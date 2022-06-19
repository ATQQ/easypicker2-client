interface BaseResponse<T = any> {
    code: number,
    errMsg: string,
    data: T
}

type ResponseData<T = any> = Promise<BaseResponse<T>>

declare namespace WishApiTypes {
    enum WishStatus {
        /**
         * 审核中
         */
        REVIEW,
        /**
         * 待开始
         */
        WAIT,
        /**
         * 开发中
         */
        START,
        /**
         * 已上线
         */
        END,
        /**
         * 关闭
         */
        CLOSE
    }
    interface Wish {
        id: string
        userId: number
        title: string
        /**
         * 详细描述
         */
        des: string
        /**
         * 联系方式
         */
        contact?: string
        /**
         * 当前进度
         */
        status: WishStatus
        startDate: Date
        endDate: Date
    }
    type addWish = ResponseData
}
