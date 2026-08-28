"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getCertificateType } from "@/lib/schema";
import Header from "@/components/Header";
import { useLanguage } from "@/components/LanguageContext";
import DocumentUploader from "@/components/DocumentUploader";
import { CheckCircle2, Circle, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";

const emptyApplicant = {
  fullName: "",
  fatherOrGuardianName: "",
  dob: "",
  phone: "",
  address: "",
  tehsil: "",
  district: "",
  state: "",
};

const INDIAN_STATES_AND_UTS = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const certType = getCertificateType(params.certId);

  const [step, setStep] = useState("eligibility");
  const [eligAnswers, setEligAnswers] = useState([]);
  const [applicant, setApplicant] = useState(emptyApplicant);
  const [docs, setDocs] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [newAppId, setNewAppId] = useState(null);
  const [flowSessionId] = useState(() => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `flow-${Date.now()}-${Math.random()}`));

  if (!certType || certType.comingSoon) {
    return (
      <>
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-10">
          <p>{t("This certificate type isn't available yet.", "यह प्रमाण पत्र प्रकार अभी उपलब्ध नहीं है।")}</p>
          <Link href="/" className="text-authority underline mt-2 inline-block">
            {t("Back home", "होम पर वापस जाएं")}
          </Link>
        </main>
      </>
    );
  }

  const steps = ["eligibility", "details", "documents", "review"];
  const stepIndex = steps.indexOf(step);
  const allDocsUploaded = certType.requiredDocuments.every((d) => docs[d.id]);
  const anyLikelyRejected = certType.requiredDocuments.some(
    (d) => docs[d.id]?.aiResult?.verdict === "likely_rejected"
  );

  async function handleSubmit() {
    setSubmitting(true);
    const documents = certType.requiredDocuments.map((d) => ({
      documentId: d.id,
      fileName: docs[d.id].fileName,
      base64: docs[d.id].base64,
      mimeType: docs[d.id].mimeType,
      imageDimensions: docs[d.id].imageDimensions,
      uploadedAt: new Date().toISOString(),
      aiCheckResult: docs[d.id].aiResult
        ? {
            verdict: docs[d.id].aiResult.verdict,
            summary: docs[d.id].aiResult.summary,
            details: docs[d.id].aiResult.details,
          }
        : undefined,
    }));

    const res = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        certificateTypeId: certType.id,
        applicant,
        documents,
      }),
    });
    const data = await res.json();
    setNewAppId(data.id);
    setSubmitting(false);
    setStep("submitted");
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-6 w-full">
        <h1 className="text-xl font-bold">{t(certType.name, certType.nameHi)}</h1>

        {step !== "submitted" && (
          <ol className="flex items-center gap-1.5 mt-4 mb-6" aria-label={t("Application steps", "आवेदन चरण")}>
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-1.5 flex-1">
                <span
                  className={`w-6 h-6 rounded-full grid place-items-center text-xs shrink-0 ${
                    i < stepIndex
                      ? "bg-success text-paper"
                      : i === stepIndex
                      ? "bg-authority text-paper"
                      : "bg-rule text-ink-soft"
                  }`}
                >
                  {i < stepIndex ? <CheckCircle2 size={14} /> : i + 1}
                </span>
                {i < steps.length - 1 && <span className="flex-1 h-0.5 bg-rule" />}
              </li>
            ))}
          </ol>
        )}

        {step === "eligibility" && (
          <EligibilityStep
            certType={certType}
            answers={eligAnswers}
            setAnswers={setEligAnswers}
            onNext={() => setStep("details")}
          />
        )}

        {step === "details" && (
          <DetailsStep
            applicant={applicant}
            setApplicant={setApplicant}
            onBack={() => setStep("eligibility")}
            onNext={() => setStep("documents")}
          />
        )}

        {step === "documents" && (
          <div>
            <p className="text-sm text-ink-soft mb-4">
              {t(
                "Each document is checked automatically as you upload it, so you can fix problems now instead of after submitting.",
                "प्रत्येक दस्तावेज़ अपलोड करते ही स्वचालित रूप से जांचा जाता है, ताकि आप समस्याओं को जमा करने के बाद नहीं, अभी ठीक कर सकें।"
              )}
            </p>
            <div className="space-y-3">
              {certType.requiredDocuments.map((doc) => (
                <DocumentUploader
                  key={doc.id}
                  doc={doc}
                  certificateTypeId={certType.id}
                  value={docs[doc.id] ?? null}
                  onChange={(v) => setDocs((prev) => ({ ...prev, [doc.id]: v }))}
                  existingDocuments={Object.values(docs).filter(Boolean)}
                  sessionId={flowSessionId}
                />
              ))}
            </div>
            <StepNav
              onBack={() => setStep("details")}
              onNext={() => setStep("review")}
              nextDisabled={!allDocsUploaded}
              nextLabel={t("Continue", "आगे बढ़ें")}
            />
          </div>
        )}

        {step === "review" && (
          <div>
            {anyLikelyRejected && (
              <div className="rounded-lg border border-alert/30 bg-alert-soft text-alert px-3 py-2.5 text-sm flex items-start gap-2 mb-4">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  {t(
                    "One or more documents were flagged as likely to be rejected. You can still submit, but fixing them first will save you a resubmission cycle.",
                    "एक या अधिक दस्तावेज़ों को अस्वीकृत होने की संभावना के रूप में चिह्नित किया गया है। आप फिर भी जमा कर सकते हैं, लेकिन पहले उन्हें ठीक करने से पुनः जमा करने का चक्र बचेगा।"
                  )}
                </span>
              </div>
            )}

            <h2 className="font-semibold mb-2">{t("Applicant details", "आवेदक विवरण")}</h2>
            <dl className="text-sm grid grid-cols-2 gap-y-1.5 gap-x-3 bg-paper-raised border border-rule rounded-xl p-4 mb-5">
              <ReviewRow label={t("Name", "नाम")} value={applicant.fullName} />
              <ReviewRow label={t("Father/Guardian", "पिता/अभिभावक")} value={applicant.fatherOrGuardianName} />
              <ReviewRow label={t("Date of birth", "जन्म तिथि")} value={applicant.dob} />
              <ReviewRow label={t("Phone", "फोन")} value={applicant.phone} />
              <ReviewRow label={t("Tehsil", "तहसील")} value={applicant.tehsil} />
              <ReviewRow label={t("District", "जिला")} value={applicant.district} />
              <ReviewRow label={t("State", "राज्य")} value={applicant.state} />
            </dl>

            <h2 className="font-semibold mb-2">{t("Documents", "दस्तावेज़")}</h2>
            <ul className="space-y-2 mb-6">
              {certType.requiredDocuments.map((d) => {
                const uploaded = docs[d.id];
                return (
                  <li key={d.id} className="flex items-center justify-between text-sm bg-paper-raised border border-rule rounded-lg px-3 py-2">
                    <span>{t(d.label, d.labelHi)}</span>
                    <span className="text-ink-soft text-xs truncate max-w-[40%]">{uploaded?.fileName}</span>
                  </li>
                );
              })}
            </ul>

            <StepNav
              onBack={() => setStep("documents")}
              onNext={handleSubmit}
              nextLabel={submitting ? t("Submitting…", "जमा हो रहा है…") : t("Submit application", "आवेदन जमा करें")}
              nextDisabled={submitting}
            />
          </div>
        )}

        {step === "submitted" && newAppId && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-success-soft text-success grid place-items-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-bold">{t("Application submitted", "आवेदन जमा हो गया")}</h2>
            <p className="text-ink-soft mt-2 text-sm">
              {t("Your application ID is", "आपकी आवेदन आईडी है")}
            </p>
            <p className="font-mono text-lg font-semibold mt-1 tracking-wide">{newAppId}</p>
            <p className="text-xs text-ink-soft mt-2 max-w-sm mx-auto">
              {t(
                "Save this ID — you'll need it to track your application. We've also stored it on this device.",
                "इस आईडी को सहेजें — आपको अपने आवेदन को ट्रैक करने के लिए इसकी आवश्यकता होगी। हमने इसे इस डिवाइस पर भी सहेजा है।"
              )}
            </p>
            <Link
              href={`/status/${newAppId}`}
              className="inline-block mt-6 bg-authority text-paper rounded-lg px-5 py-2.5 font-medium"
            >
              {t("Track this application", "इस आवेदन को ट्रैक करें")}
            </Link>
          </div>
        )}
      </main>
    </>
  );
}

