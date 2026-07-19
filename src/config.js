// Webtool Configuration File
// You can easily change these values to update the site's rates, bank details, or book details.

export const CONFIG = {
  book: {
    titleSinhala: "Mindfulness සරලව දකිමු සතිය",
    titleEnglish: "Mindfulness සරලව දකිමු සතිය",
    costLkr: 80, // Book printing cost
    weightGrams: 110, // Weight per book in grams
    size: "14.7cm × 22.2cm", // Physical size
    pages: 74, // Number of pages
    availabilitySinhala: "දැනට තොග ඇත", // Available now
    availabilityEnglish: "Available Now",
    // Set to false or a date string if not available. e.g., "2026 අගෝස්තු 15"
    tentativeDate: null,
    coverImage: "/book-cover.png",
  },
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
      radiusLimitKm: 15,
      locationCenter: "Homagama (හෝමාගම)",
    },
    // Pickup configuration
    pickup: {
      locationName: "Path Nirvana Homagama",
      mapsUrl: "https://maps.app.goo.gl/An6pt9J1GnuAb62Z7",
      directionsSinhala: "190 බස් මාර්ගයේ, පනාගොඩ පාසල් හන්දියෙන් රොමියෙල් මාවතට හැරී මීටර් 50ක් පමණ ඉදිරියට එන විට වම් පසින් හමුවන දෙවන බොරළු පාර.",
      directionsEnglish: "From the Panagoda School Junction on the 190 bus route, turn into Romiel Mawatha, walk about 50m forward, and it is the 2nd gravel road on your left."
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
