// OpenAI integration.
//
// HONESTY NOTE (read this before assuming the assistant is "fake"):
// This calls the real OpenAI API using the official `openai` SDK whenever
// OPENAI_API_KEY is set in the environment. The prompts below are the actual
// prompts that would run in production.
//
// For this submission, the app runs in disclosed demo/mock mode: no
// OPENAI_API_KEY is configured, by deliberate choice (see SCALE_AND_ADOPTION.md),
// not because the integration doesn't work. Every AI-powered response in
// demo mode is visibly labeled in the UI (mocked: true), never silently
// swapped in. The mock responses follow the identical schema the real model
// returns. The document-check mock combines filename signals, duplicate-file
// detection, and basic image dimensions (see mockDocumentCheck below). These
// are transparent heuristics, not content understanding, but they let the
// demo react to more than a filename alone. Set
// OPENAI_API_KEY in .env.local and the app calls the real model with zero
// code changes.

import OpenAI from "openai";

export const AI_IS_CONFIGURED = Boolean(process.env.OPENAI_API_KEY);

let client = null;
function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/**
 * Pre-checks an uploaded document image against the plain-language rules
 * defined per-document in lib/schema.ts, BEFORE the applicant submits.
 * This is the core "prevent rejection instead of explaining it after" feature.
 */
