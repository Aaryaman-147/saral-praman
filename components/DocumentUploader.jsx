"use client";

import { useRef, useState } from "react";
import { useLanguage } from "./LanguageContext";
import { CheckCircle2, AlertTriangle, XCircle, Upload, Loader2, Info } from "lucide-react";

export default function DocumentUploader({
  doc,
  certificateTypeId,
  value,
  onChange,
  existingDocuments = [],
  sessionId: sessionIdProp,
}) {
  const { t, lang } = useLanguage();
  const [checking, setChecking] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef(null);
  const [generatedSessionId] = useState(() => {
    if (typeof window === "undefined") return null;
    const key = "saral-praman-document-session";
    let id = window.sessionStorage.getItem(key);
    if (!id) { id = crypto.randomUUID(); window.sessionStorage.setItem(key, id); }
    return id;
  });
  const sessionId = sessionIdProp || generatedSessionId;

  async function handleFile(file) {
    if (checking) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const commaIndex = dataUrl.indexOf(",");
      const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : "";
      console.log("[debug] dataUrl length:", dataUrl.length, "commaIndex:", commaIndex, "base64 length:", base64.length);
      if (!base64) {
        onChange({ documentId: doc.id, fileName: file.name, mimeType: file.type || "image/jpeg", aiResult: { verdict: "possible_issue", summary: "Could not read this file — you can still submit, but please choose it again.", details: ["The file did not contain readable image data."], mocked: true } });
        setChecking(false);
        return;
      }
      const imageDimensions = await getImageDimensions(dataUrl, file.type);
      const uploaded = {
        documentId: doc.id,
        fileName: file.name,
        base64,
        mimeType: file.type || "image/jpeg",
        imageDimensions,
      };
      onChange(uploaded);
      setChecking(true);
      try {
        const res = await fetch("/api/document-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            certificateTypeId,
            documentId: doc.id,
            imageBase64: base64,
            mimeType: file.type || "image/jpeg",
            fileName: file.name,
            imageDimensions,
            existingDocuments: existingDocuments.filter(Boolean).map((document) => ({ documentId: document.documentId, imageBase64: document.base64 })),
            sessionId,
          }),
        });
        const result = await res.json();
        onChange({ ...uploaded, aiResult: res.ok ? result : { verdict: "possible_issue", summary: "Could not fully evaluate this document — you can still submit, but double-check it manually.", details: ["The demo checker returned an error response."], mocked: true } });
      } catch (err) {
        console.error("[debug] document-check fetch failed:", err);
        onChange({ ...uploaded, aiResult: { verdict: "possible_issue", summary: "Could not fully evaluate this document — you can still submit, but double-check it manually.", details: ["Please review the document yourself before submitting."], mocked: true } });
      } finally {
        setChecking(false);
      }
    };
    reader.readAsDataURL(file);
  }

  const verdictStyles = {
    looks_good: { icon: CheckCircle2, cls: "text-success bg-success-soft border-success/30" },
    possible_issue: { icon: AlertTriangle, cls: "text-warning bg-warning-soft border-warning/30" },
    likely_rejected: { icon: XCircle, cls: "text-alert bg-alert-soft border-alert/30" },
  };
  const rawResult = value?.aiResult;
  const result = rawResult && verdictStyles[rawResult.verdict]
    ? { ...rawResult, details: Array.isArray(rawResult.details) ? rawResult.details : [], summary: rawResult.summary || "Could not fully evaluate this document — you can still submit, but double-check it manually.", mocked: Boolean(rawResult.mocked) }
    : rawResult
      ? { verdict: "possible_issue", summary: "Couldn't fully evaluate this document — you can still submit, but double-check it manually.", details: ["Please review the document yourself before submitting."], mocked: true }
      : null;

  return (
    <div className="rounded-xl border border-rule bg-paper-raised p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-sm">{t(doc.label, doc.labelHi)}</h3>
          <p className="text-xs text-ink-soft mt-0.5">{t(doc.helpText, doc.helpTextHi)}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowHelp((s) => !s)}
          aria-label={t("What counts as valid?", "क्या मान्य माना जाता है?")}
          className="shrink-0 text-authority"
        >
          <Info size={18} />
        </button>
      </div>

      {showHelp && (
        <p className="mt-2 text-xs bg-authority-soft text-authority rounded-lg p-2.5">
          {t(
            `Accepted formats: ${doc.acceptedFormats.join(", ").toUpperCase()}. Max size ${doc.maxSizeMb}MB.`,
            `स्वीकृत प्रारूप: ${doc.acceptedFormats.join(", ").toUpperCase()}। अधिकतम आकार ${doc.maxSizeMb}MB।`
          )}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        disabled={checking}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {!value ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={checking}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-rule py-6 text-sm text-ink-soft hover:border-authority hover:text-authority transition-colors"
        >
          <Upload size={16} />
          {t("Tap to upload photo or PDF", "फोटो या PDF अपलोड करने के लिए टैप करें")}
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm bg-paper rounded-lg px-3 py-2 border border-rule">
            <span className="truncate">{value.fileName}</span>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-alert text-xs font-medium shrink-0 ml-2"
            >
              {t("Remove", "हटाएं")}
            </button>
          </div>

          {checking && (
            <div className="flex items-center gap-2 text-xs text-ink-soft px-1">
              <Loader2 size={14} className="animate-spin" />
              {t("Checking document…", "दस्तावेज़ की जांच हो रही है…")}
            </div>
          )}

          {!checking && result && (
            <div className={`rounded-lg border px-3 py-2.5 text-xs ${verdictStyles[result.verdict].cls}`}>
              <div className="flex items-start gap-2">
                {(() => {
                  const Icon = verdictStyles[result.verdict].icon;
                  return <Icon size={16} className="shrink-0 mt-0.5" />;
                })()}
                <div>
                  <p className="font-medium">{result.summary}</p>
                  {result.details.length > 0 && (
                    <ul className="mt-1 space-y-0.5 list-disc list-inside opacity-90">
                    {result.details.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  )}
                  {result.mocked && (
                    <p className="mt-1.5 text-[10px] uppercase tracking-wide opacity-70">
                      {t("⚠ AI check running in demo mode (no live model connected)", "⚠ AI जांच डेमो मोड में चल रही है (कोई लाइव मॉडल कनेक्ट नहीं)")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getImageDimensions(dataUrl, mimeType) {
  if (!mimeType?.startsWith("image/")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  });
}
