import { NextResponse } from "next/server";
import { createApplication, listApplicationsByPhone } from "@/lib/store";

export async function POST(req) {
  const body = await req.json();
  const { certificateTypeId, applicant, documents } = body;

  if (!certificateTypeId || !applicant || !documents) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const app = createApplication(certificateTypeId, applicant, documents);
  return NextResponse.json({ id: app.id });
}

export async function GET(req) {
  const phone = req.nextUrl.searchParams.get("phone");
  if (!phone) {
    return NextResponse.json({ error: "Missing phone" }, { status: 400 });
  }
  const apps = listApplicationsByPhone(phone);
  return NextResponse.json({ applications: apps.map((a) => ({ id: a.id, certificateTypeId: a.certificateTypeId, submittedAt: a.submittedAt })) });
}
