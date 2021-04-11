import ajax from '../ajax'

function importPeople(key: string, filename:string, type:string) {
  return ajax.post<any, BaseResponse>(
    `/people/${key}`, {
      filename,
      type,
    },
  )
}

function getPeople(key:string) {
  return ajax.get<any, BaseResponse>(`/people/${key}`)
}

function deletePeople(key:string, id:number) {
  return ajax.delete<any, BaseResponse>(`/people/${key}`, {
    params: {
      id,
    },
  })
}
export default {
  importPeople,
  getPeople,
  deletePeople,
}