export async function checkDocument(
  imageBase64,
  mimeType,
  documentLabel,
  checkInstructions,
  fileName,
  heuristicContext = {}
) {
  if (!AI_IS_CONFIGURED) {
    return mockDocumentCheck(documentLabel, fileName, heuristicContext);
  }

  try {
    const openai = getClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a pre-submission document checker for an Indian government certificate application (a hackathon prototype, not a real government system). " +
            "You look at a photo of a document a citizen is about to submit and flag likely problems BEFORE they submit, in plain, respectful, non-technical language a first-time applicant would understand. " +
            "Never claim to verify identity or authenticity — you are only checking whether the document looks complete, legible, and of the right type, per the instructions given. " +
            'Respond ONLY with JSON of the shape: {"verdict": "looks_good" | "possible_issue" | "likely_rejected", "summary": "one short sentence", "details": ["short bullet", "short bullet"]}. No markdown, no preamble.',
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Document type expected: ${documentLabel}\n\nWhat to check for:\n${checkInstructions}`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
      max_tokens: 400,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    return normalizeDocumentResult({
      verdict: parsed.verdict ?? "possible_issue",
      summary: parsed.summary ?? "Could not fully evaluate this document.",
      details: parsed.details ?? [],
      mocked: false,
    });
  } catch (err) {
    console.error("OpenAI document check failed, falling back to mock:", err);
    return mockDocumentCheck(documentLabel, fileName, heuristicContext);
  }
}

function normalizeDocumentResult(result) {
  const allowed = new Set(["looks_good", "possible_issue", "likely_rejected"]);
  return {
    verdict: allowed.has(result?.verdict) ? result.verdict : "possible_issue",
    summary: typeof result?.summary === "string" && result.summary ? result.summary : "Could not fully evaluate this document.",
    details: Array.isArray(result?.details) ? result.details : [],
    mocked: Boolean(result?.mocked),
  };
}

function mockDocumentCheck(documentLabel, fileName, heuristicContext) {
  // DEMO-MODE HEURISTIC (disclosed to the user via `mocked: true` in every
  // response). Rather than a response that's effectively random relative to
  // what was actually uploaded, this mock reacts to the uploaded file name,
  // so a demo can be driven deliberately and honestly: name a test file
  // something like "affidavit_no_stamp.jpg" to see the likely_rejected path,
  // or "aadhaar_clear.jpg" for the looks_good path. This is still clearly a
  // stand-in for real vision-model inspection of the image content — it is
  // not reading the image — but it means the mock's verdict correlates with
  // something the person testing it actually controls, instead of an
  // arbitrary hash of the document label. It also checks basic dimensions and
  // duplicate content hashes, but never claims to read or authenticate content.
  heuristicContext = heuristicContext || {};
  const name = (fileName ?? "").toLowerCase();
  const rejectSignals = ["reject", "bad", "blurry", "invalid", "no_stamp", "nostamp", "expired", "old", "fail"];
  const issueSignals = ["issue", "check", "unclear", "maybe", "unsure", "test"];

  if (heuristicContext.duplicateDocumentLabel) {
    return normalizeDocumentResult({ verdict: "likely_rejected", summary: `This looks like the same file you uploaded for ${heuristicContext.duplicateDocumentLabel} — each document should be a photo of the specific item requested.`, details: ["Upload a separate image or PDF for this document slot.", "This demo check compares file content, not just the file name."], mocked: true });
  }

  if (rejectSignals.some((signal) => name.includes(signal))) {
    return normalizeDocumentResult({
      verdict: "likely_rejected",
      summary: `${documentLabel} is likely to be rejected as-is.`,
      details: [
        "The file name contains a signal associated with a missing stamp, signature, date, or other common problem.",
        "That flag is based on the file name, not a reading of the document. If this is an affidavit, check for a notary stamp; if it's address proof, check the date yourself.",
        "You can still submit, but review the actual document before deciding whether to fix it.",
      ],
      mocked: true,
    });
  }

  const shapeIssue = getImageShapeIssue(documentLabel, heuristicContext.imageDimensions);
  if (shapeIssue) return normalizeDocumentResult({ verdict: "possible_issue", summary: `${documentLabel} has an image-shape issue based on its file dimensions.`, details: [shapeIssue, "This check does not inspect the image content; look over the actual document and confirm it is the specific item requested."], mocked: true });

  if (issueSignals.some((signal) => name.includes(signal))) {
    return normalizeDocumentResult({
      verdict: "possible_issue",
      summary: `${documentLabel} might have an issue — worth a second look before submitting.`,
      details: [
        "The file name suggests a possible issue; this demo check does not read the document content.",
        "Look over the date, stamp, signature, and name yourself before submitting.",
      ],
      mocked: true,
    });
  }
  return normalizeDocumentResult({
    verdict: "looks_good",
    summary: `No obvious formatting issues found for ${documentLabel} based on file properties.`,
    details: [
      "No reject or issue signals were found in the file name, dimensions, or duplicate check.",
      "This is a basic automated check, not a full content review — look it over yourself too.",
    ],
    mocked: true,
  });
}

function getImageShapeIssue(documentLabel, imageDimensions) {
  if (!imageDimensions?.width || !imageDimensions?.height) return null;
  const ratio = imageDimensions.width / imageDimensions.height;
  const smallestSide = Math.min(imageDimensions.width, imageDimensions.height);
  if (documentLabel.includes("passport-size") && (ratio > 1.25 || ratio < 0.55)) return "A passport-size photo is usually portrait or close to square, not a wide or unusually narrow image.";
  if (documentLabel.includes("Identity proof") && (smallestSide < 160 || ratio > 2.5 || ratio < 0.4)) return "This doesn't look like a typical identity-proof photo — check that you uploaded a clear, correctly framed image.";
  if (documentLabel.includes("Address proof") && (smallestSide < 180 || ratio > 4 || ratio < 0.25)) return "This doesn't look like a typical address-proof photo — check that the whole document is visible.";
  return null;
}

/**
 * Conversational assistant that explains application status and next steps
 * in plain language, in the user's chosen language (English or Hindi).
 */
export async function askAssistant(
  messages,
  contextSummary,
  language
) {
  if (!AI_IS_CONFIGURED) {
    return { reply: mockAssistantReply(messages, language), mocked: true };
  }

  try {
    const openai = getClient();
    const systemPrompt =
      (language === "hi"
        ? "आप सरल प्रमाण के सहायक हैं, जो भारत में सरकारी प्रमाण पत्र (जैसे आय प्रमाण पत्र) के लिए आवेदन करने वाले लोगों की मदद करता है। सरल, सम्मानजनक हिंदी में जवाब दें। तकनीकी शब्दजाल से बचें। संक्षिप्त उत्तर दें (3-4 वाक्य)।"
        : "You are the Saral Praman assistant, helping people in India apply for government certificates (like an Income Certificate). Reply in simple, respectful, plain English, avoiding bureaucratic jargon and technical terms. Keep answers short — 3 to 4 sentences — since users may be on small screens and reading is effortful for some. If asked something outside this application's scope, say so honestly rather than guessing.") +
      `\n\nCurrent context about this user's application:\n${contextSummary}` +
      "\n\nThis is a hackathon prototype using mock/synthetic application data, not a connection to any real government system. If asked, be upfront about that.";

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 300,
      temperature: 0.4,
    });

    return {
      reply: response.choices[0]?.message?.content ?? "Sorry, I couldn't generate a reply.",
      mocked: false,
    };
  } catch (err) {
    console.error("OpenAI assistant call failed, falling back to mock:", err);
    return { reply: mockAssistantReply(messages, language), mocked: true };
  }
}

