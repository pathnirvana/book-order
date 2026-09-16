<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { CONFIG } from './config';

// -------------------------------------------------------------
// State Management & URL Query Initialization
// -------------------------------------------------------------
function getInitialParams() {
  if (typeof window === 'undefined') {
    return {
      quantities: { mindfulness: 50, 'samantha-pattanaya': 0 },
      method: 'courier'
    };
  }

  const params = new URLSearchParams(window.location.search);

  const hasSathiyaParam = params.has('sathiya') || params.has('q1') || params.has('qty1') || params.has('qty') || params.has('q') || params.has('mindfulness');
  const hasPattanaParam = params.has('pattana') || params.has('q2') || params.has('qty2') || params.has('samantha-pattanaya');
  const hasAnyBookParam = hasSathiyaParam || hasPattanaParam;

  const initQuantities = {};

  if (hasAnyBookParam) {
    // If any book is explicitly specified in the URL, unspecified books must be 0
    if (hasSathiyaParam) {
      const raw = params.get('sathiya') ?? params.get('q1') ?? params.get('qty1') ?? params.get('qty') ?? params.get('q') ?? params.get('mindfulness');
      const v = parseInt(raw, 10);
      initQuantities.mindfulness = (!isNaN(v) && v >= 0) ? v : 0;
    } else {
      initQuantities.mindfulness = 0;
    }

    if (hasPattanaParam) {
      const raw = params.get('pattana') ?? params.get('q2') ?? params.get('qty2') ?? params.get('samantha-pattanaya');
      const v = parseInt(raw, 10);
      initQuantities['samantha-pattanaya'] = (!isNaN(v) && v >= 0) ? v : 0;
    } else {
      initQuantities['samantha-pattanaya'] = 0;
    }
  } else {
    // Default fallback when visiting URL without any book params
    initQuantities.mindfulness = CONFIG.books[0]?.defaultQty ?? 50;
    initQuantities['samantha-pattanaya'] = CONFIG.books[1]?.defaultQty ?? 0;
  }

  let method = 'courier';
  const mParam = params.get('method') || params.get('m');
  if (mParam && ['courier', 'pickup', 'pickmeFlash'].includes(mParam)) {
    method = mParam;
  }

  return { quantities: initQuantities, method };
}

const initialParams = getInitialParams();
const quantities = ref(initialParams.quantities);
const deliveryMethod = ref(initialParams.method);

// Form Fields
const name = ref('');
const address = ref('');
const phone = ref('');

const nameTouched = ref(false);
const addressTouched = ref(false);
const phoneTouched = ref(false);

const copiedStates = ref({
  accountNumber: false,
  accountName: false,
  bankName: false,
  totalAmount: false,
});

const buttonFeedback = ref({
  copy: false,
  share: false,
  screenshot: '', // '', 'loading', 'success', 'error'
});

// Modal state for viewing book info
const selectedBookForModal = ref(null);

function openBookModal(book) {
  selectedBookForModal.value = book;
}

function closeBookModal() {
  selectedBookForModal.value = null;
}

function incrementQty(bookId) {
  const current = Number(quantities.value[bookId]) || 0;
  quantities.value[bookId] = current + 1;
}

function decrementQty(bookId) {
  const current = Number(quantities.value[bookId]) || 0;
  if (current > 0) {
    quantities.value[bookId] = current - 1;
  }
}

function onQtyKeydown(event) {
  // Allow navigation and editing control keys
  const allowedKeys = [
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'
  ];
  if (allowedKeys.includes(event.key)) {
    return;
  }
  // Allow Ctrl/Cmd shortcuts (Copy, Paste, Select All, Undo, etc.)
  if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'v', 'x', 'z'].includes(event.key.toLowerCase())) {
    return;
  }
  // Block any non-digit character (blocks e, E, +, -, ., symbols, letters)
  if (!/^\d$/.test(event.key)) {
    event.preventDefault();
  }
}

function onQtyInput(bookId, event) {
  const cleanDigits = event.target.value.replace(/\D/g, '');
  event.target.value = cleanDigits;
  quantities.value[bookId] = cleanDigits === '' ? 0 : parseInt(cleanDigits, 10);
}

function onQtyPaste(event) {
  const pasteData = (event.clipboardData || window.clipboardData)?.getData('text') || '';
  if (!/^\d+$/.test(pasteData)) {
    event.preventDefault();
    const cleanDigits = pasteData.replace(/\D/g, '');
    if (cleanDigits) {
      document.execCommand('insertText', false, cleanDigits);
    }
  }
}

function onQtyBlur(bookId, event) {
  const val = quantities.value[bookId];
  if (val === '' || isNaN(val) || val == null) {
    quantities.value[bookId] = 0;
  }
  if (event?.target) {
    event.target.value = quantities.value[bookId];
  }
}

// -------------------------------------------------------------
// Lifecycle & Real-time URL Sync
// -------------------------------------------------------------
onMounted(() => {
  // Listen for Escape key to close modal
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && selectedBookForModal.value) {
      closeBookModal();
    }
  });
});

// Real-time synchronization back to URL query parameters
watch([quantities, deliveryMethod], () => {
  const url = new URL(window.location.href);

  const sathiyaQty = Number(quantities.value.mindfulness) || 0;
  const pattanaQty = Number(quantities.value['samantha-pattanaya']) || 0;

  // Set if > 0, omit if 0
  if (sathiyaQty > 0) {
    url.searchParams.set('sathiya', sathiyaQty);
  } else {
    url.searchParams.delete('sathiya');
  }

  if (pattanaQty > 0) {
    url.searchParams.set('pattana', pattanaQty);
  } else {
    url.searchParams.delete('pattana');
  }

  // Clean up any legacy keys
  ['q1', 'q2', 'qty1', 'qty2', 'qty', 'q', 'mindfulness', 'samantha-pattanaya'].forEach(k => {
    url.searchParams.delete(k);
  });

  url.searchParams.set('method', deliveryMethod.value);
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}, { deep: true });

// -------------------------------------------------------------
// Validation Logic
// -------------------------------------------------------------
// Regex for checking Sinhala Unicode characters: [\u0D80-\u0DFF]
const hasSinhalaChars = (str) => /[\u0D80-\u0DFF]/.test(str);

const totalBooksCount = computed(() => {
  return CONFIG.books.reduce((sum, b) => sum + (Number(quantities.value[b.id]) || 0), 0);
});

const isNameInvalid = computed(() => {
  if (!name.value.trim()) return 'required';
  if (hasSinhalaChars(name.value)) return 'english_only';
  return '';
});

const isAddressInvalid = computed(() => {
  if (deliveryMethod.value === 'pickup') return '';
  if (!address.value.trim()) return 'required';
  if (hasSinhalaChars(address.value)) return 'english_only';
  return '';
});

const isPhoneInvalid = computed(() => {
  if (!phone.value.trim()) return 'required';
  const cleanPhone = phone.value.replace(/\D/g, '');
  if (cleanPhone.length < 9) return 'invalid';
  return '';
});

const isFormInvalid = computed(() => {
  return totalBooksCount.value < 20 || !!isNameInvalid.value || !!isAddressInvalid.value || !!isPhoneInvalid.value;
});

