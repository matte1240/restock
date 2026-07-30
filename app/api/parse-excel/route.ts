import { NextResponse } from "next/server";
import { ExcelParseError, parseArticlesExcel } from "@/lib/excel-parse";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file caricato." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();

  try {
    const articles = await parseArticlesExcel(buffer);
    return NextResponse.json({ articles });
  } catch (error) {
    if (error instanceof ExcelParseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Errore nel parsing del file Excel:", error);
    return NextResponse.json({ error: "Errore imprevisto durante la lettura del file Excel." }, { status: 500 });
  }
}
