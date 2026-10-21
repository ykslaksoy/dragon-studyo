import { NextResponse } from "next/server";

/**
 * Optional server dekupe endpoint — not required for the core client path.
 * Browser BiRefNet / ISNet runs in-app; this route is reserved for future
 * GPU workers without free-quota third-party APIs.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      code: "CLIENT_SIDE_ONLY",
      message:
        "Dekupe tarayıcıda çalışır (ISNet önizleme, BiRefNet final). Sunucu yolu henüz bağlı değil.",
    },
    { status: 501 },
  );
}
