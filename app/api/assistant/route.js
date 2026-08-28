import { NextResponse } from "next/server";
import { askAssistant } from "@/lib/ai";
import { getApplication, getComputedStatus } from "@/lib/store";
import { getCertificateType } from "@/lib/schema";

export async function POST(req) {
  const body = await req.json();
  const { messages, applicationId, language } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  let contextSummary = "No application is currently loaded for this conversation.";
  if (applicationId) {
    const app = getApplication(applicationId);
    if (app) {
      const computed = getComputedStatus(app);
      const certType = getCertificateType(computed.certificateTypeId);
      const currentStage = computed.history[computed.history.length - 1];
      contextSummary =
        `Certificate type: ${certType?.name}. ` +
        `Application ID: ${computed.id}. ` +
        `Submitted: ${new Date(computed.submittedAt).toLocaleDateString("en-IN")}. ` +
        `Current stage: ${currentStage.stage}${currentStage.note ? " — " + currentStage.note : ""}. ` +
        (computed.rejectionReason ? `Rejection reason: ${computed.rejectionReason}` : "");
    }
  }

  const result = await askAssistant(messages, contextSummary, language === "hi" ? "hi" : "en");
  return NextResponse.json(result);
}
