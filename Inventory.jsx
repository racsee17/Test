import React from "react";
import useStore from "../store.js";

export default function Inventory() {
  const inventory = useStore((s) => s.getInventory());

  return (
    <div>
      <h2>Inventory</h2>
      <ul>
        {inventory.map((it) => (
          <li key={it.id}>{it.sku} - {it.name}: {it.onHand} units</li>
        ))}
      </ul>
    </div>
  );
}