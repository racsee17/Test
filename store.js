import { create } from "zustand";
import { nanoid } from "nanoid";

const useStore = create((set, get) => ({
  items: [],
  lots: [],
  movements: [],

  addItem: ({ sku, name }) =>
    set((s) => ({
      items: [...s.items, { id: nanoid(), sku, name }],
    })),

  receiveStock: (itemId, qty, unitCost) =>
    set((s) => {
      const lot = { id: nanoid(), itemId, qty, unitCost };
      const item = s.items.find((i) => i.id === itemId);
      return {
        lots: [...s.lots, lot],
        movements: [
          ...s.movements,
          { type: "IN", item, qty, unitCost },
        ],
      };
    }),

  issueStock: (itemId, qty) =>
    set((s) => {
      const lots = [...s.lots];
      const item = s.items.find((i) => i.id === itemId);
      let remaining = qty;
      const movements = [];
      for (let lot of lots) {
        if (lot.itemId === itemId && lot.qty > 0) {
          const take = Math.min(remaining, lot.qty);
          if (take > 0) {
            lot.qty -= take;
            movements.push({ type: "OUT", item, qty: take, unitCost: lot.unitCost });
            remaining -= take;
          }
        }
        if (remaining <= 0) break;
      }
      return {
        lots,
        movements: [...s.movements, ...movements],
      };
    }),

  getInventory: () => {
    const { items, lots } = get();
    return items.map((it) => ({
      ...it,
      onHand: lots.filter((l) => l.itemId === it.id).reduce((sum, l) => sum + l.qty, 0),
    }));
  },
}));

export default useStore;