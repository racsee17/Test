import React, { useState } from "react";
import useStore from "../store.js";

export default function ReceiveStock() {
  const items = useStore((s) => s.items);
  const receive = useStore((s) => s.receiveStock);
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);
  const [cost, setCost] = useState(0);

  return (
    <div>
      <h2>Receive Stock</h2>
      <select onChange={(e) => setItemId(e.target.value)} value={itemId}>
        <option value="">Select item</option>
        {items.map((it) => (
          <option key={it.id} value={it.id}>{it.sku} - {it.name}</option>
        ))}
      </select>
      <input type="number" placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} />
      <input type="number" placeholder="Cost" value={cost} onChange={(e) => setCost(e.target.value)} />
      <button onClick={() => receive(itemId, Number(qty), Number(cost))}>Receive</button>
    </div>
  );
}