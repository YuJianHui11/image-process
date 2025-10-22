"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_KEY_STORAGE_KEY = "identify-api-key";

type IdentifyResult = {
  id?: string;
  model?: string;
  created?: number;
  choices?: unknown[];
  [key: string]: unknown;
};

type IdentifyChoice = {
  message?: {
    role?: string;
    content?: unknown;
  };
};

type NormalizedContentBlock = {
  id: string;
  text: string;
};

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return "-";
  try {
    return new Date(timestamp * 1000).toLocaleString();
  } catch {
    return String(timestamp);
  }
}

function extractMessageContent(result: IdentifyResult | null): NormalizedContentBlock[] {
  if (!result) return [];

  const choices = Array.isArray(result.choices) ? result.choices : [];
  const blocks: NormalizedContentBlock[] = [];

  choices.forEach((choice, index) => {
    const message = (choice as IdentifyChoice | undefined)?.message;
    const content = message?.content;

    if (typeof content === "string") {
      const trimmed = content.trim();
      if (trimmed) {
        blocks.push({
          id: `choice-${index}-text-0`,
          text: trimmed,
        });
      }
      return;
    }

    if (Array.isArray(content)) {
      content.forEach((item, innerIndex) => {
        if (typeof item === "string") {
          const trimmed = item.trim();
          if (trimmed) {
            blocks.push({
              id: `choice-${index}-text-${innerIndex}`,
              text: trimmed,
            });
          }
          return;
        }

        if (
          item &&
          typeof item === "object" &&
          "type" in item &&
          (item as { type?: string }).type === "text"
        ) {
          const text = (item as { text?: string }).text?.trim();
          if (text) {
            blocks.push({
              id: `choice-${index}-text-${innerIndex}`,
              text,
            });
          }
        }
      });
    }
  });

  if (blocks.length) return blocks;

  if ("output_text" in (result as Record<string, unknown>)) {
    const text = String((result as Record<string, unknown>).output_text ?? "").trim();
    if (text) {
      return [
        {
          id: "fallback-output-text",
          text,
        },
      ];
    }
  }

  return [];
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("图片读取失败，请重试。"));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => {
      reject(new Error("图片读取失败，请重试。"));
    };
    reader.readAsDataURL(file);
  });
}

export default function IdentifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    try {
      if (apiKey) {
        window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      } else {
        window.localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch {
      // 忽略本地存储异常，可能是隐身模式造成的。
    }
  }, [apiKey]);

  const fallbackModel = useMemo(() => {
    if (!result?.model) return null;
    return `模型：${result.model}`;
  }, [result]);

  const contentBlocks = useMemo(() => extractMessageContent(result), [result]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;

    setError(null);
    setResult(null);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("请先上传一张图片。");
      return;
    }
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const response = await fetch("/api/identify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageDataUrl: dataUrl,
          apiKey: apiKey.trim() ? apiKey.trim() : undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error ?? "识别失败，请稍后再试。");
        return;
      }
      setResult(payload?.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "识别过程中发生未知错误。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-16 md:px-12 lg:px-20">
        <header className="mb-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <span className="text-sm font-medium uppercase tracking-[0.4em] text-emerald-300">
              IDENTIFY
            </span>
            <h1 className="text-3xl font-semibold md:text-4xl">智能图片识别</h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
              上传图片后，调用火山引擎多模态能力分析图片内容，输出模型识别结果。
            </p>
            <p className="text-xs text-zinc-500">
              如不填写自定义 API Key，将自动使用系统配置的密钥。
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/30 hover:text-white"
          >
            返回首页
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.6}
              viewBox="0 0 24 24"
            >
              <path d="M15 18 9 12l6-6" />
            </svg>
          </Link>
        </header>

        <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
          <section className="flex flex-col gap-8 rounded-3xl border border-white/10 bg-white/5 p-8">
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">上传图片</h2>
              <p className="text-sm text-zinc-300">支持 JPG、PNG、WEBP 等常见格式，建议小于 8MB。</p>
              <label className="group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-black/20 py-10 transition hover:border-emerald-300/60 hover:bg-emerald-300/5">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <svg
                  aria-hidden="true"
                  className="h-10 w-10 text-emerald-200 transition group-hover:text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.6}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                <div className="text-center text-sm leading-6 text-zinc-300 transition group-hover:text-zinc-100">
                  点击或拖拽上传图片
                </div>
                <span className="text-xs text-zinc-500">仅在本地保留，不会上传到外部服务。</span>
              </label>
              {file ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-200">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-zinc-400">
                    大小：{(file.size / 1024 / 1024).toFixed(2)} MB | 类型：{file.type || "未知"}
                  </p>
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <label htmlFor="apiKey" className="text-sm font-medium text-white">
                  自定义 API Key
                </label>
                <input
                  id="apiKey"
                  type="text"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="请输入火山引擎的 ARK API Key"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/70"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-400/60"
              >
                {isLoading ? "识别中..." : "开始识别"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isLoading || (!file && !previewUrl)}
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-zinc-200 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-zinc-500"
              >
                清空
              </button>
            </div>
            {error ? (
              <p className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}
          </section>

          <section className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-lg font-semibold text-white">识别结果</h2>
            {previewUrl ? (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                <img
                  src={previewUrl}
                  alt={file?.name ?? "已上传图片预览"}
                  className="max-h-[320px] w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-12 text-sm text-zinc-400">
                上传图片后将在此处显示预览与识别结果。
              </div>
            )}
            {result ? (
              <div className="space-y-4">
                <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-zinc-200 shadow-lg shadow-emerald-400/10">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-200/80">
                    {result.id ? <span>ID：{result.id}</span> : null}
                    {fallbackModel ? <span>{fallbackModel}</span> : null}
                    {result.created ? <span>时间：{formatTimestamp(result.created)}</span> : null}
                  </div>
                  {contentBlocks.length ? (
                    <div className="space-y-3 text-base leading-7 text-zinc-100">
                      {contentBlocks.map((block, index) => (
                        <div
                          key={block.id}
                          className="rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/10 via-emerald-400/5 to-transparent p-4"
                        >
                          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/80">
                            内容 {index + 1 < 10 ? `0${index + 1}` : index + 1}
                          </span>
                          <p className="mt-3 whitespace-pre-wrap text-base leading-7 text-zinc-50">
                            {block.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-400">
                      模型未返回可展示的文本内容，请检查图片或稍后重试。
                    </p>
                  )}
                </div>
                <details className="rounded-2xl border border-white/5 bg-black/30 p-4 text-sm text-zinc-300">
                  <summary className="cursor-pointer select-none font-medium text-zinc-200">
                    查看原始响应 JSON
                  </summary>
                  <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-black/40 p-4 text-xs leading-6 text-emerald-200">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
