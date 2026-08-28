import { NextResponse } from "next/server";
import { getApplication, getComputedStatus, resubmitAfterRejection, updateApplicationDocument } from "@/lib/store";

export async function GET(
  req,
  { params }
) {
  try {
    const { id } = await params;
    const app = getApplication(id);
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    return NextResponse.json(getComputedStatus(app));
  } catch (error) {
    console.error("Application status lookup failed:", error);
    return NextResponse.json({ error: "Unable to load application status" }, { status: 500 });
  }
}

export async function PATCH(
  req,
  { params }
) {
  const { id } = await params;
  const body = await req.json();
  if (body.action === "update_document") {
    const app = updateApplicationDocument(id, body.document);
    if (!app) return NextResponse.json({ error: "Application or document not found" }, { status: 404 });
    return NextResponse.json(app);
  }
  const app = resubmitAfterRejection(id, body.documents ?? []);
  if (!app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }
  return NextResponse.json(app);
}
