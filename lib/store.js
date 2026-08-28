// MOCK BACKEND.
//
// In a real deployment this would be a database (e.g. Postgres) plus a
// workflow engine, with the Patwari and Tehsildar stages backed by actual
// state-government staff logging into their own dashboards to approve/reject
// (see the "how this works at scale" doc for the real architecture).
//
// For this prototype, application state lives in memory on the server and is
// advanced by a simulated clock: each time status is checked, we compute
// what stage the application *would* be at by now, using randomized-but-seeded
// durations and a deterministic rejection reason so the demo is reproducible
// per application ID rather than re-rolling dice on every page load.

import { getCertificateType } from "./schema";

const applications = new Map();
const documentCheckSessions = new Map();

export function findDuplicateDocument(sessionId, documentId, contentHash) {
  if (!sessionId || !contentHash) return undefined;
  const entries = documentCheckSessions.get(sessionId) ?? [];
  return entries.find((entry) => entry.documentId !== documentId && entry.contentHash === contentHash);
}

export function rememberCheckedDocument(sessionId, documentId, contentHash) {
  if (!sessionId || !contentHash) return;
  const entries = documentCheckSessions.get(sessionId) ?? [];
  const existing = entries.find((entry) => entry.documentId === documentId);
  if (existing) existing.contentHash = contentHash;
  else entries.push({ documentId, contentHash });
  documentCheckSessions.set(sessionId, entries);
}

function randomId() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const year = new Date().getFullYear();
  return `SP-${year}-${rand}`;
}

// Deterministically derive an outcome path from the application id so that
// re-fetching status always tells the same story, without a real DB.
function seedFromId(id) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 1000;
  if (hash < 550) return "clean";
  if (hash < 800) return "rejected_once_then_clean";
  return "slow_but_clean";
}

export function createApplication(
  certificateTypeId,
  applicant,
  documents
) {
  const id = randomId();
  const now = new Date().toISOString();
  const app = {
    id,
    certificateTypeId,
    applicant,
    documents,
    submittedAt: now,
    outcomeSeed: seedFromId(id),
    history: [{ stage: "submitted", enteredAt: now }],
  };
  applications.set(id, app);
  return app;
}

export function getApplication(id) {
  return applications.get(id);
}

export function listApplicationsByPhone(phone) {
  return Array.from(applications.values()).filter(
    (a) => a.applicant.phone === phone
  );
}

// Computes the CURRENT effective stage given elapsed time since submission,
// simulating a real multi-stage bureaucratic workflow instead of a fake
// linear progress bar. This is the "explainability layer" — every stage
// change is logged with a timestamp and a plain-language note.
export function getComputedStatus(app) {
  const certType = getCertificateType(app.certificateTypeId);
  if (!certType) return app;

  const submittedMs = new Date(app.submittedAt).getTime();
  const now = Date.now();
  const elapsedDays = (now - submittedMs) / (1000 * 60 * 60 * 24);

  // Demo-speed compression: 1 real minute = 1 simulated day, so judges can
  // watch an application move through stages within a short demo window
  // instead of waiting real days. Clearly a demo artifact — see README.
  const simulatedDaysPerMinute = 15;
  const simulatedElapsedDays = elapsedDays * 24 * 60 * simulatedDaysPerMinute;

  const [patwariMin] = certType.workflow.find((w) => w.id === "patwari_verification").typicalDurationDays;
  const [tehsildarMin] = certType.workflow.find((w) => w.id === "tehsildar_review").typicalDurationDays;

  const patwariDoneAt = patwariMin;
  const tehsildarDoneAt = patwariDoneAt + tehsildarMin;

  const history = [...app.history];
  const alreadyHas = (stage) => history.some((h) => h.stage === stage);

  if (simulatedElapsedDays >= 0.3 && !alreadyHas("patwari_verification")) {
    history.push({
      stage: "patwari_verification",
      enteredAt: new Date(submittedMs + 0.3 * 24 * 60 * 60 * 1000 / (24 * 60 * simulatedDaysPerMinute)).toISOString(),
      note: "Assigned to Patwari for field verification.",
    });
  }

  if (app.outcomeSeed === "rejected_once_then_clean") {
    if (simulatedElapsedDays >= patwariDoneAt && !alreadyHas("rejected") && !history.some(h => h.stage === "tehsildar_review")) {
      history.push({
        stage: "rejected",
        enteredAt: new Date(submittedMs + patwariDoneAt * 24 * 60 * 60 * 1000 / (24 * 60 * simulatedDaysPerMinute)).toISOString(),
        note: "Income proof affidavit was missing the notary stamp. Re-submit with a stamped affidavit.",
      });
      app.rejectionReason =
        "Your income proof (self-employment affidavit) did not have a notary stamp. This is the single most common rejection reason for this certificate. Please re-upload a stamped copy.";
    }
  } else if (simulatedElapsedDays >= patwariDoneAt && !alreadyHas("tehsildar_review")) {
    history.push({
      stage: "tehsildar_review",
      enteredAt: new Date(submittedMs + patwariDoneAt * 24 * 60 * 60 * 1000 / (24 * 60 * simulatedDaysPerMinute)).toISOString(),
      note: "Patwari verification complete, sent to Tehsildar for approval.",
    });
  }

  const issueThreshold = app.outcomeSeed === "slow_but_clean" ? tehsildarDoneAt + 3 : tehsildarDoneAt;
  if (
    simulatedElapsedDays >= issueThreshold &&
    !alreadyHas("issued") &&
    alreadyHas("tehsildar_review")
  ) {
    history.push({
      stage: "issued",
      enteredAt: new Date(submittedMs + issueThreshold * 24 * 60 * 60 * 1000 / (24 * 60 * simulatedDaysPerMinute)).toISOString(),
      note: "Certificate approved and issued.",
    });
  }

  app.history = history;
  return app;
}

export function resubmitAfterRejection(id, documents) {
  const app = applications.get(id);
  if (!app) return undefined;
  app.documents = documents;
  app.submittedAt = new Date().toISOString(); // restart the simulated clock
  app.outcomeSeed = "clean"; // after resubmission, demo proceeds cleanly
  app.rejectionReason = undefined;
  app.history.push({
    stage: "submitted",
    enteredAt: new Date().toISOString(),
    note: "Corrected documents re-submitted.",
  });
  return app;
}

export function updateApplicationDocument(id, document) {
  const app = applications.get(id);
  if (!app) return undefined;
  const documentIndex = app.documents.findIndex((item) => item.documentId === document.documentId);
  if (documentIndex === -1) return undefined;

  app.documents[documentIndex] = { ...app.documents[documentIndex], ...document, uploadedAt: new Date().toISOString() };
  app.history.push({ stage: app.history[app.history.length - 1].stage, enteredAt: new Date().toISOString(), note: `Applicant updated ${document.fileName}.` });
  return app;
}
