<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { CONFIG } from './config';
import { copyOrderCardScreenshot } from './services/orderCardGenerator';

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

async function copyOrderScreenshot() {
  if (buttonFeedback.value.screenshot === "loading") return;
  buttonFeedback.value.screenshot = "loading";

  try {
    const activeBooks = CONFIG.books
      .filter((b) => (Number(quantities.value[b.id]) || 0) > 0)
      .map((b) => ({
        ...b,
        quantity: Number(quantities.value[b.id]) || 0
      }));

    const orderData = {
      activeBooks,
      totalBooksCount: totalBooksCount.value,
      booksCost: totalBookCost.value,
      deliveryMethod: deliveryMethod.value,
      deliveryCost: deliveryCost.value,
      totalCost: totalCost.value,
      bankInfo: CONFIG.payment.bankTransfer,
      contactInfo: CONFIG.contact
    };

    const result = await copyOrderCardScreenshot(orderData);
    if (result === 'downloaded') {
      buttonFeedback.value.screenshot = 'downloaded';
    } else {
      buttonFeedback.value.screenshot = 'success';
    }
  } catch (err) {
    console.error('Failed to copy screenshot to clipboard:', err);
    buttonFeedback.value.screenshot = 'error';
  } finally {
    setTimeout(() => {
      buttonFeedback.value.screenshot = '';
    }, 2800);
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
            <span v-else-if="buttonFeedback.screenshot === 'downloaded'" class="text-emerald-600 font-bold flex items-center gap-1 text-[11px]">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              <span>Saved!</span>
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
