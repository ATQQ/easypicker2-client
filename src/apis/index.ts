import p from './modules/public'
import user from './modules/user'
import category from './modules/category'
import task from './modules/task'
import people from './modules/people'
import file from './modules/file'
import superOverview from './modules/super/overview'
import superUser from './modules/super/user'

export const PublicApi = p
export const UserApi = user
export const CategoryApi = category
export const TaskApi = task
export const PeopleApi = people
export const FileApi = file
export const SuperOverviewApi = superOverview
export const SuperUserApi = superUser
export { default as WishApi } from './modules/wish'
export { default as ConfigServiceAPI } from './modules/config'
export { default as ActionServiceAPI } from './modules/action'