function ReviewRow({ label, value }) {
  return (
    <>
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-medium truncate">{value || "—"}</dd>
    </>
  );
}

function StepNav({
  onBack,
  onNext,
  nextDisabled,
  nextLabel,
}) {
  const { t } = useLanguage();
  return (
    <div className="flex gap-3 mt-6">
      <button
        onClick={onBack}
        className="flex-1 rounded-lg border-2 border-rule py-2.5 font-medium text-ink-soft"
      >
        {t("Back", "पीछे")}
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 rounded-lg bg-authority text-paper py-2.5 font-medium disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {nextDisabled && nextLabel.includes("…") && <Loader2 size={16} className="animate-spin" />}
        {nextLabel}
      </button>
    </div>
  );
}

function EligibilityStep({
  certType,
  answers,
  setAnswers,
  onNext,
}) {
  const { t } = useLanguage();
  if (!certType) return null;

  const allYes = answers.length === certType.eligibility.length && answers.every(Boolean);

  return (
    <div>
      <h2 className="font-semibold mb-1">{t("Quick eligibility check", "त्वरित पात्रता जांच")}</h2>
      <p className="text-sm text-ink-soft mb-4">
        {t("This takes 10 seconds and saves you filling a form you may not qualify for.", "इसमें 10 सेकंड लगते हैं और आपको ऐसा फॉर्म भरने से बचाता है जिसके लिए आप योग्य नहीं हो सकते।")}
      </p>
      <div className="space-y-2">
        {certType.eligibility.map((e, i) => (
          <label
            key={i}
            className="flex items-center gap-3 bg-paper-raised border border-rule rounded-xl p-3.5 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={answers[i] ?? false}
              onChange={(ev) => {
                const next = [...answers];
                next[i] = ev.target.checked;
                setAnswers(next);
              }}
              className="w-5 h-5 shrink-0 accent-authority"
            />
            <span className="text-sm">{t(e.label, e.labelHi)}</span>
          </label>
        ))}
      </div>
      <div className="mt-6">
        <button
          onClick={onNext}
          disabled={!allYes}
          className="w-full rounded-lg bg-authority text-paper py-2.5 font-medium disabled:opacity-40"
        >
          {t("I meet these conditions — continue", "मैं इन शर्तों को पूरा करता/करती हूं — आगे बढ़ें")}
        </button>
      </div>
    </div>
  );
}

