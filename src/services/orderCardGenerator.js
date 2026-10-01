/**
 * Path Nirvana Order Card Generator
 * Draws the order summary image (1080px wide, height fits the content) with the
 * Canvas 2D API, rendered at 2x for crisp text and a scannable LankaQR code.
 * Layout: hero (headline + covers) → receipt → bank + LankaQR → steps → WhatsApp → footer
 */

import { ICONS } from './cardIcons.js';

const W = 1080;
const PAD = 56;
const INNER = W - PAD * 2;
const SCALE = 2;

const SANS = 'Outfit, "Noto Sans Sinhala", sans-serif';
const SINHALA = '"Noto Sans Sinhala", Outfit, sans-serif';
const SERIF = '"Noto Serif Sinhala", "Noto Sans Sinhala", serif';

const COLORS = {
  pine: '#0a3d35',
  pineDeep: '#06261f',
  pineLight: '#16695b',
  gold: '#b8862b',
  goldLight: '#f3d27a',
  cream: '#f6efe2',
  paper: '#fffdf8',
  line: '#e7dcc6',
  dash: '#e2d6bd',
  ink: '#1d2a26',
  text: '#3a4743',
  muted: '#8a8f88',
  red: '#b3261e',
  whatsapp: '#1fa855',
};

// Fonts the card uses; loaded explicitly because the page itself may not use them yet
const FONT_SPECS = [
  `700 60px ${SERIF}`, `600 22px ${SERIF}`,
  `800 64px ${SANS}`, `700 30px ${SANS}`, `600 22px ${SANS}`, `500 16px ${SANS}`,
  `400 22px ${SINHALA}`, `700 24px ${SINHALA}`, `500 18px ${SINHALA}`,
];

// Vertical layout (logical px)
const HERO_H = 430;
const RECEIPT_PAD = 26;
const ROW_H = 50;
const SEP_H = 22;
const TOTAL_H = 90;
const PAY_H = 250;
const QR_TILE_W = 250;
const STEPS_H = 56;
const WA_H = 92;
const FOOTER_H = 60;
const GAP = 24;

const DELIVERY_STEPS = {
  courier: [
    ['මුදල් තැන්පත් කරන්න', 'ගිණුමට හෝ LankaQR'],
    ['Slip එක එවන්න', 'WhatsApp මඟින්'],
    ['Name, Address, Phone', 'English වලින්'],
  ],
  pickmeFlash: [
    ['පොත් මුදල ගෙවන්න', 'ගිණුමට හෝ LankaQR'],
    ['Slip, ලිපිනය එවන්න', 'WhatsApp මඟින්'],
    ['Delivery ගාස්තුව', 'රියදුරුට ගෙවන්න'],
  ],
  pickup: [
    ['කලින් ගෙවන්න', 'හෝ පැමිණ ගෙවන්න'],
    ['Slip එක එවන්න', 'WhatsApp මඟින්'],
    ['පැමිණ ලබා ගන්න', 'Path Nirvana හෝමාගම'],
  ],
};

/**
 * Preloads an image safely without tainting canvas
 */
