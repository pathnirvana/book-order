# Path Nirvana Book Order Webtool — Complete System Design & Implementation Reference

> **Document Purpose**: This file serves as the definitive architecture, design system, decisions log, and implementation guide for the Path Nirvana Book Order application. It contains all context, technical constraints, business logic, layout metrics, and workflow details necessary for any developer or AI assistant to continue development seamlessly.

---

## 1. Executive Summary & Application Context

### 1.1 Project Mission
The **Path Nirvana Book Order Webtool** is a specialized, lightweight web application designed to facilitate the distribution of Theravada Buddhist Dhamma books at subsidized printing costs (Dhamma Dāna). It allows devotees and practitioners in Sri Lanka to calculate delivery charges, choose shipping methods, review payment instructions, and place book orders via WhatsApp or Email.

### 1.2 Core Business Model & Non-Negotiables
- **Non-Profit / Subsidized**: Books are offered below commercial retail rates as a Dhamma service.
- **Minimum Order Requirement**: **50 books** total (`CONFIG.minOrderBooks = 50`) for Courier and PickMe Flash. Orders below 50 books are allowed for **Self-Pickup only**.
- **No Cash on Delivery (Strict `COD නොමැත`)**: All orders require prior bank transfer deposit. Books are dispatched only after receiving the deposit receipt.
- **Delivery Channels**:
  1. **Island-wide Courier (Citypak)**: Weight-based tiered pricing with batch packaging costs.
  2. **PickMe Flash**: Same-day express within 20km of Homagama; delivery fare paid directly to driver upon receipt.
  3. **Self-Pickup (Homagama)**: Free pickup at Path Nirvana premises.

---

## 2. Technical Stack & Repository Structure

