import jsPDF from 'jspdf';
import { Order } from '../types/index.js';

export function generateReceiptPdf(order: Order) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // 1. Header Banner
  doc.setFillColor(79, 70, 229); // #4f46e5 Indigo
  doc.rect(0, 0, pageWidth, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PRINTHUB', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Print Order Receipt & Pickup Slip', 14, 26);

  doc.setFontSize(10);
  doc.text(`DATE: ${new Date(order.createdAt).toLocaleDateString()} ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 18, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(`ORDER #: ${order.orderNumber}`, pageWidth - 14, 26, { align: 'right' });

  // 2. Shop & Customer Details Grid
  doc.setTextColor(30, 41, 59); // Slate-800
  let y = 46;

  // Shop Box (Left)
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(14, y, (pageWidth - 34) / 2, 38, 2, 2, 'FD');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PRINT SHOP', 18, y + 8);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(order.shop?.name || 'PrintHub Authorized Shop', 18, y + 15);
  doc.text(order.shop?.address || '123 Tech Park Road', 18, y + 21);
  doc.text(`Phone: ${order.shop?.phone || '+91 9876543210'}`, 18, y + 27);
  doc.text('Status: Verified Print Partner', 18, y + 33);

  // Customer Box (Right)
  const rightX = 14 + (pageWidth - 34) / 2 + 6;
  doc.roundedRect(rightX, y, (pageWidth - 34) / 2, 38, 2, 2, 'FD');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CUSTOMER INFO', rightX + 4, y + 8);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${order.customer?.name || 'Valued Customer'}`, rightX + 4, y + 15);
  doc.text(`Email: ${order.customer?.email || 'N/A'}`, rightX + 4, y + 21);
  doc.text(`Phone: ${order.customer?.phone || '+91 9876500001'}`, rightX + 4, y + 27);
  const payLabel = order.paymentMethod === 'SHOP_UPI_QR'
    ? `Shop UPI QR (${order.upiTransactionRef || 'Verified'})`
    : `${order.paymentMethod} (PAID)`;
  doc.text(`Payment: ${payLabel}`, rightX + 4, y + 33);

  // 3. Items Table Header
  y = 92;
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.rect(14, y, pageWidth - 28, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);

  doc.text('#', 18, y + 5.5);
  doc.text('DOCUMENT / SPECS', 30, y + 5.5);
  doc.text('COLOR', 105, y + 5.5);
  doc.text('PAGES × COPIES', 135, y + 5.5);
  doc.text('TOTAL', pageWidth - 18, y + 5.5, { align: 'right' });

  // 4. Items Table Rows
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  order.items.forEach((item, index) => {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}`, 18, y + 4);
    
    // File name
    const truncatedName = item.originalFileName.length > 35
      ? item.originalFileName.substring(0, 32) + '...'
      : item.originalFileName;
    doc.text(truncatedName, 30, y + 4);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const duplexLabel = item.duplexMode === 'DUPLEX_SHORT' 
      ? 'Duplex (Short Edge)' 
      : (item.duplexMode === 'DUPLEX_LONG' || item.duplexMode === 'DUPLEX') 
        ? 'Duplex (Long Edge)' 
        : '1-Sided';
    const subsetLabel = item.pageSubset && item.pageSubset !== 'ALL' 
      ? ` | ${item.pageSubset === 'ODD' ? 'Odd Pgs' : 'Even Pgs'}` 
      : '';
    const scaleLabel = item.scaling && item.scaling !== 'FIT' ? ` | ${item.scaling}` : '';
    doc.text(`${item.paperSize} | ${item.orientation || 'Auto'} | ${duplexLabel}${subsetLabel}${scaleLabel} | Range: ${item.pageRange}`, 30, y + 9);

    // Color mode badge text
    doc.setTextColor(item.colorMode === 'COLOR' ? 190 : 30, item.colorMode === 'COLOR' ? 24 : 41, item.colorMode === 'COLOR' ? 93 : 59);
    doc.text(item.colorMode === 'COLOR' ? 'Color' : 'B&W', 105, y + 6);

    // Pages × Copies
    doc.setTextColor(15, 23, 42);
    doc.text(`${item.calculatedPages} pgs × ${item.copies}`, 135, y + 6);

    // Price
    doc.setFont('helvetica', 'bold');
    doc.text(`INR ${item.itemPrice.toFixed(2)}`, pageWidth - 18, y + 6, { align: 'right' });

    // Row divider line
    doc.setDrawColor(241, 245, 249);
    doc.line(14, y + 12, pageWidth - 14, y + 12);

    y += 14;
  });

  // 5. Total Calculation Summary Box
  y += 6;
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  const summaryWidth = 80;
  const summaryX = pageWidth - 14 - summaryWidth;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(summaryX, y, summaryWidth, 34, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Subtotal:', summaryX + 6, y + 8);
  doc.text(`INR ${order.totalAmount.toFixed(2)}`, summaryX + summaryWidth - 6, y + 8, { align: 'right' });

  doc.text('Convenience / Tax:', summaryX + 6, y + 15);
  doc.text('INR 0.00', summaryX + summaryWidth - 6, y + 15, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(summaryX + 6, y + 19, summaryX + summaryWidth - 6, y + 19);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text('Total Paid:', summaryX + 6, y + 27);
  doc.text(`INR ${order.totalAmount.toFixed(2)}`, summaryX + summaryWidth - 6, y + 27, { align: 'right' });

  // 6. Security / Pickup Verification Box
  doc.setFillColor(240, 253, 244); // Green-50
  doc.setDrawColor(187, 247, 208); // Green-200
  doc.roundedRect(14, y, (pageWidth - 34) - summaryWidth, 34, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // Green-800
  doc.text('PICKUP PASS STATUS: VALID', 20, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61);
  doc.text(`Order Status: ${order.status}`, 20, y + 17);
  doc.text('Show this digital receipt or mention your Order # at the counter.', 20, y + 24);

  // 7. Footer
  const footerY = doc.internal.pageSize.getHeight() - 14;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('PrintHub Platform — Automated Print Routing & Management • Support: support@printhub.com', pageWidth / 2, footerY, { align: 'center' });

  // Save PDF
  doc.save(`PrintHub_Receipt_${order.orderNumber}.pdf`);
}