export function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function fillRoundedRect(ctx, x, y, w, h, r, fill, stroke, lineWidth = 1) {
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function setFont(ctx, weight, size, family = SANS) {
  ctx.font = `${weight} ${size}px ${family}`;
}

/** Largest font size (down to minSize) at which text fits maxWidth */
function fitFontSize(ctx, text, maxWidth, weight, size, family, minSize) {
  let s = size;
  setFont(ctx, weight, s, family);
  while (s > minSize && ctx.measureText(text).width > maxWidth) {
    s -= 1;
    setFont(ctx, weight, s, family);
  }
  return s;
}

/** Truncates text with an ellipsis to fit maxWidth using the current font */
function ellipsize(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

/** Draws text with manual letter spacing (canvas letterSpacing is not universal) */
function drawSpacedText(ctx, text, x, y, spacing) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  return cx - spacing - x;
}

function formatLkr(n) {
  return Number(n || 0).toLocaleString('en-US');
}

function receiptRows(data) {
  const { activeBooks = [], deliveryMethod, deliveryCost = 0, roundingAdjustment = 0, parcelWeightKg = 0 } = data;
  const rows = activeBooks.map((b) => ({
    label: b.titleSinhala,
    note: `${b.quantity} × රු. ${b.costLkr}`,
    value: `රු. ${formatLkr(b.quantity * b.costLkr)}`,
  }));

  if (deliveryMethod === 'courier') {
    rows.push({ label: 'කූරියර් ගාස්තුව', note: `${Number(parcelWeightKg.toFixed(2))} kg • දින 3–10`, value: `රු. ${formatLkr(deliveryCost)}` });
  } else if (deliveryMethod === 'pickmeFlash') {
    rows.push({ label: 'PickMe Flash', note: 'හෝමාගම සිට 20km තුළ', value: 'රියදුරුට ගෙවන්න' });
  } else {
    rows.push({ label: 'පැමිණ ලබා ගැනීම', note: 'Path Nirvana හෝමාගම', value: 'නොමිලේ' });
  }

  if (roundingAdjustment > 0) {
    rows.push({ label: 'වටයීම (Rounding)', value: `+ රු. ${formatLkr(roundingAdjustment)}`, muted: true });
  }
  return rows;
}

/** Computes the y position of every section so the canvas height fits the content */
function computeLayout(data) {
  const rows = receiptRows(data);
  const receiptY = HERO_H + 34;
  const receiptH = RECEIPT_PAD * 2 + rows.length * ROW_H + SEP_H + TOTAL_H;
  const payY = receiptY + receiptH + 22;
  const stepsY = payY + PAY_H + GAP;
  const waY = stepsY + STEPS_H + GAP;
  const footerY = waY + WA_H;
  return { rows, receiptY, receiptH, payY, stepsY, waY, footerY, height: footerY + FOOTER_H };
}

function drawHero(ctx, data, assets) {
  const { activeBooks = [], totalBooksCount = 0 } = data;
  const { bookCovers = {}, lotusIcon } = assets;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, HERO_H);
  ctx.clip();

  const bg = ctx.createRadialGradient(W * 0.8, HERO_H * 0.1, 0, W * 0.8, HERO_H * 0.1, W);
  bg.addColorStop(0, COLORS.pineLight);
  bg.addColorStop(0.55, COLORS.pine);
  bg.addColorStop(1, COLORS.pineDeep);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, HERO_H);

  // Brand
  if (lotusIcon) ctx.drawImage(lotusIcon, PAD, 44, 46, 46);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  setFont(ctx, 700, 30);
  ctx.fillText('Path Nirvana', PAD + 60, 74);
  ctx.fillStyle = '#bfe3d8';
  setFont(ctx, 500, 17, SINHALA);
  ctx.fillText('ධර්ම දාන පොත් සේවාව • හෝමාගම', PAD + 60, 99);

  // Price date (top right)
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  setFont(ctx, 600, 17);
  ctx.fillText(dateStr, W - PAD, 72);
  const dateW = ctx.measureText(dateStr).width;
  ctx.fillStyle = '#cfe8e0';
  setFont(ctx, 500, 17, SINHALA);
  ctx.fillText('මිල ගණන් ', W - PAD - dateW, 72);

  // Book covers fanned on the right, with quantity tags
  drawCoverFan(ctx, activeBooks, bookCovers);

  // Headline: "දහම් පොත් {n}ක් / දන් දීමට"
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.goldLight;
  setFont(ctx, 600, 20, SINHALA);
  ctx.fillText('ඔබගේ ධර්ම දාන ඇණවුම', PAD, 176);

  const pre = 'දහම් පොත් ';
  const num = String(totalBooksCount);
  const post = 'ක්';
  const maxHeadlineW = 560;
  let size = 60;
  const lineWidth = (s) => {
    setFont(ctx, 700, s, SERIF);
    const a = ctx.measureText(pre).width + ctx.measureText(post).width;
    setFont(ctx, 800, s + 4);
    return a + ctx.measureText(num).width;
  };
  while (size > 40 && lineWidth(size) > maxHeadlineW) size -= 2;

  let x = PAD;
  const line1Y = 250;
  ctx.fillStyle = '#ffffff';
  setFont(ctx, 700, size, SERIF);
  ctx.fillText(pre, x, line1Y);
  x += ctx.measureText(pre).width;
  ctx.fillStyle = COLORS.goldLight;
  setFont(ctx, 800, size + 4);
  ctx.fillText(num, x, line1Y);
  x += ctx.measureText(num).width;
  ctx.fillStyle = '#ffffff';
  setFont(ctx, 700, size, SERIF);
  ctx.fillText(post, x, line1Y);
  ctx.fillText('දන් දීමට', PAD, line1Y + 75);

  // Motto
  ctx.fillStyle = '#e7d9b5';
  setFont(ctx, 600, 22, SERIF);
  ctx.fillText('“සබ්බ දානං ධම්ම දානං ජිනාති”', PAD, 380);
  ctx.fillStyle = '#9fc9bd';
  setFont(ctx, 'italic 500', 16);
  ctx.fillText('The gift of Dhamma excels all gifts', PAD, 404);

  ctx.restore();

  // Gold rule under the hero
  const rule = ctx.createLinearGradient(0, 0, W, 0);
  rule.addColorStop(0, COLORS.gold);
  rule.addColorStop(0.5, COLORS.goldLight);
  rule.addColorStop(1, COLORS.gold);
  ctx.fillStyle = rule;
  ctx.fillRect(0, HERO_H - 5, W, 5);
}

