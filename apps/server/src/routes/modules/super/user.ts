import { Router } from 'flash-wolves'
import { USER_POWER, USER_STATUS } from '@/db/model/user'
import { selectAllUser, updateUser } from '@/db/userDb'

const router = new Router('super/user')

router.get(
  'list',
  async (req, res) => {
    const columns = [
      'id',
      'account',
      'phone',
      'status',
      'join_time',
      'login_time',
      'login_count',
      'open_time'
    ]
    const users = await selectAllUser(columns)
    res.success({
      list: users.map((u) => ({
        ...u,
        phone: u?.phone?.slice(-4)
      }))
    })
  },
  {
    userPower: USER_POWER.SUPER,
    needLogin: true
  }
)

router.put(
  'status',
  async (req, res) => {
    const { id, status } = req.body
    let { openTime } = req.body
    if (status !== USER_STATUS.FREEZE) {
      openTime = ''
    } else {
      openTime = new Date(new Date(openTime).getTime())
    }
    await updateUser(
      {
        status,
        openTime
      },
      {
        id
      }
    )
    res.success()
  },
  {
    userPower: USER_POWER.SUPER,
    needLogin: true
  }
)
export default router
