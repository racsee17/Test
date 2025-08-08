import React from "react";
import useStore from "../store.js";

export default function Movements() {
  const movements = useStore((s) => s.movements);

  return (
    <div>
      <h2>Movements</h2>
      <ul>
        {movements.map((m, i) => (
          <li key={i}>
            {m.type} - {m.item.sku} - {m.qty} units @ {m.unitCost}
          </li>
        ))}
      </ul>
    </div>
  );
}