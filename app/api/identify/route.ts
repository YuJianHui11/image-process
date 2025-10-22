import { NextResponse } from "next/server";

const VOLCENGINE_ENDPOINT = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
const DEFAULT_PROMPT = "识别图片";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IdentifyRequestBody = {
  imageDataUrl?: unknown;
  apiKey?: unknown;
  prompt?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as IdentifyRequestBody;
    const { imageDataUrl, apiKey, prompt } = body ?? {};

    if (typeof imageDataUrl !== "string" || !imageDataUrl.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "缺少有效的图片数据，请重新上传。" },
        { status: 400 },
      );
    }

    const resolvedApiKey =
      (typeof apiKey === "string" && apiKey.trim()) || process.env.ARK_API_KEY;

    if (!resolvedApiKey) {
      return NextResponse.json(
        { error: "服务器未配置火山引擎 API Key，请联系管理员或填写自定义密钥。" },
        { status: 400 },
      );
    }

    const textPrompt =
      typeof prompt === "string" && prompt.trim().length > 0 ? prompt.trim() : DEFAULT_PROMPT;

    const payload = {
      model: "ep-20251023004013-j2vpb",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: textPrompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
          ],
        },
      ],
    };

    const response = await fetch(VOLCENGINE_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resolvedApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const rawText = await response.text();
    let parsedBody: unknown;
    try {
      parsedBody = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsedBody = rawText;
    }

    if (!response.ok) {
      const message =
        (parsedBody as { message?: string; error?: { message?: string } } | null)?.error?.message ||
        (parsedBody as { message?: string } | null)?.message ||
        "识别失败，请稍后再试。";
      return NextResponse.json(
        {
          error: message,
          details: parsedBody,
        },
        { status: response.status },
      );
    }

    return NextResponse.json(
      {
        data: parsedBody,
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
