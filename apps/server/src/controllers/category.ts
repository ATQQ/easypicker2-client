import {
  Context,
  Delete,
  Get,
  Inject,
  InjectCtx,
  Post,
  Put,
  ReqBody,
  ReqParams,
  RouterController
} from 'flash-wolves'
import { CategoryService } from '@/service'
import { wrapperCatchError } from '@/utils/context'

@RouterController('category', { needLogin: true })
export default class CategoryController {
  @InjectCtx()
  private ctx: Context

  @Inject(CategoryService)
  private categoryService: CategoryService

  @Post('/create')
  async createCategory(@ReqBody('name') name: string) {
    try {
      await this.categoryService.createCategory(name)
    } catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Get('')
  getList() {
    return this.categoryService.getList()
  }

  @Put('/:key/submit-nav')
  async updateSubmitNav(
    @ReqParams('key') key: string,
    @ReqBody('keys') keys: string[],
  ) {
    try {
      await this.categoryService.updateSubmitNav(key, keys || [])
    }
    catch (error) {
      return wrapperCatchError(error)
    }
  }

  @Delete('/:key')
  deleteCategory(@ReqParams('key') key: string) {
    return this.categoryService.deleteCategory(key)
  }
}