### 2.1 Stack
- **Framework**: [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)
- **Build Tool**: [Vite 8](https://vite.dev/)
- **CSS Engine**: [Tailwind CSS 4](https://tailwindcss.com/) using semantic theme variables
- **Runtime / Package Manager**: Node.js v22+ / npm
- **Image Generation**: HTML5 Canvas 2D API (1080 px wide, height fits the content, rendered at 2× → 2160 px)

### 2.2 Directory Structure
```text
/Volumes/2TB/node/misc-ai/book-order/
├── index.html                   # HTML entry point with Google Fonts (Noto Sans Sinhala, Outfit)
├── package.json                 # Project dependencies and npm scripts
├── vite.config.js               # Vite config with Vue, Tailwind, and server CORS
├── public/                      # Static assets served at root
│   ├── book-cover.png           # Thumbnail for "Mindfulness සරලව දකිමු සතිය"
│   ├── samantha-pattana.png     # Thumbnail for "සමන්ත පට්ඨානය"
│   ├── lankaqr dialog.jpg       # LankaQR payment code shown on the order card
│   ├── favicon.svg              # App favicon
│   └── icons/                   # Direct user-supplied high-res PNG icons
│       ├── lotus.png            # Sacred pink blooming lotus (header)
│       ├── lotus-flat.png       # Flat pastel pink lotus (alternative)
│       ├── bank.png             # Classical bank temple building (no longer used by the card)
│       └── whatsapp.png         # Official WhatsApp green speech bubble (action bar)
├── src/
│   ├── main.js                  # Vue app initialization
│   ├── App.vue                  # Main application component (reactive UI, state, validation)
│   ├── config.js                # Central configuration (books, pricing, bank, contacts)
│   ├── style.css                # Global Tailwind CSS definitions and custom variables
│   └── services/
│       ├── cardIcons.js         # Base64 embedded icons (zero-network, zero-CORS taint)
│       └── orderCardGenerator.js# Canvas 2D order card generator (1080 px wide @2x)
└── DESIGN_DETAILS.md            # This design and implementation reference document
```

---

## 3. Configuration & Single Source of Truth (`src/config.js`)

All dynamic parameters (rates, book inventory, banking details, contacts) are centralized in `src/config.js`:

```javascript
export const CONFIG = {
  // Global Minimum Order Constraint (below this, only pickup is available)
  minOrderBooks: 50,
  quickQuantities: [0, 50, 75, 100], // One-tap quantity buttons under each book (0 resets)

  // Books Inventory
  books: [
    {
      id: 'mindfulness',
      titleSinhala: "Mindfulness සරලව දකිමු සතිය",
      costLkr: 80,
      weightGrams: 110,
      size: "14.7cm × 22.2cm",
      pages: 74,
      inStock: true,
      availabilitySinhala: "දැනට තොග ඇත",
      noteSinhala: "ධර්ම දානයක් ලෙස මුද්‍රණ වියදමටත් වඩා අඩුවෙන් ලබා දේ.",
      pdfUrl: "https://tipitaka.lk/library/1210",
      coverImage: "./book-cover.png",
      defaultQty: 50,
    },
    {
      id: 'samantha-pattanaya',
      titleSinhala: "සමන්ත පට්ඨානය",
      costLkr: 60,
      weightGrams: 100,
      size: "14.7cm × 22.2cm",
      pages: 64,
      inStock: true,
      availabilitySinhala: "දැනට තොග ඇත",
      noteSinhala: "ධර්ම දානයක් ලෙස මුද්‍රණ වියදමටත් වඩා අඩුවෙන් ලබා දේ.",
      pdfUrl: "https://tipitaka.lk/library/1220",
      coverImage: "./samantha-pattana.png",
      defaultQty: 0,
    }
  ],

  // Delivery Pricing Configuration
  delivery: {
    courier: {
      baseWeightKg: 1.0,           // Up to 1.0 kg covered by base charge
      baseChargeLkr: 450,          // Base courier charge
      additionalKgChargeLkr: 100,  // Charge per additional kg (rounded up)
      packingCostThreshold: 50,    // Batch threshold for packing cost
      packingCostPerBatch: 20,     // Rs. 20 packaging charge per batch of 50 books
    },
    pickmeFlash: {
      radiusLimitKm: 20,           // Radius from Homagama
      locationCenter: "Homagama (හෝමාගම)",
    },
    pickup: {
      locationName: "Path Nirvana Homagama",
      mapsUrl: "https://maps.app.goo.gl/An6pt9J1GnuAb62Z7",
      directionsSinhala: "190 බස් මාර්ගයේ, පනාගොඩ පාසල් හන්දියෙන් රොමියෙල් මාවතට හැරී මීටර් 50ක් පමණ ඉදිරියට එන විට වම් පසින් හමුවන දෙවන බොරළු පාර.",
    }
  },

  // Bank Deposit Account
  payment: {
    bankTransfer: {
      bankName: "Commercial Bank (කොමර්ෂල් බැංකුව)",
      branch: "Homagama (හෝමාගම)",
      accountNumber: "8029909489",
      accountName: "LJ Pradeep",
    },
    lankaQrImage: "./lankaqr dialog.jpg", // LankaQR code drawn on the order card
  },

  // Contact Information
  contact: {
    email: "pathnirvana@gmail.com",
    whatsappNumber: "94715215866",  // Digits only for wa.me link
    whatsappDisplay: "071 521 5866", // Human-readable format
  }
};
```

---

## 4. Business Logic & Calculation Engine

### 4.1 Minimum Order Constraint (`minOrderBooks = 50`)
- **Rule**: Courier and PickMe Flash need at least **50 total books**. Below 50, only **Self-Pickup** is available.
- `isBelowMin = totalBooksCount < 50`; `canOrder = totalBooksCount > 0 && (method === 'pickup' || !isBelowMin)`.
- **Auto-switch**: when the total drops below 50 while Courier/PickMe is selected, the method switches to Pickup and the previous choice is remembered. Once the total is back to 50+, the remembered method is restored, unless the user picked a method themselves in the meantime (`onMethodPicked` clears the memory). This also applies to URLs such as `?method=courier&sathiya=20`.
- **UI when below 50**: Courier/PickMe tiles are disabled with a `(පොත් 50+)` hint, and a note shows how many more books are needed for courier. The price box, Copy/Share/Screenshot and the order buttons stay available for pickup.
- **UI when 0 books**: a "කරුණාකර පොත් ප්‍රමාණය තෝරන්න" note; price box, actions and order buttons are hidden/disabled.

### 4.1a Quick Quantity Buttons
Each book has one-tap buttons from `CONFIG.quickQuantities` (`0 · 50 · 75 · 100`) next to the −/+ stepper; `0` resets the book. Tapping sets that book's quantity; the button matching the current quantity is highlighted.

### 4.2 Numeric-Only Input Sanitization
Text boxes for book quantities enforce numeric-only characters:
- **`onQtyKeydown`**: Blocks any keypress that is not a digit (`0-9`), Backspace, Delete, Tab, Arrow keys, or standard shortcuts (`Cmd/Ctrl + A/C/V/X`).
- **`onQtyPaste`**: Intercepts clipboard paste and strips all non-digit characters (`e.clipboardData.getData('text').replace(/\D/g, '')`).
- **`onQtyInput`**: Instantly regex-replaces non-digits on input events.
- **`onQtyBlur`**: Ensures the field is normalized to an integer (defaults to `0` if left empty).

### 4.3 Weight & Courier Cost Formulas
1. **Total Weight (kg)**:
   $$\text{totalWeightKg} = \frac{\sum (\text{qty}_i \times \text{weightGrams}_i)}{1000}$$
2. **Additional Weight (kg)**:
   $$\text{extraKg} = \lceil \max(0, \text{totalWeightKg} - \text{baseWeightKg}) \rceil$$
3. **Packaging Cost** (only when more than 50 books):
   $$\text{packagingCost} = \left\lceil \frac{\text{totalBooks}}{50} \right\rceil \times 20$$
4. **Courier Delivery Fee**:
   $$\text{courierFee} = \text{baseChargeLkr} + (\text{extraKg} \times 100) + \text{packagingCost}$$
5. **PickMe Flash Fee**: Treated as `0` in the application calculation; UI explicitly notes: `"රියදුරුට ගෙවන්න (Pay Driver Directly)"`.
6. **Pickup Fee**: `0` (Free).
7. **Rounding**: for courier orders above 50 books the grand total is rounded up to the next Rs. 100. The difference (`roundingAdjustment`) is shown as its own `වටයීම (Rounding)` line on the page, in the copied text and on the card, so the breakdown always adds up.

### 4.4 URL Query Parameter State Synchronization
The app synchronizes state with browser query parameters bidirectionally:
- **Supported Parameters**:
  - `method`: `courier` | `pickmeFlash` | `pickup`
  - Mindfulness book quantity: `sathiya`, `q1`, `qty1`, `qty`, `q`, `mindfulness`
  - Samantha Pattana book quantity: `pattana`, `q2`, `qty2`, `samantha-pattanaya`
- **Strict Query Rule**: If *any* book parameter is present in the URL, any unspecified book is initialized to `0` (preventing unwanted auto-injection or redirect overwriting).
- **History Replace**: Whenever quantities or delivery methods change, `window.history.replaceState` updates the browser URL without page reload.

---

## 5. Action Buttons Below Total

Located directly below the Price Breakdown box when `totalBooksCount >= 50`:

### 5.1 Copy Button (Text Clipboard)
Copies a beautifully formatted Sinhala & English summary directly to the clipboard:
```text
• Mindfulness සතිය: පොත් 50
• සමන්ත පට්ඨානය: පොත් 10
ක්‍රමය: කූරියර් Courier
පොත්: රු. 4600 ((50 × රු. 80) + (10 × රු. 60))
Courier: රු. 1090
වටයීම (Rounding): රු. 10
මුළු මුදල: රු. 5700

බැංකු විස්තර:
• බැංකුව: Commercial Bank (කොමර්ෂල් බැංකුව)
• ශාඛාව: Homagama (හෝමාගම)
• ගිණුම් අංකය: 8029909489
• නම: LJ Pradeep

* COD නොමැත.
* තැන්පතුවෙන් පසු Deposit Slip, English වලින් Name, Address සහ Phone Number එවන්න.
* WhatsApp 0715215866 වෙත
```

### 5.2 Share Button
Copies the current page URL with the exact query string (e.g. `https://pathnirvana.org/order/?method=courier&sathiya=50&pattana=10`) so the cart can be shared with others.

### 5.3 Screenshot Button
Generates the order card image via `src/services/orderCardGenerator.js` and writes the PNG to the clipboard, falling back to a download if the browser blocks clipboard writes. The card is meant for the shop owner to paste into WhatsApp chats with customers (many older customers order over WhatsApp, not the website).

---

## 6. Order Card Generator (`src/services/`)

### 6.1 Files
- [`src/services/orderCardGenerator.js`](src/services/orderCardGenerator.js): layout + drawing, `renderOrderCardBlob()`, `copyOrderCardScreenshot()`
- [`src/services/cardIcons.js`](src/services/cardIcons.js): base64 lotus and WhatsApp icons
- `public/lankaqr dialog.jpg`: LankaQR code, path set in `CONFIG.payment.lankaQrImage` (set to `null` to hide the tile; the bank block then spans the full width)

### 6.2 Canvas & Style
- **Width**: 1080 logical px; **height** is computed from the content by `computeLayout()` (about 1256–1356 px), so there is no empty space. Drawn at **2×** (2160 px wide) so text and the QR stay sharp after WhatsApp compression.
- **Palette**: pine green `#0a3d35`, gold `#b8862b` / `#f3d27a`, cream `#f6efe2`, paper `#fffdf8`, WhatsApp green `#1fa855`, and red `#b3261e` only for the "pay first" tag.
- **Fonts**: Outfit (Latin and numbers), Noto Sans Sinhala (body), Noto Serif Sinhala (headline and motto). These fonts are loaded explicitly with `document.fonts.load()` before drawing.
- **No emoji** on the card (they render differently on each phone).

### 6.3 Layout (top to bottom)
| Section | Height | Contents |
|---|---|---|
| **Hero** | 430 | Pine radial gradient. Lotus + "Path Nirvana" + `ධර්ම දාන පොත් සේවාව • හෝමාගම`; top-right `මිල ගණන් {date}`. Kicker `ඔබගේ ධර්ම දාන ඇණවුම`, headline `දහම් පොත් {n}ක් / දන් දීමට` (number in gold; shrinks to fit 560 px), motto `“සබ්බ දානං ධම්ම දානං ජිනාති”` + English line. Up to 3 book covers fanned on the right with gold `× qty` tags. Gold rule at the bottom. |
| **Receipt** | 26·2 + rows·50 + 22 + 90 | One row per book (`title  qty × price` → subtotal), a delivery row (Courier: weight • දින 3–10 → fee; PickMe: `රියදුරුට ගෙවන්න`; Pickup: `නොමිලේ`), optional muted Rounding row, dashed rule, then the total `තැන්පත් කළ යුතු මුළු මුදල` (Pickup: `ගෙවිය යුතු මුළු මුදල`) with the amount in 64 px. |
| **Payment** | 250 | Left: pine block with tag (`කලින් ගෙවිය යුතුයි • COD නැත`, or gold `කලින් ගෙවා පොත් වෙන්කර ගන්න` for pickup), `COMMERCIAL BANK • ACCOUNT NO.`, account number unbroken in 50 px gold, account name • branch. Right: 250 px white LankaQR tile with the code and `ඕනෑම බැංකු App එකකින් Scan කරන්න`. |
| **Steps** | 56 | 3 numbered steps, depending on the delivery method (see `DELIVERY_STEPS`). |
| **WhatsApp bar** | 92 | Green bar, WhatsApp icon, number in 30 px, `Slip එක සහ ඔබගේ විස්තර WhatsApp කරන්න`. |
| **Footer** | 60 | `pathnirvana.org • පොත් මුද්‍රණ වියදමටත් අඩුවෙන් ධර්ම දානයක් ලෙස` |

## 7. Critical Technical Solutions & Resolved Bugs

### 7.1 Canvas Tainting (CORS) on Vite Dev Server
- **Problem**: When `img.crossOrigin = 'anonymous'` was applied to local image URLs (`/book-cover.png`, `/icons/lotus.png`), the browser demanded `Access-Control-Allow-Origin` headers. Because Vite's static file server does not send CORS headers by default, the images tainted the canvas, causing `canvas.toBlob()` to throw a security `DOMException`: `"Failed to execute 'toBlob' on 'HTMLCanvasElement': Tainted canvases may not be exported"`.
- **Solution**:
  1. Removed `crossOrigin = 'anonymous'` for same-origin local assets.
  2. Added `server: { cors: true }` to `vite.config.js`.
  3. Pre-encoded all graphical icons (`lotus.png`, `bank.png`, `whatsapp.png`) as base64 data URLs in `src/services/cardIcons.js`. Data URLs load in **0ms** without HTTP requests and **cannot taint a canvas**.

### 7.2 Browser Clipboard Permissions & User Gesture Expiration
> **Current approach**: `copyOrderCardScreenshot()` passes the *promise* of the PNG blob to `new ClipboardItem({ 'image/png': blobPromise })` and calls `clipboard.write()` right away, so the click's user activation stays valid while fonts and images load. The download fallback below is still used if the write is rejected.

- **Problem**: In modern Chrome and Safari, `navigator.clipboard.write()` requires transient user activation and focused document permissions. Multi-step asynchronous operations (`await fonts.ready`, `await imageLoad`) cause the user activation token to expire, throwing `NotAllowedError`.
- **Solution**:
  1. All icons and assets are pre-cached in memory for near-instant rendering.
  2. Implemented an automatic dual-mode fallback:
     ```javascript
     let copied = false;
     if (navigator.clipboard && typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
       try {
         await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
         copied = true;
       } catch (clipErr) {
         console.warn('Clipboard write blocked, falling back to download:', clipErr);
       }
     }
     if (!copied) {
       // Direct download fallback
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
     ```
  3. The UI button displays `Copied! (පිටපත් විය)` if clipboard succeeds, or `Saved! (බාගත විය)` if downloaded, ensuring the user is never stranded with an error.

### 7.3 ReferenceError: `totalBooksCost` Typo
- **Problem**: Runtime crash `ReferenceError: totalBooksCost is not defined at copyOrderScreenshot (App.vue:390:18)`.
- **Solution**: The computed property was defined as `totalBookCost` (singular). Fixed `booksCost: totalBookCost.value` in `src/App.vue`.

---

## 8. Chronological Decisions & Iterations Log

1. **URL Redirect Fix**: Removed unexpected automatic redirects that forced `&sathiya=50` when visiting `/` with custom query parameters. Unspecified books now safely default to 0 when query params are provided.
2. **Book Availability Update**: Updated "Samantha Pattana" book status to `inStock: true` (`defaultQty: 0`, Rs. 60).
3. **Minimum Order Constraint**:
   - Initially set to 20 books; subsequently increased by user request to **50 books**.
   - Standardized into `CONFIG.minOrderBooks = 50` and enforced across validation, UI warnings, action buttons, bank card visibility, and submission guards.
4. **Digit-Only Input Restriction**: Prevented all non-digit characters in book quantity text boxes via keyboard, input, and paste sanitization.
5. **Action Buttons Suite**: Introduced `Copy`, `Share`, and `Screenshot` buttons in a 3-column row below the price calculation box.
6. **Screenshot Visual Polish & Buddhist Theme**:
   - Upgraded resolution from 800×1000 to **1200×1500 (4:5)**.
   - Designed floating Buddhist plaque: **`❖  සබ්බ දානං ධම්ම දානං ජිනාති  ❖`**.
   - Added prominent vintage scroll ribbon on bank details: **`⚠️ කලින් මුදල් තැන්පත් කළ යුතුය  (COD නොමැත)`** in bold Sinhala.
   - Enlarged key details: book quantity badges (`50`, `10`) in mint boxes, Grand Total in a warm brass/gold plate (`Rs. 5,700` in 46px Outfit bold).
7. **Monolithic Code Refactoring**: Extracted ~434 lines of canvas rendering code out of `src/App.vue` into `src/services/orderCardGenerator.js`.
8. **Direct Icon Assets Integration**: Replaced synthetic vector icon approximations with the user's authentic PNG icons (`lotus.png`, `bank.png`, `whatsapp.png`) embedded via base64 for 100% reliable rendering.
9. **Order Card Redesign (2026-10-01)**: Replaced the 1200×1500 fixed card with the hero/receipt layout (section 6). The account number is unbroken (it was shown as `8029 9094 89`), the card height fits its content, there are no emoji, and a LankaQR tile was added. Order reference numbers were considered and dropped: bank deposit references are not visible to the shop, so they would only add work for customers.
10. **Pickup-only below 50 books**: courier/PickMe are disabled below the minimum, with auto-switch to pickup (section 4.1).
11. **Quick quantity buttons** `0 · 50 · 75 · 100` (section 4.1a).
12. **Fixes**: added the Rounding line (the total previously did not add up), full book titles on phones (they were cut off at 360 px), `ක්‍රමය` typo in the copied text (missing ZWJ), and consistent PickMe wording (`රියදුරුට ගෙවන්න`).

---

## 9. Developer Guide: How to Extend or Maintain

### 9.1 Adding a New Book
1. Open `src/config.js`.
2. Add a new object to `CONFIG.books`:
   ```javascript
   {
     id: 'new-book-id',
     titleSinhala: "පොතේ නම",
     costLkr: 100,
     weightGrams: 120,
     size: "14.7cm × 22.2cm",
     pages: 96,
     inStock: true,
     availabilitySinhala: "දැනට තොග ඇත",
     noteSinhala: "ධර්ම දානයක් ලෙස ලබා දේ.",
     pdfUrl: "https://tipitaka.lk/library/...",
     coverImage: "./new-book-cover.png",
     defaultQty: 0,
   }
   ```
3. Place `new-book-cover.png` in `/public/`.
4. In `src/App.vue`, URL parameter mappings in `getInitialParams` and `updateUrlParams` will automatically include the new book ID.
5. `src/services/orderCardGenerator.js` adds a receipt row per active book and grows the canvas height to fit; the hero shows up to 3 covers.

### 9.2 Modifying Pricing or Delivery Rates
- Update courier base rates, additional kg fees, or packaging charges inside `CONFIG.delivery.courier` in `src/config.js`. Calculations throughout the UI, copy text, and screenshot generator update automatically.

### 9.3 Updating Minimum Book Requirement
- Modify `minOrderBooks` in `src/config.js` (e.g. `minOrderBooks: 25`). All template warnings, validation bounds, button disable states, and alerts automatically adapt.

### 9.4 Running Build & Tests
```bash
# Start Vite development server
npm run dev

# Compile production bundle
npm run build

# Preview production build locally
npm run preview
```

---
*Created on 2026-10-01 for Path Nirvana Web Development Team.*
