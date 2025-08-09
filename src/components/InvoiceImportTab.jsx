// src/components/InvoiceImportTab.jsx
import React, { useState } from "react";
import useStore from "../store";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5175";

export default function InvoiceImportTab() {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [engine, setEngine] = useState("");
  const [rawPreviewOpen, setRawPreviewOpen] = useState(false);
  const [rawText, setRawText] = useState("");

  const upsertInvoiceItems = useStore((s) => s.upsertInvoiceItems);

  const onServerParse = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setMsg("");
    setRows([]);
    setRawText("");

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/api/parse-invoice`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Server ${res.status}: ${t}`);
      }
      const data = await res.json();
      setRows(data.items || []);
      setEngine(data.used || "");
      setRawText(data.text_excerpt || "");
      setMsg(
        `Parsed ${data.items?.length || 0} line(s) via ${data.used === "ocr" ? "OCR" : "PDF text"}.`
      );
    } catch (e) {
      console.error("[InvoiceImportTab] server parse error:", e);
      setError(e?.message || "Failed to parse on server.");
    } finally {
      setLoading(false);
    }
  };

  const updateCell = (i, key, val) => {
    const next = [...rows];
    next[i] = { ...next[i], [key]: val };
    setRows(next);
  };

  const onConfirm = () => {
    if (!rows.length) return;
    upsertInvoiceItems(rows);
    setMsg(`Queued ${rows.length} lines → inventory updated.`);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Import Invoice (PDF)</h2>
      <p className="muted">
        Upload a PDF invoice. The server will extract text using pdfminer.six, and fall back to OCR (Tesseract) if needed.
      </p>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        style={{ marginTop: 8, marginBottom: 8 }}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button disabled={!file || loading} onClick={onServerParse}>
          {loading ? "Parsing…" : "Upload & Parse (Server)"}
        </button>
        {rawText && (
          <button onClick={() => setRawPreviewOpen(!rawPreviewOpen)}>
            {rawPreviewOpen ? "Hide raw text" : "Show raw text"}
          </button>
        )}
      </div>

      {error && <div style={{ color: "#d33", marginBottom: 8 }}>{error}</div>}
      {msg && !error && (
        <div style={{ color: "#2a7", marginBottom: 8 }}>
          {msg} {engine && <em style={{ opacity: 0.7 }}>({engine})</em>}
        </div>
      )}

      {rawPreviewOpen && rawText && (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#0d1320",
            padding: 12,
            borderRadius: 8,
            border: "1px solid #223044",
            maxHeight: 240,
            overflow: "auto",
            fontSize: 12,
            lineHeight: 1.35,
          }}
        >
          {rawText}
        </pre>
      )}

      {rows.length > 0 && (
        <>
          <div style={{ opacity: 0.7, marginTop: 8 }}>
            Review items before adding to inventory.
          </div>
          <div
            style={{
              overflow: "auto",
              border: "1px solid #2a2f3a",
              borderRadius: 8,
              marginTop: 8,
            }}
          >
            <table style={{ width: "100%", fontSize: 14 }}>
              <thead style={{ background: "#121826" }}>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>SKU</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Description</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Qty</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Unit Price</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #2a2f3a" }}>
                    {["sku", "description", "quantity", "unit_price"].map((k) => (
                      <td key={k} style={{ padding: 6 }}>
                        <input
                          value={r[k] ?? ""}
                          onChange={(e) => updateCell(i, k, e.target.value)}
                          style={{ width: "100%" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button style={{ marginTop: 8 }} onClick={onConfirm}>
            Add to Inventory
          </button>
        </>
      )}
    </div>
  );
}
