export enum WishStatus {
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
export interface Wish {
  id: string
  /**
   * 需求标题
   */
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
