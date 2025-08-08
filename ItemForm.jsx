import React, { useState } from "react";
import useStore from "../store.js";

export default function ItemForm() {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const addItem = useStore((s) => s.addItem);
  const items = useStore((s) => s.items);

  const handleAdd = () => {
    if (sku && name) {
      addItem({ sku, name });
      setSku("");
      setName("");
    }
  };

  return (
    <div>
      <h2>Items</h2>
      <input placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={handleAdd}>Add</button>
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.sku} - {item.name}</li>
        ))}
      </ul>
    </div>
  );
}