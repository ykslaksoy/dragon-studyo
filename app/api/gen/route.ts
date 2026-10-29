import { NextResponse } from "next/server";

/**
 * Generative frame tier — fal.ai Flux (in-hand / lifestyle / UGC).
 * End-to-end wired; blocked only when FAL_KEY is missing.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

type GenBody = {
  prompt?: string;
  frameLabel?: string;
  cutoutDataUrl?: string;
  purpose?: string;
};

const MODEL = "fal-ai/flux/schnell";

function buildPrompt(body: GenBody): string {
  const frame = body.frameLabel ?? "lifestyle product photo";
  const purpose = body.purpose ?? "marketplace";
  if (body.prompt?.trim()) return body.prompt.trim();
  return [
    `Professional ecommerce ${frame} photograph of the product,`,
    `natural lighting, realistic materials, ${purpose} listing style,`,
    `shot on 50mm, clean composition, no watermark, no text overlay`,
  ].join(" ");
}

async function falSubscribe(
  key: string,
  prompt: string,
  imageUrl?: string,
): Promise<{ imageUrl: string; requestId?: string }> {
  // Prefer image-to-image when cutout provided; else text-to-image schnell.
  const endpoint = imageUrl
    ? "https://queue.fal.run/fal-ai/flux/dev/image-to-image"
    : `https://queue.fal.run/${MODEL}`;

  const payload: Record<string, unknown> = {
    prompt,
    image_size: "square_hd",
    num_images: 1,
    enable_safety_checker: true,
  };
  if (imageUrl) {
    payload.image_url = imageUrl;
    payload.strength = 0.72;
    payload.num_inference_steps = 28;
  }

  const submit = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!submit.ok) {
    const text = await submit.text();
    throw new Error(`fal submit ${submit.status}: ${text.slice(0, 400)}`);
  }

  const submitted = (await submit.json()) as {
    request_id: string;
    status_url: string;
    response_url: string;
  };

  const deadline = Date.now() + 55_000;
  while (Date.now() < deadline) {
    const st = await fetch(submitted.status_url, {
      headers: { Authorization: `Key ${key}` },
    });
    const status = (await st.json()) as { status: string };
    if (status.status === "COMPLETED") break;
    if (status.status === "FAILED") {
      throw new Error("fal generation failed");
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  const resultRes = await fetch(submitted.response_url, {
    headers: { Authorization: `Key ${key}` },
  });
  if (!resultRes.ok) {
    const text = await resultRes.text();
    throw new Error(`fal result ${resultRes.status}: ${text.slice(0, 400)}`);
  }
  const result = (await resultRes.json()) as {
    images?: { url: string }[];
  };
  const url = result.images?.[0]?.url;
  if (!url) throw new Error("fal yanıtında görsel yok");
  return { imageUrl: url, requestId: submitted.request_id };
}

export async function GET() {
  const hasKey = Boolean(process.env.FAL_KEY?.trim());
  return NextResponse.json({
    ok: true,
    configured: hasKey,
    model: MODEL,
    blockedEnv: hasKey ? null : "FAL_KEY",
    note: hasKey
      ? "GEN frames fal.ai ile üretilebilir."
      : "FAL_KEY yok — üretken kareler tuval yer tutucu / mannequin warp kullanır.",
  });
}

export async function POST(req: Request) {
  const key = process.env.FAL_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_ENV",
        blockedEnv: "FAL_KEY",
        message:
          "Üretken AI için FAL_KEY gerekli. Vercel env'e FAL_KEY ekleyin.",
      },
      { status: 503 },
    );
  }

  let body: GenBody;
  try {
    body = (await req.json()) as GenBody;
  } catch {
    return NextResponse.json(
      { ok: false, code: "BAD_JSON", message: "Geçersiz JSON gövde" },
      { status: 400 },
    );
  }

  const prompt = buildPrompt(body);
  try {
    // fal needs a public URL for img2img — data URLs often rejected; pass only if http(s)
    const cut = body.cutoutDataUrl;
    const imageUrl =
      cut && /^https?:\/\//i.test(cut) ? cut : undefined;
    const out = await falSubscribe(key, prompt, imageUrl);
    return NextResponse.json({
      ok: true,
      imageUrl: out.imageUrl,
      requestId: out.requestId,
      model: imageUrl ? "fal-ai/flux/dev/image-to-image" : MODEL,
      prompt,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        code: "FAL_ERROR",
        message: err instanceof Error ? err.message : "fal hatası",
      },
      { status: 502 },
    );
  }
}
