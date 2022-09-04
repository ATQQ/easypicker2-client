import ajax from '../ajax'

function importPeople(
  key: string,
  filename: string,
  type: string
): PeopleApiTypes.importPeople {
  return ajax.post(`/people/${key}`, {
    filename,
    type
  })
}

function getPeople(key: string, detail = '0'): PeopleApiTypes.getPeople {
  return ajax.get(`/people/${key}`, {
    params: {
      detail
    }
  })
}

function deletePeople(key: string, id: number): PeopleApiTypes.deletePeople {
  return ajax.delete(`/people/${key}`, {
    params: {
      id
    }
  })
}

function updatePeopleStatus(
  key: string,
  filename: string,
  name: string,
  hash: string
): PeopleApiTypes.updatePeopleStatus {
  return ajax.put(`/people/${key}`, {
    filename,
    name,
    hash
  })
}

function checkPeopleIsExist(
  key: string,
  name: string
): PeopleApiTypes.checkPeopleIsExist {
  return ajax.post(`/people/check/${key}`, {
    name
  })
}

function getUsefulTemplate(key: string): PeopleApiTypes.getUsefulTemplate {
  return ajax.get(`/people/template/${key}`)
}

function importPeopleFromTpl(
  taskKey: string,
  tplKey: string,
  type: string
): PeopleApiTypes.importFromTpl {
  return ajax.put(`/people/template/${taskKey}`, {
    key: tplKey,
    type
  })
}

function addPeopleByUser(name: string, key: string) {
  return ajax.post(`/people/add/${key}`, {
    name
  })
}
export default {
  importPeopleFromTpl,
  importPeople,
  getPeople,
  deletePeople,
  updatePeopleStatus,
  checkPeopleIsExist,
  getUsefulTemplate,
  addPeopleByUser
}
