require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ─── IN-MEMORY DATABASE ───────────────────────────────────────────────────────
let inventory = [
  { sku: "WH-001", name: "Industrial Bolts M12", qty: 4820, min: 500,  unit: "pcs",   location: "A-12" },
  { sku: "WH-002", name: "Steel Pipe 2in",        qty: 142,  min: 200,  unit: "m",     location: "B-03" },
  { sku: "WH-003", name: "Safety Gloves XL",      qty: 0,    min: 50,   unit: "pairs", location: "C-07" },
  { sku: "WH-004", name: "Forklift Pallets",       qty: 89,   min: 30,   unit: "pcs",   location: "D-01" },
  { sku: "WH-005", name: "Hydraulic Oil 5L",       qty: 23,   min: 40,   unit: "cans",  location: "E-05" },
  { sku: "WH-006", name: "Conveyor Belt 10m",      qty: 7,    min: 5,    unit: "rolls", location: "F-02" },
];

let activityLog = [];
let purchaseOrders = [];
let poCounter = 891;

function getStatus(item) {
  if (item.qty === 0)         return "out";
  if (item.qty < item.min)    return "low";
  return "ok";
}

function logActivity(cmd, user, result) {
  activityLog.unshift({ cmd, user, result, time: new Date().toISOString() });
  if (activityLog.length > 100) activityLog.pop();
}

