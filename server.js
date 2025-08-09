// server.js (root)
import express from "express";
import fileUpload from "express-fileupload";
import pdfParse from "pdf-parse";
import cors from "cors";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(fileUpload());
app.use(express.json());

app.post("/api/parse-invoice", async (req, res) => {
  try {
    const f = req.files?.file;
    if (!f) return res.status(400).json({ error: "No file" });
    const pdf = await pdfParse(f.data);
    const text = pdf.text || "";

    // Heuristic parse similar to client
    const startIdx = text.search(/(Item|SKU)?\\s*Description\\s+Qty/i);
    const endIdx = text.search(/Subtotal|Total/i);
    const blob = text.slice(startIdx > -1 ? startIdx : 0, endIdx > -1 ? endIdx : text.length);
    const lines = blob.split(/\\r?\\n/).map(l => l.trim()).filter(Boolean);

    const items = [];
    for (const line of lines) {
      let m = line.match(/^([A-Z0-9\\-]+)\\s+(.+?)\\s+(\\d+)\\s+([\\d,.]+)$/i);
      if (m) {
        items.push({ sku: m[1], description: m[2], quantity: Number(m[3]), unit_price: Number(m[4].replace(/,/g, \"\")) });
        continue;
      }
      m = line.match(/^(.+?)\\s+(\\d+)\\s+([\\d,.]+)$/);
      if (m) items.push({ sku: \"\", description: m[1], quantity: Number(m[2]), unit_price: Number(m[3].replace(/,/g, \"\")) });
    }

    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Parse failed" });
  }
});

// Optional: inventory bulk endpoint (front-end updates store locally already)
app.post("/api/inventory/bulk-add", async (req, res) => {
  res.json({ ok: true, message: "Received" });
});

app.listen(5174, () => console.log("API on http://localhost:5174"));
