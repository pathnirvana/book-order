// Webtool Configuration File
// You can easily change these values to update rates, bank details, or book details.

export const CONFIG = {
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
      inStock: false,
      availabilitySinhala: "තවමත් තොග ලැබී නොමැත (ළඟදීම)",
      noteSinhala: "ධර්ම දානයක් ලෙස මුද්‍රණ වියදමටත් වඩා අඩුවෙන් ලබා දේ.",
      pdfUrl: "https://tipitaka.lk/library/1220",
      coverImage: "./samantha-pattana.png",
      defaultQty: 0,
    }
  ],
  delivery: {
    // Citypak Courier configuration
    courier: {
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
    }
  },
  contact: {
    email: "pathnirvana@gmail.com",
    whatsappNumber: "94715215866", // No '+' sign or spaces for wa.me API link
    whatsappDisplay: "071 521 5866", // Number shown to user
  }
};