// ─── BOT COMMAND PARSER ───────────────────────────────────────────────────────
function processCommand(rawCmd, user = "API User") {
  const cmd   = rawCmd.trim().toUpperCase();
  const parts = cmd.split(/\s+/);

  // CHECK <SKU>
  if (parts[0] === "CHECK" && parts[1]) {
    const item = inventory.find(i => i.sku === parts[1]);
    if (!item) return { ok: false, text: `❌ SKU "${parts[1]}" not found.\nAvailable: ${inventory.map(i => i.sku).join(", ")}` };
    const s = getStatus(item);
    const emoji = { ok: "✅", low: "⚠️", out: "❌" }[s];
    const text = `${emoji} SKU: ${item.sku}\nItem: ${item.name}\nQty: ${item.qty} ${item.unit}\nLocation: ${item.location}\nMin threshold: ${item.min} ${item.unit}\nStatus: ${s.toUpperCase()}`;
    logActivity(cmd, user, "ok");
    return { ok: true, text, item };
  }

  // ADD <SKU> <QTY>
  if (parts[0] === "ADD" && parts[1] && parts[2]) {
    const item = inventory.find(i => i.sku === parts[1]);
    const qty  = parseInt(parts[2]);
    if (!item)      return { ok: false, text: `❌ SKU "${parts[1]}" not found.` };
    if (isNaN(qty) || qty <= 0) return { ok: false, text: "❌ Invalid quantity. Use: ADD WH-001 50" };
    const prev = item.qty;
    item.qty += qty;
    logActivity(cmd, user, "ok");
    return { ok: true, text: `✅ Stock Updated!\n${item.sku}: ${item.name}\n${prev} → ${item.qty} ${item.unit}\nTimestamp: ${new Date().toLocaleString()}`, item };
  }

  // REMOVE <SKU> <QTY>
  if (parts[0] === "REMOVE" && parts[1] && parts[2]) {
    const item = inventory.find(i => i.sku === parts[1]);
    const qty  = parseInt(parts[2]);
    if (!item)      return { ok: false, text: `❌ SKU "${parts[1]}" not found.` };
    if (isNaN(qty) || qty <= 0) return { ok: false, text: "❌ Invalid quantity." };
    if (item.qty < qty)         return { ok: false, text: `❌ Insufficient stock. Current: ${item.qty} ${item.unit}` };
    const prev = item.qty;
    item.qty -= qty;
    logActivity(cmd, user, "ok");
    return { ok: true, text: `✅ Stock Deducted!\n${item.sku}: ${item.name}\n${prev} → ${item.qty} ${item.unit}\nTimestamp: ${new Date().toLocaleString()}`, item };
  }

  // LOW STOCK
  if (cmd === "LOW STOCK") {
    const low = inventory.filter(i => getStatus(i) === "low");
    const out = inventory.filter(i => getStatus(i) === "out");
    if (low.length === 0 && out.length === 0) return { ok: true, text: "✅ All items are above minimum threshold!" };
    let text = "";
    if (low.length) text += `⚠️ LOW STOCK (${low.length}):\n` + low.map(i => `• ${i.sku} ${i.name}: ${i.qty}/${i.min} ${i.unit}`).join("\n");
    if (out.length) text += `\n\n❌ OUT OF STOCK (${out.length}):\n` + out.map(i => `• ${i.sku} ${i.name}`).join("\n");
    logActivity(cmd, user, "ok");
    return { ok: true, text: text.trim() };
  }

  // REORDER <SKU>
  if (parts[0] === "REORDER" && parts[1]) {
    const item = inventory.find(i => i.sku === parts[1]);
    if (!item) return { ok: false, text: `❌ SKU "${parts[1]}" not found.` };
    const suggestedQty = Math.max(item.min * 2 - item.qty, item.min);
    const po = { id: `PO-2024-${++poCounter}`, sku: item.sku, name: item.name, qty: suggestedQty, unit: item.unit, status: "pending", created: new Date().toISOString() };
    purchaseOrders.unshift(po);
    logActivity(cmd, user, "ok");
    return { ok: true, text: `📋 Purchase Order Created!\nPO: ${po.id}\nItem: ${item.name}\nQty: ${suggestedQty} ${item.unit}\nStatus: PENDING APPROVAL\nETA: 3-5 business days`, po };
  }

  // SEARCH <NAME>
  if (parts[0] === "SEARCH" && parts.length > 1) {
    const q     = parts.slice(1).join(" ");
    const found = inventory.filter(i => i.name.toLowerCase().includes(q.toLowerCase()) || i.sku.includes(q));
    if (!found.length) return { ok: true, text: `🔍 No items found for "${q}"` };
    return { ok: true, text: `🔍 Results for "${q}":\n\n` + found.map(i => `• ${i.sku}: ${i.name} — ${i.qty} ${i.unit} [${getStatus(i).toUpperCase()}]`).join("\n") };
  }

  // REPORT DAILY
  if (cmd === "REPORT DAILY") {
    const total = inventory.reduce((s, i) => s + i.qty, 0);
    const text  = `📊 DAILY REPORT — ${new Date().toDateString()}\n\nTotal SKUs: ${inventory.length}\nTotal Units: ${total.toLocaleString()}\nLow Stock: ${inventory.filter(i => getStatus(i) === "low").length}\nOut of Stock: ${inventory.filter(i => getStatus(i) === "out").length}\n\n` + inventory.map(i => `${i.sku} | ${i.name.padEnd(22)} | ${String(i.qty).padStart(6)} ${i.unit} | ${getStatus(i).toUpperCase()}`).join("\n");
    logActivity(cmd, user, "ok");
    return { ok: true, text };
  }

  // HELP
  if (cmd === "HELP") {
    return {
      ok: true,
      text: `📋 STOCKBOT COMMANDS:\n\nCHECK <SKU>         — Get stock level\nADD <SKU> <QTY>     — Add received stock\nREMOVE <SKU> <QTY>  — Deduct used stock\nLOW STOCK           — List below-minimum\nREORDER <SKU>       — Create purchase order\nSEARCH <NAME>       — Find items by keyword\nREPORT DAILY        — Full inventory summary\nHELP                — Show this message\n\nExample SKUs: WH-001 to WH-006`
    };
  }

  return { ok: false, text: `❓ Unknown command: "${rawCmd}"\n\nType HELP for available commands.` };
}

// ─── API ROUTES ───────────────────────────────────────────────────────────────