// -------------------------------------------------------------
// Calculation Logic
// -------------------------------------------------------------
const bookCostBreakdown = computed(() => {
  return CONFIG.books
    .filter(b => (Number(quantities.value[b.id]) || 0) > 0)
    .map(b => {
      const q = Number(quantities.value[b.id]) || 0;
      return {
        id: b.id,
        title: b.titleSinhala,
        qty: q,
        price: b.costLkr,
        formula: `(${q} × රු. ${b.costLkr})`,
        cost: q * b.costLkr
      };
    });
});

const totalBookCost = computed(() => {
  return bookCostBreakdown.value.reduce((sum, item) => sum + item.cost, 0);
});

const bookCostFormulaText = computed(() => {
  if (bookCostBreakdown.value.length === 0) {
    return 'රු. 0';
  }
  return bookCostBreakdown.value.map(item => item.formula).join(' + ');
});

const parcelWeightKg = computed(() => {
  const totalGrams = CONFIG.books.reduce((sum, b) => {
    const q = Number(quantities.value[b.id]) || 0;
    return sum + q * b.weightGrams;
  }, 0);
  return totalGrams / 1000;
});

const deliveryCost = computed(() => {
  if (deliveryMethod.value === 'pickup' || deliveryMethod.value === 'pickmeFlash' || totalBooksCount.value === 0) {
    return 0;
  }
  
  const weight = parcelWeightKg.value;
  const chargeableWeight = Math.ceil(weight);
  const base = CONFIG.delivery.courier.baseChargeLkr;
  const extra = CONFIG.delivery.courier.additionalKgChargeLkr;
  
  let cost = base + Math.max(0, chargeableWeight - 1) * extra;
  
  // Add packing cost directly to courier delivery cost
  const thresh = CONFIG.delivery.courier.packingCostThreshold;
  const perBatch = CONFIG.delivery.courier.packingCostPerBatch;
  if (totalBooksCount.value > thresh) {
    cost += Math.ceil(totalBooksCount.value / 50) * perBatch;
  }
  
  return cost;
});

const rawTotalCost = computed(() => {
  return totalBookCost.value + deliveryCost.value;
});

const totalCost = computed(() => {
  // If more than 50 books, round up the grand total to nearest 100
  if (totalBooksCount.value > 50 && deliveryMethod.value === 'courier') {
    return Math.ceil(rawTotalCost.value / 100) * 100;
  }
  return rawTotalCost.value;
});

// -------------------------------------------------------------
// Copy Helper
// -------------------------------------------------------------
const copyText = (text, field) => {
  navigator.clipboard.writeText(text).then(() => {
    copiedStates.value[field] = true;
    setTimeout(() => {
      copiedStates.value[field] = false;
    }, 2000);
  });
};

// -------------------------------------------------------------
// Action Buttons: Copy, Share, Screenshot
// -------------------------------------------------------------
function copyOrderSummaryText() {
  const lines = [];

  CONFIG.books.forEach(b => {
    const q = Number(quantities.value[b.id]) || 0;
    if (q > 0) {
      const bookTitle = b.id === 'mindfulness' ? 'Mindfulness සතිය' : b.titleSinhala;
      lines.push(`• ${bookTitle}: පොත් ${q}`);
    }
  });

  const deliveryNames = {
    courier: 'කූරියර් Courier',
    pickmeFlash: 'PickMe Flash',
    pickup: 'පැමිණ ලබා ගැනීම',
  };
  lines.push(`ක්රමය: ${deliveryNames[deliveryMethod.value] || deliveryMethod.value}`);

  lines.push(`පොත්: රු. ${totalBookCost.value} (${bookCostFormulaText.value})`);
  if (deliveryMethod.value === 'courier') {
    lines.push(`Courier: රු. ${deliveryCost.value}`);
  } else if (deliveryMethod.value === 'pickmeFlash') {
    lines.push(`Courier: රියදුරුට ගෙවන්න`);
  }
  lines.push(`මුළු මුදල: රු. ${totalCost.value}`);

  if (deliveryMethod.value !== 'pickup') {
    lines.push('');
    lines.push('බැංකු විස්තර:');
    lines.push(`• බැංකුව: ${CONFIG.payment.bankTransfer.bankName}`);
    lines.push(`• ශාඛාව: ${CONFIG.payment.bankTransfer.branch}`);
    lines.push(`• ගිණුම් අංකය: ${CONFIG.payment.bankTransfer.accountNumber}`);
    lines.push(`• නම: ${CONFIG.payment.bankTransfer.accountName}`);
    lines.push('');
    lines.push('* COD නොමැත.');
    lines.push('* තැන්පතුවෙන් පසු Deposit Slip, English වලින් Name, Address සහ Phone Number එවන්න.');
    lines.push('* WhatsApp 0715215866 වෙත');
  }

  const text = lines.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    buttonFeedback.value.copy = true;
    setTimeout(() => {
      buttonFeedback.value.copy = false;
    }, 2000);
  }).catch((err) => {
    console.error('Failed to copy order text:', err);
  });
}

function sharePageLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    buttonFeedback.value.share = true;
    setTimeout(() => {
      buttonFeedback.value.share = false;
    }, 2000);
  }).catch((err) => {
    console.error('Failed to copy page link:', err);
  });
}

function preloadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCanvasRoundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth = 1) {
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

function drawRoundedImage(ctx, img, x, y, width, height, radius) {
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
  
  // Subtle border around image
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

function drawOrderSummaryOnCanvas(ctx, w, h, bookCovers = {}) {
  // 1. Canvas Background: calm warm-stone neutral
  ctx.fillStyle = '#ebeee8';
  ctx.fillRect(0, 0, w, h);

  // 2. Outer Card with subtle drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(15, 118, 110, 0.08)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  drawCanvasRoundedRect(ctx, 30, 30, 1140, 1440, 32, '#ffffff', '#d5ded2', 2);
  ctx.restore();

  // 3. Header Banner (with clipped top rounded corners)
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(30, 30, 1140, 1440, 32);
  } else {
    ctx.rect(30, 30, 1140, 1440);
  }
  ctx.clip();

  const headerGrad = ctx.createLinearGradient(30, 30, 1170, 195);
  headerGrad.addColorStop(0, '#064e43');
  headerGrad.addColorStop(1, '#0f766e');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(30, 30, 1140, 168);

  // Gold top accent stripe
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(30, 30, 1140, 6);

  // Header Badge
  drawCanvasRoundedRect(ctx, 70, 54, 220, 32, 16, 'rgba(254, 243, 199, 0.95)', null);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#92400e';
  ctx.font = 'bold 14px "Noto Sans Sinhala", sans-serif';
  ctx.fillText('✨ ධර්ම දාන පොත් ඇණවුම', 180, 70);

  // Title & Subtitle
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px Outfit, sans-serif';
  ctx.fillText('Path Nirvana', 70, 118);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '500 17px "Noto Sans Sinhala", Outfit, sans-serif';
  ctx.fillText('හෝමාගම (Homagama) • Sri Lanka', 70, 154);

  // Date Pill
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  drawCanvasRoundedRect(ctx, 910, 54, 220, 38, 19, 'rgba(255, 255, 255, 0.18)', null);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Outfit, sans-serif';
  ctx.fillText('📅 ' + dateStr, 1020, 73);

  // Delivery Method Pill
  const delPillName = deliveryMethod.value === 'courier' ? '📦 කූරියර් Courier' : (deliveryMethod.value === 'pickmeFlash' ? '⚡ PickMe Flash' : '🚶 පැමිණ ලබා ගැනීම');
  drawCanvasRoundedRect(ctx, 890, 104, 240, 44, 22, '#ffffff', null);
  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 16px "Noto Sans Sinhala", sans-serif';
  ctx.fillText(delPillName, 1010, 126);

  ctx.restore();

  // 4. Section 1: Ordered Books
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 20px "Noto Sans Sinhala", Outfit, sans-serif';
  ctx.fillText('1. ඇණවුම් කළ පොත් (Ordered Books)', 70, 230);

  const activeBooks = CONFIG.books.filter(b => (Number(quantities.value[b.id]) || 0) > 0);
  let bookY = 258;
  activeBooks.forEach((b) => {
    const q = Number(quantities.value[b.id]) || 0;
    const cardH = 124;
    
    drawCanvasRoundedRect(ctx, 60, bookY, 1080, cardH, 16, '#f9faf7', '#e2e8df', 1.5);

    const img = bookCovers[b.id];
    if (img) {
      drawRoundedImage(ctx, img, 76, bookY + 12, 74, 100, 8);
    } else {
      drawCanvasRoundedRect(ctx, 76, bookY + 12, 74, 100, 8, '#e2e8df', null);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#6b7280';
      ctx.font = '32px sans-serif';
      ctx.fillText('📖', 113, bookY + 62);
    }

    // Title
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 23px "Noto Sans Sinhala", sans-serif';
    const bookTitle = b.id === 'mindfulness' ? 'Mindfulness සතිය' : b.titleSinhala;
    ctx.fillText(bookTitle, 168, bookY + 36);

    // Quantity Pill right beside title (measured dynamically to prevent any collision)
    const titleWidth = ctx.measureText(bookTitle).width;
    const pillX = 168 + titleWidth + 16;
    drawCanvasRoundedRect(ctx, pillX, bookY + 20, 100, 32, 16, '#e6f4f1', '#0f766e', 1.5);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 16px "Noto Sans Sinhala", Outfit, sans-serif';
    ctx.fillText(`පොත් ${q}`, pillX + 50, bookY + 36);

    // Specs (Row 2)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6b7280';
    ctx.font = '16px "Noto Sans Sinhala", Outfit, sans-serif';
    ctx.fillText(`පිටු ${b.pages} • බර ${b.weightGrams}g • පිටපතක් රු. ${b.costLkr}`, 168, bookY + 74);

    // Note (Row 3)
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px "Noto Sans Sinhala", sans-serif';
    ctx.fillText('ධර්ම දානයක් ලෙස මුද්‍රණ වියදමටත් වඩා අඩුවෙන් ලබා දේ', 168, bookY + 100);

    // Price calculation (Right side)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#6b7280';
    ctx.font = '500 17px Outfit, "Noto Sans Sinhala", sans-serif';
    ctx.fillText(`${q} × රු. ${b.costLkr}`, 1115, bookY + 40);

    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 28px Outfit, sans-serif';
    ctx.fillText(`රු. ${(q * b.costLkr).toLocaleString()}`, 1115, bookY + 80);

    bookY += cardH + 14;
  });

  // 5. Section 2: Delivery & Total Box
  const totalBoxY = Math.max(bookY + 4, 538);
  const totalBoxH = 175;
  drawCanvasRoundedRect(ctx, 60, totalBoxY, 1080, totalBoxH, 18, '#ffffff', '#d5ded2', 1.5);

  const deliveryLabels = {
    courier: 'කූරියර් Courier',
    pickmeFlash: 'PickMe Flash',
    pickup: 'පැමිණ ලබා ගැනීම',
  };
  const deliveryLabel = deliveryLabels[deliveryMethod.value] || deliveryMethod.value;

  let deliveryFeeStr = 'රු. 0';
  if (deliveryMethod.value === 'courier') {
    deliveryFeeStr = `රු. ${deliveryCost.value.toLocaleString()}`;
  } else if (deliveryMethod.value === 'pickmeFlash') {
    deliveryFeeStr = 'රියදුරුට ගෙවන්න';
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#374151';
  ctx.font = 'bold 18px "Noto Sans Sinhala", sans-serif';
  ctx.fillText('📦 ලබාගැනීමේ ක්‍රමය: ' + deliveryLabel, 86, totalBoxY + 34);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 18px Outfit, "Noto Sans Sinhala", sans-serif';
  ctx.fillText(deliveryFeeStr + (deliveryMethod.value === 'courier' ? ` (මුළු බර: ${parcelWeightKg.value.toFixed(2)} kg)` : ''), 1115, totalBoxY + 34);

  // Grand Total Highlight Banner
  const totalBannerY = totalBoxY + 58;
  const totalGrad = ctx.createLinearGradient(76, totalBannerY, 1124, totalBannerY + 98);
  totalGrad.addColorStop(0, '#e6f4f1');
  totalGrad.addColorStop(1, '#ecfdf5');
  drawCanvasRoundedRect(ctx, 76, totalBannerY, 1048, 98, 16, totalGrad, '#0f766e', 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 22px "Noto Sans Sinhala", sans-serif';
  ctx.fillText('ගෙවිය යුතු මුළු මුදල (Grand Total):', 102, totalBannerY + 36);

  ctx.fillStyle = '#4b5563';
  ctx.font = '500 16px "Noto Sans Sinhala", Outfit, sans-serif';
  ctx.fillText(`(පොත් සඳහා රු. ${totalBookCost.value.toLocaleString()} + Courier)`, 102, totalBannerY + 68);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 46px Outfit, sans-serif';
  ctx.fillText(`රු. ${totalCost.value.toLocaleString()}`, 1100, totalBannerY + 50);

  // 6. Section 3: Bank Details Card
  const bankBoxY = totalBoxY + totalBoxH + 18;
  const bankBoxH = 310;

  if (deliveryMethod.value !== 'pickup') {
    drawCanvasRoundedRect(ctx, 60, bankBoxY, 1080, bankBoxH, 20, '#f8fafc', '#cbd5e1', 1.5);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 21px "Noto Sans Sinhala", sans-serif';
    ctx.fillText('🏛️ බැංකු තැන්පතු විස්තර (Bank Transfer)', 86, bankBoxY + 36);

    // COD badge (wide pill with zero clipping)
    drawCanvasRoundedRect(ctx, 880, bankBoxY + 18, 235, 38, 10, '#fef2f2', '#fecaca', 1.5);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#991b1b';
    ctx.font = 'bold 15px "Noto Sans Sinhala", sans-serif';
    ctx.fillText('COD නොමැත (කලින් ගෙවීම)', 997, bankBoxY + 37);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#6b7280';
    ctx.font = '18px "Noto Sans Sinhala", sans-serif';
    ctx.fillText('බැංකුව (Bank):', 86, bankBoxY + 86);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 18px "Noto Sans Sinhala", Outfit, sans-serif';
    ctx.fillText(CONFIG.payment.bankTransfer.bankName, 240, bankBoxY + 86);

    ctx.fillStyle = '#6b7280';
    ctx.font = '18px "Noto Sans Sinhala", sans-serif';
    ctx.fillText('ශාඛාව (Branch):', 86, bankBoxY + 126);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 18px "Noto Sans Sinhala", Outfit, sans-serif';
    ctx.fillText(CONFIG.payment.bankTransfer.branch, 240, bankBoxY + 126);

    // VIP Account Number highlight box
    const accBoxY = bankBoxY + 154;
    drawCanvasRoundedRect(ctx, 76, accBoxY, 1048, 72, 14, '#ecfdf5', '#10b981', 2);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 19px "Noto Sans Sinhala", sans-serif';
    ctx.fillText('ගිණුම් අංකය (Account Number):', 102, accBoxY + 36);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#064e3b';
    ctx.font = 'bold 34px Outfit, monospace, sans-serif';
    ctx.fillText('8029 9094 89', 1100, accBoxY + 36);

    // Account Name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6b7280';
    ctx.font = '18px "Noto Sans Sinhala", sans-serif';
    ctx.fillText('ගිණුම් හිමියා (Account Name):', 86, bankBoxY + 266);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText(CONFIG.payment.bankTransfer.accountName, 1115, bankBoxY + 266);
  } else {
    // Pickup Details
    drawCanvasRoundedRect(ctx, 60, bankBoxY, 1080, bankBoxH, 20, '#f8fafc', '#cbd5e1', 1.5);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f766e';
    ctx.font = 'bold 21px "Noto Sans Sinhala", sans-serif';
    ctx.fillText('🚶 පැමිණ ලබා ගැනීමේ විස්තර (Pickup Location)', 86, bankBoxY + 36);

    ctx.fillStyle = '#374151';
    ctx.font = 'bold 20px "Noto Sans Sinhala", Outfit, sans-serif';
    ctx.fillText('ස්ථානය: ' + CONFIG.delivery.pickup.locationName, 86, bankBoxY + 90);

    ctx.fillStyle = '#4b5563';
    ctx.font = '18px "Noto Sans Sinhala", sans-serif';
    ctx.fillText('ලිපිනය: 190 බස් මාර්ගයේ, පනාගොඩ පාසල් හන්දියෙන් රොමියෙල් මාවත', 86, bankBoxY + 135);
    ctx.fillText('(මීටර් 50ක් පමණ ඉදිරියට එන විට වම් පසින් හමුවන දෙවන බොරළු පාර)', 86, bankBoxY + 170);

    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 17px "Noto Sans Sinhala", sans-serif';
    ctx.fillText('* පැමිණ මුදල් ගෙවා ලබාගත හැක (කලින් ගෙවීමකින් තොරව පොත් වෙන්කර තැබිය නොහැක).', 86, bankBoxY + 230);
  }

  // 7. Section 4: Notice & WhatsApp Banner
  const noticeBoxY = bankBoxY + bankBoxH + 18;
  const noticeBoxH = 205;
  drawCanvasRoundedRect(ctx, 60, noticeBoxY, 1080, noticeBoxH, 20, '#fffbeb', '#fde68a', 1.5);

  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(60, noticeBoxY, 8, noticeBoxH, [20, 0, 0, 20]);
  } else {
    ctx.rect(60, noticeBoxY, 8, noticeBoxH);
  }
  ctx.fillStyle = '#f59e0b';
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#92400e';
  ctx.font = 'bold 18px "Noto Sans Sinhala", sans-serif';
  ctx.fillText('⚠️ තැන්පතුව සිදු කළ පසු පහත විස්තර අප වෙත එවන්න:', 90, noticeBoxY + 36);

  const itemY = noticeBoxY + 76;
  drawCanvasRoundedRect(ctx, 86, itemY - 20, 320, 42, 8, '#fef3c7', null);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#78350f';
  ctx.font = '600 16px "Noto Sans Sinhala", sans-serif';
  ctx.fillText('🧾 Deposit Slip / Screenshot', 246, itemY);

  drawCanvasRoundedRect(ctx, 426, itemY - 20, 340, 42, 8, '#fef3c7', null);
  ctx.fillText('🔤 Name & Address (English)', 596, itemY);

  drawCanvasRoundedRect(ctx, 786, itemY - 20, 320, 42, 8, '#fef3c7', null);
  ctx.fillText('📞 Phone Number', 946, itemY);

  const waBannerY = noticeBoxY + 124;
  drawCanvasRoundedRect(ctx, 80, waBannerY, 1040, 60, 14, '#0f766e', null);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 21px Outfit, "Noto Sans Sinhala", sans-serif';
  ctx.fillText('💬 WhatsApp: 071 521 5866 වෙත විස්තර එවන්න', 600, waBannerY + 30);

  // 8. Section 5: Card Footer
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(60, 1410);
  ctx.lineTo(1140, 1410);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#9ca3af';
  ctx.font = '500 16px Outfit, "Noto Sans Sinhala", sans-serif';
  ctx.fillText('Path Nirvana • හෝමාගම • ධර්ම දාන පොත් සේවාව • pathnirvana.org', 600, 1442);
}

async function copyOrderScreenshot() {
  if (buttonFeedback.value.screenshot === 'loading') return;
  buttonFeedback.value.screenshot = 'loading';

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Preload book cover thumbnails for high quality rendering
    const bookCovers = {};
    await Promise.all(CONFIG.books.map(async (b) => {
      if (b.coverImage) {
        const coverRel = b.coverImage.startsWith('./') ? b.coverImage.slice(2) : b.coverImage;
        const src = new URL(coverRel, window.location.href).href;
        const img = await preloadImage(src);
        if (img) bookCovers[b.id] = img;
      }
    }));

    const canvas = document.createElement('canvas');
    const w = 1200;
    const h = 1500; // Ultra-crisp high resolution 4:5 aspect ratio
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Canvas context not available');
    }

    drawOrderSummaryOnCanvas(ctx, w, h, bookCovers);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      throw new Error('Canvas blob generation failed');
    }

    if (!navigator.clipboard || typeof ClipboardItem === 'undefined' || !navigator.clipboard.write) {
      throw new Error('ClipboardItem write not supported in this browser');
    }

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);

    buttonFeedback.value.screenshot = 'success';
  } catch (err) {
    console.error('Failed to copy screenshot to clipboard:', err);
    buttonFeedback.value.screenshot = 'error';
  } finally {
    setTimeout(() => {
      buttonFeedback.value.screenshot = '';
    }, 2500);
  }
}

