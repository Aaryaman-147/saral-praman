import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { checkDocument } from "@/lib/ai";
import { getCertificateType } from "@/lib/schema";
import { findDuplicateDocument, rememberCheckedDocument } from "@/lib/store";

export async function POST(req) {
  try {
  const body = await req.json();
  const { certificateTypeId, documentId, imageBase64, mimeType, fileName, imageDimensions, existingDocuments = [], sessionId } = body;

  const certType = getCertificateType(certificateTypeId);
  const docDef = certType?.requiredDocuments.find((d) => d.id === documentId);
  if (!certType || !docDef) {
    return NextResponse.json({ error: "Unknown document type" }, { status: 400 });
  }
  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: "Missing image data" }, { status: 400 });
  }

  const currentHash = createHash("sha256").update(imageBase64).digest("hex");
  const duplicate = findDuplicateDocument(sessionId, documentId, currentHash) || existingDocuments.find((document) => document.documentId !== documentId && document.imageBase64 && createHash("sha256").update(document.imageBase64).digest("hex") === currentHash);
  const duplicateDocumentLabel = duplicate ? certType.requiredDocuments.find((document) => document.id === duplicate.documentId)?.label : undefined;
  const result = await checkDocument(imageBase64, mimeType, docDef.label, docDef.checkInstructions, fileName, { imageDimensions, duplicateDocumentLabel });
  rememberCheckedDocument(sessionId, documentId, currentHash);
  return NextResponse.json(result);
  } catch (error) {
    console.error("Document check failed:", error);
    return NextResponse.json({ verdict: "possible_issue", summary: "Could not fully evaluate this document — you can still submit, but double-check it manually.", details: ["Please review the document yourself before submitting."], mocked: true }, { status: 200 });
  }
}