function DetailsStep({
  applicant,
  setApplicant,
  onBack,
  onNext,
}) {
  const { t } = useLanguage();
  const [touched, setTouched] = useState({});
  const [attemptedContinue, setAttemptedContinue] = useState(false);

  const errors = validateApplicant(applicant);
  const hasErrors = Object.keys(errors).length > 0;

  // Next step: replace free-text District and Tehsil fields with state-aware lists.
  const fields = [
    { key: "fullName", label: "Full name", labelHi: "पूरा नाम", type: "text" },
    { key: "fatherOrGuardianName", label: "Father's / Guardian's name", labelHi: "पिता/अभिभावक का नाम", type: "text" },
    { key: "dob", label: "Date of birth", labelHi: "जन्म तिथि", type: "date" },
    { key: "phone", label: "Mobile number", labelHi: "मोबाइल नंबर", type: "tel" },
    { key: "address", label: "Current address", labelHi: "वर्तमान पता", type: "text" },
    { key: "tehsil", label: "Tehsil", labelHi: "तहसील", type: "text" },
    { key: "district", label: "District", labelHi: "जिला", type: "text" },
    { key: "state", label: "State", labelHi: "राज्य", type: "select" },
  ];

  function handleContinue() {
    setAttemptedContinue(true);
    if (!hasErrors) onNext();
  }

  return (
    <div>
      <h2 className="font-semibold mb-4">{t("Your details", "आपका विवरण")}</h2>
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium mb-1" htmlFor={f.key}>
              {t(f.label, f.labelHi)}
            </label>
            {f.type === "select" ? (
              <select
                id={f.key}
                value={applicant[f.key]}
                onBlur={() => setTouched((current) => ({ ...current, [f.key]: true }))}
                onChange={(e) => setApplicant({ ...applicant, [f.key]: e.target.value })}
                className="w-full rounded-lg border-2 border-rule px-3 py-2.5 text-sm bg-paper-raised focus-visible:border-authority"
              >
                <option value="">{t("Select your state or union territory", "अपना राज्य या केंद्र शासित प्रदेश चुनें")}</option>
                {INDIAN_STATES_AND_UTS.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            ) : (
              <input
                id={f.key}
                type={f.type}
                value={applicant[f.key]}
                onBlur={() => setTouched((current) => ({ ...current, [f.key]: true }))}
                onChange={(e) => setApplicant({ ...applicant, [f.key]: e.target.value })}
                className="w-full rounded-lg border-2 border-rule px-3 py-2.5 text-sm bg-paper-raised focus-visible:border-authority"
              />
            )}
            {(touched[f.key] || attemptedContinue) && errors[f.key] && (
              <p className="mt-1 text-xs text-alert" role="alert">{t(errors[f.key].en, errors[f.key].hi)}</p>
            )}
            {f.key === "district" && (
              <p className="mt-1 text-xs text-ink-soft">{t("District and Tehsil remain free text for now; state-specific lists are the next step.", "जिला और तहसील अभी मुक्त टेक्स्ट हैं; राज्य-विशिष्ट सूची अगला चरण है।")}</p>
            )}
          </div>
        ))}
      </div>
      <StepNav onBack={onBack} onNext={handleContinue} nextLabel={t("Continue", "आगे बढ़ें")} />
    </div>
  );
}

