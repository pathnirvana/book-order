/**
 * Buddhist Aesthetic Executive Order Card Generator
 * High-resolution (1200x1500, 4:5 aspect ratio) Canvas 2D image generator
 * Designed for Path Nirvana Book Order Service
 */

import { ICONS } from './cardIcons.js';

/**
 * Preloads an image safely without tainting canvas
 */
export function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      // If error occurs, try fetching as blob
      if (src.startsWith('data:')) {
        resolve(null);
        return;
      }
      fetch(src)
        .then((res) => {
          if (!res.ok) throw new Error('Fetch failed');
          return res.blob();
        })
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const fbImg = new Image();
          fbImg.onload = () => {
            URL.revokeObjectURL(blobUrl);
            resolve(fbImg);
          };
          fbImg.onerror = () => {
            URL.revokeObjectURL(blobUrl);
            resolve(null);
          };
          fbImg.src = blobUrl;
        })
        .catch(() => resolve(null));
    };
    img.src = src;
  });
}

/**
 * Utility: Draws a rounded rectangle path
 */
export function drawCanvasRoundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth = 1) {
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    const r = typeof radius === 'number' ? radius : 8;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Utility: Draws an image inside a rounded clipping mask
 */
export function drawRoundedImage(ctx, img, x, y, width, height, radius) {
  if (!img) return;
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
  ctx.clip();
  ctx.drawImage(img, x, y, width, height);
  ctx.restore();

  // Subtle border around thumbnail
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/**
 * Fallback Vector: Sacred Lotus Flower (🪷)
 */
export function drawLotusIcon(ctx, cx, cy, size, petalColor = '#fef3c7', coreColor = '#f59e0b') {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size / 40;

  const glow = ctx.createRadialGradient(0, 0, 2 * s, 0, 0, 24 * s);
  glow.addColorStop(0, 'rgba(251, 191, 36, 0.35)');
  glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 24 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = petalColor;
  ctx.strokeStyle = coreColor;
  ctx.lineWidth = 1.2 * s;

  ctx.beginPath();
  ctx.moveTo(-4 * s, 10 * s);
  ctx.quadraticCurveTo(-22 * s, 8 * s, -24 * s, -4 * s);
  ctx.quadraticCurveTo(-14 * s, -14 * s, -2 * s, 2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(4 * s, 10 * s);
  ctx.quadraticCurveTo(22 * s, 8 * s, 24 * s, -4 * s);
  ctx.quadraticCurveTo(14 * s, -14 * s, 2 * s, 2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-3 * s, 11 * s);
  ctx.quadraticCurveTo(-16 * s, 2 * s, -14 * s, -16 * s);
  ctx.quadraticCurveTo(-6 * s, -12 * s, 0, 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(3 * s, 11 * s);
  ctx.quadraticCurveTo(16 * s, 2 * s, 14 * s, -16 * s);
  ctx.quadraticCurveTo(6 * s, -12 * s, 0, 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const centerGrad = ctx.createLinearGradient(0, -22 * s, 0, 10 * s);
  centerGrad.addColorStop(0, '#ffffff');
  centerGrad.addColorStop(1, petalColor);
  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.moveTo(0, -22 * s);
  ctx.quadraticCurveTo(9 * s, -8 * s, 5 * s, 12 * s);
  ctx.quadraticCurveTo(0, 14 * s, -5 * s, 12 * s);
  ctx.quadraticCurveTo(-9 * s, -8 * s, 0, -22 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.ellipse(0, 12 * s, 8 * s, 3.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Vector: Calendar Icon
 */
export function drawCalendarIcon(ctx, x, y, size, color = '#ffffff') {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 24;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * s;
  drawCanvasRoundedRect(ctx, 2 * s, 4 * s, 20 * s, 18 * s, 4 * s, 'rgba(255, 255, 255, 0.15)', color, 2 * s);

  ctx.fillStyle = color;
  ctx.fillRect(2 * s, 4 * s, 20 * s, 5 * s);

  ctx.fillStyle = color;
  ctx.fillRect(6 * s, 1 * s, 2.5 * s, 5 * s);
  ctx.fillRect(15.5 * s, 1 * s, 2.5 * s, 5 * s);

  ctx.fillStyle = color;
  const dots = [
    [6, 12], [11, 12], [16, 12],
    [6, 16], [11, 16], [16, 16]
  ];
  dots.forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(dx * s, dy * s, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

/**
 * Vector: Delivery Truck Icon
 */
export function drawTruckIcon(ctx, x, y, size, color = '#064e43') {
  ctx.save();
  ctx.translate(x, y);
  const s = size / 24;

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5 * s;

  ctx.beginPath();
  ctx.roundRect(1 * s, 3 * s, 13 * s, 12 * s, 2 * s);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(14 * s, 7 * s);
  ctx.lineTo(19 * s, 7 * s);
  ctx.lineTo(22 * s, 11 * s);
  ctx.lineTo(22 * s, 15 * s);
  ctx.lineTo(14 * s, 15 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(15.5 * s, 8.5 * s);
  ctx.lineTo(18.5 * s, 8.5 * s);
  ctx.lineTo(20.5 * s, 11.5 * s);
  ctx.lineTo(15.5 * s, 11.5 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.arc(5.5 * s, 16 * s, 2.8 * s, 0, Math.PI * 2);
  ctx.arc(17.5 * s, 16 * s, 2.8 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(5.5 * s, 16 * s, 1.1 * s, 0, Math.PI * 2);
  ctx.arc(17.5 * s, 16 * s, 1.1 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Fallback Vector: Classical Bank Medallion
 */
export function drawBankMedallion(ctx, cx, cy, radius) {
  ctx.save();
  ctx.translate(cx, cy);

  const outerGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
  outerGrad.addColorStop(0, '#fef08a');
  outerGrad.addColorStop(0.5, '#d97706');
  outerGrad.addColorStop(1, '#92400e');
  
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = outerGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, radius - 4, 0, Math.PI * 2);
  const innerGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, radius - 4);
  innerGrad.addColorStop(0, '#0f766e');
  innerGrad.addColorStop(1, '#064e43');
  ctx.fillStyle = innerGrad;
  ctx.fill();

  const s = radius / 36;
  ctx.fillStyle = '#fef3c7';

  ctx.beginPath();
  ctx.moveTo(0, -18 * s);
  ctx.lineTo(18 * s, -7 * s);
  ctx.lineTo(-18 * s, -7 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillRect(-19 * s, -6 * s, 38 * s, 3 * s);

  const pillarX = [-14, -5, 5, 14];
  pillarX.forEach((px) => {
    ctx.fillRect((px - 1.8) * s, -2 * s, 3.6 * s, 12 * s);
  });

  ctx.fillRect(-20 * s, 11 * s, 40 * s, 3.5 * s);
  ctx.fillRect(-22 * s, 15 * s, 44 * s, 3.5 * s);

  ctx.restore();
}

/**
 * Vector: Vintage Scroll Ribbon with Bold Sinhala Notice
 */
export function drawRibbonScroll(ctx, x, y, width, height, text, ribbonColor = '#991b1b', textColor = '#ffffff') {
  ctx.save();
  const tailWidth = 26;
  const foldOffset = 10;

  // Left Ribbon Tail
  ctx.fillStyle = '#701a75';
  ctx.beginPath();
  ctx.moveTo(x + 12, y + height);
  ctx.lineTo(x + 12, y + height + foldOffset);
  ctx.lineTo(x + 24, y + height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 6);
  ctx.lineTo(x - tailWidth, y + 6);
  ctx.lineTo(x - tailWidth + 14, y + height / 2 + 3);
  ctx.lineTo(x - tailWidth, y + height);
  ctx.lineTo(x + 12, y + height);
  ctx.closePath();
  ctx.fill();

  // Right Ribbon Tail
  ctx.fillStyle = '#701a75';
  ctx.beginPath();
  ctx.moveTo(x + width - 12, y + height);
  ctx.lineTo(x + width - 12, y + height + foldOffset);
  ctx.lineTo(x + width - 24, y + height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#7f1d1d';
  ctx.beginPath();
  ctx.moveTo(x + width - 12, y + 6);
  ctx.lineTo(x + width + tailWidth, y + 6);
  ctx.lineTo(x + width + tailWidth - 14, y + height / 2 + 3);
  ctx.lineTo(x + width + tailWidth, y + height);
  ctx.lineTo(x + width - 12, y + height);
  ctx.closePath();
  ctx.fill();

  // Main Ribbon Body
  const ribbonGrad = ctx.createLinearGradient(x, y, x, y + height);
  ribbonGrad.addColorStop(0, '#b91c1c');
  ribbonGrad.addColorStop(0.5, ribbonColor);
  ribbonGrad.addColorStop(1, '#7f1d1d');

  drawCanvasRoundedRect(ctx, x, y, width, height, 8, ribbonGrad, '#f59e0b', 2);

  // Bold Text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.font = 'bold 22px "Noto Sans Sinhala", Outfit, sans-serif';
  ctx.fillText(text, x + width / 2, y + height / 2 + 1);

  ctx.restore();
}

/**
 * Fallback Vector: WhatsApp Medallion Seal
 */
export function drawWhatsAppMedallion(ctx, cx, cy, radius) {
  ctx.save();
  ctx.translate(cx, cy);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, radius - 2.5, 0, Math.PI * 2);
  const waGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
  waGrad.addColorStop(0, '#25d366');
  waGrad.addColorStop(1, '#128c7e');
  ctx.fillStyle = waGrad;
  ctx.fill();

  const s = radius / 22;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 11 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-6 * s, 8 * s);
  ctx.lineTo(-11 * s, 13 * s);
  ctx.lineTo(-2 * s, 10 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#128c7e';
  ctx.beginPath();
  ctx.arc(0, 0, 7.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(0, 0, 3 * s, 5.5 * s, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the entire executive Buddhist order summary card
 */
export function drawOrderCard(ctx, w, h, data, assets = {}) {
  const {
    activeBooks = [],
    totalBooksCount = 0,
    booksCost = 0,
    deliveryMethod = 'courier',
    deliveryCost = 0,
    totalCost = 0,
    bankInfo = {},
    contactInfo = {}
  } = data;

  const {
    bookCovers = {},
    lotusIcon = null,
    bankIcon = null,
    whatsappIcon = null
  } = assets;

  // 1. Canvas Background: warm calm parchment
  ctx.fillStyle = '#f3efe8';
  ctx.fillRect(0, 0, w, h);

  // 2. Outer Card with delicate drop shadow and gold inner trim
  const cardX = 40;
  const cardY = 36;
  const cardW = 1120;
  const cardH = 1428;
  const cardR = 28;

  ctx.save();
  ctx.shadowColor = 'rgba(15, 118, 110, 0.12)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 10;
  drawCanvasRoundedRect(ctx, cardX, cardY, cardW, cardH, cardR, '#ffffff', '#e3dcd1', 2);
  ctx.restore();

  // Inner subtle gold border
  drawCanvasRoundedRect(ctx, cardX + 6, cardY + 6, cardW - 12, cardH - 12, cardR - 4, null, 'rgba(217, 119, 6, 0.15)', 1);

  // 3. Header Banner (Clipped to card top corners)
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(cardX, cardY, cardW, cardH, cardR);
  } else {
    ctx.rect(cardX, cardY, cardW, cardH);
  }
  ctx.clip();

  const headerH = 166;
  const headerGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + headerH);
  headerGrad.addColorStop(0, '#04342d');
  headerGrad.addColorStop(0.5, '#074e44');
  headerGrad.addColorStop(1, '#0e695d');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(cardX, cardY, cardW, headerH);

  // Golden accent top stripe
  const goldStripe = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
  goldStripe.addColorStop(0, '#d97706');
  goldStripe.addColorStop(0.5, '#fef08a');
  goldStripe.addColorStop(1, '#d97706');
  ctx.fillStyle = goldStripe;
  ctx.fillRect(cardX, cardY, cardW, 6);

  // Lotus Icon in Header (Use directly from user uploaded icon)
  if (lotusIcon) {
    ctx.save();
    // Soft glowing backdrop
    const lGlow = ctx.createRadialGradient(cardX + 66, cardY + 84, 10, cardX + 66, cardY + 84, 34);
    lGlow.addColorStop(0, 'rgba(254, 240, 138, 0.25)');
    lGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = lGlow;
    ctx.beginPath();
    ctx.arc(cardX + 66, cardY + 84, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(lotusIcon, cardX + 38, cardY + 56, 56, 56);
    ctx.restore();
  } else {
    drawLotusIcon(ctx, cardX + 66, cardY + 84, 48, '#fef3c7', '#f59e0b');
  }

  // Brand Name & Subtitle
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px Outfit, sans-serif';
  ctx.fillText('Path Nirvana', cardX + 110, cardY + 82);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '500 18px "Noto Sans Sinhala", Outfit, sans-serif';
  ctx.fillText('හෝමාගම (Homagama) • ධර්ම දාන පොත් සේවාව', cardX + 110, cardY + 116);

  // Top-Right Badges: Date & Delivery
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const datePillW = 205;
  const datePillH = 40;
  const datePillX = cardX + cardW - datePillW - 36;
  const datePillY = cardY + 34;
  drawCanvasRoundedRect(ctx, datePillX, datePillY, datePillW, datePillH, 20, 'rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.3)', 1);
  drawCalendarIcon(ctx, datePillX + 14, datePillY + 9, 22, '#ffffff');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Outfit, sans-serif';
  ctx.fillText(dateStr, datePillX + 116, datePillY + 25);

  // Delivery Pill
  const delPillW = 245;
  const delPillH = 46;
  const delPillX = cardX + cardW - delPillW - 36;
  const delPillY = cardY + 86;
  drawCanvasRoundedRect(ctx, delPillX, delPillY, delPillW, delPillH, 23, '#ffffff', '#f59e0b', 1.5);
  drawTruckIcon(ctx, delPillX + 14, delPillY + 11, 24, '#064e43');
  
  const delName = deliveryMethod === 'courier' ? 'කූරියර් Courier' : (deliveryMethod === 'pickmeFlash' ? 'PickMe Flash' : 'පැමිණ ලබා ගැනීම');
  ctx.textAlign = 'center';
  ctx.fillStyle = '#064e43';
  ctx.font = 'bold 17px "Noto Sans Sinhala", sans-serif';
  ctx.fillText(delName, delPillX + 138, delPillY + 29);

  ctx.restore();

  // 4. Centered Floating Buddhist Motto Plaque (Overlapping bottom edge of header)
  const plaqueW = 560;
  const plaqueH = 44;
  const plaqueX = (w - plaqueW) / 2;
  const plaqueY = cardY + headerH - 22;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  drawCanvasRoundedRect(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 22, '#032620', '#f59e0b', 2);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 19px "Noto Sans Sinhala", serif';
  ctx.fillText('❖  සබ්බ දානං ධම්ම දානං ජිනාති  ❖', w / 2, plaqueY + plaqueH / 2 + 1);

  // 5. Section 1: Ordered Books
  let curY = plaqueY + plaqueH + 26;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 22px "Noto Sans Sinhala", Outfit, sans-serif';
  ctx.fillText('1. ඇණවුම් කළ පොත් (Ordered Books)', cardX + 36, curY);

  curY += 16;
  const bookCount = activeBooks.length;
  const bookCardH = bookCount === 1 ? 142 : 124;

  activeBooks.forEach((b) => {
    const q = Number(b.quantity) || 0;
    const itemTotal = q * (b.costLkr || 0);
    const itemCardX = cardX + 36;
    const itemCardW = cardW - 72;

    drawCanvasRoundedRect(ctx, itemCardX, curY, itemCardW, bookCardH, 16, '#fbfbfa', '#e5e7eb', 1.5);

    // Book Cover Image
    const coverImg = bookCovers[b.id];
    const imgW = 72;
    const imgH = bookCardH === 142 ? 116 : 102;
    const imgY = curY + (bookCardH - imgH) / 2;
    if (coverImg) {
      drawRoundedImage(ctx, coverImg, itemCardX + 16, imgY, imgW, imgH, 8);
    } else {
      drawCanvasRoundedRect(ctx, itemCardX + 16, imgY, imgW, imgH, 8, '#e5e7eb', '#d1d5db');
      ctx.fillStyle = '#9ca3af';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📖', itemCardX + 16 + imgW / 2, imgY + imgH / 2 + 8);
    }

    // Book Title and Specs
    const textX = itemCardX + 16 + imgW + 18;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 22px "Noto Sans Sinhala", sans-serif';
    ctx.fillText(b.titleSinhala, textX, curY + 40);

    ctx.fillStyle = '#6b7280';
    ctx.font = '500 16px "Noto Sans Sinhala", Outfit, sans-serif';
    ctx.fillText(`රු. ${b.costLkr} බැගින්  •  බර: ${b.weightGrams}g  •  පිටු ${b.pages}`, textX, curY + 70);

    ctx.fillStyle = '#0f766e';
    ctx.font = '500 14px "Noto Sans Sinhala", sans-serif';
    ctx.fillText('✓ ධර්ම දානයක් ලෙස මුද්‍රණ වියදමටත් වඩා අඩුවෙන්', textX, curY + 98);

    // Prominent Quantity Box
    const qtyBoxW = 125;
    const qtyBoxH = 92;
    const qtyBoxX = itemCardX + itemCardW - 320;
    const qtyBoxY = curY + (bookCardH - qtyBoxH) / 2;

    drawCanvasRoundedRect(ctx, qtyBoxX, qtyBoxY, qtyBoxW, qtyBoxH, 14, '#f0fdfa', '#0f766e', 2);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 12px "Noto Sans Sinhala", Outfit, sans-serif';
    ctx.fillText('ප්‍රමාණය (QTY)', qtyBoxX + qtyBoxW / 2, qtyBoxY + 22);

    ctx.fillStyle = '#044e43';
    ctx.font = 'bold 40px Outfit, sans-serif';
    ctx.fillText(String(q), qtyBoxX + qtyBoxW / 2, qtyBoxY + 62);

    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 12px "Noto Sans Sinhala", sans-serif';
    ctx.fillText('පොත් (Books)', qtyBoxX + qtyBoxW / 2, qtyBoxY + 82);

    // Subtotal Box on Right
    const subtotalX = itemCardX + itemCardW - 20;
    ctx.textAlign = 'right';
    ctx.fillStyle = '#6b7280';
    ctx.font = '500 14px "Noto Sans Sinhala", Outfit, sans-serif';
    ctx.fillText('එකතුව (Subtotal)', subtotalX, curY + 38);

    ctx.fillStyle = '#047857';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillText(`රු. ${itemTotal.toLocaleString()}`, subtotalX, curY + 74);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '500 14px Outfit, "Noto Sans Sinhala", sans-serif';
    ctx.fillText(`(${q} × රු. ${b.costLkr})`, subtotalX, curY + 98);

    curY += bookCardH + 12;
  });

  // 6. Section 2: Split Grand Total & Delivery Breakdown Banner
  curY += 8;
  const bannerX = cardX + 36;
  const bannerW = cardW - 72;
  const bannerH = 132;

  // Left Plate: Delivery & Books Breakdown
  const leftW = Math.round(bannerW * 0.56);
  const leftGrad = ctx.createLinearGradient(bannerX, curY, bannerX + leftW, curY + bannerH);
  leftGrad.addColorStop(0, '#04342d');
  leftGrad.addColorStop(1, '#0b5247');

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.14)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  drawCanvasRoundedRect(ctx, bannerX, curY, leftW, bannerH, 18, leftGrad, null);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Delivery breakdown
  ctx.fillStyle = '#a7f3d0';
  ctx.font = '500 17px "Noto Sans Sinhala", Outfit, sans-serif';
  const delLabel = deliveryMethod === 'courier' ? '📦 කූරියර් Courier ගාස්තුව:' : (deliveryMethod === 'pickmeFlash' ? '⚡ PickMe Flash ගාස්තුව:' : '🚶 ලබා ගැනීම (Homagama):');
  ctx.fillText(delLabel, bannerX + 24, curY + 46);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Outfit, "Noto Sans Sinhala", sans-serif';
  const delValStr = deliveryCost > 0 ? `රු. ${deliveryCost.toLocaleString()}` : (deliveryMethod === 'pickup' ? 'නොමිලේ (Free)' : 'පාරිභෝගිකයා ගෙවයි');
  ctx.fillText(delValStr, bannerX + leftW - 24, curY + 46);

  // Books breakdown
  ctx.textAlign = 'left';
  ctx.fillStyle = '#a7f3d0';
  ctx.font = '500 17px "Noto Sans Sinhala", Outfit, sans-serif';
  ctx.fillText(`📚 පොත් ${totalBooksCount} සඳහා එකතුව:`, bannerX + 24, curY + 94);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Outfit, sans-serif';
  ctx.fillText(`රු. ${booksCost.toLocaleString()}`, bannerX + leftW - 24, curY + 94);

  // Right Plate: Radiant Warm Brass / Gold Grand Total Plate
  const rightX = bannerX + leftW + 12;
  const rightW = bannerW - leftW - 12;

  const goldPlate = ctx.createLinearGradient(rightX, curY, rightX + rightW, curY + bannerH);
  goldPlate.addColorStop(0, '#f59e0b');
  goldPlate.addColorStop(0.3, '#fbbf24');
  goldPlate.addColorStop(0.7, '#d97706');
  goldPlate.addColorStop(1, '#b45309');

  ctx.save();
  ctx.shadowColor = 'rgba(180, 83, 9, 0.25)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  drawCanvasRoundedRect(ctx, rightX, curY, rightW, bannerH, 18, goldPlate, '#78350f', 1.5);
  ctx.restore();

  // Grand Total Content
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 14px Outfit, "Noto Sans Sinhala", sans-serif';
  ctx.fillText('ගෙවිය යුතු මුළු මුදල (GRAND TOTAL)', rightX + rightW / 2, curY + 36);

  ctx.fillStyle = '#1c0c02';
  ctx.font = 'bold 46px Outfit, sans-serif';
  ctx.fillText(`රු. ${totalCost.toLocaleString()}`, rightX + rightW / 2, curY + 84);

  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 13px "Noto Sans Sinhala", sans-serif';
  ctx.fillText('තැන්පත් කළ යුතු මුළු එකතුව', rightX + rightW / 2, curY + 112);

  // 7. Section 3: Bank Transfer Details
  curY += bannerH + 28;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 22px "Noto Sans Sinhala", Outfit, sans-serif';
  ctx.fillText('2. බැංකු තැන්පතු විස්තර (Bank Transfer Details)', cardX + 36, curY);

  curY += 16;
  const bankCardX = cardX + 36;
  const bankCardW = cardW - 72;
  const bankCardH = 296;

  drawCanvasRoundedRect(ctx, bankCardX, curY, bankCardW, bankCardH, 20, '#fcfbfa', '#e5e7eb', 1.5);

  // Vintage Scroll Ribbon: "කලින් මුදල් තැන්පත් කළ යුතුය (COD නොමැත)"
  const ribbonW = bankCardW - 140;
  const ribbonH = 52;
  const ribbonX = bankCardX + (bankCardW - ribbonW) / 2;
  const ribbonY = curY + 16;

  drawRibbonScroll(
    ctx,
    ribbonX,
    ribbonY,
    ribbonW,
    ribbonH,
    '⚠️ කලින් මුදල් තැන්පත් කළ යුතුය  (COD නොමැත)',
    '#991b1b',
    '#ffffff'
  );

  // Bank Details Layout
  const detailY = ribbonY + ribbonH + 24;

  // Bank Medallion Seal (Using user uploaded bank icon directly)
  const bMedRadius = 42;
  const bMedCx = bankCardX + 66;
  const bMedCy = detailY + 60;

  // Medallion outer gold backing circle
  drawCanvasRoundedRect(ctx, bMedCx - bMedRadius, bMedCy - bMedRadius, bMedRadius * 2, bMedRadius * 2, bMedRadius, '#fef3c7', '#d97706', 2.5);

  if (bankIcon) {
    ctx.drawImage(bankIcon, bMedCx - 26, bMedCy - 26, 52, 52);
  } else {
    drawBankMedallion(ctx, bMedCx, bMedCy, bMedRadius);
  }

  // Bank & Branch Names
  const bankTextX = bankCardX + 130;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 23px Outfit, "Noto Sans Sinhala", sans-serif';
  ctx.fillText(bankInfo.bankName || 'Commercial Bank (කොමර්ෂල් බැංකුව)', bankTextX, detailY + 36);

  ctx.fillStyle = '#4b5563';
  ctx.font = '500 17px "Noto Sans Sinhala", Outfit, sans-serif';
  ctx.fillText(`ශාඛාව: ${bankInfo.branch || 'Homagama (හෝමාගම)'}`, bankTextX, detailY + 68);

  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 19px Outfit, "Noto Sans Sinhala", sans-serif';
  ctx.fillText(`ගිණුමේ නම: ${bankInfo.accountName || 'LJ Pradeep'}`, bankTextX, detailY + 102);

  // Account Number Display Box
  const accBoxW = 410;
  const accBoxH = 104;
  const accBoxX = bankCardX + bankCardW - accBoxW - 24;
  const accBoxY = detailY + 10;

  drawCanvasRoundedRect(ctx, accBoxX, accBoxY, accBoxW, accBoxH, 16, '#f0fdf4', '#16a34a', 2);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#15803d';
  ctx.font = 'bold 13px Outfit, "Noto Sans Sinhala", sans-serif';
  ctx.fillText('ගිණුම් අංකය (ACCOUNT NUMBER)', accBoxX + accBoxW / 2, accBoxY + 28);

  const rawAcc = String(bankInfo.accountNumber || '8029909489');
  const spacedAcc = rawAcc.length === 10
    ? `${rawAcc.slice(0, 4)}  ${rawAcc.slice(4, 8)}  ${rawAcc.slice(8)}`
    : rawAcc;

  ctx.fillStyle = '#052e16';
  ctx.font = 'bold 36px monospace, Outfit, sans-serif';
  ctx.fillText(spacedAcc, accBoxX + accBoxW / 2, accBoxY + 68);

  ctx.fillStyle = '#166534';
  ctx.font = '500 13px "Noto Sans Sinhala", Outfit, sans-serif';
  ctx.fillText('Commercial Bank • හෝමාගම ශාඛාව', accBoxX + accBoxW / 2, accBoxY + 92);

  // 8. Section 4: What to Send After Payment (Next Steps)
  curY += bankCardH + 26;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1f2937';
  ctx.font = 'bold 21px "Noto Sans Sinhala", Outfit, sans-serif';
  ctx.fillText('3. තැන්පතුවෙන් පසු එවන්න (Send After Deposit)', cardX + 36, curY);

  curY += 14;
  const stepsY = curY;
  const stepCardH = 78;
  const totalStepsW = cardW - 72;
  const singleStepW = Math.round((totalStepsW - 48) / 3);

  const steps = [
    { num: '①', icon: '🧾', title: 'Deposit Slip', sub: 'බැංකු තැන්පතු පත්‍රිකාව' },
    { num: '②', icon: '🔤', title: 'Name & Address', sub: 'English වලින් නම හා ලිපිනය' },
    { num: '③', icon: '📞', title: 'Phone Number', sub: 'දුරකථන අංකය' }
  ];

  steps.forEach((step, idx) => {
    const sX = cardX + 36 + idx * (singleStepW + 24);
    drawCanvasRoundedRect(ctx, sX, stepsY, singleStepW, stepCardH, 14, '#f8fafc', '#cbd5e1', 1.5);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 20px Outfit, "Noto Sans Sinhala", sans-serif';
    ctx.fillText(`${step.num} ${step.icon} ${step.title}`, sX + 16, stepsY + 34);

    ctx.fillStyle = '#475569';
    ctx.font = '500 15px "Noto Sans Sinhala", sans-serif';
    ctx.fillText(step.sub, sX + 16, stepsY + 60);

    if (idx < steps.length - 1) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('➔', sX + singleStepW + 12, stepsY + 44);
    }
  });

  // 9. Section 5: WhatsApp Action Bar & Footer
  curY = stepsY + stepCardH + 20;

  const waBarW = cardW - 72;
  const waBarH = 74;
  const waBarX = cardX + 36;

  const waGrad = ctx.createLinearGradient(waBarX, curY, waBarX + waBarW, curY + waBarH);
  waGrad.addColorStop(0, '#075e54');
  waGrad.addColorStop(1, '#128c7e');

  ctx.save();
  ctx.shadowColor = 'rgba(18, 140, 126, 0.25)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  drawCanvasRoundedRect(ctx, waBarX, curY, waBarW, waBarH, 16, waGrad, null);
  ctx.restore();

  // WhatsApp Icon (Using user uploaded icon directly)
  if (whatsappIcon) {
    ctx.drawImage(whatsappIcon, waBarX + 18, curY + (waBarH - 50) / 2, 50, 50);
  } else {
    drawWhatsAppMedallion(ctx, waBarX + 44, curY + waBarH / 2, 24);
  }

  // WhatsApp Text
  const waDisplay = contactInfo.whatsappDisplay || '071 521 5866';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 23px Outfit, "Noto Sans Sinhala", sans-serif';
  ctx.fillText(`WhatsApp ${waDisplay} වෙත විස්තර එවන්න`, waBarX + 80, curY + 37);

  ctx.fillStyle = '#d1fae5';
  ctx.font = '500 15px "Noto Sans Sinhala", sans-serif';
  ctx.fillText('(බැංකු තැන්පතු පත්‍රිකාව සහ ඔබගේ විස්තර WhatsApp කරන්න)', waBarX + 80, curY + 60);

  // 10. Elegant Card Footer
  const footerLineY = curY + waBarH + 24;
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 40, footerLineY);
  ctx.lineTo(cardX + cardW - 40, footerLineY);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#9ca3af';
  ctx.font = '500 16px Outfit, "Noto Sans Sinhala", sans-serif';
  ctx.fillText('Path Nirvana • හෝමාගම • ධර්ම දාන පොත් සේවාව • pathnirvana.org', w / 2, footerLineY + 28);
}

/**
 * Main function: Generates the order card canvas, copies to clipboard or triggers fallback download
 */
export async function copyOrderCardScreenshot(orderData) {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // Preload book covers and user-provided icons in parallel
  const [bookCovers, lotusIcon, bankIcon, whatsappIcon] = await Promise.all([
    (async () => {
      const covers = {};
      if (Array.isArray(orderData.activeBooks)) {
        await Promise.all(
          orderData.activeBooks.map(async (b) => {
            if (b.coverImage) {
              const coverRel = b.coverImage.startsWith('./') ? b.coverImage.slice(2) : b.coverImage;
              const src = new URL(coverRel, window.location.href).href;
              const img = await preloadImage(src);
              if (img) covers[b.id] = img;
            }
          })
        );
      }
      return covers;
    })(),
    preloadImage(ICONS.lotus),
    preloadImage(ICONS.bank),
    preloadImage(ICONS.whatsapp)
  ]);

  const canvas = document.createElement('canvas');
  const w = 1200;
  const h = 1500; // Ultra-crisp 4:5 aspect ratio
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  drawOrderCard(ctx, w, h, orderData, {
    bookCovers,
    lotusIcon,
    bankIcon,
    whatsappIcon
  });

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Canvas blob generation failed');
  }

  // Try writing to clipboard
  let copied = false;
  if (navigator.clipboard && typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      copied = true;
    } catch (clipErr) {
      console.warn('Clipboard write failed or permission blocked, falling back to download:', clipErr);
    }
  }

  if (!copied) {
    // Robust fallback: Trigger instant download so the user always receives the image!
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `path-nirvana-order-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    return 'downloaded';
  }

  return 'copied';
}
