/**
 * 用户状态
 */
export enum USER_STATUS {
  /**
   * 正常
   */
  NORMAL,
  /**
   * 冻结
   */
  FREEZE,
  /**
   * 封禁
   */
  BAN
}

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

export enum ActionType {
  /**
   * 点赞
   */
  PRAISE,

  /**
   * 文件下载
   */
  Download,

  /**
   * 文件归档
   */
  Compress,

  /**
   * 路由禁用
   */
  DisabledRoute
}

export enum DownloadStatus {
  /**
   * 归档中
   */
  ARCHIVE,
  /**
   * 链接已失效
   */
  EXPIRED,
  /**
   * 可下载
   */
  SUCCESS,
  /**
   * 归档失败
   */
  FAIL
}

export const filenamePattern = /[\\/:*?"<>|]/g
