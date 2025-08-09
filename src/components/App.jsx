// src/components/App.jsx
import React, { useState } from "react";
import ItemForm from "./ItemForm.jsx";
import ReceiveStock from "./ReceiveStock.jsx";
import IssueStock from "./IssueStock.jsx";
import Inventory from "./Inventory.jsx";
import Movements from "./Movements.jsx";
import InvoiceImportTab from "./InvoiceImportTab.jsx";

const TABS = ["Items", "Receive", "Issue", "Inventory", "Movements", "Import"];

export default function App() {
  const [tab, setTab] = useState(TABS[0]);

  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <div className="logo" />
          <div>
            <h1>Inventory Tracker</h1>
            <small className="subtle">FIFO • Offline-first (localStorage) • React + Zustand</small>
          </div>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab ${t === tab ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Items" && <ItemForm />}
      {tab === "Receive" && <ReceiveStock />}
      {tab === "Issue" && <IssueStock />}
      {tab === "Inventory" && <Inventory />}
      {tab === "Movements" && <Movements />}
    </div>
  );
}

{tab === "Import" && <InvoiceImportTab />}