function validateApplicant(applicant) {
  const errors = {};
  const namePattern = /\p{L}/u;
  const textFields = ["address", "tehsil", "district"];

  if (!namePattern.test(applicant.fullName.trim())) {
    errors.fullName = { en: "Enter a name containing at least one letter.", hi: "कम से कम एक अक्षर वाला नाम दर्ज करें।" };
  }
  if (!namePattern.test(applicant.fatherOrGuardianName.trim())) {
    errors.fatherOrGuardianName = { en: "Enter a name containing at least one letter.", hi: "कम से कम एक अक्षर वाला नाम दर्ज करें।" };
  }
  if (!/^\d{10}$/.test(applicant.phone)) {
    errors.phone = { en: "Enter a 10-digit Indian mobile number using digits only.", hi: "केवल अंकों का 10 अंकों वाला भारतीय मोबाइल नंबर दर्ज करें।" };
  }

  // --- FIXED DOB VALIDATION ---
  let isValidDob = false;
  let age = 0;

  if (applicant.dob && /^\d{4}-\d{2}-\d{2}$/.test(applicant.dob)) {
    const [year, month, day] = applicant.dob.split('-').map(Number);
    const dob = new Date(year, month - 1, day);
    
    // Validates the date didn't roll over (e.g., catching Feb 30 shifting to Mar 2)
    isValidDob = dob.getFullYear() === year && 
                 dob.getMonth() === month - 1 && 
                 dob.getDate() === day;

    if (isValidDob) {
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      if (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate())) {
        age--;
      }
    }
  }

  if (!isValidDob) {
    errors.dob = { en: "Enter a valid date of birth.", hi: "जन्म की मान्य तिथि दर्ज करें।" };
  } else if (age < 18) {
    errors.dob = { en: "You must be at least 18 years old to apply.", hi: "आवेदन करने के लिए आपकी आयु कम से कम 18 वर्ष होनी चाहिए।" };
  }
  // -----------------------------

  textFields.forEach((field) => {
    if (applicant[field].trim().length < 2) {
      errors[field] = { en: "Enter at least 2 characters.", hi: "कम से कम 2 अक्षर दर्ज करें।" };
    }
  });
  if (!INDIAN_STATES_AND_UTS.includes(applicant.state)) {
    errors.state = { en: "Select a state or union territory.", hi: "एक राज्य या केंद्र शासित प्रदेश चुनें।" };
  }
  return errors;
}
