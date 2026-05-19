// Repository DI barrel. To swap backends, replace the imports below with your
// alternative implementations (e.g. PrismaMenuRepository) — no other file needs to change.
import './jsonImpl/persistence';   // side-effect: hydrate state from disk on first import
import { JsonMenuRepository } from './jsonImpl/menuRepo';
import { JsonOrderRepository } from './jsonImpl/orderRepo';
import { JsonTableRepository } from './jsonImpl/tableRepo';
import { JsonCartRepository } from './jsonImpl/cartRepo';
import type {
  MenuRepository,
  OrderRepository,
  TableRepository,
  CartRepository,
} from './types';

export const menuRepository: MenuRepository = new JsonMenuRepository();
export const orderRepository: OrderRepository = new JsonOrderRepository();
export const tableRepository: TableRepository = new JsonTableRepository();
export const cartRepository: CartRepository = new JsonCartRepository();

export type {
  MenuRepository,
  OrderRepository,
  TableRepository,
  CartRepository,
  PlaceCartOrderResult,
} from './types';
