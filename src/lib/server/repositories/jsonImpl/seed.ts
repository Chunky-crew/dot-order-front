import type { PersistedState } from './persistence';
import type { MenuCategory, MenuItem } from '@/types';

export function seed(state: PersistedState): void {
  const cats: MenuCategory[] = [
    { id: 'cat-1', name: '커피', displayOrder: 1 },
    { id: 'cat-2', name: '음료', displayOrder: 2 },
    { id: 'cat-3', name: '베이커리', displayOrder: 3 },
  ];
  state.categories = cats;

  const items: MenuItem[] = [
    {
      id: 'item-1', categoryId: 'cat-1', name: '아메리카노', price: 4000,
      image: '', description: '깊고 진한 에스프레소에 물을 더한 클래식 커피',
      soldOut: false,
      options: [
        { id: 'opt-1', name: '온도', type: 'radio', required: true, choices: [
          { id: 'ch-1', label: 'HOT', priceModifier: 0 },
          { id: 'ch-2', label: 'ICE', priceModifier: 0 },
        ]},
        { id: 'opt-2', name: '사이즈', type: 'radio', required: true, choices: [
          { id: 'ch-3', label: 'Regular', priceModifier: 0 },
          { id: 'ch-4', label: 'Large', priceModifier: 500 },
        ]},
      ],
    },
    {
      id: 'item-2', categoryId: 'cat-1', name: '카페라떼', price: 4500,
      image: '', description: '부드러운 우유와 에스프레소의 조화',
      soldOut: false,
      options: [
        { id: 'opt-3', name: '온도', type: 'radio', required: true, choices: [
          { id: 'ch-5', label: 'HOT', priceModifier: 0 },
          { id: 'ch-6', label: 'ICE', priceModifier: 0 },
        ]},
        { id: 'opt-4', name: '사이즈', type: 'radio', required: true, choices: [
          { id: 'ch-7', label: 'Regular', priceModifier: 0 },
          { id: 'ch-8', label: 'Large', priceModifier: 500 },
        ]},
      ],
    },
    {
      id: 'item-3', categoryId: 'cat-1', name: '바닐라라떼', price: 5000,
      image: '', description: '달콤한 바닐라 시럽이 들어간 라떼',
      soldOut: false,
      options: [
        { id: 'opt-5', name: '온도', type: 'radio', required: true, choices: [
          { id: 'ch-9', label: 'HOT', priceModifier: 0 },
          { id: 'ch-10', label: 'ICE', priceModifier: 0 },
        ]},
      ],
    },
    {
      id: 'item-4', categoryId: 'cat-1', name: '카푸치노', price: 4500,
      image: '', description: '풍성한 우유 거품의 이탈리아 정통 커피',
      soldOut: false,
      options: [
        { id: 'opt-6', name: '사이즈', type: 'radio', required: true, choices: [
          { id: 'ch-11', label: 'Regular', priceModifier: 0 },
          { id: 'ch-12', label: 'Large', priceModifier: 500 },
        ]},
      ],
    },
    {
      id: 'item-5', categoryId: 'cat-2', name: '녹차라떼', price: 5000,
      image: '', description: '진한 말차와 부드러운 우유의 만남',
      soldOut: false,
      options: [
        { id: 'opt-7', name: '온도', type: 'radio', required: true, choices: [
          { id: 'ch-13', label: 'HOT', priceModifier: 0 },
          { id: 'ch-14', label: 'ICE', priceModifier: 0 },
        ]},
      ],
    },
    {
      id: 'item-6', categoryId: 'cat-2', name: '자몽에이드', price: 5500,
      image: '', description: '상큼한 자몽과 탄산의 시원한 조합',
      soldOut: false,
      options: [
        { id: 'opt-8', name: '토핑', type: 'checkbox', required: false, choices: [
          { id: 'ch-15', label: '알로에 추가', priceModifier: 500 },
          { id: 'ch-16', label: '코코넛 추가', priceModifier: 500 },
        ]},
      ],
    },
    {
      id: 'item-7', categoryId: 'cat-2', name: '레몬에이드', price: 5000,
      image: '', description: '새콤달콤한 수제 레몬에이드',
      soldOut: false,
      options: [],
    },
    {
      id: 'item-8', categoryId: 'cat-3', name: '크로와상', price: 3500,
      image: '', description: '바삭하고 버터향 가득한 프랑스식 크로와상',
      soldOut: false,
      options: [],
    },
    {
      id: 'item-9', categoryId: 'cat-3', name: '초코 머핀', price: 3800,
      image: '', description: '진한 초콜릿이 가득한 촉촉한 머핀',
      soldOut: false,
      options: [],
    },
    {
      id: 'item-10', categoryId: 'cat-3', name: '치즈케이크', price: 5500,
      image: '', description: '부드럽고 진한 뉴욕 스타일 치즈케이크',
      soldOut: true,
      options: [],
    },
  ];
  state.menuItems = items;
}
