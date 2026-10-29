import { NextResponse } from "next/server";

/**
 * Optional hard-SKU paid cutout fallback (Photoroom).
 * End-to-end wired; blocked only when PHOTOROOM_API_KEY is missing.
 * Core path remains free BiRefNet — this never creates free-quota dependency.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const hasKey = Boolean(process.env.PHOTOROOM_API_KEY?.trim());
  return NextResponse.json({
    ok: true,
    configured: hasKey,
    provider: "photoroom",
    blockedEnv: hasKey ? null : "PHOTOROOM_API_KEY",
    note: hasKey
      ? "Zor SKU için Photoroom hazır."
      : "PHOTOROOM_API_KEY yok — ücretli fallback kapalı; BiRefNet çekirdek yol aktif.",
  });
}

export async function POST(req: Request) {
  const key = process.env.PHOTOROOM_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_ENV",
        blockedEnv: "PHOTOROOM_API_KEY",
        message:
          "Photoroom için PHOTOROOM_API_KEY gerekli. Çekirdek BiRefNet yolu etkilenmez.",
      },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, code: "BAD_FORM", message: "multipart form bekleniyor" },
      { status: 400 },
    );
  }

  const file = form.get("image");
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { ok: false, code: "NO_IMAGE", message: "image alanı zorunlu" },
      { status: 400 },
    );
  }

  const upstream = new FormData();
  upstream.append(
    "image_file",
    file,
    file instanceof File ? file.name : "product.png",
  );

  try {
    const res = await fetch("https://sdk.photoroom.com/v1/segment", {
      method: "POST",
      headers: { "x-api-key": key },
      body: upstream,
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        {
          ok: false,
          code: "PHOTOROOM_ERROR",
          message: `Photoroom ${res.status}: ${text.slice(0, 400)}`,
        },
        { status: 502 },
      );
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/png";
    const dataUrl = `data:${contentType};base64,${buf.toString("base64")}`;
    return NextResponse.json({
      ok: true,
      provider: "photoroom",
      cutoutDataUrl: dataUrl,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        code: "PHOTOROOM_ERROR",
        message: err instanceof Error ? err.message : "Photoroom hatası",
      },
      { status: 502 },
    );
  }
}
