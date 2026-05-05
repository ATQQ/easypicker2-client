declare type V2Array<T> = {
  [P in keyof T]?: T[P] | T[P][]
}
