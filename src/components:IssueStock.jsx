// src/components/IssueStock.jsx
import React, { useState } from "react";
import useStore from "../store.js";

export default function IssueStock() {
  const items = useStore((s)=>s.items);
  const onHandList = useStore((s)=>s.getInventory());
  const issue = useStore((s)=>s.issueStock);
  const [sel, setSel] = useState("");
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState("");

  const onHand = (id) => onHandList.find(x=>x.id===id)?.onHand ?? 0;

  return (
    <section className="card">
      <h3>📤 Issue Stock (FIFO)</h3>
      <div className="grid-3">
        <label>Item
          <select value={sel} onChange={(e)=>{ setSel(e.target.value); setErr(""); }}>
            <option value="">— Select item —</option>
            {items.map(i=>(
              <option key={i.id} value={i.id}>
                {i.sku} — {i.name} (on hand: {onHand(i.id)})
              </option>
            ))}
          </select>
        </label>
        <label>Quantity
          <input type="number" min="0" step="0.01" value={qty} onChange={(e)=>setQty(e.target.value)} />
        </label>
        <div className="actions" style={{alignSelf:"end"}}>
          <button
            className="btn"
            onClick={()=>{
              setErr("");
              try{
                if(!sel || qty<=0) return;
                issue(sel, Number(qty));
                setQty(1);
              }catch(e){
                setErr(e.message || "Unable to issue stock.");
              }
            }}
          >Issue (FIFO)</button>
          <button className="btn secondary" onClick={()=>{ setQty(1); setErr(""); }}>Reset</button>
        </div>
      </div>
      {err && <div style={{marginTop:10, color:"var(--danger)"}}>⚠️ {err}</div>}
    </section>
  );
}
