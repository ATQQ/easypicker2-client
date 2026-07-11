import { Provide } from 'flash-wolves'
import { AppDataSource, BaseRepository } from '.'
import { PaymentOrder as PaymentOrderEntity } from './entity'

@Provide()
export class PaymentOrderRepository extends BaseRepository<PaymentOrderEntity> {
  protected entityName = PaymentOrderEntity.name

  protected createRepository() {
    return AppDataSource.getRepository(PaymentOrderEntity)
  }
}
