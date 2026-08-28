// Domain model for Saral Praman.
//
// DESIGN NOTE: Certificate types are config, not code. Adding "Domicile
// Certificate" or "Caste Certificate" as a fully working flow is meant to be
// a matter of adding another entry to CERTIFICATE_TYPES below, not rebuilding
// the app. Income Certificate is the one fully wired end-to-end for this demo;
// the other two are marked comingSoon to prove the pattern without spending
// build time faking three separate rulesets.

export const WORKFLOW_INCOME = [
  {
    id: "submitted",
    label: "Application submitted",
    labelHi: "आवेदन जमा हुआ",
    description: "Your application and documents have been received.",
    descriptionHi: "आपका आवेदन और दस्तावेज़ प्राप्त हो गए हैं।",
    typicalDurationDays: [0, 1],
    officeHolder: "System",
  },
  {
    id: "patwari_verification",
    label: "Field verification by Patwari",
    labelHi: "पटवारी द्वारा फील्ड सत्यापन",
    description:
      "The local Patwari (revenue official for your area) checks your address and income details, sometimes by visiting or calling.",
    descriptionHi:
      "आपके क्षेत्र के पटवारी आपके पते और आय विवरण की जांच करते हैं, कभी-कभी घर जाकर या फोन करके।",
    typicalDurationDays: [3, 10],
    officeHolder: "Patwari / Revenue Inspector",
  },
  {
    id: "tehsildar_review",
    label: "Approval by Tehsildar / SDM",
    labelHi: "तहसीलदार / एसडीएम द्वारा अनुमोदन",
    description:
      "The Tehsildar or Sub-Divisional Magistrate reviews the Patwari's report and approves or rejects the certificate.",
    descriptionHi:
      "तहसीलदार या उप-मंडल अधिकारी पटवारी की रिपोर्ट की समीक्षा कर प्रमाण पत्र स्वीकृत या अस्वीकृत करते हैं।",
    typicalDurationDays: [2, 7],
    officeHolder: "Tehsildar / SDM",
  },
  {
    id: "issued",
    label: "Certificate issued",
    labelHi: "प्रमाण पत्र जारी",
    description: "Your certificate is ready to download and print.",
    descriptionHi: "आपका प्रमाण पत्र डाउनलोड और प्रिंट के लिए तैयार है।",
    typicalDurationDays: [0, 0],
    officeHolder: "System",
  },
  {
    id: "rejected",
    label: "Sent back for correction",
    labelHi: "सुधार हेतु वापस भेजा गया",
    description:
      "Something needs to be fixed before this can move forward. See the reason below.",
    descriptionHi:
      "आगे बढ़ने से पहले कुछ ठीक करना होगा। नीचे कारण देखें।",
    typicalDurationDays: [0, 0],
    officeHolder: "—",
  },
];

