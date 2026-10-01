const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(ROOT));

function readOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8")); }
  catch { return []; }
}
function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}
function esc(v) {
  return String(v ?? "").replace(/[&<>'"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;" })[c]);
}
function money(v) {
  return "$" + Number(v || 0).toFixed(2).replace(/\.00$/, "");
}
function transporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}
function requireAdmin(req,res,next) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) return res.status(503).json({error:"ADMIN_API_KEY is not configured on the server."});
  if (req.get("x-admin-key") !== expected) return res.status(401).json({error:"Unauthorized"});
  next();
}

function orderHtml(order, heading) {
  const c = order.customer || {};
  const rows = (order.items || []).map(x =>
    `<tr><td style="padding:10px;border-bottom:1px solid #eee">${esc(x.name)} × ${Number(x.qty)||1}</td><td style="padding:10px;border-bottom:1px solid #eee;text-align:right">${money((Number(x.price)||0)*(Number(x.qty)||1))}</td></tr>`
  ).join("");
  return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#332b2b">
    <h2>${esc(heading)}</h2><p>Order reference: <strong>${esc(order.reference)}</strong></p>
    <p>Status: <strong>${esc(order.status || "New")}</strong></p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <p style="text-align:right;font-size:18px"><strong>Total: ${money(order.total)}</strong></p>
    <h3>Delivery Details</h3>
    <p>${esc([c.firstName,c.lastName].filter(Boolean).join(" "))}<br>${esc(c.phone)}<br>${esc(c.email)}<br>${esc([c.address,c.city,c.postal,c.country].filter(Boolean).join(", "))}</p>
  </div>`;
}
async function sendOrderEmails(order, statusUpdate = false) {
  const t = transporter();
  if (!t) return { sent:false, reason:"SMTP is not configured" };
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const admin = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  const subject = statusUpdate ? `Order ${order.reference} status: ${order.status}` : `Order confirmation: ${order.reference}`;
  const heading = statusUpdate ? `Your order ${order.reference} is now ${order.status}` : "Thank you for your order";
  const jobs = [];
  if (order.customer?.email) jobs.push(t.sendMail({from,to:order.customer.email,subject,html:orderHtml(order,heading)}));
  jobs.push(t.sendMail({from,to:admin,subject:`${statusUpdate?"Order status updated":"New order received"}: ${order.reference}`,html:orderHtml(order,statusUpdate?"Order status updated":"New customer order received")}));
  await Promise.all(jobs);
  return {sent:true};
}

app.post("/api/orders", async (req,res) => {
  try {
    const order = req.body || {};
    if (!order.customer?.email || !Array.isArray(order.items) || !order.items.length) return res.status(400).json({error:"Customer email and order items are required."});
    order.reference = order.reference || "ELG-" + Date.now().toString().slice(-8);
    order.createdAt = order.createdAt || new Date().toISOString();
    order.status = order.status || "New";
    order.id = order.id || crypto.randomUUID();
    const orders = readOrders();
    orders.push(order);
    writeOrders(orders);
    let email = {sent:false};
    try { email = await sendOrderEmails(order); } catch (e) { console.error("Email error:", e.message); email={sent:false,reason:e.message}; }
    res.status(201).json({ok:true,order,email});
  } catch (e) { console.error(e); res.status(500).json({error:"Could not save order."}); }
});

app.get("/api/orders", requireAdmin, (req,res) => res.json(readOrders().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))));

app.patch("/api/orders/:reference/status", requireAdmin, async (req,res) => {
  const allowed = ["New","Processing","Shipped","Delivered","Cancelled"];
  if (!allowed.includes(req.body?.status)) return res.status(400).json({error:"Invalid status."});
  const orders = readOrders();
  const order = orders.find(o => o.reference === req.params.reference);
  if (!order) return res.status(404).json({error:"Order not found."});
  order.status = req.body.status;
  order.updatedAt = new Date().toISOString();
  writeOrders(orders);
  let email={sent:false};
  try { email=await sendOrderEmails(order,true); } catch(e) { console.error("Status email error:",e.message); email={sent:false,reason:e.message}; }
  res.json({ok:true,order,email});
});

app.delete("/api/orders/:reference", requireAdmin, (req,res) => {
  const orders=readOrders();
  const next=orders.filter(o=>o.reference!==req.params.reference);
  if(next.length===orders.length) return res.status(404).json({error:"Order not found."});
  writeOrders(next); res.json({ok:true});
});

app.get("/api/health",(req,res)=>res.json({ok:true}));

app.listen(PORT,()=>console.log(`ÉLÉGANCE store running on http://localhost:${PORT}`));
