export interface Store {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  tables: number;
}

export interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
}

export interface MenuOptionChoice {
  id: string;
  label: string;
  priceModifier: number;
}

export interface MenuOption {
  id: string;
  name: string;
  type: 'radio' | 'checkbox';
  required: boolean;
  choices: MenuOptionChoice[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  image: string;
  description: string;
  soldOut: boolean;
  options: MenuOption[];
}

export interface CartItem {
  id: string;
  menuItemId: string;
  menuItemName: string;
  basePrice: number;
  selectedOptions: { optionName: string; choiceLabel: string; priceModifier: number }[];
  quantity: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  tableNumber: number;
  items: CartItem[];
  totalPrice: number;
  status: 'pending' | 'preparing' | 'completed';
  createdAt: string;
}

export interface TableCartSnapshot {
  tableNumber: number;
  items: CartItem[];
  hostClientId: string | null;
  version: number;
  totalPrice: number;
  totalCount: number;
}