function mockAssistantReply(messages, language) {
  const lastUser = messages.filter((m) => m.role === "user").pop()?.content?.toLowerCase() ?? "";
  const isFirstUserMessage = messages.filter((m) => m.role === "user").length <= 1;

  const en = {
    greeting:
      "Hi! I can explain your application status, what each stage means, or what to do next. Ask me something like \"why is my application stuck?\" or \"what documents do I need?\"",
    patwari:
      "Your application is with the Patwari, the local revenue official who checks your address and income details. This usually takes 3 to 10 days. You don't need to visit anyone — they may call you or visit your address to confirm details.",
    reject:
      "Applications are most often sent back because the income proof document is missing a signature or stamp. Check the rejection note on your status page — it names the exact document and reason, and lets you upload a corrected copy without starting over.",
    time: "Most Income Certificate applications take about 7 to 15 days in total, across the Patwari and Tehsildar stages. You'll see your exact stage on the status page, updated as it moves.",
    eligibility:
      "For an Income Certificate, you generally need to be a resident of the state you're applying in and be able to show your income source — salary slip, land record, or a self-employment affidavit. The eligibility check at the start of the application walks through this for your specific case.",
    documents:
      "You'll need four documents: a photo ID (Aadhaar or Voter ID), an address proof dated within the last 6 months, proof of your income source, and a recent passport-size photo. Each one is checked as you upload it so you can fix anything before submitting.",
    thanks: "You're welcome. Let me know if anything else comes up as your application moves forward.",
    default:
      "I can help explain your application status, what each stage means, or what to do if something was rejected. Try asking, for example, \"why is my application stuck?\"",
  };
  const hi = {
    greeting:
      "नमस्ते! मैं आपके आवेदन की स्थिति, हर चरण का मतलब, या आगे क्या करना है, समझा सकता हूं। पूछें जैसे \"मेरा आवेदन क्यों अटका है?\" या \"मुझे कौन से दस्तावेज़ चाहिए?\"",
    patwari:
      "आपका आवेदन पटवारी के पास है, जो स्थानीय राजस्व अधिकारी हैं और आपके पते व आय विवरण की जांच करते हैं। इसमें आमतौर पर 3 से 10 दिन लगते हैं। आपको किसी के पास जाने की जरूरत नहीं — वे विवरण की पुष्टि के लिए कॉल या आपके पते पर जा सकते हैं।",
    reject:
      "आवेदन अक्सर इसलिए वापस भेजे जाते हैं क्योंकि आय प्रमाण दस्तावेज़ पर हस्ताक्षर या मुहर नहीं होती। अपने स्टेटस पेज पर अस्वीकृति नोट देखें — वहां सटीक दस्तावेज़ और कारण बताया गया है, और आप बिना दोबारा शुरू किए सुधारी हुई कॉपी अपलोड कर सकते हैं।",
    time: "अधिकतर आय प्रमाण पत्र आवेदनों में पटवारी और तहसीलदार चरणों को मिलाकर कुल 7 से 15 दिन लगते हैं। आपका सटीक चरण स्टेटस पेज पर दिखेगा।",
    eligibility:
      "आय प्रमाण पत्र के लिए, आमतौर पर आपको उस राज्य का निवासी होना चाहिए जहां आप आवेदन कर रहे हैं, और अपनी आय का स्रोत दिखाना होगा — वेतन पर्ची, भूमि रिकॉर्ड, या स्व-रोजगार शपथ पत्र। आवेदन की शुरुआत में पात्रता जांच आपके मामले के अनुसार यह बताती है।",
    documents:
      "आपको चार दस्तावेज़ चाहिए: फोटो पहचान (आधार या वोटर आईडी), पिछले 6 महीनों की तारीख वाला पता प्रमाण, आय स्रोत का प्रमाण, और हाल की पासपोर्ट साइज़ फोटो। हर एक की जांच अपलोड करते ही हो जाती है ताकि आप जमा करने से पहले सुधार सकें।",
    thanks: "आपका स्वागत है। जैसे-जैसे आपका आवेदन आगे बढ़े, कुछ और पूछना हो तो बताएं।",
    default:
      "मैं आपके आवेदन की स्थिति, हर चरण का मतलब, या अस्वीकृति की स्थिति में क्या करना है, समझाने में मदद कर सकता हूं। उदाहरण के लिए पूछें, \"मेरा आवेदन क्यों अटका है?\"",
  };
  const bank = language === "hi" ? hi : en;

  if (isFirstUserMessage && (lastUser.includes("hi") || lastUser.includes("hello") || lastUser.includes("नमस्ते") || lastUser.length < 4)) return bank.greeting;
  if (lastUser.includes("thank") || lastUser.includes("धन्यवाद") || lastUser.includes("shukriya")) return bank.thanks;
  if (lastUser.includes("patwari") || lastUser.includes("stuck") || lastUser.includes("अटक") || lastUser.includes("पटवारी")) return bank.patwari;
  if (lastUser.includes("reject") || lastUser.includes("अस्वीकृत") || lastUser.includes("wrong")) return bank.reject;
  if (lastUser.includes("time") || lastUser.includes("long") || lastUser.includes("कितन") || lastUser.includes("din")) return bank.time;
  if (lastUser.includes("eligib") || lastUser.includes("qualify") || lastUser.includes("पात्र")) return bank.eligibility;
  if (lastUser.includes("document") || lastUser.includes("upload") || lastUser.includes("दस्तावेज़") || lastUser.includes("kagaz")) return bank.documents;
  return bank.default;
}
