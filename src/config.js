// Webtool Configuration File
// You can easily change these values to update rates, bank details, or book details.

export const CONFIG = {
  minOrderBooks: 50, // Below this, only pickup (Homagama) is available
  quickQuantities: [0, 50, 75, 100], // One-tap quantity buttons under each book (0 resets)
  // urlParam: query-string key for the quantity (urlAliases: older keys still accepted)
  // shortTitleSinhala: name used in the copied text; refName: name used in the order Reference line
  // inStock: false shows the availability text as a badge, but the book can still be ordered
  books: [
    {
      id: 'mindfulness',
      urlParam: 'sathiya',
      urlAliases: ['q1', 'qty1', 'qty', 'q', 'mindfulness'],
      shortTitleSinhala: "Mindfulness සතිය",
      refName: 'Sathiya',
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
      urlParam: 'pattana',
      urlAliases: ['q2', 'qty2', 'samantha-pattanaya'],
      refName: 'Pattana',
      titleSinhala: "සමන්ත පට්ඨානය",
      costLkr: 60,
      weightGrams: 100,
      size: "14.7cm × 22.2cm",
      pages: 64,
      inStock: false,
      availabilitySinhala: "දැනට තොග නැත (ඇණවුම් කළ හැක)",
      noteSinhala: "ධර්ම දානයක් ලෙස මුද්‍රණ වියදමටත් වඩා අඩුවෙන් ලබා දේ.",
      pdfUrl: "https://tipitaka.lk/library/1220",
      coverImage: "./samantha-pattana.png",
      defaultQty: 0,
    },
    {
      id: 'pattana-prathya-vivaranaya',
      urlParam: 'vivaranaya',
      urlAliases: ['q3', 'qty3'],
      refName: 'Vivaranaya',
      titleSinhala: "පට්ඨාන ප්‍රත්‍ය විවරණය",
      costLkr: 75,
      weightGrams: 110,
      size: "14.7cm × 22.2cm",
      pages: 72,
      inStock: true,
      availabilitySinhala: "දැනට තොග ඇත",
      noteSinhala: "පූජ්‍ය දිගන සුගතවංශ හිමියන් විසින් පවත්වන ලද පට්ඨාන ධර්ම දේශනාවේ ලිඛිත සංස්කරණයයි. ධර්ම දානයක් ලෙස මුද්‍රණ වියදමටත් වඩා අඩුවෙන් ලබා දේ.",
      pdfUrl: null,
      coverImage: "./pattana-prathya-vivaranaya.png",
      defaultQty: 0,
    }
  ],
  delivery: {
    // Citypak Courier configuration
    courier: {
      enabled: false, // Courier discontinued: tile stays disabled and a banner is shown
      discontinuedNoticeSinhala: "කූරියර් සේවාව නවතා දමා ඇත.",
      baseWeightKg: 1.0, // Weight covered by base charge
      baseChargeLkr: 450, // Courier base rate
      additionalKgChargeLkr: 100, // Cost per additional kg (rounded up)
      packingCostThreshold: 50, // Minimum books for packing charge
      packingCostPerBatch: 20, // Cost per 50 books
    },
    // PickMe Flash configuration
    pickmeFlash: {
      radiusLimitKm: 20,
      locationCenter: "Homagama (හෝමාගම)",
    },
    // Pickup configuration
    pickup: {
      locationName: "Path Nirvana Homagama",
      mapsUrl: "https://maps.app.goo.gl/An6pt9J1GnuAb62Z7",
      directionsSinhala: "190 බස් මාර්ගයේ, පනාගොඩ පාසල් හන්දියෙන් රොමියෙල් මාවතට හැරී මීටර් 50ක් පමණ ඉදිරියට එන විට වම් පසින් හමුවන දෙවන බොරළු පාර.",
    }
  },
  payment: {
    bankTransfer: {
      bankName: "Commercial Bank (කොමර්ෂල් බැංකුව)",
      branch: "Homagama (හෝමාගම)",
      accountNumber: "8029909489",
      accountName: "LJ Pradeep",
    },
    lankaQrImage: "./lankaqr dialog.jpg", // Shown on the order card for LankaQR payments
  },
  contact: {
    email: "pathnirvana@gmail.com",
    whatsappNumber: "94715215866", // No '+' sign or spaces for wa.me API link
    whatsappDisplay: "071 521 5866", // Number shown to user
  }
};
