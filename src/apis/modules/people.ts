import ajax from '../ajax'

function importPeople(key: string, filename:string, type:string):PeopleApiTypes.importPeople {
  return ajax.post(
    `/people/${key}`, {
      filename,
      type,
    },
  )
}

function getPeople(key:string):PeopleApiTypes.getPeople {
  return ajax.get(`/people/${key}`)
}

function deletePeople(key:string, id:number):PeopleApiTypes.deletePeople {
  return ajax.delete(`/people/${key}`, {
    params: {
      id,
    },
  })
}

function updatePeopleStatus(key:string,
  filename:string,
  name:string,
  hash:string):PeopleApiTypes.updatePeopleStatus {
  return ajax.put(`/people/${key}`, {
    filename,
    name,
    hash,
  })
}

function checkPeopleIsExist(key:string, name:string):PeopleApiTypes.checkPeopleIsExist {
  return ajax.post(`/people/check/${key}`, {
    name,
  })
}
export default {
  importPeople,
  getPeople,
  deletePeople,
  updatePeopleStatus,
  checkPeopleIsExist,
}
