import type { Order } from "./store-types";
import { formatBDT } from "./store-types";
import type { SiteSettings } from "./site-settings";

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function commonHead(title: string, primary: string) {
  return `<meta charset="utf-8" />
<title>${esc(title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans Bengali','SolaimanLipi',sans-serif;color:#111;margin:0;padding:0;background:#fff}
  .muted{color:#666}
  .accent{color:${primary}}
  table{width:100%;border-collapse:collapse}
  th,td{padding:8px 10px;text-align:left;vertical-align:top}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  @media print{ .no-print{display:none!important} body{-webkit-print-color-adjust:exact;print-color-adjust:exact} }
  .printbar{position:fixed;top:0;left:0;right:0;padding:10px;background:#0f172a;color:#fff;display:flex;gap:8px;justify-content:center;z-index:99}
  .printbar button{background:${primary};color:#fff;border:0;padding:8px 16px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px}
  .printbar button.alt{background:transparent;border:1px solid #fff}
</style>`;
}

function printBar() {
  return `<div class="printbar no-print">
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button class="alt" onclick="window.close()">Close</button>
  </div><div class="no-print" style="height:50px"></div>`;
}

function invoiceHTML(order: Order, settings: SiteSettings) {
  const primary = settings.primary_color || "#ef4444";
  const subtotal = Number(order.unit_price) * Number(order.quantity);
  const created = new Date(order.created_at).toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return `<!doctype html><html><head>${commonHead(`Invoice ${order.id.slice(0, 8)}`, primary)}
<style>
  .page{max-width:780px;margin:24px auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px}
  .head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:2px solid ${primary};padding-bottom:16px;margin-bottom:20px}
  .brand{display:flex;gap:12px;align-items:center}
  .brand img{height:48px;width:auto;object-fit:contain}
  .brand h1{margin:0;font-size:22px}
  .meta{text-align:right;font-size:12px}
  .meta .inv{font-size:20px;font-weight:700;color:${primary}}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
  .box{border:1px solid #e5e7eb;border-radius:10px;padding:12px}
  .box h3{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#666}
  .items{border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:16px}
  .items thead{background:#f8fafc;font-size:12px;text-transform:uppercase;color:#475569}
  .items tbody tr+tr{border-top:1px solid #f1f5f9}
  .totals{margin-left:auto;width:280px}
  .totals td{padding:6px 0}
  .totals tr.grand td{border-top:2px solid ${primary};font-weight:700;font-size:18px;color:${primary};padding-top:10px}
  .footer{margin-top:24px;padding-top:16px;border-top:1px dashed #e5e7eb;text-align:center;color:#666;font-size:12px}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;background:${primary}1a;color:${primary};font-size:11px;font-weight:600;text-transform:uppercase}
</style></head><body>
${printBar()}
<div class="page">
  <div class="head">
    <div class="brand">
      ${settings.logo_url ? `<img src="${esc(settings.logo_url)}" alt="" />` : ""}
      <div>
        <h1>${esc(settings.brand_name || "Invoice")}</h1>
        ${settings.contact_address ? `<div class="muted" style="font-size:12px">${esc(settings.contact_address)}</div>` : ""}
        ${settings.contact_phone ? `<div class="muted" style="font-size:12px">📞 ${esc(settings.contact_phone)}${settings.contact_email ? ` · ✉️ ${esc(settings.contact_email)}` : ""}</div>` : ""}
      </div>
    </div>
    <div class="meta">
      <div class="inv">INVOICE</div>
      <div>#${esc(order.id.slice(0, 8).toUpperCase())}</div>
      <div class="muted">${esc(created)}</div>
      <div style="margin-top:6px"><span class="badge">${esc(order.status)}</span></div>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <h3>Bill To</h3>
      <div style="font-weight:600">${esc(order.customer_name)}</div>
      <div>📱 ${esc(order.mobile)}</div>
      <div style="margin-top:4px">${esc(order.address)}${order.area ? ` (${esc(order.area)})` : ""}</div>
    </div>
    <div class="box">
      <h3>Order Details</h3>
      <div>Payment: <strong>Cash on Delivery</strong></div>
      <div>Source: <strong>${order.landing_page_slug ? `/p/${esc(order.landing_page_slug)}` : "Main store"}</strong></div>
      ${order.courier_tracking_code ? `<div>Tracking: <strong>${esc(order.courier_tracking_code)}</strong></div>` : ""}
      ${order.courier_consignment_id ? `<div class="muted" style="font-size:12px">Consignment #${esc(order.courier_consignment_id)}</div>` : ""}
    </div>
  </div>

  <table class="items">
    <thead><tr><th>Item</th><th>Variant</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr></thead>
    <tbody>
      <tr>
        <td>${esc(order.product_title)}</td>
        <td>${esc(order.variant_label ?? "—")}</td>
        <td class="num">${order.quantity}</td>
        <td class="num">${esc(formatBDT(order.unit_price))}</td>
        <td class="num">${esc(formatBDT(subtotal))}</td>
      </tr>
    </tbody>
  </table>

  <table class="totals">
    <tr><td>Subtotal</td><td class="num">${esc(formatBDT(subtotal))}</td></tr>
    <tr><td>Delivery</td><td class="num">${esc(formatBDT(order.delivery_charge))}</td></tr>
    <tr class="grand"><td>Total (COD)</td><td class="num">${esc(formatBDT(order.total))}</td></tr>
  </table>

  <div class="footer">
    Thank you for your order! · ${esc(settings.brand_name || "")}
    ${settings.contact_phone ? ` · ${esc(settings.contact_phone)}` : ""}
  </div>
</div>
<script>setTimeout(()=>window.focus(),50)</script>
</body></html>`;
}

function slipHTML(order: Order, settings: SiteSettings) {
  const primary = settings.primary_color || "#ef4444";
  const created = new Date(order.created_at).toLocaleString("en-BD", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(order.id)}`;
  return `<!doctype html><html><head>${commonHead(`Slip ${order.id.slice(0, 8)}`, primary)}
<style>
  @page { size: 80mm auto; margin: 4mm }
  .slip{width:72mm;margin:0 auto;padding:8px 4px;font-size:12px;line-height:1.35}
  .slip h2{margin:0;font-size:14px;text-align:center}
  .slip .brand{text-align:center;border-bottom:1px dashed #999;padding-bottom:6px;margin-bottom:6px}
  .slip .row{display:flex;justify-content:space-between;gap:6px;margin:2px 0}
  .slip .section{border-top:1px dashed #999;margin-top:6px;padding-top:6px}
  .slip .big{font-size:14px;font-weight:700}
  .slip .center{text-align:center}
  .slip img.qr{display:block;margin:6px auto 2px;width:120px;height:120px}
  .slip .accent{color:${primary}}
</style></head><body>
${printBar()}
<div class="slip">
  <div class="brand">
    ${settings.logo_url ? `<img src="${esc(settings.logo_url)}" alt="" style="max-height:36px;margin:0 auto 4px;display:block" />` : ""}
    <h2 class="accent">${esc(settings.brand_name || "Order Slip")}</h2>
    ${settings.contact_phone ? `<div>📞 ${esc(settings.contact_phone)}</div>` : ""}
  </div>

  <div class="row"><span>Order</span><span class="big">#${esc(order.id.slice(0, 8).toUpperCase())}</span></div>
  <div class="row"><span>Date</span><span>${esc(created)}</span></div>
  ${order.courier_tracking_code ? `<div class="row"><span>Tracking</span><span><strong>${esc(order.courier_tracking_code)}</strong></span></div>` : ""}

  <div class="section">
    <div class="big">${esc(order.customer_name)}</div>
    <div>📱 ${esc(order.mobile)}</div>
    <div>${esc(order.address)}${order.area ? ` (${esc(order.area)})` : ""}</div>
  </div>

  <div class="section">
    <div class="row"><span>${esc(order.product_title)}</span></div>
    <div class="row"><span>${esc(order.variant_label ?? "")} × ${order.quantity}</span><span>${esc(formatBDT(Number(order.unit_price) * Number(order.quantity)))}</span></div>
    <div class="row"><span>Delivery</span><span>${esc(formatBDT(order.delivery_charge))}</span></div>
    <div class="row big accent"><span>COD Total</span><span>${esc(formatBDT(order.total))}</span></div>
  </div>

  <img class="qr" src="${qrSrc}" alt="QR" />
  <div class="center muted" style="font-size:10px">${esc(order.id)}</div>
  <div class="center" style="margin-top:6px">— Thank you —</div>
</div>
<script>setTimeout(()=>window.focus(),50)</script>
</body></html>`;
}

function openPrintable(html: string) {
  if (typeof window === "undefined") return;
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
    alert("Popup blocked. Please allow popups for this site to print.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export function printInvoice(order: Order, settings: SiteSettings) {
  openPrintable(invoiceHTML(order, settings));
}

export function printSlip(order: Order, settings: SiteSettings) {
  openPrintable(slipHTML(order, settings));
}

/** Print multiple slips on a single page (bulk shipping). */
export function printBulkSlips(orders: Order[], settings: SiteSettings) {
  if (orders.length === 0) return;
  const pages = orders
    .map((o) => slipHTML(o, settings).match(/<body>([\s\S]*)<\/body>/)?.[1] ?? "")
    .join('<div style="page-break-after:always"></div>');
  const html = `<!doctype html><html><head>${commonHead(`Bulk slips (${orders.length})`, settings.primary_color || "#ef4444")}</head><body>${pages}</body></html>`;
  openPrintable(html);
}
