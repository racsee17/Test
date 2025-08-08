import React, { useState } from "react";
import ItemForm from "./ItemForm.jsx";
import ReceiveStock from "./ReceiveStock.jsx";
import IssueStock from "./IssueStock.jsx";
import Inventory from "./Inventory.jsx";
import Movements from "./Movements.jsx";

export default function App() {
  const [tab, setTab] = useState("Items");

  const tabs = ["Items", "Receive", "Issue", "Inventory", "Movements"];
  const renderTab = () => {
    switch (tab) {
      case "Items": return <ItemForm />;
      case "Receive": return <ReceiveStock />;
      case "Issue": return <IssueStock />;
      case "Inventory": return <Inventory />;
      case "Movements": return <Movements />;
      default: return null;
    }
  };

  return (
    <div>
      <h1>📦 Inventory Tracker</h1>
      <nav>
        {tabs.map((t) => (
          <button key={t} className={t === tab ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      <hr />
      {renderTab()}
    </div>
  );
}