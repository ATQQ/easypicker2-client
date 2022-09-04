import { WishStatus } from '@/constants'
import ajax from '../ajax'

function addWish(wish: Partial<WishApiTypes.Wish>): WishApiTypes.addWish {
  return ajax.post('/wish/add', wish)
}

function findAllWish(): WishApiTypes.allWishData {
  return ajax.get('/wish/all')
}

function updateWishStatus(
  id: string,
  status: WishStatus
): WishApiTypes.updateWish {
  return ajax.put('/wish/update', { id, status })
}

function updateWishDes(
  id: string,
  title: string,
  des: string
): WishApiTypes.updateWish {
  return ajax.put(`/wish/update/${id}`, { title, des })
}
export default {
  addWish,
  findAllWish,
  updateWishStatus,
  updateWishDes
}
