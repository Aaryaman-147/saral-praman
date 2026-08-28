"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import AssistantChat from "@/components/AssistantChat";
import { useLanguage } from "@/components/LanguageContext";
import { getCertificateType } from "@/lib/schema";
import { CheckCircle2, Clock, XCircle, Loader2, Award } from "lucide-react";
import DocumentUploader from "@/components/DocumentUploader";

export default function StatusPage() {
  const params = useParams();
  const { t } = useLanguage();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [resubmitDoc, setResubmitDoc] = useState(null);
  const [resubmitting, setResubmitting] = useState(false);
  const [updatingDocumentId, setUpdatingDocumentId] = useState(null);
  const [updatedDocument, setUpdatedDocument] = useState(null);
  const [updatingDocument, setUpdatingDocument] = useState(false);

  const fetchStatus = useCallback(async () => {
    const res = await fetch(`/api/applications/${params.id}`);
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let data;
    try {
      data = await res.json();
    } catch {
      setNotFound(true);
      setLoading(false);
      return;
    }
    if (!res.ok || data?.error) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setApp(data);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000); // poll like a real status page would
    return () => clearInterval(interval);
  }, [fetchStatus]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="animate-spin text-authority" />
        </main>
      </>
    );
  }

  if (notFound || !app) {
    return (
      <>
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-10 text-center">
          <p>{t("We couldn't find an application with that ID.", "हमें उस आईडी के साथ कोई आवेदन नहीं मिला।")}</p>
        </main>
      </>
    );
  }

  const certType = getCertificateType(app.certificateTypeId);
  const latestStage = app.history[app.history.length - 1];
  const isRejected = latestStage.stage === "rejected";
  const isIssued = latestStage.stage === "issued";
  const canUpdateDocuments = !isIssued && !isRejected;

  async function handleResubmit() {
    if (!resubmitDoc) return;
    setResubmitting(true);
    await fetch(`/api/applications/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documents: [
          {
            ...resubmitDoc,
            uploadedAt: new Date().toISOString(),
            aiCheckResult: resubmitDoc.aiResult,
          },
        ],
      }),
    });
    setResubmitDoc(null);
    setResubmitting(false);
    await fetchStatus();
  }

  async function handleDocumentUpdate() {
    if (!updatedDocument) return;
    setUpdatingDocument(true);
    await fetch(`/api/applications/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_document", document: { ...updatedDocument, uploadedAt: new Date().toISOString(), aiCheckResult: updatedDocument.aiResult } }),
    });
    setUpdatedDocument(null);
    setUpdatingDocumentId(null);
    setUpdatingDocument(false);
    await fetchStatus();
  }

  function downloadMockCertificate() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.opener = null;
    const certificateType = certType.name.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const applicantName = app.applicant.fullName.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    printWindow.document.write(`<!doctype html>
      <html><head><title>Mock Certificate - ${app.id}</title>
      <style>
        @page { size: A4; margin: 18mm; }
        body { font-family: Georgia, serif; color: #1a1a1a; background: #faf7ef; }
        .banner { margin-bottom: 18px; padding: 14px; background: #fbeae2; border: 3px solid #b5451b; color: #8d3415; font-family: Arial, sans-serif; font-weight: 800; text-align: center; letter-spacing: .04em; }
        .certificate { position: relative; border: 7px double #1e3a5f; padding: 30px 34px; min-height: 690px; background: #fffdf7; }
        .mark { position: absolute; top: 42%; left: 10%; width: 80%; color: rgba(30, 58, 95, .13); font-family: Arial, sans-serif; font-size: 42px; font-weight: 900; text-align: center; transform: rotate(-28deg); }
        .brand { color: #1e3a5f; font-family: Arial, sans-serif; font-weight: 800; letter-spacing: .12em; text-align: center; text-transform: uppercase; }
        h1 { color: #1e3a5f; font-size: 32px; text-align: center; margin: 28px 0 8px; letter-spacing: .04em; }
        .rule { width: 90px; border-top: 2px solid #1e3a5f; margin: 0 auto 28px; }
        .subhead { color: #52504a; text-align: center; font-family: Arial, sans-serif; margin-bottom: 35px; }
        .reference { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd6c3; padding-bottom: 12px; font: 12px Arial, sans-serif; }
        .body-copy { position: relative; z-index: 1; margin: 38px 4px; font-size: 18px; line-height: 1.8; text-align: justify; }
        .body-copy strong { color: #1e3a5f; }
        .details { font: 13px Arial, sans-serif; border-top: 1px solid #ddd6c3; padding-top: 16px; }
        .footer { margin-top: 30px; font: 12px Arial, sans-serif; color: #52504a; line-height: 1.5; }
      </style></head><body>
      <div class="banner">MOCK CERTIFICATE - NOT A VALID GOVERNMENT DOCUMENT</div>
      <section class="certificate"><div class="mark">MOCK - NOT VALID</div><div class="brand">Saral Praman · Demo Office</div><h1>Income Certificate</h1><div class="rule"></div><p class="subhead">Demo certificate preview only</p><div class="reference"><span>Reference: ${app.id}</span><span>Date: ${new Date().toLocaleDateString("en-IN")}</span></div><p class="body-copy">This is to certify that <strong>${applicantName}</strong>, son/daughter of <strong>${app.applicant.fatherOrGuardianName}</strong>, resident of <strong>${app.applicant.address}</strong>, has an annual family income within the eligible range for the purposes stated in the application.</p><div class="details"><strong>Certificate type:</strong> ${certificateType}<br/><strong>Application ID:</strong> ${app.id}</div><p class="footer">This file is generated by an independent hackathon prototype. It is not issued by, connected to, or valid for any government department or scheme.</p></section>
      <script>window.onload = () => window.print();<\/script>
      </body></html>`);
    printWindow.document.close();
  }

  return (
    <>
      <Header />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-6 w-full">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h1 className="text-xl font-bold">{t(certType.name, certType.nameHi)}</h1>
          <span className="font-mono text-xs text-ink-soft">{app.id}</span>
        </div>
        <p className="text-sm text-ink-soft mt-1">
          {app.applicant.fullName} · {app.applicant.tehsil}, {app.applicant.district}
        </p>

        {/* Overall status stamp */}
        <div className="mt-5">
          {isIssued && (
            <div className="stamp text-success text-sm">
              <Award size={16} />
              {t("Certificate Issued", "प्रमाण पत्र जारी")}
            </div>
          )}
          {isRejected && (
            <div className="stamp text-alert text-sm">
              <XCircle size={16} />
              {t("Correction Needed", "सुधार आवश्यक")}
            </div>
          )}
          {!isIssued && !isRejected && (
            <div className="stamp text-warning text-sm">
              <Clock size={16} />
              {t("In Progress", "प्रक्रियाधीन")}
            </div>
          )}
        </div>

        {/* Rejection resolution */}
        {isRejected && app.rejectionReason && (
          <div className="mt-4 rounded-xl border-2 border-alert/30 bg-alert-soft p-4">
            <h2 className="font-semibold text-alert text-sm flex items-center gap-1.5">
              <XCircle size={16} />
              {t("What needs fixing", "क्या ठीक करना है")}
            </h2>
            <p className="text-sm mt-1.5 text-ink">{app.rejectionReason}</p>

            <div className="mt-4">
              <p className="text-xs font-medium text-ink-soft mb-2">
                {t("Upload the corrected document to re-submit:", "पुनः जमा करने के लिए सुधारा हुआ दस्तावेज़ अपलोड करें:")}
              </p>
              <DocumentUploader
                doc={certType.requiredDocuments.find((d) => d.id === "income_proof")}
                certificateTypeId={certType.id}
                value={resubmitDoc}
                onChange={setResubmitDoc}
                existingDocuments={app.documents}
                sessionId={app.id}
              />
              <button
                onClick={handleResubmit}
                disabled={!resubmitDoc || resubmitting}
                className="w-full mt-3 rounded-lg bg-authority text-paper py-2.5 font-medium disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {resubmitting && <Loader2 size={16} className="animate-spin" />}
                {t("Re-submit", "पुनः जमा करें")}
              </button>
            </div>
          </div>
        )}

        {canUpdateDocuments && (
          <section className="mt-6">
            <h2 className="font-semibold text-sm mb-1">{t("Your submitted documents", "आपके जमा किए गए दस्तावेज़")}</h2>
            <p className="text-xs text-ink-soft mb-3">{t("You can replace a document while this application is being processed. The new upload is checked again before it is saved.", "आवेदन प्रक्रिया में रहते हुए आप दस्तावेज़ बदल सकते हैं। नया अपलोड सहेजने से पहले फिर से जांचा जाएगा।")}</p>
            <div className="space-y-2">
              {app.documents.map((uploaded) => {
                const doc = certType.requiredDocuments.find((item) => item.id === uploaded.documentId);
                const isEditing = updatingDocumentId === uploaded.documentId;
                return (
                  <div key={uploaded.documentId} className="rounded-xl border border-rule bg-paper-raised p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{t(doc.label, doc.labelHi)}</p>
                        <p className="text-xs text-ink-soft truncate">{uploaded.fileName}</p>
                      </div>
                      <button onClick={() => { setUpdatingDocumentId(isEditing ? null : uploaded.documentId); setUpdatedDocument(null); }} className="shrink-0 text-sm font-medium text-authority underline">
                        {isEditing ? t("Cancel", "रद्द करें") : t("Update this document", "यह दस्तावेज़ अपडेट करें")}
                      </button>
                    </div>
                    {isEditing && (
                      <div className="mt-3">
                        <DocumentUploader doc={doc} certificateTypeId={certType.id} value={updatedDocument} onChange={setUpdatedDocument} existingDocuments={app.documents} sessionId={app.id} />
                        <button onClick={handleDocumentUpdate} disabled={!updatedDocument || updatingDocument} className="w-full mt-3 rounded-lg bg-authority text-paper py-2.5 text-sm font-medium disabled:opacity-40">
                          {updatingDocument ? t("Saving…", "सहेजा जा रहा है…") : t("Save updated document", "अपडेट किया गया दस्तावेज़ सहेजें")}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Timeline */}
        <div className="mt-6">
          <div className="mb-4 rounded-xl border border-authority/20 bg-authority-soft px-3.5 py-3 text-xs leading-relaxed text-authority">
            {t(
              "Demo status — in this prototype, stage changes are simulated on a timer. A real version would sync with the relevant state portal, or be updated by you as you visit each office.",
              "डेमो स्थिति — इस प्रोटोटाइप में, चरण परिवर्तन एक टाइमर पर सिम्युलेट किए जाते हैं। एक वास्तविक संस्करण संबंधित राज्य पोर्टल के साथ सिंक करेगा, या जैसे-जैसे आप हर कार्यालय जाएंगे, आपके द्वारा अपडेट किया जाएगा।"
            )}
          </div>
          <h2 className="font-semibold text-sm mb-3">{t("Progress", "प्रगति")}</h2>
          <ol className="space-y-0">
            {certType.workflow
              .filter((w) => w.id !== "rejected")
              .map((stageDef, i, arr) => {
                const historyEntry = app.history.find((h) => h.stage === stageDef.id);
                const reached = Boolean(historyEntry);
                const isCurrent = latestStage.stage === stageDef.id;
                const isLast = i === arr.length - 1;

                return (
                  <li key={stageDef.id} className="flex gap-3 stage-enter">
                    <div className="flex flex-col items-center">
                      <span
                        className={`w-7 h-7 rounded-full grid place-items-center shrink-0 ${
                          reached ? "bg-success text-paper" : "bg-rule text-ink-soft"
                        } ${isCurrent && !isIssued ? "ring-4 ring-warning-soft" : ""}`}
                      >
                        {reached ? <CheckCircle2 size={16} /> : <Clock size={14} />}
                      </span>
                      {!isLast && <span className={`w-0.5 flex-1 min-h-8 ${reached ? "bg-success" : "bg-rule"}`} />}
                    </div>
                    <div className="pb-6">
                      <p className={`text-sm font-medium ${reached ? "text-ink" : "text-ink-soft"}`}>
                        {t(stageDef.label, stageDef.labelHi)}
                      </p>
                      <p className="text-xs text-ink-soft mt-0.5 max-w-md">
                        {t(stageDef.description, stageDef.descriptionHi)}
                      </p>
                      {historyEntry && (
                        <p className="text-xs text-authority mt-1">
                          {new Date(historyEntry.enteredAt).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {historyEntry.note ? ` — ${historyEntry.note}` : ""}
                        </p>
                      )}
                      {!reached && (
                        <p className="text-xs text-ink-soft/70 mt-1">
                          {t("Typically", "आमतौर पर")} {stageDef.typicalDurationDays[0]}–{stageDef.typicalDurationDays[1]} {t("days", "दिन")} · {stageDef.officeHolder}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
          </ol>
        </div>

        {isIssued && (
          <button onClick={downloadMockCertificate} className="w-full rounded-lg bg-success text-paper py-3 font-medium mb-6">
            {t("Download certificate (PDF)", "प्रमाण पत्र डाउनलोड करें (PDF)")}
          </button>
        )}

        <AssistantChat applicationId={app.id} />
      </main>
    </>
  );
}