function drawCoverFan(ctx, books, covers) {
  const shown = books.filter((b) => covers[b.id]).slice(0, 3);
  const placements = {
    1: [{ cx: 830, cy: 255, rot: -4, w: 200 }],
    2: [{ cx: 760, cy: 265, rot: -8, w: 190 }, { cx: 905, cy: 245, rot: 6, w: 190 }],
    3: [{ cx: 715, cy: 270, rot: -10, w: 165 }, { cx: 835, cy: 250, rot: 0, w: 165 }, { cx: 955, cy: 270, rot: 10, w: 165 }],
  }[shown.length];
  if (!placements) return;

  shown.forEach((b, i) => {
    const img = covers[b.id];
    const { cx, cy, rot, w } = placements[i];
    const h = (w * img.height) / img.width;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 24;
    fillRoundedRect(ctx, -w / 2, -h / 2, w, h, 6, '#ffffff');
    ctx.shadowColor = 'transparent';
    roundedRectPath(ctx, -w / 2, -h / 2, w, h, 6);
    ctx.clip();
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  });

  // Quantity tags drawn after all covers so none is hidden behind a neighbour
  shown.forEach((b, i) => {
    const img = covers[b.id];
    const { cx, cy, w } = placements[i];
    const h = (w * img.height) / img.width;
    const label = `× ${b.quantity}`;
    setFont(ctx, 800, 22);
    const tw = ctx.measureText(label).width + 28;
    const tx = cx - w / 2 + 14;
    const ty = cy + h / 2 - 52;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    fillRoundedRect(ctx, tx, ty, tw, 38, 19, COLORS.goldLight);
    ctx.restore();
    ctx.fillStyle = '#3b2a06';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, tx + 14, ty + 20);
    ctx.textBaseline = 'alphabetic';
  });
}

function drawReceipt(ctx, data, layout) {
  const { deliveryMethod, totalCost = 0 } = data;
  const { rows, receiptY: y, receiptH: h } = layout;
  const left = PAD + 30;
  const right = PAD + INNER - 30;

  ctx.save();
  ctx.shadowColor = 'rgba(80, 60, 20, 0.08)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  fillRoundedRect(ctx, PAD, y, INNER, h, 22, COLORS.paper);
  ctx.restore();
  fillRoundedRect(ctx, PAD, y, INNER, h, 22, null, COLORS.line, 1);

  rows.forEach((row, i) => {
    const baseY = y + RECEIPT_PAD + i * ROW_H + 34;
    const size = row.muted ? 18 : 22;

    ctx.textAlign = 'right';
    ctx.fillStyle = row.muted ? COLORS.muted : COLORS.ink;
    setFont(ctx, row.muted ? 500 : 600, size);
    ctx.fillText(row.value, right, baseY);
    const valueW = ctx.measureText(row.value).width;

    ctx.textAlign = 'left';
    let noteW = 0;
    if (row.note) {
      setFont(ctx, 500, 17);
      noteW = ctx.measureText(row.note).width + 10;
    }
    const labelMax = right - left - valueW - 30 - noteW;
    fitFontSize(ctx, row.label, labelMax, 400, size, SANS, 18);
    ctx.fillStyle = row.muted ? COLORS.muted : COLORS.text;
    const label = ellipsize(ctx, row.label, labelMax);
    ctx.fillText(label, left, baseY);

    if (row.note) {
      const lw = ctx.measureText(label).width;
      ctx.fillStyle = COLORS.muted;
      setFont(ctx, 500, 17);
      ctx.fillText(row.note, left + lw + 10, baseY);
    }
  });

  // Dashed separator
  const sepY = y + RECEIPT_PAD + rows.length * ROW_H + SEP_H / 2;
  ctx.save();
  ctx.strokeStyle = COLORS.dash;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(left, sepY);
  ctx.lineTo(right, sepY);
  ctx.stroke();
  ctx.restore();

  // Grand total
  const tb = sepY + SEP_H / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.pine;
  setFont(ctx, 700, 24, SINHALA);
  ctx.fillText(deliveryMethod === 'pickup' ? 'ගෙවිය යුතු මුළු මුදල' : 'තැන්පත් කළ යුතු මුළු මුදල', left, tb + 46);
  ctx.fillStyle = COLORS.muted;
  setFont(ctx, 500, 16);
  ctx.fillText(deliveryMethod === 'pickup' ? 'Amount to pay' : 'Amount to deposit', left, tb + 72);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.pine;
  setFont(ctx, 800, 64);
  const totalStr = formatLkr(totalCost);
  ctx.fillText(totalStr, right, tb + 70);
  const totalW = ctx.measureText(totalStr).width;
  ctx.fillStyle = COLORS.gold;
  setFont(ctx, 700, 30);
  ctx.fillText('රු.', right - totalW - 10, tb + 70);
}