// -------------------------------------------------------------
// Submission Handlers (WhatsApp & Email)
// -------------------------------------------------------------
const formattedOrderMessage = computed(() => {
  const deliveryNames = {
    pickup: 'පැමිණ ලබා ගැනීම (Homagama)',
    courier: 'කූරියර් Courier',
    pickmeFlash: 'PickMe Flash',
  };

  const deliveryStr = deliveryNames[deliveryMethod.value] || deliveryMethod.value;
  
  let msg = `Book Order\n`;
  CONFIG.books.forEach(b => {
    const q = Number(quantities.value[b.id]) || 0;
    if (q > 0) {
      msg += `• ${b.titleSinhala}: ${q}\n`;
    }
  });
  msg += `ක්‍රමය: ${deliveryStr}\n`;
  msg += `ගෙවන ලද මුළු මුදල: රු. ${totalCost.value}\n\n`;
  
  msg += `Name: ${name.value.trim()}\n`;
  if (deliveryMethod.value !== 'pickup') {
    msg += `Address: ${address.value.trim()}\n`;
  }
  msg += `Phone: ${phone.value.trim()}\n`;

  // Reference: 50 Sathiya + 13 Pattana books for {name}
  const refParts = [];
  const qSathiya = Number(quantities.value.mindfulness) || 0;
  const qPattana = Number(quantities.value['samantha-pattanaya']) || 0;
  if (qSathiya > 0) refParts.push(`${qSathiya} Sathiya`);
  if (qPattana > 0) refParts.push(`${qPattana} Pattana`);
  const bookRefStr = (refParts.length > 0 ? refParts.join(' + ') : 'Book') + ' books';
  const refLine = name.value.trim() ? `${bookRefStr} for ${name.value.trim()}` : bookRefStr;
  msg += `Reference: ${refLine}\n`;
  
  if (deliveryMethod.value !== 'pickup') {
    msg += `\n(බැංකු තැන්පතු Slip / Screenshot එක මෙයට අමුණා එවන්න)`;
  }
  return msg;
});

