import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const incomingForm = await request.formData();
    const image = incomingForm.get("image");
    const apiKey = incomingForm.get("apiKey");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "缺少图片文件，请重新上传。" }, { status: 400 });
    }

    if (typeof apiKey !== "string" || !apiKey.trim()) {
      return NextResponse.json({ error: "缺少 remove.bg API Key。" }, { status: 400 });
    }

    const formData = new FormData();
    formData.append("image_file", image);
    formData.append("size", "auto");

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey.trim(),
      },
      body: formData,
    });

    const creditsRemaining = response.headers.get("x-credits-remaining");
    const creditsCharged = response.headers.get("x-credits-charged");
    const creditType = response.headers.get("x-credit-type");

    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const errorBody = await response.json();
        const firstError = errorBody?.errors?.[0];
        const jsonResponse = NextResponse.json(
          {
            error: firstError?.title || "去除背景失败，请检查 API Key 与配额。",
            code: firstError?.code,
            details: errorBody,
          },
          { status: response.status },
        );
        if (creditsRemaining) {
          jsonResponse.headers.set("X-Credits-Remaining", creditsRemaining);
        }
        if (creditsCharged) {
          jsonResponse.headers.set("X-Credits-Charged", creditsCharged);
        }
        if (creditType) {
          jsonResponse.headers.set("X-Credit-Type", creditType);
        }
        return jsonResponse;
      }

      const errorText = await response.text();
      const textResponse = NextResponse.json(
        { error: "去除背景失败，请稍后重试。", details: errorText },
        { status: response.status },
      );
      if (creditsRemaining) {
        textResponse.headers.set("X-Credits-Remaining", creditsRemaining);
      }
      if (creditsCharged) {
        textResponse.headers.set("X-Credits-Charged", creditsCharged);
      }
      if (creditType) {
        textResponse.headers.set("X-Credit-Type", creditType);
      }
      return textResponse;
    }

    const arrayBuffer = await response.arrayBuffer();
    const outgoingHeaders = new Headers({
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    });
    if (creditsRemaining) {
      outgoingHeaders.set("X-Credits-Remaining", creditsRemaining);
    }
    if (creditsCharged) {
      outgoingHeaders.set("X-Credits-Charged", creditsCharged);
    }
    if (creditType) {
      outgoingHeaders.set("X-Credit-Type", creditType);
    }

    return new Response(arrayBuffer, {
      status: 200,
      headers: outgoingHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "服务异常，请稍后再试。",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