export const CERTIFICATE_TYPES = [
  {
    // Baseline rules for this MVP are modeled on Punjab's income certificate
    // process specifically (not a generic all-India average), to keep AI
    // pre-check rules traceable to a real, citable source rather than invented
    // composites. See PRD.md for the source citation.
    id: "income",
    name: "Income Certificate",
    nameHi: "आय प्रमाण पत्र",
    description:
      "Proof of annual family income. Needed for scholarships, fee waivers, EWS quota, and many welfare schemes.",
    eligibility: [
      { label: "You are a resident of the state you're applying in", labelHi: "आप जिस राज्य में आवेदन कर रहे हैं वहां के निवासी हैं" },
      { label: "You can show your source of income (salary, land, business, or family support)", labelHi: "आप अपनी आय का स्रोत दिखा सकते हैं (वेतन, भूमि, व्यवसाय, या पारिवारिक सहायता)" },
    ],
    requiredDocuments: [
      {
        id: "id_proof",
        label: "Identity proof (Aadhaar / Voter Card / PAN)",
        labelHi: "पहचान प्रमाण (आधार / वोटर कार्ड / पैन)",
        helpText: "A clear photo of the front side. Name and photo must be readable.",
        helpTextHi: "सामने की ओर की स्पष्ट फोटो। नाम और फोटो पढ़ने योग्य होने चाहिए।",
        checkInstructions:
          "This should be Aadhaar card, Voter Card, or PAN card. Check: (1) a name is visible, (2) a photo is visible where applicable, (3) an ID number is visible, (4) the image is not blurry or cut off. This is a MOCK check for a hackathon demo — do not treat this as verifying a real government ID.",
        acceptedFormats: ["jpg", "png", "pdf"],
        maxSizeMb: 5,
      },
      {
        id: "address_proof",
        label: "Residence proof (Voter Card / Driving License / Electricity Bill)",
        labelHi: "निवास प्रमाण (वोटर कार्ड / ड्राइविंग लाइसेंस / बिजली बिल)",
        helpText: "Must be dated within the last 6 months and show your current address.",
        helpTextHi: "पिछले 6 महीनों के भीतर की तारीख होनी चाहिए और आपका वर्तमान पता दिखाना चाहिए।",
        checkInstructions:
          "This should be a Voter Card, Driving License, or Electricity Bill showing your current address. Check: (1) an address is visible, (2) a date is visible and looks recent (within roughly 6 months of today, treat any 2025 or 2026 date as recent for this demo), (3) the name roughly matches a household member, (4) the document is legible.",
        acceptedFormats: ["jpg", "png", "pdf"],
        maxSizeMb: 5,
      },
      {
        id: "income_proof",
        label: "Income proof (self-declaration/affidavit, salary slip, or land record)",
        labelHi: "आय प्रमाण (स्व-घोषणा/शपथ पत्र, वेतन पर्ची या भूमि रिकॉर्ड)",
        helpText: "The single most common reason applications get rejected. See what counts below.",
        helpTextHi: "आवेदन अस्वीकार होने का सबसे आम कारण। नीचे देखें क्या मान्य है।",
        checkInstructions:
          "This should include Punjab's mandatory self-declaration/affidavit from the applicant, or where applicable a salary slip with employer name and amount, or a land ownership/revenue record (khasra/khatauni) for agricultural income. Check the income amount or relevant detail, signature/stamp where expected, and legibility. Be specific about what is missing.",
        acceptedFormats: ["jpg", "png", "pdf"],
        maxSizeMb: 5,
      },
      {
        id: "passport_photo",
        label: "Recent passport-size photo",
        labelHi: "हाल की पासपोर्ट साइज़ फोटो",
        helpText: "Plain background, face clearly visible, taken in the last 6 months.",
        helpTextHi: "सादा पृष्ठभूमि, चेहरा स्पष्ट दिखाई दे, पिछले 6 महीनों में ली गई।",
        checkInstructions:
          "This should be a passport-style photo of one person's face and shoulders, reasonably plain background, facing forward. Check: (1) exactly one face is visible, (2) the background is relatively plain (not a busy scene), (3) the face is not obscured by sunglasses or a hand, (4) the image is not a full-body photo cropped awkwardly.",
        acceptedFormats: ["jpg", "png"],
        maxSizeMb: 2,
      },
    ],
    // Punjab applications additionally require reports from the local Patwari
    // and Nambardar/Sarpanch or Municipal Councillor. They are represented by
    // our simulated Patwari verification stage; submissions typically go via
    // a Sewa Kendra and are verified by a Tehsildar.
    workflow: WORKFLOW_INCOME,
    validityMonths: 12,
    commonRejectionReasons: [
      "Income proof is missing a stamp or signature (common with self-employment affidavits)",
      "Address proof is more than 6 months old",
      "Name spelling doesn't match across documents (e.g. Aadhaar vs address proof)",
      "Photo is not passport-style (full body, group photo, or wrong background)",
      "Applying in the wrong Tehsil/jurisdiction for the current address",
    ],
  },
  {
    id: "domicile",
    name: "Domicile / Residence Certificate",
    nameHi: "अधिवास / निवास प्रमाण पत्र",
    description:
      "Proof of permanent residence in a state. Needed for state quota college admissions and state government jobs.",
    comingSoon: true,
    eligibility: [],
    requiredDocuments: [],
    workflow: WORKFLOW_INCOME,
    validityMonths: 999,
    commonRejectionReasons: [],
  },
  {
    id: "caste",
    name: "Caste Certificate",
    nameHi: "जाति प्रमाण पत्र",
    description:
      "Proof of caste for reservation benefits in education and employment.",
    comingSoon: true,
    eligibility: [],
    requiredDocuments: [],
    workflow: WORKFLOW_INCOME,
    validityMonths: 999,
    commonRejectionReasons: [],
  },
];

export function getCertificateType(id) {
  return CERTIFICATE_TYPES.find((c) => c.id === id);
}
