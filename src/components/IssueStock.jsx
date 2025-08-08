import React, { useState } from "react";
import useStore from "../store.js";

export default function IssueStock() {
  const items = useStore((s) => s.items);
  const issue = useStore((s) => s.issueStock);
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState(1);

  return (
    <div>
      <h2>Issue Stock (FIFO)</h2>
      <select onChange={(e) => setItemId(e.target.value)} value={itemId}>
        <option value="">Select item</option>
        {items.map((it) => (
          <option key={it.id} value={it.id}>{it.sku} - {it.name}</option>
        ))}
      </select>
      <input type="number" placeholder="Quantity" value={qty} onChange={(e) => setQty(e.target.value)} />
      <button onClick={() => issue(itemId, Number(qty))}>Issue</button>
    </div>
  );
}
