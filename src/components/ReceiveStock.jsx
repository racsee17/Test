// src/components/ReceiveStock.jsx
import React, { useMemo, useState } from "react";
import useStore from "../store.js";

export default function ReceiveStock() {
  const items = useStore((s) => s.items);
  const lots = useStore((s) => s.lots);
  const receive = useStore((s) => s.receiveStock);

  const [sel, setSel] = useState("");
  const [qty, setQty] = useState(1);
  const [cost, setCost] = useState(0);
  const [note, setNote] = useState("");

  const recent = useMemo(
    () => lots.slice().reverse().slice(0, 10),
    [lots]
  );

  return (
    <>
      <section className="card">
        <h3>📥 Receive Stock</h3>
        <div className="grid-3">
          <label>Item
            <select value={sel} onChange={(e)=>setSel(e.target.value)}>
              <option value="">— Select item —</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.sku} — {i.name}</option>)}
            </select>
          </label>
          <label>Quantity
            <input type="number" min="0" step="0.01" value={qty} onChange={(e)=>setQty(e.target.value)} />
          </label>
          <label>Unit Cost
            <input type="number" min="0" step="0.01" value={cost} onChange={(e)=>setCost(e.target.value)} />
          </label>
        </div>
        <div className="grid-2" style={{marginTop:12}}>
          <label>Note
            <input placeholder="PO #123, supplier, etc." value={note} onChange={(e)=>setNote(e.target.value)} />
          </label>
          <div className="actions" style={{alignSelf:"end"}}>
            <button
              className="btn"
              onClick={()=>{
                if(!sel || qty <= 0) return;
                receive(sel, Number(qty), Number(cost), note);
                setQty(1); setCost(0); setNote("");
              }}
            >Receive</button>
            <button className="btn secondary" onClick={()=>{ setQty(1); setCost(0); setNote(""); }}>Reset</button>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>🧾 Recent Lots</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th><th>Qty</th><th>Unit Cost</th><th>Note</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && <tr><td colSpan="4"><div className="empty">No receipts yet.</div></td></tr>}
              {recent.map((l,i)=>{
                const it = items.find(x=>x.id===l.itemId);
                return (
                  <tr key={i}>
                    <td>{it?.sku} — {it?.name}</td>
                    <td><span className="badge qty">{l.qty}</span></td>
                    <td>{l.unitCost ?? "-"}</td>
                    <td className="subtle">{l.note || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
