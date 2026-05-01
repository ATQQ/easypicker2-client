import { FilterQuery, UpdateQuery } from 'mongodb'
import {
  findCollection,
  insertCollection,
  updateCollection
} from '@/lib/dbConnect/mongodb'
import { Wish } from './model/wish'

export function addWishData(wish: Wish) {
  return insertCollection<Wish>('wish', wish)
}

export function findWish(wish: FilterQuery<Wish>) {
  return findCollection<Wish>('wish', wish)
}

export function updateWish(query: FilterQuery<Wish>, wish: UpdateQuery<Wish>) {
  return updateCollection<Wish>('wish', query, wish)
}
