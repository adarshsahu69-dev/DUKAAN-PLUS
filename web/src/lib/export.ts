import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Product, Sale, Purchase } from "../types";
import { money, num, fmtDate } from "./format";

export function exportProductsCSV(products: Product[]) {
  const rows = products.map((p) => ({
    Name: p.name,
    SKU: p.sku || "",
    Barcode: p.barcode || "",
    Category: p.categoryName || "",
    Unit: p.unitCode || "",
    "Cost Price": p.costPrice,
    "Selling Price": p.sellingPrice,
    Stock: p.stockQty,
    "Reorder Level": p.reorderLevel,
    "Expiry Date": p.expiryDate || "",
    "Active": p.isActive ? "yes" : "no",
  }));
  downloadCSV("products.csv", rows);
}

export function exportSalesCSV(sales: Sale[]) {
  const rows = sales.map((s) => ({
    Invoice: s.invoiceNo,
    Date: s.createdAt,
    Customer: s.customerName || "",
    Total: s.total,
    Payment: s.paymentMethod,
    Credit: s.creditAmount,
  }));
  downloadCSV("sales.csv", rows);
}

export function downloadCSV(filename: string, data: any[]) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportSalesPDF(sale: Sale, items: any[]) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Kirana Shop", 14, 18);
  doc.setFontSize(11);
  doc.text(`Invoice: ${sale.invoiceNo}`, 14, 28);
  doc.text(`Date: ${fmtDate(sale.createdAt)}`, 14, 34);
  doc.text(`Customer: ${sale.customerName || "Walk-in"}`, 14, 40);
  doc.text(`Payment: ${sale.paymentMethod.toUpperCase()}`, 14, 46);

  autoTable(doc, {
    startY: 54,
    head: [["Item", "Qty", "Rate", "Total"]],
    body: items.map((i) => [
      i.productName,
      num(i.qty),
      money(i.unitPrice),
      money(i.lineTotal),
    ]),
  });
  // @ts-ignore
  const afterY = (doc as any).lastAutoTable.finalY + 10;
  doc.text(`Subtotal: ${money(sale.subtotal)}`, 140, afterY);
  doc.text(`Discount: -${money(sale.discountAmount)}`, 140, afterY + 6);
  doc.text(`Total: ${money(sale.total)}`, 140, afterY + 12);
  if (sale.creditAmount > 0) doc.text(`Credit: ${money(sale.creditAmount)}`, 140, afterY + 18);
  doc.save(`${sale.invoiceNo}.pdf`);
}

export function exportReportPDF(title: string, columns: string[], rows: any[][]) {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
  autoTable(doc, { startY: 28, head: [columns], body: rows });
  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}
