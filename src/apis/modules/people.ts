import ajax from '../ajax'

function importPeople(key: string, filename:string, type:string) {
  return ajax.post<any, BaseResponse>(
    `/people/${key}`, {
      filename,
      type,
    },
  )
}

export default {
  importPeople,
}
