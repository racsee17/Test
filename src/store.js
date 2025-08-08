// src/store.js
import { create } from "zustand";
import { nanoid } from "nanoid";

const useStore = create((set, get) => ({
  items: [],
  lots: [],          // {id, itemId, qty, unitCost, note?}
  movements: [],     // {type: 'IN'|'OUT', item, qty, unitCost, note?}

  // Items
  addItem: ({ sku, name }) =>
    set((s) => ({
      items: [...s.items, { id: nanoid(), sku: sku.trim(), name: name.trim() }],
    })),

  // Receive (IN)
  receiveStock: (itemId, qty, unitCost, note = "") =>
    set((s) => {
      if (!itemId || qty <= 0) return {};
      const lot = { id: nanoid(), itemId, qty, unitCost, note };
      const item = s.items.find((i) => i.id === itemId);
      return {
        lots: [...s.lots, lot],
        movements: [...s.movements, { type: "IN", item, qty, unitCost, note }],
      };
    }),

  // Issue (OUT) with FIFO
  issueStock: (itemId, qty) =>
    set((s) => {
      if (!itemId || qty <= 0) return {};
      const lots = s.lots.map((l) => ({ ...l }));
      const item = s.items.find((i) => i.id === itemId);

      const available = lots
        .filter((l) => l.itemId === itemId)
        .reduce((sum, l) => sum + l.qty, 0);

      if (qty > available + 1e-9) {
        throw new Error(`Not enough stock. Requested ${qty}, available ${available}.`);
      }

      let remaining = qty;
      const fifoLots = lots
        .filter((l) => l.itemId === itemId && l.qty > 0)
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); // stable for our session

      const newMoves = [];
      for (const lot of fifoLots) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, lot.qty);
        if (take > 0) {
          lot.qty = +(lot.qty - take).toFixed(6);
          newMoves.push({ type: "OUT", item, qty: take, unitCost: lot.unitCost });
          remaining -= take;
        }
      }

      return { lots, movements: [...s.movements, ...newMoves] };
    }),

  // Inventory snapshot
  getInventory: () => {
    const { items, lots } = get();
    return items.map((it) => ({
      ...it,
      onHand: lots.filter((l) => l.itemId === it.id).reduce((sum, l) => sum + l.qty, 0),
    }));
  },
}));

export default useStore;