function drawPayment(ctx, data, layout, assets) {
  const { deliveryMethod, bankInfo = {} } = data;
  const { lankaQrImage } = assets;
  const y = layout.payY;
  const bankW = lankaQrImage ? INNER - 22 - QR_TILE_W : INNER;
  const x = PAD;

  // Bank account block
  fillRoundedRect(ctx, x, y, bankW, PAY_H, 22, COLORS.pine);

  const tag = deliveryMethod === 'pickup' ? 'කලින් ගෙවා පොත් වෙන්කර ගන්න' : 'කලින් ගෙවිය යුතුයි • COD නැත';
  setFont(ctx, 700, 17);
  const tagW = ctx.measureText(tag).width + 28;
  fillRoundedRect(ctx, x + 30, y + 26, tagW, 36, 8, deliveryMethod === 'pickup' ? COLORS.gold : COLORS.red);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(tag, x + 44, y + 45);
  ctx.textBaseline = 'alphabetic';

  const bankName = (bankInfo.bankName || '').split(' (')[0].toUpperCase();
  ctx.fillStyle = '#9fc9bd';
  setFont(ctx, 500, 16);
  drawSpacedText(ctx, `${bankName} • ACCOUNT NO.`, x + 30, y + 104, 1.5);

  ctx.fillStyle = COLORS.goldLight;
  setFont(ctx, 700, 50);
  drawSpacedText(ctx, String(bankInfo.accountNumber || ''), x + 30, y + 168, 4);

  ctx.fillStyle = '#e2efe9';
  setFont(ctx, 500, 19);
  const branch = (bankInfo.branch || '').replace(/^.*\((.*)\)$/, '$1');
  ctx.fillText(`${bankInfo.accountName || ''} • ${branch} ශාඛාව`, x + 30, y + 212);

  // LankaQR tile
  if (lankaQrImage) {
    const qx = x + bankW + 22;
    fillRoundedRect(ctx, qx, y, QR_TILE_W, PAY_H, 22, '#ffffff', COLORS.line, 1);
    const box = 168;
    const ratio = Math.min(box / lankaQrImage.width, box / lankaQrImage.height);
    const iw = lankaQrImage.width * ratio;
    const ih = lankaQrImage.height * ratio;
    ctx.imageSmoothingEnabled = false; // keep QR modules sharp
    ctx.drawImage(lankaQrImage, qx + (QR_TILE_W - iw) / 2, y + 10 + (box - ih) / 2, iw, ih);
    ctx.imageSmoothingEnabled = true;

    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.ink;
    setFont(ctx, 800, 20);
    ctx.fillText('LankaQR', qx + QR_TILE_W / 2, y + 200);
    ctx.fillStyle = COLORS.text;
    setFont(ctx, 500, 15);
    ctx.fillText('ඕනෑම බැංකු App එකකින්', qx + QR_TILE_W / 2, y + 220);
    ctx.fillText('Scan කරන්න', qx + QR_TILE_W / 2, y + 239);
  }
}