function submitViaWhatsApp() {
  if (totalBooksCount.value < 20) {
    alert('ඇණවුම් කළ හැකි අවම මුළු පොත් සංඛ්‍යාව 20කි.');
    return;
  }

  nameTouched.value = true;
  addressTouched.value = true;
  phoneTouched.value = true;

  if (isFormInvalid.value) {
    alert('කරුණාකර පෝරමයේ ඇති වැරදි නිවැරදි කර නැවත උත්සාහ කරන්න.');
    return;
  }
  
  const encodedText = encodeURIComponent(formattedOrderMessage.value);
  const waUrl = `https://wa.me/${CONFIG.contact.whatsappNumber}?text=${encodedText}`;
  window.open(waUrl, '_blank');
}

function submitViaEmail() {
  if (totalBooksCount.value < 20) {
    alert('ඇණවුම් කළ හැකි අවම මුළු පොත් සංඛ්‍යාව 20කි.');
    return;
  }

  nameTouched.value = true;
  addressTouched.value = true;
  phoneTouched.value = true;

  if (isFormInvalid.value) {
    alert('කරුණාකර පෝරමයේ ඇති වැරදි නිවැරදි කර නැවත උත්සාහ කරන්න.');
    return;
  }
  
  const subject = encodeURIComponent(`Book Order: ${name.value.substring(0, 20)}`);
  const body = encodeURIComponent(formattedOrderMessage.value);
  const mailtoUrl = `mailto:${CONFIG.contact.email}?subject=${subject}&body=${body}`;
  window.open(mailtoUrl, '_blank');
}
</script>

