import { NextResponse } from "next/server";
import { getAiSettings, saveAiSettings } from "@/lib/db";
import type { AiReasoningLevel, AiSettings } from "@/lib/types";

export const runtime = "nodejs";

const VALID_REASONING: AiReasoningLevel[] = ["none", "adaptive", "deep"];

export async function GET() {
  return NextResponse.json({ settings: getAiSettings() });
}

export async function PATCH(request: Request) {
  let body: Partial<AiSettings>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non valido." }, { status: 400 });
  }

  const current = getAiSettings();
  const model = typeof body.model === "string" && body.model ? body.model : current.model;
  const reasoning =
    typeof body.reasoning === "string" && VALID_REASONING.includes(body.reasoning as AiReasoningLevel)
      ? (body.reasoning as AiReasoningLevel)
      : current.reasoning;

  return NextResponse.json({ settings: saveAiSettings({ model, reasoning }) });
}