function drawSteps(ctx, data, layout) {
  const steps = DELIVERY_STEPS[data.deliveryMethod] || DELIVERY_STEPS.courier;
  const y = layout.stepsY;
  const colW = INNER / 3;

  steps.forEach(([title, sub], i) => {
    const cx = PAD + i * colW;
    ctx.beginPath();
    ctx.arc(cx + 19, y + 28, 19, 0, Math.PI * 2);
    ctx.fillStyle = '#e6d3a8';
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5a3f08';
    setFont(ctx, 800, 19);
    ctx.fillText(String(i + 1), cx + 19, y + 29);
    ctx.textBaseline = 'alphabetic';

    const textW = colW - 62;
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.ink;
    fitFontSize(ctx, title, textW, 700, 18, SANS, 14);
    ctx.fillText(title, cx + 50, y + 22);
    ctx.fillStyle = COLORS.text;
    fitFontSize(ctx, sub, textW, 500, 18, SANS, 14);
    ctx.fillText(sub, cx + 50, y + 47);
  });
}

function drawWhatsAppBar(ctx, data, layout, assets) {
  const { contactInfo = {} } = data;
  const y = layout.waY;
  fillRoundedRect(ctx, PAD, y, INNER, WA_H, 20, COLORS.whatsapp);
  if (assets.whatsappIcon) ctx.drawImage(assets.whatsappIcon, PAD + 26, y + 20, 52, 52);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  setFont(ctx, 700, 30);
  ctx.fillText(contactInfo.whatsappDisplay || '', PAD + 96, y + 44);
  setFont(ctx, 500, 18);
  ctx.fillText('Slip එක සහ ඔබගේ විස්තර WhatsApp කරන්න', PAD + 96, y + 72);
}

function drawFooter(ctx, layout) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9a8f78';
  setFont(ctx, 500, 16);
  ctx.fillText('pathnirvana.org • පොත් මුද්‍රණ වියදමටත් අඩුවෙන් ධර්ම දානයක් ලෙස', W / 2, layout.footerY + 36);
}

/**
 * Draws the order card into ctx (logical coordinates, W wide × layout.height tall)
 */
export function drawOrderCard(ctx, data, assets = {}) {
  const layout = computeLayout(data);
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, 0, W, layout.height);

  drawHero(ctx, data, assets);
  drawReceipt(ctx, data, layout);
  drawPayment(ctx, data, layout, assets);
  drawSteps(ctx, data, layout);
  drawWhatsAppBar(ctx, data, layout, assets);
  drawFooter(ctx, layout);
}

function resolveAssetUrl(path) {
  if (!path) return null;
  const rel = path.startsWith('./') ? path.slice(2) : path;
  return new URL(rel, window.location.href).href;
}

/**
 * Renders the order card to a PNG blob
 */
export async function renderOrderCardBlob(orderData) {
  if (document.fonts) {
    await Promise.all(FONT_SPECS.map((f) => document.fonts.load(f, 'අආ Aa0').catch(() => null)));
  }

  const [bookCovers, lotusIcon, whatsappIcon, lankaQrImage] = await Promise.all([
    (async () => {
      const covers = {};
      await Promise.all((orderData.activeBooks || []).map(async (b) => {
        const img = await preloadImage(resolveAssetUrl(b.coverImage));
        if (img) covers[b.id] = img;
      }));
      return covers;
    })(),
    preloadImage(ICONS.lotus),
    preloadImage(ICONS.whatsapp),
    preloadImage(resolveAssetUrl(orderData.lankaQrImage)),
  ]);

  const { height } = computeLayout(orderData);
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');
  ctx.scale(SCALE, SCALE);

  drawOrderCard(ctx, orderData, { bookCovers, lotusIcon, whatsappIcon, lankaQrImage });

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Canvas blob generation failed');
  return blob;
}

/**
 * Generates the order card and copies it to the clipboard, falling back to a download
 */
export async function copyOrderCardScreenshot(orderData) {
  const blobPromise = renderOrderCardBlob(orderData);

  // Passing the promise to ClipboardItem keeps the click's user activation valid
  // while the image renders (needed by Safari, works in Chrome)
  let copied = false;
  if (navigator.clipboard && typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
      copied = true;
    } catch (clipErr) {
      console.warn('Clipboard write failed or permission blocked, falling back to download:', clipErr);
    }
  }

  if (!copied) {
    const blob = await blobPromise;
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
