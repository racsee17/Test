// src/components/Movements.jsx
import React from "react";
import useStore from "../store.js";

export default function Movements() {
  const movements = useStore((s)=>s.movements);

  return (
    <section className="card">
      <h3>📜 Movements</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Type</th><th>Item</th><th>Qty</th><th>Unit Cost</th></tr>
          </thead>
          <tbody>
            {movements.length === 0 && (
              <tr><td colSpan="4"><div className="empty">No movements yet.</div></td></tr>
            )}
            {movements.slice().reverse().map((m, i)=>(
              <tr key={i}>
                <td>
                  <span className={`badge ${m.type === "IN" ? "in" : "out"}`}>{m.type}</span>
                </td>
                <td>{m.item?.sku} — {m.item?.name}</td>
                <td><span className="badge qty">{m.qty}</span></td>
                <td>{m.unitCost ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
