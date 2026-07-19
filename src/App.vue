<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { CONFIG } from './config';

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------
const lang = ref('si'); // default to Sinhala
const theme = ref('light'); // default to Light Mode
const quantity = ref(50);
const deliveryMethod = ref('courier'); // courier, pickup, pickmeFlash

// Form Fields
const name = ref('');
const address = ref('');
const phone = ref('');

// Tracking interaction for validation (to avoid showing errors on load)
const nameTouched = ref(false);
const addressTouched = ref(false);
const phoneTouched = ref(false);

// Copied states for tooltips
const copiedStates = ref({
  accountNumber: false,
  accountName: false,
  bankName: false,
  totalAmount: false,
});

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
onMounted(() => {
  // Saved theme preference or default to light
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    theme.value = savedTheme;
  } else {
    theme.value = 'light';
  }
  updateThemeClass();

  // Load configuration from URL search query parameters if present
  const params = new URLSearchParams(window.location.search);
  const qParam = params.get('qty') || params.get('q');
  if (qParam) {
    const parsedQty = parseInt(qParam, 10);
    if (!isNaN(parsedQty) && parsedQty > 0) {
      quantity.value = parsedQty;
    }
  }

  const mParam = params.get('method') || params.get('m');
  if (mParam && ['courier', 'pickup', 'pickmeFlash'].includes(mParam)) {
    deliveryMethod.value = mParam;
  }
});

// Synchronize quantity and deliveryMethod back to the URL query parameters dynamically
watch([quantity, deliveryMethod], () => {
  const url = new URL(window.location.href);
  url.searchParams.set('qty', quantity.value);
  url.searchParams.set('method', deliveryMethod.value);
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
});

function updateThemeClass() {
  if (theme.value === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('theme', theme.value);
}

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  updateThemeClass();
}

function toggleLang(newLang) {
  lang.value = newLang;
  document.documentElement.setAttribute('lang', newLang);
}

// -------------------------------------------------------------
// Validation Logic
// -------------------------------------------------------------
// Regex for checking Sinhala Unicode characters: [\u0D80-\u0DFF]
const hasSinhalaChars = (str) => /[\u0D80-\u0DFF]/.test(str);

const isNameInvalid = computed(() => {
  if (!name.value.trim()) return 'required';
  if (hasSinhalaChars(name.value)) return 'english_only';
  return '';
});

const isAddressInvalid = computed(() => {
  if (deliveryMethod.value === 'pickup') return ''; // Address not needed for self pickup
  if (!address.value.trim()) return 'required';
  if (hasSinhalaChars(address.value)) return 'english_only';
  return '';
});

const isPhoneInvalid = computed(() => {
  if (!phone.value.trim()) return 'required';
  // Check if phone has at least 9-10 digits (common Sri Lankan phone numbers)
  const cleanPhone = phone.value.replace(/\D/g, '');
  if (cleanPhone.length < 9) return 'invalid';
  return '';
});

const isFormInvalid = computed(() => {
  return !!isNameInvalid.value || !!isAddressInvalid.value || !!isPhoneInvalid.value;
});

// -------------------------------------------------------------
// Calculation Logic
// -------------------------------------------------------------
const bookCost = computed(() => quantity.value * CONFIG.book.costLkr);

const parcelWeightKg = computed(() => {
  return (quantity.value * CONFIG.book.weightGrams) / 1000;
});

const deliveryCost = computed(() => {
  if (deliveryMethod.value === 'pickup' || deliveryMethod.value === 'pickmeFlash') {
    return 0;
  }
  
  // Courier calculations
  const weight = parcelWeightKg.value;
  const chargeableWeight = Math.ceil(weight);
  const base = CONFIG.delivery.courier.baseChargeLkr;
  const extra = CONFIG.delivery.courier.additionalKgChargeLkr;
  
  let cost = base + Math.max(0, chargeableWeight - 1) * extra;
  
  // Add packing cost directly to courier delivery cost
  const thresh = CONFIG.delivery.courier.packingCostThreshold;
  const perBatch = CONFIG.delivery.courier.packingCostPerBatch;
  if (quantity.value > thresh) {
    cost += Math.ceil(quantity.value / 50) * perBatch;
  }
  
  return cost;
});

const rawTotalCost = computed(() => {
  return bookCost.value + deliveryCost.value;
});

