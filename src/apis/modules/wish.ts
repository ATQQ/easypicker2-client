import ajax from '../ajax'

function addWish(wish:Partial<WishApiTypes.Wish>):WishApiTypes.addWish {
  return ajax.post(
    '/wish/add', wish,
  )
}

export default {
  addWish,
}
