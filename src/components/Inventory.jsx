// src/components/Inventory.jsx
import React, { useMemo, useState } from "react";
import useStore from "../store.js";

export default function Inventory() {
  const getInventory = useStore((s)=>s.getInventory);
  const [q, setQ] = useState("");

  const rows = useMemo(()=>{
    const data = getInventory();
    const query = q.trim().toLowerCase();
    return data
      .filter(i => i.sku.toLowerCase().includes(query) || i.name.toLowerCase().includes(query))
      .sort((a,b)=>a.name.localeCompare(b.name));
  }, [getInventory, q]);

  return (
    <section className="card">
      <h3>📊 Inventory</h3>
      <div className="actions" style={{marginBottom:10}}>
        <input placeholder="Search SKU or Name…" value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>SKU</th><th>Name</th><th>On Hand</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="3"><div className="empty">No items match your search.</div></td></tr>}
            {rows.map((r)=>(
              <tr key={r.id}>
                <td>{r.sku}</td>
                <td>{r.name}</td>
                <td><span className="badge qty">{r.onHand}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