const totalCost = computed(() => {
  // If more than 50 books, round up the grand total to the nearest 100
  if (quantity.value > 50 && deliveryMethod.value === 'courier') {
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
// Submission Handlers (WhatsApp & Email)
// -------------------------------------------------------------
const formattedOrderMessage = computed(() => {
  const deliveryMethodNames = {
    pickup: lang.value === 'si' ? 'ස්වයං එකතු කර ගැනීම (Self-Pickup)' : 'Self-Pickup',
    courier: lang.value === 'si' ? 'Citypak කුරියර් (Courier)' : 'Citypak Courier',
    pickmeFlash: lang.value === 'si' ? 'PickMe Flash සේවාව' : 'PickMe Flash',
  };

  const deliveryStr = deliveryMethodNames[deliveryMethod.value];
  
  let msg = '';
  if (lang.value === 'si') {
    msg += `නව පොත් ඇණවුමක් (New Book Order)\n`;
    msg += `--------------------------------------\n`;
    msg += `පොතේ නම: ${CONFIG.book.titleSinhala}\n`;
    msg += `පොත් ගණන: ${quantity.value}\n`;
    msg += `ලබාගන්නා ආකාරය: ${deliveryStr}\n`;
    msg += `ගෙවන ලද මුළු මුදල: රු. ${totalCost.value}\n\n`;
    
    msg += `ලබන්නාගේ තොරතුරු (Recipient Details):\n`;
    msg += `නම (Name): ${name.value.trim()}\n`;
    if (deliveryMethod.value !== 'pickup') {
      msg += `ලිපිනය (Address): ${address.value.trim()}\n`;
    }
    msg += `දුරකථනය (Phone): ${phone.value.trim()}\n`;
    
    if (deliveryMethod.value !== 'pickup') {
      msg += `\n(බැංකු තැන්පතු රිසිට් පතේ ඡායාරූපය/Screen shot එක මෙයට අමුණා එවන්න)`;
    }
  } else {
    msg += `New Book Order\n`;
    msg += `--------------------------------------\n`;
    msg += `Book Title: ${CONFIG.book.titleEnglish}\n`;
    msg += `Quantity: ${quantity.value}\n`;
    msg += `Delivery Method: ${deliveryStr}\n`;
    msg += `Total Paid Amount: Rs. ${totalCost.value}\n\n`;
    
    msg += `Recipient Details:\n`;
    msg += `Name: ${name.value.trim()}\n`;
    if (deliveryMethod.value !== 'pickup') {
      msg += `Address: ${address.value.trim()}\n`;
    }
    msg += `Phone: ${phone.value.trim()}\n`;
    
    if (deliveryMethod.value !== 'pickup') {
      msg += `\n(Please attach a screenshot of your bank transfer receipt)`;
    }
  }
  return msg;
});

function submitViaWhatsApp() {
  nameTouched.value = true;
  addressTouched.value = true;
  phoneTouched.value = true;
  
  if (isFormInvalid.value) {
    alert(translations[lang.value].validationError);
    return;
  }
  
  const encodedText = encodeURIComponent(formattedOrderMessage.value);
  const waUrl = `https://wa.me/${CONFIG.contact.whatsappNumber}?text=${encodedText}`;
  window.open(waUrl, '_blank');
}

function submitViaEmail() {
  nameTouched.value = true;
  addressTouched.value = true;
  phoneTouched.value = true;
  
  if (isFormInvalid.value) {
    alert(translations[lang.value].validationError);
    return;
  }
  
  const subject = encodeURIComponent(`Book Order: ${name.value.substring(0, 20)}`);
  const body = encodeURIComponent(formattedOrderMessage.value);
  const mailtoUrl = `mailto:${CONFIG.contact.email}?subject=${subject}&body=${body}`;
  window.open(mailtoUrl, '_blank');
}

// -------------------------------------------------------------
// Translation Dictionary
// -------------------------------------------------------------
const translations = {
  si: {
    title: "Mindfulness සරලව දකිමු සතිය",
    subtitle: "පොත ඇණවුම් කිරීම් සහ තොරතුරු සේවාව",
    bookDetails: "පොත පිළිබඳ තොරතුරු",
    size: "ප්‍රමාණය",
    pages: "පිටු ගණන",
    weight: "බර (තනි පොතක)",
    availability: "තොග පවතින බව",
    availableNow: "දැනට තොග ඇත (ඇණවුම් කළ හැක)",
    outOfStock: "දැනට තොග අවසන්",
    printingCost: "මුද්‍රණ වියදම (පොතකට)",
    lkr: "රු.",
    grams: "ග්‍රෑම්",
    orderTitle: "පොත් ඇණවුම් කිරීමේ පෝරමය",
    quantity: "අවශ්‍ය පොත් ගණන කීයද?",
    deliveryMethod: "ලබාගැනීමේ ක්‍රමය",
    pickup: "පැමිණ ලබා ගැනීම (හෝමාගම)",
    courier: "Citypak කුරියර් (නිවසටම)",
    pickmeFlash: "PickMe Flash (කි.මී. 15 සීමාව)",
    calculations: "මිල සහ බර ගණනය කිරීම",
    pricePerBook: "පොත් සඳහා මුදල",
    deliveryFee: "කුරියර් ගාස්තුව",
    packingFee: "ඇසුරුම් සහ වටකිරීම් ගාස්තුව",
    parcelWeight: "පාර්සලයේ බර",
    totalAmount: "ගෙවිය යුතු මුළු මුදල",
    payToDriver: "පැමිණෙන රියදුරුට ගෙවිය යුතුය",
    free: "රු. 0",
    detailsTitle: "ලබන්නාගේ විස්තර",
    detailsPickupTitle: "ඇණවුම්කරුගේ විස්තර",
    fullName: "සම්පූර්ණ නම (Full Name)",
    fullNamePlaceholder: "E.g. J.R. Perera (ඉංග්‍රීසි අකුරින් පමණි)",
    address: "බෙදාහැරිය යුතු ලිපිනය (Address)",
    addressPlaceholder: "E.g. No 12, Temple Road, Homagama (ඉංග්‍රීසි අකුරින් පමණි)",
    phone: "දුරකථන අංකය (Phone Number)",
    phonePlaceholder: "E.g. 0712345678",
    englishOnlyWarning: "⚠️ නම සහ ලිපිනය ඉංග්‍රීසි අකුරින් (English) පමණක් ඇතුළත් කරන්න. සිංහල අකුරු භාවිතා කළ නොහැක.",
    requiredField: "මෙය අත්‍යවශ්‍ය ක්‍ෂේත්‍රයකි.",
    invalidPhone: "වලංගු දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 07XXXXXXXX).",
    pickupDetails: "පොත් ලබා ගැනීමට පැමිණීමට පෙර අපව දැනුවත් කිරීම අවශ්‍ය නොවේ. ඔබ පැමිණෙන විට තොග පවතින ආකාරය අනුව පොත් ලබාගත හැක. (කලින් ගෙවීමකින් තොරව පොත් වෙන්කර තබාගත නොහැකි බව කරුණාවෙන් සලකන්න.) මුදල් ගෙවීම පොත් ලබාගන්නා අවස්ථාවේදී සිදු කළ හැක.",
    pickupLocation: "පොත් ලබාගත හැකි ස්ථානය (Path Nirvana Homagama)",
    viewOnGoogleMaps: "Google සිතියම (Google Maps) ඔස්සේ බලන්න",
    pickmeDetails: "හෝමාගම අපගේ ස්ථානයේ සිට කිලෝමීටර් 15 ක සීමාව ඇතුළත පමණක් ලබාගත හැක. පොතේ මුද්‍රණ වියදම පමණක් අපගේ බැංකු ගිණුමට තැන්පත් කළ යුතු අතර බෙදාහැරීමේ ගාස්තුව පැමිණෙන රියදුරුට ඍජුවම ගෙවිය යුතුය.",
    courierDetails: "Citypak කුරියර් සේවාව මඟින් දිවයින පුරා බෙදාහරිනු ලැබේ. (කරුණාවෙන් සලකන්න: COD / ලැබුණු පසු මුදල් ගෙවීමේ සේවාව නොමැති අතර, පොත් එවීම සිදු කරනුයේ කලින් බැංකු තැන්පතුවක් සිදු කිරීමෙන් පසුව පමණි.) බෙදාහැරීම සඳහා ප්‍රදේශය අනුව දින 3-5ත් අතර කාලයක් ගත විය හැකි අතර, පාර්සලය එවීමෙන් පසු ලුහුබැඳීමේ අංකයක් (Tracking Number) ඔබට ලබා දෙනු ඇත.",
    bankDetailsTitle: "බැංකු තැන්පතු උපදෙස්",
    bankDetailsIntro: "පොත් එවීම සිදු කරනුයේ බැංකු තැන්පතුව සිදු කළ පසුව පමණි. (භාණ්ඩ ලැබුණු පසු මුදල් ගෙවීමේ - COD සේවාව ලබාගත නොහැක.) කරුණාකර පහත දැක්වෙන අපගේ බැංකු ගිණුමට අදාළ මුළු මුදල තැන්පත් කරන්න:",
    bankName: "බැංකුව",
    branch: "ශාඛාව",
    accountNumber: "ගිණුම් අංකය",
    accountName: "ගිණුම් හිමියාගේ නම",
    copied: "පිටපත් කෙරුණා!",
    copy: "පිටපත් කරන්න",
    notificationTitle: "ඇණවුම දැනුම් දීම සහ තහවුරු කිරීම",
    notificationIntro: "බැංකු තැන්පතුව සිදු කිරීමෙන් පසු, පහත ක්‍රම දෙකෙන් එකක් භාවිතා කර තැන්පතු පත්‍රිකාව (Slip) සහ ඉහත විස්තර අප වෙත එවන්න:",
    whatsappBtn: "WhatsApp හරහා ඇණවුම් කරන්න",
    emailBtn: "ඊමේල් (Email) හරහා ඇණවුම් කරන්න",
    validationError: "කරුණාකර පෝරමයේ ඇති වැරදි නිවැරදි කර නැවත උත්සාහ කරන්න.",
    language: "භාෂාව",
    theme: "මාදිලිය",
    themeLight: "දිවා මාදිලිය",
    themeDark: "රාත්‍රී මාදිලිය",
    addressRequirementSinhala: "⚠️ කුරියර් ලේබල මුද්‍රණය සඳහා නම සහ ලිපිනය ඉංග්‍රීසි අකුරින් (Latin/English characters) පමණක් ඇතුළත් කළ යුතුය.",
    bookIntro: "ධර්ම දානයක් ලෙස මෙම පොත එහි සැබෑ මුද්‍රණ පිරිවැයටත් වඩා අඩු මුදලකට ඔබට ලබා දීමට කටයුතු සලසා ඇත.",
    pdfLinkText: "නොමිලේ PDF බාගත කරන්න"
  },
  en: {
    title: "Mindfulness සරලව දකිමු සතිය",
    subtitle: "Book Order & Information Service",
    bookDetails: "Book Information",
    size: "Physical Size",
    pages: "Pages",
    weight: "Weight (Per Book)",
    availability: "Availability Status",
    availableNow: "Available Now (In Stock)",
    outOfStock: "Temporarily Out of Stock",
    printingCost: "Printing Cost (Per Book)",
    lkr: "Rs.",
    grams: "g",
    orderTitle: "Book Order Form",
    quantity: "Number of Books Required",
    deliveryMethod: "Delivery Method",
    pickup: "Self-Pickup (Homagama)",
    courier: "Citypak Courier (To Doorstep)",
    pickmeFlash: "PickMe Flash (15km Radius)",
    calculations: "Price & Weight Calculation",
    pricePerBook: "Book Cost",
    deliveryFee: "Courier Fee",
    packingFee: "Packing & Handling Fee",
    parcelWeight: "Parcel Weight",
    totalAmount: "Total Payable Amount",
    payToDriver: "Pay to Delivery Driver",
    free: "Rs. 0",
    detailsTitle: "Recipient Details",
    detailsPickupTitle: "Customer Details",
    fullName: "Full Name (English Letters)",
    fullNamePlaceholder: "E.g. J.R. Perera (English letters only)",
    address: "Delivery Address (English Letters)",
    addressPlaceholder: "E.g. No 12, Temple Road, Homagama (English letters only)",
    phone: "Phone Number",
    phonePlaceholder: "E.g. 0712345678",
    englishOnlyWarning: "⚠️ Name and Address must be in English letters only. Sinhala letters are not allowed.",
    requiredField: "This field is required.",
    invalidPhone: "Please enter a valid phone number (e.g. 07XXXXXXXX).",
    pickupDetails: "You do not need to notify us in advance. Books can be collected based on stock availability when you arrive. (Please note that books cannot be reserved without prior payment.) Payment can be made at collection.",
    pickupLocation: "Pickup Location (Path Nirvana Homagama)",
    viewOnGoogleMaps: "View on Google Maps",
    pickmeDetails: "Only available within a 15km radius of Homagama. You must deposit only the book printing cost to our bank account. The delivery fare must be paid directly to the PickMe Flash driver upon delivery.",
    courierDetails: "Delivered via Citypak courier service islandwide. (Please note: COD / Cash on Delivery is not available. Books will only be dispatched after prior bank transfer is completed.) Please note it take 3-5 days for delivery depending on the location and we will give you a tracking number.",
    bankDetailsTitle: "Bank Deposit Instructions",
    bankDetailsIntro: "Books will only be dispatched after prior bank transfer. (Cash on Delivery - COD is not available.) Please deposit the total amount to the following bank account:",
    bankName: "Bank",
    branch: "Branch",
    accountNumber: "Account Number",
    accountName: "Account Holder Name",
    copied: "Copied!",
    copy: "Copy",
    notificationTitle: "Confirm Order & Notify Us",
    notificationIntro: "After making the bank transfer, send us a photo of the slip along with the above details via WhatsApp or Email:",
    whatsappBtn: "Order via WhatsApp",
    emailBtn: "Order via Email",
    validationError: "Please correct the errors in the form before proceeding.",
    language: "Language",
    theme: "Theme",
    themeLight: "Light Mode",
    themeDark: "Dark Mode",
    addressRequirementSinhala: "⚠️ For courier printing purposes, Name and Address must be written in English characters only.",
    bookIntro: "As a Dhamma donation, this book is provided at a cost lower than the actual printing cost.",
    pdfLinkText: "Download Free PDF Version"
  }
};
</script>

<template>
  <div class="min-h-screen bg-bg-primary text-text-text transition-colors duration-300">
    <!-- Header -->
    <header class="sticky top-0 z-50 bg-bg-secondary/80 backdrop-blur-md border-b border-border-primary shadow-xs transition-colors duration-300">
      <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <!-- Logo Icon -->
          <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
            🧘
          </div>
          <div>
            <h1 class="text-lg font-bold text-text-primary leading-tight font-display">
              {{ translations[lang].title }}
            </h1>
            <p class="text-xs text-text-secondary">
              {{ translations[lang].subtitle }}
            </p>
          </div>
        </div>
        
        <!-- Controls (Theme & Language) -->
        <div class="flex items-center space-x-3">
          <!-- Language Switcher -->
          <div class="bg-bg-primary p-0.5 rounded-lg border border-border-primary flex text-xs">
            <button 
              @click="toggleLang('si')"
              :class="['px-2.5 py-1 rounded-md transition-all duration-200', lang === 'si' ? 'bg-primary text-white font-bold shadow-xs' : 'text-text-secondary hover:text-text-primary']"
            >
              සිංහල
            </button>
            <button 
              @click="toggleLang('en')"
              :class="['px-2.5 py-1 rounded-md transition-all duration-200', lang === 'en' ? 'bg-primary text-white font-bold shadow-xs' : 'text-text-secondary hover:text-text-primary']"
            >
              English
            </button>
          </div>

          <!-- Theme Toggler -->
          <button 
            @click="toggleTheme" 
            class="p-2 rounded-lg border border-border-primary hover:bg-bg-primary text-text-secondary transition-colors"
            :title="translations[lang].theme"
          >
            <!-- Sun Icon (shown in dark mode) -->
            <svg v-if="theme === 'dark'" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
            <!-- Moon Icon (shown in light mode) -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-6xl mx-auto px-4 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Left Side: Book details card -->
        <section class="lg:col-span-5 space-y-6">
          <div class="bg-bg-secondary rounded-2xl border border-border-primary overflow-hidden shadow-xs hover:shadow-md transition-all duration-300">
            <!-- Gradiant Cover Wrapper -->
            <div class="relative bg-gradient-to-tr from-teal-500/10 to-emerald-500/10 p-6 flex justify-center items-center group">
              <!-- Book Image -->
              <img 
                :src="CONFIG.book.coverImage" 
                :alt="CONFIG.book.titleEnglish"
                class="w-64 h-auto rounded-lg shadow-lg group-hover:scale-[1.02] transition-transform duration-300"
              />
              
              <!-- Availability badge overlay -->
              <span class="absolute top-4 left-4 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500 text-white shadow-xs">
                <span class="w-2 h-2 rounded-full bg-white mr-1.5 animate-pulse"></span>
                {{ translations[lang].availableNow }}
              </span>
            </div>

            <!-- Book Specs -->
            <div class="p-6 space-y-4">
              <h2 class="text-xl font-bold text-text-primary">{{ translations[lang].bookDetails }}</h2>
              
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div class="p-3 bg-bg-primary rounded-xl border border-border-primary flex flex-col justify-center">
                  <span class="text-text-secondary text-xs font-medium">{{ translations[lang].size }}</span>
                  <span class="text-text-primary font-bold mt-0.5">{{ CONFIG.book.size }}</span>
                </div>
                
                <div class="p-3 bg-bg-primary rounded-xl border border-border-primary flex flex-col justify-center">
                  <span class="text-text-secondary text-xs font-medium">{{ translations[lang].pages }}</span>
                  <span class="text-text-primary font-bold mt-0.5">{{ CONFIG.book.pages }}</span>
                </div>
                
                <div class="p-3 bg-bg-primary rounded-xl border border-border-primary flex flex-col justify-center">
                  <span class="text-text-secondary text-xs font-medium">{{ translations[lang].weight }}</span>
                  <span class="text-text-primary font-bold mt-0.5">{{ CONFIG.book.weightGrams }} {{ translations[lang].grams }}</span>
                </div>

                <div class="p-3 bg-bg-primary rounded-xl border border-border-primary flex flex-col justify-center font-display">
                  <span class="text-text-secondary text-xs font-medium">{{ translations[lang].printingCost }}</span>
                  <span class="text-primary font-bold mt-0.5 text-base">{{ translations[lang].lkr }} {{ CONFIG.book.costLkr }}</span>
                </div>
              </div>

              <!-- Brief Book Intro -->
              <div class="pt-4 border-t border-border-primary space-y-3">
                <p class="text-sm text-text-secondary leading-relaxed">
                  {{ translations[lang].bookIntro }}
                </p>
                <div class="pt-1">
                  <a 
                    href="https://tipitaka.lk/library/1210" 
                    target="_blank" 
                    class="inline-flex items-center text-xs text-primary hover:underline font-semibold bg-primary/5 px-3 py-2 rounded-lg border border-primary/20 transition-all active:scale-[0.98]"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {{ translations[lang].pdfLinkText }}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Right Side: Calculations & Order form -->
        <section class="lg:col-span-7 space-y-6">
          
          <!-- Step 1: Selection & live calculations -->
          <div class="bg-bg-secondary p-6 rounded-2xl border border-border-primary shadow-xs space-y-6">
            <div class="flex items-center space-x-2">
              <span class="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">1</span>
              <h2 class="text-lg font-bold text-text-primary">{{ translations[lang].orderTitle }}</h2>
            </div>

            <!-- Quantity Selector -->
            <div>
              <label class="block text-sm font-semibold text-text-secondary mb-2" for="quantity">
                {{ translations[lang].quantity }}
              </label>
              <div class="flex items-center space-x-3">
                <button 
                  type="button"
                  @click="quantity > 1 ? quantity-- : null"
                  class="w-12 h-12 rounded-xl border border-border-primary flex items-center justify-center hover:bg-bg-primary text-text-primary font-bold text-xl active:scale-95 transition-all"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <input 
                  id="quantity"
                  type="number"
                  v-model.number="quantity"
                  min="1"
                  class="w-20 h-12 rounded-xl border border-border-primary text-center font-bold text-lg text-text-primary bg-bg-secondary focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button 
                  type="button"
                  @click="quantity++"
                  class="w-12 h-12 rounded-xl border border-border-primary flex items-center justify-center hover:bg-bg-primary text-text-primary font-bold text-xl active:scale-95 transition-all"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <!-- Delivery Method -->
            <div class="space-y-3">
              <span class="block text-sm font-semibold text-text-secondary">
                {{ translations[lang].deliveryMethod }}
              </span>
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <!-- Courier Option -->
                <label 
                  :class="['relative p-4 rounded-xl border flex flex-col cursor-pointer transition-all duration-200', 
                    deliveryMethod === 'courier' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border-primary hover:bg-bg-primary']"
                >
                  <input 
                    type="radio" 
                    v-model="deliveryMethod" 
                    value="courier" 
                    class="sr-only"
                  />
                  <span class="text-sm font-bold text-text-primary">
                    📦 {{ translations[lang].courier }}
                  </span>
                  <span class="text-xs text-text-secondary mt-1">
                    Citypak (Rs. 450 +)
                  </span>
                </label>

                <!-- PickMe Flash Option -->
                <label 
                  :class="['relative p-4 rounded-xl border flex flex-col cursor-pointer transition-all duration-200', 
                    deliveryMethod === 'pickmeFlash' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border-primary hover:bg-bg-primary']"
                >
                  <input 
                    type="radio" 
                    v-model="deliveryMethod" 
                    value="pickmeFlash" 
                    class="sr-only"
                  />
                  <span class="text-sm font-bold text-text-primary">
                    ⚡ {{ translations[lang].pickmeFlash }}
                  </span>
                  <span class="text-xs text-text-secondary mt-1">
                    Pay driver directly
                  </span>
                </label>

                <!-- Self Pickup Option -->
                <label 
                  :class="['relative p-4 rounded-xl border flex flex-col cursor-pointer transition-all duration-200', 
                    deliveryMethod === 'pickup' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border-primary hover:bg-bg-primary']"
                >
                  <input 
                    type="radio" 
                    v-model="deliveryMethod" 
                    value="pickup" 
                    class="sr-only"
                  />
                  <span class="text-sm font-bold text-text-primary">
                    🚶 {{ translations[lang].pickup }}
                  </span>
                  <span class="text-xs text-text-secondary mt-1">
                    Collect from Homagama
                  </span>
                </label>
              </div>
            </div>

            <!-- Live Calculation Summary Card -->
            <div class="bg-bg-primary p-4 rounded-xl border border-border-primary space-y-3 font-display">
              <h3 class="text-sm font-semibold text-text-primary border-b border-border-primary pb-2 flex justify-between">
                <span>{{ translations[lang].calculations }}</span>
                <span class="text-xs font-normal text-text-secondary">({{ quantity }} {{ quantity === 1 ? 'book' : 'books' }})</span>
              </h3>
              
              <!-- Calculations breakdown -->
              <div class="space-y-1.5 text-sm text-text-secondary">
                <div class="flex justify-between">
                  <span>{{ translations[lang].pricePerBook }} ({{ quantity }} × {{ CONFIG.book.costLkr }}):</span>
                  <span class="text-text-primary font-medium">Rs. {{ bookCost }}</span>
                </div>
                
                <div class="flex justify-between">
                  <span>{{ translations[lang].deliveryFee }}:</span>
                  <span class="text-text-primary font-medium">
                    <span v-if="deliveryMethod === 'courier'">Rs. {{ deliveryCost }}</span>
                    <span v-else-if="deliveryMethod === 'pickmeFlash'" class="text-amber-600 dark:text-amber-400 font-semibold">{{ translations[lang].payToDriver }}</span>
                    <span v-else class="text-emerald-600 dark:text-emerald-400 font-semibold">{{ translations[lang].free }}</span>
                  </span>
                </div>



                <div class="flex justify-between text-xs pt-1 border-t border-border-primary border-dashed">
                  <span>{{ translations[lang].parcelWeight }}:</span>
                  <span class="text-text-primary font-medium">{{ parcelWeightKg.toFixed(2) }} kg</span>
                </div>
              </div>

              <!-- Grand Total -->
              <div class="flex justify-between items-center text-text-primary pt-2 border-t border-border-primary font-bold text-base">
                <span>{{ translations[lang].totalAmount }}:</span>
                <span class="text-primary text-xl">Rs. {{ totalCost }}</span>
              </div>
              

            </div>

            <!-- Delivery Method Specific Instructions -->
            <div class="bg-primary/5 p-4 rounded-xl border border-primary/20 text-sm space-y-3">
              <p class="text-text-secondary leading-relaxed">
                <span v-if="deliveryMethod === 'courier'">
                  ℹ️ {{ translations[lang].courierDetails }}
                </span>
                <span v-else-if="deliveryMethod === 'pickmeFlash'">
                  ℹ️ {{ translations[lang].pickmeDetails }}
                </span>
                <span v-else>
                  ℹ️ {{ translations[lang].pickupDetails }}
                </span>
              </p>

              <!-- Self Pickup Google Maps details -->
              <div v-if="deliveryMethod === 'pickup'" class="pt-2 space-y-2">
                <span class="block font-bold text-text-primary">📍 {{ translations[lang].pickupLocation }}:</span>
                <a 
                  :href="CONFIG.delivery.pickup.mapsUrl" 
                  target="_blank" 
                  class="inline-flex items-center text-primary hover:underline font-semibold"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {{ translations[lang].viewOnGoogleMaps }}
                </a>
                
                <!-- Directions -->
                <div class="mt-2 p-3 bg-bg-secondary rounded-lg border border-border-primary text-xs leading-relaxed text-text-secondary">
                  <span class="font-bold text-text-primary block mb-0.5">
                    {{ lang === 'si' ? 'පැමිණිය යුතු මඟ:' : 'Directions:' }}
                  </span>
                  <span>
                    {{ lang === 'si' ? CONFIG.delivery.pickup.directionsSinhala : CONFIG.delivery.pickup.directionsEnglish }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Recipient details form -->
          <div class="bg-bg-secondary p-6 rounded-2xl border border-border-primary shadow-xs space-y-6">
            <div class="flex items-center space-x-2">
              <span class="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">2</span>
              <h2 class="text-lg font-bold text-text-primary">
                {{ deliveryMethod === 'pickup' ? translations[lang].detailsPickupTitle : translations[lang].detailsTitle }}
              </h2>
            </div>

            <!-- English requirement warning -->
            <div v-if="deliveryMethod !== 'pickup'" class="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 text-xs text-amber-800 dark:text-amber-400">
              {{ translations[lang].addressRequirementSinhala }}
            </div>

            <div class="space-y-4">
              <!-- Full Name Field -->
              <div>
                <label for="nameInput" class="block text-sm font-semibold text-text-secondary mb-1">
                  {{ translations[lang].fullName }} <span class="text-red-500">*</span>
                </label>
                <input 
                  id="nameInput"
                  type="text" 
                  v-model="name"
                  @blur="nameTouched = true"
                  :placeholder="translations[lang].fullNamePlaceholder"
                  class="w-full h-12 px-4 rounded-xl border border-border-primary text-text-primary bg-bg-secondary focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary text-base"
                  autocomplete="name"
                />
                <!-- Error messages -->
                <p v-if="nameTouched && isNameInvalid === 'required'" class="text-xs text-red-500 mt-1">
                  {{ translations[lang].requiredField }}
                </p>
                <p v-if="nameTouched && isNameInvalid === 'english_only'" class="text-xs text-red-500 mt-1 font-semibold">
                  {{ translations[lang].englishOnlyWarning }}
                </p>
              </div>

              <!-- Address Field (only shown if not pickup) -->
              <div v-if="deliveryMethod !== 'pickup'">
                <label for="addressInput" class="block text-sm font-semibold text-text-secondary mb-1">
                  {{ translations[lang].address }} <span class="text-red-500">*</span>
                </label>
                <textarea 
                  id="addressInput"
                  v-model="address"
                  @blur="addressTouched = true"
                  :placeholder="translations[lang].addressPlaceholder"
                  rows="3"
                  class="w-full p-4 rounded-xl border border-border-primary text-text-primary bg-bg-secondary focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary text-base"
                  autocomplete="street-address"
                ></textarea>
                <!-- Error messages -->
                <p v-if="addressTouched && isAddressInvalid === 'required'" class="text-xs text-red-500 mt-1">
                  {{ translations[lang].requiredField }}
                </p>
                <p v-if="addressTouched && isAddressInvalid === 'english_only'" class="text-xs text-red-500 mt-1 font-semibold">
                  {{ translations[lang].englishOnlyWarning }}
                </p>
              </div>

              <!-- Phone Field -->
              <div>
                <label for="phoneInput" class="block text-sm font-semibold text-text-secondary mb-1">
                  {{ translations[lang].phone }} <span class="text-red-500">*</span>
                </label>
                <input 
                  id="phoneInput"
                  type="tel" 
                  v-model="phone"
                  @blur="phoneTouched = true"
                  :placeholder="translations[lang].phonePlaceholder"
                  class="w-full h-12 px-4 rounded-xl border border-border-primary text-text-primary bg-bg-secondary focus:outline-hidden focus:border-primary focus:ring-1 focus:ring-primary text-base"
                  autocomplete="tel"
                />
                <!-- Error messages -->
                <p v-if="phoneTouched && isPhoneInvalid === 'required'" class="text-xs text-red-500 mt-1">
                  {{ translations[lang].requiredField }}
                </p>
                <p v-if="phoneTouched && isPhoneInvalid === 'invalid'" class="text-xs text-red-500 mt-1">
                  {{ translations[lang].invalidPhone }}
                </p>
              </div>
            </div>
          </div>

          <!-- Step 3: Bank transfer instructions (hidden for self pickup) -->
          <div 
            v-if="deliveryMethod !== 'pickup'"
            class="bg-bg-secondary p-6 rounded-2xl border border-border-primary shadow-xs space-y-4"
          >
            <div class="flex items-center space-x-2">
              <span class="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">3</span>
              <h2 class="text-lg font-bold text-text-primary">{{ translations[lang].bankDetailsTitle }}</h2>
            </div>
            
            <p class="text-sm text-text-secondary">
              {{ translations[lang].bankDetailsIntro }}
            </p>

            <div class="bg-bg-primary rounded-xl border border-border-primary divide-y divide-border-primary overflow-hidden">
              <!-- Bank Name -->
              <div class="p-3.5 flex items-center justify-between text-sm">
                <div>
                  <span class="text-text-secondary text-xs block">{{ translations[lang].bankName }}</span>
                  <span class="text-text-primary font-bold">{{ CONFIG.payment.bankTransfer.bankName }}</span>
                </div>
                <button 
                  @click="copyText(CONFIG.payment.bankTransfer.bankName.split(' ')[0], 'bankName')"
                  class="px-3 py-1.5 rounded-lg border border-border-primary text-text-secondary text-xs hover:bg-bg-secondary active:scale-95 transition-all flex items-center space-x-1"
                >
                  <span>{{ copiedStates.bankName ? translations[lang].copied : translations[lang].copy }}</span>
                </button>
              </div>

              <!-- Branch -->
              <div class="p-3.5 flex items-center justify-between text-sm">
                <div>
                  <span class="text-text-secondary text-xs block">{{ translations[lang].branch }}</span>
                  <span class="text-text-primary font-bold">{{ CONFIG.payment.bankTransfer.branch }}</span>
                </div>
              </div>

              <!-- Account Number -->
              <div class="p-3.5 flex items-center justify-between text-sm">
                <div>
                  <span class="text-text-secondary text-xs block">{{ translations[lang].accountNumber }}</span>
                  <span class="text-text-primary font-bold text-base tracking-wider">{{ CONFIG.payment.bankTransfer.accountNumber }}</span>
                </div>
                <button 
                  @click="copyText(CONFIG.payment.bankTransfer.accountNumber, 'accountNumber')"
                  class="px-3 py-1.5 rounded-lg border border-border-primary text-text-secondary text-xs hover:bg-bg-secondary active:scale-95 transition-all flex items-center space-x-1"
                >
                  <span>{{ copiedStates.accountNumber ? translations[lang].copied : translations[lang].copy }}</span>
                </button>
              </div>

              <!-- Account Name -->
              <div class="p-3.5 flex items-center justify-between text-sm">
                <div>
                  <span class="text-text-secondary text-xs block">{{ translations[lang].accountName }}</span>
                  <span class="text-text-primary font-bold">{{ CONFIG.payment.bankTransfer.accountName }}</span>
                </div>
                <button 
                  @click="copyText(CONFIG.payment.bankTransfer.accountName, 'accountName')"
                  class="px-3 py-1.5 rounded-lg border border-border-primary text-text-secondary text-xs hover:bg-bg-secondary active:scale-95 transition-all flex items-center space-x-1"
                >
                  <span>{{ copiedStates.accountName ? translations[lang].copied : translations[lang].copy }}</span>
                </button>
              </div>

              <!-- Dynamic Amount To Transfer -->
              <div class="p-3.5 bg-primary/5 flex items-center justify-between text-sm font-semibold">
                <div>
                  <span class="text-primary text-xs block">{{ translations[lang].totalAmount }}</span>
                  <span class="text-text-primary font-bold text-lg">Rs. {{ totalCost }}</span>
                </div>
                <button 
                  @click="copyText(totalCost.toString(), 'totalAmount')"
                  class="px-3 py-1.5 rounded-lg border border-primary/20 bg-white text-primary text-xs hover:bg-primary/10 active:scale-95 transition-all flex items-center space-x-1"
                >
                  <span>{{ copiedStates.totalAmount ? translations[lang].copied : translations[lang].copy }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Step 4 / Final Action: Notification and Dispatch -->
          <div class="bg-bg-secondary p-6 rounded-2xl border border-border-primary shadow-xs space-y-6">
            <div class="flex items-center space-x-2">
              <span class="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                {{ deliveryMethod === 'pickup' ? '3' : '4' }}
              </span>
              <h2 class="text-lg font-bold text-text-primary">{{ translations[lang].notificationTitle }}</h2>
            </div>

            <p class="text-sm text-text-secondary leading-relaxed">
              <span v-if="deliveryMethod === 'pickup'">
                💡 {{ lang === 'si' ? 'පොත් ලබා ගැනීමට පැමිණීමට පෙර අපව කලින් දැනුවත් කිරීම අවශ්‍ය නොවේ. ඔබ පැමිණෙන විට තොග පවතින ආකාරය අනුව පොත් ලබාගත හැක. (කලින් ගෙවීමකින් තොරව පොත් කලින් වෙන්කර තබාගත නොහැකි බව කරුණාවෙන් සලකන්න.)' : 'You do not need to notify us in advance. Books can be collected based on stock availability when you arrive. (Please note that books cannot be reserved without prior payment.)' }}
              </span>
              <span v-else>
                {{ translations[lang].notificationIntro }}
              </span>
            </p>

            <!-- Send Action Buttons -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- WhatsApp Submit Button -->
              <button 
                @click="submitViaWhatsApp"
                :disabled="isFormInvalid && (nameTouched || addressTouched || phoneTouched)"
                class="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
              >
                <!-- WhatsApp SVG icon -->
                <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.982L2 22l5.233-1.371a9.936 9.936 0 0 0 4.779 1.22h.005c5.505 0 9.99-4.477 9.99-9.985C22.007 6.478 17.518 2 12.012 2zm6.068 14.254c-.267.753-1.31 1.37-1.808 1.43-.464.056-.99.083-1.63-.122-.397-.127-.925-.333-1.583-.615-2.793-1.196-4.606-4.043-4.747-4.23-.14-.188-1.127-1.499-1.127-2.86 0-1.36.703-2.029.983-2.31.28-.28.615-.352.82-.352h.588c.19 0 .444-.072.693.528.257.618.882 2.148.958 2.302.076.155.127.336.025.539-.101.203-.152.33-.304.507-.152.178-.32.397-.457.533-.153.153-.312.32-.135.624.178.304.79 1.295 1.688 2.09.155.138.31.277.472.41 1.157 1.05 2.05 1.365 2.353 1.488.303.123.48.102.66-.102.179-.203.766-.889.97-1.194.203-.304.407-.254.686-.153.28.102 1.777.838 2.083.99.304.153.508.229.584.356.076.127.076.736-.19 1.49z"/>
                </svg>
                <span>{{ translations[lang].whatsappBtn }}</span>
              </button>

              <!-- Email Submit Button -->
              <button 
                @click="submitViaEmail"
                :disabled="isFormInvalid && (nameTouched || addressTouched || phoneTouched)"
                class="w-full py-4 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
              >
                <!-- Email SVG icon -->
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{{ translations[lang].emailBtn }}</span>
              </button>
            </div>

            <!-- Email Display and WhatsApp Display text below -->
            <div class="text-xs text-text-secondary text-center space-y-1">
              <p>Email: <a :href="'mailto:' + CONFIG.contact.email" class="underline hover:text-text-primary">{{ CONFIG.contact.email }}</a></p>
              <p>WhatsApp: <span class="font-bold">{{ CONFIG.contact.whatsappDisplay }}</span></p>
            </div>
          </div>
        </section>

      </div>
    </main>

    <!-- Footer -->
    <footer class="mt-16 border-t border-border-primary bg-bg-secondary py-8 text-center text-xs text-text-secondary transition-colors duration-300">
      <div class="max-w-6xl mx-auto px-4 space-y-2">
        <p>© 2026 Path Nirvana. All Rights Reserved.</p>
      </div>
    </footer>
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