// WhatsApp webhook verification (Twilio / Meta)
app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === (process.env.VERIFY_TOKEN || "stockbot123")) {
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// WhatsApp webhook incoming message (Meta Cloud API)
app.post("/webhook", (req, res) => {
  try {
    const body = req.body;
    if (body.object === "whatsapp_business_account") {
      const entry   = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const msg     = changes?.value?.messages?.[0];
      if (msg?.type === "text") {
        const from = msg.from;
        const text = msg.text.body;
        console.log(`[WhatsApp] From: ${from} | Cmd: ${text}`);
        const result = processCommand(text, from);
        // In production: send reply via WhatsApp API here
        console.log(`[Bot Reply]: ${result.text}`);
      }
    }
    res.sendStatus(200);
  } catch (e) {
    console.error(e);
    res.sendStatus(200);
  }
});

// Twilio WhatsApp webhook
app.post("/twilio/webhook", (req, res) => {
  const from = req.body.From || "unknown";
  const body = req.body.Body || "";
  console.log(`[Twilio] From: ${from} | Cmd: ${body}`);
  const result = processCommand(body, from);
  // TwiML response
  res.set("Content-Type", "text/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${result.text}</Message></Response>`);
});

// Bot command API (for dashboard simulator)
app.post("/api/bot/command", (req, res) => {
  const { command, user } = req.body;
  if (!command) return res.status(400).json({ error: "command is required" });
  const result = processCommand(command, user || "Dashboard");
  res.json(result);
});

// Inventory CRUD
app.get("/api/inventory", (req, res) => {
  const items = inventory.map(i => ({ ...i, status: getStatus(i) }));
  res.json({ items, total: items.length });
});

app.post("/api/inventory", (req, res) => {
  const { sku, name, qty, min, unit, location } = req.body;
  if (!sku || !name) return res.status(400).json({ error: "sku and name are required" });
  if (inventory.find(i => i.sku === sku)) return res.status(409).json({ error: "SKU already exists" });
  const item = { sku: sku.toUpperCase(), name, qty: parseInt(qty) || 0, min: parseInt(min) || 0, unit: unit || "pcs", location: location || "TBD" };
  inventory.push(item);
  logActivity(`ADD_ITEM ${sku}`, "API", "ok");
  res.status(201).json({ ...item, status: getStatus(item) });
});

app.put("/api/inventory/:sku", (req, res) => {
  const item = inventory.find(i => i.sku === req.params.sku.toUpperCase());
  if (!item) return res.status(404).json({ error: "SKU not found" });
  const { name, qty, min, unit, location } = req.body;
  if (name)     item.name     = name;
  if (qty !== undefined) item.qty = parseInt(qty);
  if (min !== undefined) item.min = parseInt(min);
  if (unit)     item.unit     = unit;
  if (location) item.location = location;
  res.json({ ...item, status: getStatus(item) });
});

app.delete("/api/inventory/:sku", (req, res) => {
  const idx = inventory.findIndex(i => i.sku === req.params.sku.toUpperCase());
  if (idx === -1) return res.status(404).json({ error: "SKU not found" });
  inventory.splice(idx, 1);
  res.json({ deleted: true });
});

// Dashboard stats
app.get("/api/stats", (req, res) => {
  const items = inventory.map(i => ({ ...i, status: getStatus(i) }));
  res.json({
    totalSKUs:    items.length,
    inStock:      items.filter(i => i.status === "ok").length,
    lowStock:     items.filter(i => i.status === "low").length,
    outOfStock:   items.filter(i => i.status === "out").length,
    totalUnits:   items.reduce((s, i) => s + i.qty, 0),
    alerts:       items.filter(i => i.status !== "ok"),
    recentActivity: activityLog.slice(0, 10),
    purchaseOrders: purchaseOrders.slice(0, 5),
  });
});

// Health check (Railway uses this)
app.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() }));

// Serve dashboard for all other routes
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`🚀 StockBot WMS running on port ${PORT}`));
