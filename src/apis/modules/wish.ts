import ajax from '../ajax'

function addWish(wish:Partial<WishApiTypes.Wish>):WishApiTypes.addWish {
  return ajax.post(
    '/wish/add', wish,
  )
}

function findAllWish():WishApiTypes.allWishData {
  return ajax.get(
    '/wish/all',
  )
}

function updateWishStatus(id:string, status:WishApiTypes.WishStatus):WishApiTypes.updateWish {
  return ajax.put(
    '/wish/update', { id, status },
  )
}
export default {
  addWish,
  findAllWish,
  updateWishStatus,
}
