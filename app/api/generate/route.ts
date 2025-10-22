import { NextResponse } from "next/server";

const VOLCENGINE_IMAGE_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const DEFAULT_MODEL = "ep-20251023012547-2jjbx";

type GenerateRequestBody = {
  prompt?: unknown;
  negativePrompt?: unknown;
  apiKey?: unknown;
  size?: unknown;
  sequential?: unknown;
  watermark?: unknown;
  responseFormat?: unknown;
};

type RawImageItem = {
  url?: string;
  b64_json?: string;
  mime_type?: string;
  content_type?: string;
  size?: string;
  prompt?: string;
  revised_prompt?: string;
  seed?: number;
  index?: number;
  created?: number;
};

type NormalizedImage = {
  id: string;
  url: string;
  mimeType: string;
  size?: string | null;
  prompt?: string | null;
  revisedPrompt?: string | null;
  seed?: number | null;
  created?: number | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildImageUrl(item: RawImageItem, fallbackMime: string): { url: string; mime: string } | null {
  if (item.url) {
    return {
      url: item.url,
      mime: item.content_type || item.mime_type || fallbackMime,
    };
  }

  if (item.b64_json) {
    const mime = item.content_type || item.mime_type || fallbackMime;
    return {
      url: `data:${mime};base64,${item.b64_json}`,
      mime,
    };
  }

  return null;
}

function normalizeImages(data: unknown): NormalizedImage[] {
  if (!Array.isArray((data as { data?: RawImageItem[] } | undefined)?.data)) {
    return [];
  }

  const items = (data as { data?: RawImageItem[] }).data ?? [];
  const results: NormalizedImage[] = [];

  items.forEach((item, index) => {
    const built = buildImageUrl(item, "image/png");
    if (!built) return;
    results.push({
      id: `image-${item.index ?? index}`,
      url: built.url,
      mimeType: built.mime,
      size: item.size ?? null,
      prompt: item.prompt ?? null,
      revisedPrompt: item.revised_prompt ?? null,
      seed: item.seed ?? null,
      created: item.created ?? null,
    });
  });

  return results;
}

type VolcengineCallResult = {
  response: Response;
  rawText: string;
  parsedBody: unknown;
  format: "url" | "b64_json";
};

async function callVolcengine({
  apiKey,
  payload,
  responseFormat,
}: {
  apiKey: string;
  payload: Record<string, unknown>;
  responseFormat: "url" | "b64_json";
}): Promise<VolcengineCallResult> {
  const finalPayload = {
    ...payload,
    response_format: responseFormat,
  };

  const response = await fetch(VOLCENGINE_IMAGE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(finalPayload),
  });

  const rawText = await response.text();
  let parsedBody: unknown;
  try {
    parsedBody = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsedBody = rawText;
  }

  return { response, rawText, parsedBody, format: responseFormat };
}

function shouldRetryWithBase64(result: VolcengineCallResult) {
  if (result.response.ok) return false;
  if (result.format !== "url") return false;
  if (result.response.status === 404) return true;
  const message =
    (result.parsedBody as { error?: { message?: string }; message?: string } | null)?.error
      ?.message ||
    (result.parsedBody as { message?: string } | null)?.message;
  if (!message) return false;
  return /endpoint that is currently closed or temporarily unavailable/i.test(message);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequestBody;

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const negativePrompt =
      typeof body.negativePrompt === "string" ? body.negativePrompt.trim() : undefined;
    const size = typeof body.size === "string" && body.size.trim() ? body.size.trim() : "2K";
    const sequential =
      body.sequential === "enabled" || body.sequential === "disabled"
        ? (body.sequential as "enabled" | "disabled")
        : "disabled";
    const watermark =
      typeof body.watermark === "boolean" ? body.watermark : body.watermark === "false" ? false : true;
    const initialResponseFormat =
      body.responseFormat === "b64_json" || body.responseFormat === "url"
        ? (body.responseFormat as "b64_json" | "url")
        : "url";

    if (!prompt) {
      return NextResponse.json({ error: "提示词不能为空。" }, { status: 400 });
    }

    const resolvedApiKey =
      (typeof body.apiKey === "string" && body.apiKey.trim()) || process.env.ARK_API_KEY;

    if (!resolvedApiKey) {
      return NextResponse.json(
        { error: "服务器未配置火山引擎 API Key，请联系管理员或填写自定义密钥。" },
        { status: 400 },
      );
    }

    const payloadBase: Record<string, unknown> = {
      model: DEFAULT_MODEL,
      prompt,
      size,
      stream: false,
      watermark,
      sequential_image_generation: sequential,
    };

    if (negativePrompt) {
      payloadBase.negative_prompt = negativePrompt;
    }

    const initialResult = await callVolcengine({
      apiKey: resolvedApiKey,
      payload: payloadBase,
      responseFormat: initialResponseFormat,
    });

    let finalResult = initialResult;

    if (shouldRetryWithBase64(initialResult)) {
      finalResult = await callVolcengine({
        apiKey: resolvedApiKey,
        payload: payloadBase,
        responseFormat: "b64_json",
      });
    }

    if (!finalResult.response.ok) {
      const errorMessage =
        (finalResult.parsedBody as { error?: { message?: string }; message?: string } | null)?.error
          ?.message ||
        (finalResult.parsedBody as { message?: string } | null)?.message ||
        "生成失败，请稍后再试。";
      return NextResponse.json(
        {
          error: errorMessage,
          details: finalResult.parsedBody,
        },
        { status: finalResult.response.status },
      );
    }

    const images = normalizeImages(finalResult.parsedBody);

    return NextResponse.json(
      {
        data: {
          images,
          raw: finalResult.parsedBody,
          responseFormat: finalResult.format,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "服务异常，请稍后重试。",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
