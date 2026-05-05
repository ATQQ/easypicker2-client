declare module 'node-persist' {
  export interface InitOptions {
    dir?: string
    stringify?: typeof JSON.stringify
    parse?: typeof JSON.parse
    encoding?: string
    logging?: boolean | ((...args: any[]) => void)
    ttl?: boolean | number | Date
    expiredInterval?: number
    forgiveParseErrors?: boolean
    writeQueue?: boolean
    writeQueueIntervalMs?: number
    writeQueueWriteOnlyLast?: boolean
    maxFileDescriptors?: number
  }

  export interface SetOptions {
    ttl?: number | Date
  }

  export interface Storage {
    init: (options?: InitOptions) => Promise<void>
    getItem: <T = any>(key: string) => Promise<T>
    setItem: (key: string, value: any, options?: SetOptions) => Promise<void>
    removeItem: (key: string) => Promise<void>
  }

  export function create(options?: InitOptions): Storage
}