<template>
  <div class="min-h-screen bg-bg-primary text-text-text px-3 py-3 sm:py-6">
    <main class="max-w-xl mx-auto space-y-3 sm:space-y-4">

      <!-- Compact Page Header -->
      <section class="text-center py-1">
        <h1 class="text-base sm:text-lg font-bold text-text-primary flex items-center justify-center gap-1.5">
          <span>📖</span>
          <span>Path Nirvana දහම් පොත්</span>
        </h1>
      </section>

      <!-- Step 1: Book Selection & Delivery Selection -->
      <section class="bg-bg-secondary rounded-xl border border-border-primary p-3 sm:p-4 shadow-xs space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-text-primary">1. පොත් කීයක් අවශ්‍යද?</h2>
          <span class="text-[11px] text-text-secondary font-medium">
            එකතුව: {{ totalBooksCount }} {{ totalBooksCount === 1 ? 'පොතයි' : 'පොත්' }}
          </span>
        </div>

        <!-- Book Selection Rows -->
        <div class="space-y-2">
          <div 
            v-for="book in CONFIG.books" 
            :key="book.id"
            class="p-2.5 sm:p-3 rounded-xl border border-border-primary bg-bg-primary/40 hover:bg-bg-primary/60 transition-all flex items-center gap-2.5 sm:gap-3"
          >
            <!-- Thumbnail (Clickable to open dialog) -->
            <img 
              :src="book.coverImage" 
              :alt="book.titleSinhala"
              class="w-11 sm:w-12 h-15 sm:h-16 object-cover rounded shadow-xs border border-border-primary shrink-0 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
              @click="openBookModal(book)"
              title="විස්තර බලන්න"
            />

            <!-- Book Info & Details Button -->
            <div class="min-w-0 flex-1">
              <h3 class="text-xs sm:text-sm font-bold text-text-primary leading-tight line-clamp-1">
                {{ book.titleSinhala }}
              </h3>
              <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-text-secondary mt-0.5">
                <span class="font-bold text-primary">රු. {{ book.costLkr }}</span>
                <span>•</span>
                <span>{{ book.weightGrams }}g</span>
                <span>•</span>
                <span>පිටු {{ book.pages }}</span>
                <span v-if="book.inStock === false" class="text-[10px] text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded font-medium">
                  තවමත් නැත
                </span>
              </div>

              <!-- Button to open popup modal dialog -->
              <button 
                type="button"
                @click="openBookModal(book)"
                class="text-[11px] text-primary hover:underline font-semibold inline-flex items-center gap-1 mt-1 cursor-pointer"
              >
                <span>ℹ️ විස්තර බලන්න (Info)</span>
              </button>
            </div>

            <!-- Stepper Controls -->
            <div class="flex items-center space-x-1.5 shrink-0">
              <button 
                type="button"
                @click="decrementQty(book.id)"
                class="w-8 h-8 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-primary font-bold text-base flex items-center justify-center active:scale-95 transition-all"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input 
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                :value="quantities[book.id]"
                @keydown="onQtyKeydown"
                @input="onQtyInput(book.id, $event)"
                @paste="onQtyPaste"
                @blur="onQtyBlur(book.id, $event)"
                class="w-12 sm:w-14 h-8 rounded-lg border border-border-primary text-center font-bold text-xs sm:text-sm text-text-primary bg-bg-secondary focus:outline-hidden focus:border-primary"
              />
              <button 
                type="button"
                @click="incrementQty(book.id)"
                class="w-8 h-8 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-primary font-bold text-base flex items-center justify-center active:scale-95 transition-all"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <!-- Warning if less than 20 books selected -->
        <p v-if="totalBooksCount < 20" class="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-1.5">
          <span>⚠️</span>
          <span>ඇණවුම් කළ හැකි අවම මුළු පොත් සංඛ්‍යාව 20කි. (දැනට තෝරාගෙන ඇත්තේ: <strong>{{ totalBooksCount }}</strong>)</span>
        </p>

        <!-- Delivery Method Radios -->
        <div class="space-y-1.5 pt-1">
          <span class="block text-xs font-semibold text-text-secondary">ලබාගැනීමේ ක්‍රමය තෝරන්න:</span>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <!-- Courier -->
            <label 
              :class="['p-2.5 rounded-lg border flex items-center justify-center text-center cursor-pointer transition-all', 
                deliveryMethod === 'courier' ? 'border-primary bg-primary-light/50 ring-1 ring-primary' : 'border-border-primary hover:bg-bg-tertiary/40']"
            >
              <input type="radio" v-model="deliveryMethod" value="courier" class="sr-only" />
              <span class="text-xs font-bold text-text-primary">📦 කූරියර් Courier</span>
            </label>

            <!-- PickMe Flash -->
            <label 
              :class="['p-2.5 rounded-lg border flex items-center justify-center text-center cursor-pointer transition-all', 
                deliveryMethod === 'pickmeFlash' ? 'border-primary bg-primary-light/50 ring-1 ring-primary' : 'border-border-primary hover:bg-bg-tertiary/40']"
            >
              <input type="radio" v-model="deliveryMethod" value="pickmeFlash" class="sr-only" />
              <span class="text-xs font-bold text-text-primary">⚡ PickMe Flash</span>
            </label>

            <!-- Pickup -->
            <label 
              :class="['p-2.5 rounded-lg border flex items-center justify-center text-center cursor-pointer transition-all', 
                deliveryMethod === 'pickup' ? 'border-primary bg-primary-light/50 ring-1 ring-primary' : 'border-border-primary hover:bg-bg-tertiary/40']"
            >
              <input type="radio" v-model="deliveryMethod" value="pickup" class="sr-only" />
              <span class="text-xs font-bold text-text-primary">🚶 පැමිණ ලබා ගැනීම</span>
            </label>
          </div>
        </div>

        <!-- Price Breakdown Box (hidden if less than 20 books) -->
        <div v-if="totalBooksCount >= 20" class="bg-bg-primary/70 p-2.5 rounded-lg border border-border-primary space-y-1 text-xs">
          <div class="flex justify-between text-text-secondary">
            <span>
              පොත් සඳහා 
              <span v-if="bookCostBreakdown.length > 0" class="text-text-primary font-medium">
                {{ bookCostFormulaText }}
              </span>:
            </span>
            <span class="text-text-primary font-medium">රු. {{ totalBookCost }}</span>
          </div>
          <div class="flex justify-between text-text-secondary">
            <span>Courier ගාස්තුව:</span>
            <span class="text-text-primary font-medium">
              <span v-if="deliveryMethod === 'courier'">රු. {{ deliveryCost }}</span>
              <span v-else-if="deliveryMethod === 'pickmeFlash'" class="text-amber-700 font-semibold">රියදුරුට ගෙවන්න</span>
              <span v-else class="text-emerald-700 font-semibold">රු. 0</span>
            </span>
          </div>
          <div v-if="deliveryMethod === 'courier'" class="flex justify-between text-text-secondary text-[11px]">
            <span>මුළු බර:</span>
            <span>{{ parcelWeightKg.toFixed(2) }} kg</span>
          </div>
          <div class="flex justify-between items-center text-text-primary pt-1.5 border-t border-border-primary font-bold text-sm">
            <span>ගෙවිය යුතු මුළු මුදල:</span>
            <span class="text-primary text-base">රු. {{ totalCost }}</span>
          </div>
        </div>

        <!-- Action Buttons Row below Total -->
        <div v-if="totalBooksCount >= 20" class="grid grid-cols-3 gap-2 pt-0.5">
          <!-- Copy Button -->
          <button 
            type="button" 
            @click="copyOrderSummaryText"
            class="h-9 px-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Copy order details as text"
          >
            <span v-if="buttonFeedback.copy" class="text-emerald-600 font-bold flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              <span>Copied!</span>
            </span>
            <span v-else class="flex items-center gap-1">
              <span>📋</span>
              <span>Copy</span>
            </span>
          </button>

          <!-- Share Button -->
          <button 
            type="button" 
            @click="sharePageLink"
            class="h-9 px-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Copy page link with query string"
          >
            <span v-if="buttonFeedback.share" class="text-emerald-600 font-bold flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              <span>Copied!</span>
            </span>
            <span v-else class="flex items-center gap-1">
              <span>🔗</span>
              <span>Share</span>
            </span>
          </button>

          <!-- Screenshot Button -->
          <button 
            type="button" 
            @click="copyOrderScreenshot"
            class="h-9 px-2 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Copy screenshot image (4:5) to clipboard"
          >
            <span v-if="buttonFeedback.screenshot === 'loading'" class="text-primary font-bold flex items-center gap-1 text-[11px]">
              <svg class="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Creating...</span>
            </span>
            <span v-else-if="buttonFeedback.screenshot === 'success'" class="text-emerald-600 font-bold flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              <span>Copied!</span>
            </span>
            <span v-else-if="buttonFeedback.screenshot === 'error'" class="text-red-600 font-bold flex items-center gap-1 text-[11px]">
              <span>❌ Failed</span>
            </span>
            <span v-else class="flex items-center gap-1">
              <span>📸</span>
              <span>Screenshot</span>
            </span>
          </button>
        </div>

        <!-- Delivery Context Note -->
        <div class="text-xs text-text-secondary leading-relaxed bg-primary-light/40 p-2.5 rounded-lg border border-primary/20">
          <template v-if="deliveryMethod === 'courier'">
            📦 දිවයින පුරා දින 3-5 අතර ලැබේ (Tracking Number එකක් එවනු ලැබේ). <span class="font-semibold text-text-primary">COD නොමැත</span> - කලින් මුදල් තැන්පත් කළ යුතුය.
          </template>
          <template v-else-if="deliveryMethod === 'pickmeFlash'">
            ⚡ හෝමාගම සිට {{ CONFIG.delivery.pickmeFlash.radiusLimitKm }}km සීමාව තුළ පමණි. පොත් මුදල බැංකුවට තැන්පත් කර, Delivery ගාස්තුව පැමිණෙන රියදුරුට ඍජුවම ගෙවන්න.
          </template>
          <template v-else>
            🚶 පැමිණ මුදල් ගෙවා ලබාගත හැක. (කලින් ගෙවීමකින් තොරව පොත් වෙන්කර තැබිය නොහැක).
            <div class="mt-1 pt-1 border-t border-primary/20 flex flex-col gap-1">
              <a 
                :href="CONFIG.delivery.pickup.mapsUrl" 
                target="_blank" 
                class="text-primary hover:underline font-semibold inline-flex items-center gap-1"
              >
                📍 Path Nirvana Homagama (Google Maps) ↗
              </a>
              <span class="text-[11px] text-text-secondary">
                {{ CONFIG.delivery.pickup.directionsSinhala }}
              </span>
            </div>
          </template>
        </div>
      </section>

      <!-- Step 2: Recipient Details -->
      <section class="bg-bg-secondary rounded-xl border border-border-primary p-3 sm:p-4 shadow-xs space-y-2.5">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-text-primary">
            {{ deliveryMethod === 'pickup' ? '2. ඔබගේ විස්තර' : '2. ලබන්නාගේ විස්තර' }}
          </h2>
          <span v-if="deliveryMethod !== 'pickup'" class="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Courier සඳහා Name & Address ඉංග්‍රීසියෙන්
          </span>
        </div>

        <div class="space-y-2">
          <!-- Name -->
          <div>
            <label for="nameInput" class="block text-xs font-semibold text-text-secondary mb-0.5">
              Name (English) <span class="text-red-500">*</span>
            </label>
            <input 
              id="nameInput"
              type="text" 
              v-model="name"
              @blur="nameTouched = true"
              placeholder="e.g. Nimal Perera"
              class="w-full h-10 px-3 rounded-lg border border-border-primary text-text-primary bg-bg-secondary focus:outline-hidden focus:border-primary text-sm"
              autocomplete="name"
            />
            <p v-if="nameTouched && isNameInvalid === 'required'" class="text-[11px] text-red-500 mt-0.5">
              නම ඇතුළත් කරන්න.
            </p>
            <p v-if="nameTouched && isNameInvalid === 'english_only'" class="text-[11px] text-red-500 mt-0.5 font-semibold">
              ⚠️ English අකුරින් පමණක් ඇතුළත් කරන්න (සිංහල අකුරු භාවිතා කළ නොහැක).
            </p>
          </div>

          <!-- Address (only if not pickup) -->
          <div v-if="deliveryMethod !== 'pickup'">
            <label for="addressInput" class="block text-xs font-semibold text-text-secondary mb-0.5">
              Address (English) <span class="text-red-500">*</span>
            </label>
            <textarea 
              id="addressInput"
              v-model="address"
              @blur="addressTouched = true"
              placeholder="e.g. No 12, Temple Road, Homagama"
              rows="2"
              class="w-full p-2.5 rounded-lg border border-border-primary text-text-primary bg-bg-secondary focus:outline-hidden focus:border-primary text-sm"
              autocomplete="street-address"
            ></textarea>
            <p v-if="addressTouched && isAddressInvalid === 'required'" class="text-[11px] text-red-500 mt-0.5">
              ලිපිනය ඇතුළත් කරන්න.
            </p>
            <p v-if="addressTouched && isAddressInvalid === 'english_only'" class="text-[11px] text-red-500 mt-0.5 font-semibold">
              ⚠️ English අකුරින් පමණක් ඇතුළත් කරන්න (සිංහල අකුරු භාවිතා කළ නොහැක).
            </p>
          </div>

          <!-- Phone -->
          <div>
            <label for="phoneInput" class="block text-xs font-semibold text-text-secondary mb-0.5">
              Phone Number <span class="text-red-500">*</span>
            </label>
            <input 
              id="phoneInput"
              type="tel" 
              v-model="phone"
              @blur="phoneTouched = true"
              placeholder="07XXXXXXXX"
              class="w-full h-10 px-3 rounded-lg border border-border-primary text-text-primary bg-bg-secondary focus:outline-hidden focus:border-primary text-sm"
              autocomplete="tel"
            />
            <p v-if="phoneTouched && isPhoneInvalid === 'required'" class="text-[11px] text-red-500 mt-0.5">
              දුරකථන අංකය ඇතුළත් කරන්න.
            </p>
            <p v-if="phoneTouched && isPhoneInvalid === 'invalid'" class="text-[11px] text-red-500 mt-0.5">
              වලංගු දුරකථන අංකයක් ඇතුළත් කරන්න.
            </p>
          </div>
        </div>
      </section>

      <!-- Step 3: Bank Transfer Instructions (hidden for pickup or when books < 20) -->
      <section v-if="deliveryMethod !== 'pickup' && totalBooksCount >= 20" class="bg-bg-secondary rounded-xl border border-border-primary p-3 sm:p-4 shadow-xs space-y-2">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-text-primary">3. බැංකු තැන්පතු විස්තර</h2>
          <span class="text-[11px] text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 font-semibold">
            COD නොමැත
          </span>
        </div>
        <p class="text-xs text-text-secondary">
          පොත් එවනු ලබන්නේ බැංකු තැන්පතුව සිදු කළ පසු පමණි. කරුණාකර මුළු මුදල තැන්පත් කරන්න:
        </p>

        <div class="bg-bg-primary/80 rounded-lg border border-border-primary divide-y divide-border-primary text-xs">
          <!-- Bank & Branch -->
          <div class="p-2 flex items-center justify-between">
            <div>
              <span class="text-text-secondary text-[11px] block">බැංකුව</span>
              <span class="text-text-primary font-bold">{{ CONFIG.payment.bankTransfer.bankName }}</span>
            </div>
            <button 
              @click="copyText(CONFIG.payment.bankTransfer.bankName.split(' ')[0], 'bankName')"
              class="px-2 py-1 rounded border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary text-[11px] active:scale-95 transition-all"
            >
              {{ copiedStates.bankName ? 'පිටපත් කළා!' : 'Copy' }}
            </button>
          </div>

          <!-- Account Number -->
          <div class="p-2 flex items-center justify-between">
            <div>
              <span class="text-text-secondary text-[11px] block">ගිණුම් අංකය</span>
              <span class="text-text-primary font-bold text-sm tracking-wider">{{ CONFIG.payment.bankTransfer.accountNumber }}</span>
            </div>
            <button 
              @click="copyText(CONFIG.payment.bankTransfer.accountNumber, 'accountNumber')"
              class="px-2 py-1 rounded border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary text-[11px] active:scale-95 transition-all"
            >
              {{ copiedStates.accountNumber ? 'පිටපත් කළා!' : 'Copy' }}
            </button>
          </div>

          <!-- Account Name -->
          <div class="p-2 flex items-center justify-between">
            <div>
              <span class="text-text-secondary text-[11px] block">ගිණුම් හිමියා</span>
              <span class="text-text-primary font-bold">{{ CONFIG.payment.bankTransfer.accountName }}</span>
            </div>
            <button 
              @click="copyText(CONFIG.payment.bankTransfer.accountName, 'accountName')"
              class="px-2 py-1 rounded border border-border-primary bg-bg-secondary hover:bg-bg-tertiary text-text-secondary text-[11px] active:scale-95 transition-all"
            >
              {{ copiedStates.accountName ? 'පිටපත් කළා!' : 'Copy' }}
            </button>
          </div>

          <!-- Amount -->
          <div class="p-2 bg-primary-light/50 flex items-center justify-between">
            <div>
              <span class="text-primary text-[11px] block font-semibold">තැන්පත් කළ යුතු මුදල</span>
              <span class="text-text-primary font-bold text-sm">රු. {{ totalCost }}</span>
            </div>
            <button 
              @click="copyText(totalCost.toString(), 'totalAmount')"
              class="px-2 py-1 rounded border border-primary/30 bg-bg-secondary text-primary font-semibold text-[11px] hover:bg-primary-light active:scale-95 transition-all"
            >
              {{ copiedStates.totalAmount ? 'පිටපත් කළා!' : 'Copy' }}
            </button>
          </div>
        </div>
      </section>

      <!-- Action & Submit -->
      <section class="bg-bg-secondary rounded-xl border border-border-primary p-3 sm:p-4 shadow-xs space-y-2.5">
        <p class="text-xs text-text-secondary text-center leading-relaxed">
          <span v-if="deliveryMethod === 'pickup'">
            පහත බොත්තම මඟින් ඔබගේ ඇණවුම අප වෙත එවන්න.
          </span>
          <span v-else>
            බැංකු තැන්පතු පත්‍රිකාව (Slip / Screenshot) සමඟ පහත බොත්තම ඔබා විස්තර එවන්න:
          </span>
        </p>

        <!-- Buttons -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <!-- WhatsApp Button -->
          <button 
            @click="submitViaWhatsApp"
            :disabled="totalBooksCount < 20 || (isFormInvalid && (nameTouched || addressTouched || phoneTouched))"
            class="w-full h-11 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.982L2 22l5.233-1.371a9.936 9.936 0 0 0 4.779 1.22h.005c5.505 0 9.99-4.477 9.99-9.985C22.007 6.478 17.518 2 12.012 2zm6.068 14.254c-.267.753-1.31 1.37-1.808 1.43-.464.056-.99.083-1.63-.122-.397-.127-.925-.333-1.583-.615-2.793-1.196-4.606-4.043-4.747-4.23-.14-.188-1.127-1.499-1.127-2.86 0-1.36.703-2.029.983-2.31.28-.28.615-.352.82-.352h.588c.19 0 .444-.072.693.528.257.618.882 2.148.958 2.302.076.155.127.336.025.539-.101.203-.152.33-.304.507-.152.178-.32.397-.457.533-.153.153-.312.32-.135.624.178.304.79 1.295 1.688 2.09.155.138.31.277.472.41 1.157 1.05 2.05 1.365 2.353 1.488.303.123.48.102.66-.102.179-.203.766-.889.97-1.194.203-.304.407-.254.686-.153.28.102 1.777.838 2.083.99.304.153.508.229.584.356.076.127.076.736-.19 1.49z"/>
            </svg>
            <span>WhatsApp හරහා ඇණවුම් කරන්න</span>
          </button>

          <!-- Email Button -->
          <button 
            @click="submitViaEmail"
            :disabled="totalBooksCount < 20 || (isFormInvalid && (nameTouched || addressTouched || phoneTouched))"
            class="w-full h-11 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Email හරහා ඇණවුම් කරන්න</span>
          </button>
        </div>

        <div class="text-[11px] text-text-secondary text-center space-y-0.5 pt-1">
          <p>WhatsApp: <span class="font-bold text-text-primary">{{ CONFIG.contact.whatsappDisplay }}</span> • Email: <a :href="'mailto:' + CONFIG.contact.email" class="underline hover:text-text-primary">{{ CONFIG.contact.email }}</a></p>
        </div>
      </section>

      <!-- Minimal Compact Footer -->
      <footer class="py-3 text-center text-[11px] text-text-secondary">
        <p>© 2026 Path Nirvana. All Rights Reserved.</p>
      </footer>

    </main>

    <!-- Popup Modal Dialog for Book Info -->
    <div 
      v-if="selectedBookForModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs transition-opacity"
      @click.self="closeBookModal"
      role="dialog"
      aria-modal="true"
      :aria-label="selectedBookForModal.titleSinhala"
    >
      <div 
        class="bg-bg-secondary rounded-2xl border border-border-primary p-4 sm:p-5 max-w-sm w-full shadow-xl relative max-h-[90vh] overflow-y-auto space-y-3"
      >
        <!-- Prominent Top Close Button -->
        <button 
          type="button"
          @click="closeBookModal"
          class="absolute top-3 right-3 w-8 h-8 rounded-full bg-bg-tertiary/70 hover:bg-bg-tertiary text-text-secondary hover:text-text-primary flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
          aria-label="Close dialog"
        >
          ✕
        </button>

        <!-- Book Image -->
        <div class="flex justify-center pt-2">
          <img 
            :src="selectedBookForModal.coverImage" 
            :alt="selectedBookForModal.titleSinhala"
            class="w-32 sm:w-36 h-auto rounded-lg shadow-md border border-border-primary"
          />
        </div>

        <!-- Book Title & Status -->
        <div class="text-center space-y-1">
          <h3 class="text-base sm:text-lg font-bold text-text-primary leading-snug">
            {{ selectedBookForModal.titleSinhala }}
          </h3>
          <div class="flex items-center justify-center gap-2">
            <span class="text-base font-bold text-primary">රු. {{ selectedBookForModal.costLkr }}</span>
            <span 
              :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', 
                selectedBookForModal.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800']"
            >
              ● {{ selectedBookForModal.availabilitySinhala }}
            </span>
          </div>
        </div>

        <!-- Specifications Grid -->
        <div class="grid grid-cols-3 gap-2 text-center text-xs">
          <div class="p-2 bg-bg-primary/70 rounded-lg border border-border-primary">
            <span class="text-[10px] text-text-secondary block">පිටු ගණන</span>
            <span class="font-bold text-text-primary">{{ selectedBookForModal.pages }}</span>
          </div>
          <div class="p-2 bg-bg-primary/70 rounded-lg border border-border-primary">
            <span class="text-[10px] text-text-secondary block">බර</span>
            <span class="font-bold text-text-primary">{{ selectedBookForModal.weightGrams }}g</span>
          </div>
          <div class="p-2 bg-bg-primary/70 rounded-lg border border-border-primary">
            <span class="text-[10px] text-text-secondary block">ප්‍රමාණය</span>
            <span class="font-bold text-text-primary text-[11px] leading-tight">{{ selectedBookForModal.size }}</span>
          </div>
        </div>

        <!-- Note -->
        <p class="text-xs text-text-secondary text-center leading-relaxed">
          {{ selectedBookForModal.noteSinhala }}
        </p>

        <!-- PDF link if available -->
        <div v-if="selectedBookForModal.pdfUrl" class="text-center pt-1">
          <a 
            :href="selectedBookForModal.pdfUrl" 
            target="_blank" 
            class="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1 bg-primary-light/50 px-3 py-1.5 rounded-lg border border-primary/20"
          >
            <span>📄 නොමිලේ PDF බාගත කරන්න ↗</span>
          </a>
        </div>

        <!-- Prominent Bottom Close Button -->
        <div class="pt-2">
          <button 
            type="button"
            @click="closeBookModal"
            class="w-full py-2.5 rounded-lg bg-bg-tertiary hover:bg-border-primary text-text-primary font-bold text-xs transition-all cursor-pointer"
          >
            වසන්න (Close)
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Number input styling overrides to hide standard spinners */
input[type=number]::-webkit-inner-spin-button, 
input[type=number]::-webkit-outer-spin-button { 
  -webkit-appearance: none; 
  margin: 0; 
}
input[type=number] {
  -moz-appearance: textfield;
}
</style>
