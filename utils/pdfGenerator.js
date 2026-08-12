import PDFDocument from 'pdfkit';

export const generateInvoicePDF = (order, res) => {
  const doc = new PDFDocument({ margin: 50 });

  // Pipe the PDF directly to the response
  doc.pipe(res);

  // --- Header ---
  doc
    .fillColor('#222')
    .fontSize(24)
    .text('ELSH', { align: 'center', characterSpacing: 4 })
    .fontSize(10)
    .fillColor('#888')
    .text('ESSENTIAL LUXURY', { align: 'center', characterSpacing: 2 })
    .moveDown(2);

  // --- Invoice Title & Details ---
  doc
    .fillColor('#222')
    .fontSize(16)
    .text('INVOICE', { align: 'center' })
    .moveDown(1.5);

  doc
    .fontSize(10)
    .text(`Order ID: ${order.orderId || order._id}`, 50, 160)
    .text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 175)
    .text(`Status: ${order.orderStatus}`, 50, 190);

  // --- Billing/Shipping Details ---
  doc
    .text('Billed To:', 300, 160)
    .text(order.shippingAddress.fullName, 300, 175)
    .text(order.shippingAddress.addressLine1, 300, 190);
    
  if (order.shippingAddress.addressLine2) {
    doc.text(order.shippingAddress.addressLine2, 300, 205);
    doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`, 300, 220);
  } else {
    doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}`, 300, 205);
  }

  doc.moveDown(4);

  // --- Table Header ---
  const tableTop = 270;
  doc.font('Helvetica-Bold');
  doc.text('Item', 50, tableTop);
  doc.text('Quantity', 280, tableTop);
  doc.text('Price', 370, tableTop);
  doc.text('Total', 470, tableTop);

  doc
    .moveTo(50, tableTop + 15)
    .lineTo(550, tableTop + 15)
    .stroke();

  doc.font('Helvetica');

  // --- Table Items ---
  let y = tableTop + 25;
  order.items.forEach(item => {
    const itemName = item.productName || (item.product ? item.product.name : 'Unknown Product');
    const variantName = item.variantName || (item.variant ? item.variant.size : 'Standard');
    
    doc.text(`${itemName} - ${variantName}`, 50, y, { width: 220 });
    doc.text(item.quantity.toString(), 280, y);
    doc.text(`INR ${item.price.toFixed(2)}`, 370, y);
    doc.text(`INR ${item.itemTotal.toFixed(2)}`, 470, y);
    y += 30;
  });

  doc
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke();

  // --- Totals ---
  y += 15;
  doc.text('Subtotal:', 370, y);
  doc.text(`INR ${order.pricing.subtotal.toFixed(2)}`, 470, y);
  y += 20;
  
  if (order.pricing.discount > 0) {
    doc.text('Discount:', 370, y);
    doc.text(`-INR ${order.pricing.discount.toFixed(2)}`, 470, y);
    y += 20;
  }

  doc.text('Shipping:', 370, y);
  doc.text(order.pricing.shippingFee > 0 ? `INR ${order.pricing.shippingFee.toFixed(2)}` : 'FREE', 470, y);
  y += 20;

  doc.font('Helvetica-Bold');
  doc.text('Total:', 370, y);
  doc.text(`INR ${order.pricing.totalAmount.toFixed(2)}`, 470, y);

  // --- Footer ---
  doc.font('Helvetica');
  doc
    .fontSize(10)
    .fillColor('#888')
    .text('Thank you for shopping with ELSH.', 50, 700, { align: 'center', width: 500 });

  doc.end();
};
