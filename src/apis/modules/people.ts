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

function updatePeopleStatus(key:string, filename:string, name:string) {
  return ajax.put<any, BaseResponse>(`/people/${key}`, {
    filename,
    name,
  })
}

function checkPeopleIsExist(key:string, name:string) {
  return ajax.get<any, BaseResponse>(`/people/check/${key}`, {
    params: {
      name,
    },
  })
}
export default {
  importPeople,
  getPeople,
  deletePeople,
  updatePeopleStatus,
  checkPeopleIsExist,
}
