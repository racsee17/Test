// src/components/ItemForm.jsx
import React, { useMemo, useState } from "react";
import useStore from "../store.js";

export default function ItemForm() {
  const items = useStore((s) => s.items);
  const addItem = useStore((s) => s.addItem);
  const getInventory = useStore((s) => s.getInventory);

  const [form, setForm] = useState({ sku: "", name: "" });
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const inv = getInventory();
    const q = search.trim().toLowerCase();
    return inv
      .filter((i) => i.sku.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [getInventory, search]);

  return (
    <>
      <section className="card">
        <h3>➕ Add Item</h3>
        <div className="grid-3">
          <label>SKU
            <input placeholder="e.g. ABC-001" value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </label>
          <label>Name
            <input placeholder="e.g. Blue T-Shirt" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <div className="actions" style={{alignSelf:"end"}}>
            <button
              className="btn"
              onClick={() => {
                if (!form.sku || !form.name) return;
                addItem(form);
                setForm({ sku: "", name: "" });
              }}
            >
              Add Item
            </button>
            <button className="btn secondary" onClick={() => setForm({ sku: "", name: "" })}>Clear</button>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>📦 Items</h3>
        <div className="actions" style={{marginBottom:10}}>
          <input placeholder="Search by SKU or Name…" value={search} onChange={(e)=>setSearch(e.target.value)} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Name</th>
                <th>On Hand</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan="4"><div className="empty">No items yet. Add your first SKU above.</div></td></tr>
              )}
              {rows.map((it) => (
                <tr key={it.id}>
                  <td>{it.sku}</td>
                  <td>{it.name}</td>
                  <td><span className="badge qty">{it.onHand}</span></td>
                  <td className="subtle">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
