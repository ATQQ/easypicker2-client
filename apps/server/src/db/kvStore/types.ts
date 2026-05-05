export interface KvStore {
  setValue: (key: string, value: string, ttlSeconds?: number) => Promise<void>
  getValue: (key: string) => Promise<string | null>
  expireKey: (key: string) => Promise<void>
}
