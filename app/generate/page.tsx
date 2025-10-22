"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_KEY_STORAGE_KEY = "generate-api-key";

type GenerationImage = {
  id: string;
  url: string;
  mimeType: string;
  size?: string | null;
  prompt?: string | null;
  revisedPrompt?: string | null;
  seed?: number | null;
  created?: number | null;
};

type GenerationResponse = {
  images: GenerationImage[];
  raw: unknown;
  responseFormat?: "url" | "b64_json";
};

const SIZE_OPTIONS = [
  { value: "1K", label: "1K (1024px)" },
  { value: "2K", label: "2K (2048px)", default: true },
  { value: "512*1024", label: "纵向 512×1024" },
  { value: "1024*512", label: "横向 1024×512" },
];

const SEQ_OPTIONS = [
  { value: "disabled", label: "关闭" },
  { value: "enabled", label: "启用" },
];

function formatTimestamp(timestamp?: number | null) {
  if (!timestamp) return "-";
  try {
    return new Date(timestamp * 1000).toLocaleString();
  } catch {
    return String(timestamp);
  }
}

function getDefaultSize() {
  const fallback = SIZE_OPTIONS.find((item) => item.default)?.value;
  return fallback ?? "2K";
}

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [size, setSize] = useState(getDefaultSize);
  const [sequentialMode, setSequentialMode] = useState("disabled");
  const [watermark, setWatermark] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<GenerationResponse | null>(null);
  const [previewImage, setPreviewImage] = useState<GenerationImage | null>(null);

  useEffect(() => {
    try {
      if (apiKey) {
        window.localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      } else {
        window.localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    } catch {
      // ignore storage failures
    }
  }, [apiKey]);

  const hasImages = response?.images?.length ? response.images.length > 0 : false;

  const handlePromptChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  };

  const handleNegativePromptChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setNegativePrompt(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim()) {
      setError("请输入提示词后再尝试生成。");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreviewImage(null);
    setResponse(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negativePrompt: negativePrompt.trim() || undefined,
          apiKey: apiKey.trim() ? apiKey.trim() : undefined,
          size,
          sequential: sequentialMode,
          watermark,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.error ?? "生成失败，请稍后再试。");
        return;
      }

      setResponse(payload?.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成过程中发生未知错误。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPrompt("");
    setNegativePrompt("");
    setPreviewImage(null);
    setResponse(null);
    setError(null);
  };

  const responseSummary = useMemo(() => {
    if (!response?.images?.length) return null;
    const generatedAt = response.images[0]?.created;
    return generatedAt ? `生成时间：${formatTimestamp(generatedAt)}` : null;
  }, [response]);

  const isBase64Response = response?.responseFormat === "b64_json";

  useEffect(() => {
    if (typeof window === "undefined" || !previewImage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewImage]);

  useEffect(() => {
    if (typeof document === "undefined" || !previewImage) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [previewImage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-16 md:px-12 lg:px-20">
        <header className="mb-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <span className="text-sm font-medium uppercase tracking-[0.4em] text-emerald-300">
              GENERATE
            </span>
            <h1 className="text-3xl font-semibold md:text-4xl">AI 生图生成器</h1>
            <p className="max-w-3xl text-base leading-7 text-zinc-300 md:text-lg">
              输入详细提示词，调用火山引擎多模态生成模型，一键生成高清风格化图片，可自定义 API Key
              与生成参数，适用于创意设计、视觉灵感与内容制作场景。
            </p>
            <p className="text-xs text-zinc-500">
              如不填写自定义 API Key，将默认使用系统配置的密钥。
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

        <div className="grid gap-8 lg:grid-cols-[380px_minmax(0,1fr)]">
          <section className="flex flex-col gap-8 rounded-3xl border border-white/10 bg-white/5 p-8">
            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">提示词</h2>
                  <span className="text-xs text-zinc-500">建议描述主体、环境、风格与光效。</span>
                </div>
                <textarea
                  value={prompt}
                  onChange={handlePromptChange}
                  placeholder="例如：星际穿越场景，黑洞中冲出复古列车，电影质感、强光影、末日氛围..."
                  rows={6}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/10"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">反向提示词</h2>
                  <span className="text-xs text-zinc-500">可选，描述需要避免的元素。</span>
                </div>
                <textarea
                  value={negativePrompt}
                  onChange={handleNegativePromptChange}
                  placeholder="例如：模糊，噪点，低清晰度"
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/10"
                />
              </div>

              <div className="grid gap-3">
                <label htmlFor="size" className="text-sm font-medium text-white">
                  输出尺寸
                </label>
                <select
                  id="size"
                  value={size}
                  onChange={(event) => setSize(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none transition focus:border-emerald-400/70"
                >
                  {SIZE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-3">
                <label htmlFor="sequential" className="text-sm font-medium text-white">
                  多轮连续生成
                </label>
                <select
                  id="sequential"
                  value={sequentialMode}
                  onChange={(event) => setSequentialMode(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white outline-none transition focus:border-emerald-400/70"
                >
                  {SEQ_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 text-sm text-zinc-200">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border border-white/20 bg-black text-emerald-400 focus:ring-emerald-400"
                  checked={watermark}
                  onChange={(event) => setWatermark(event.target.checked)}
                />
                生成图像添加水印
              </label>

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

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-400/60"
                >
                  {isLoading ? "生成中..." : "开始生成"}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isLoading || (!prompt && !negativePrompt && !response)}
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
            </form>
          </section>

          <section className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-8">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-white">生成结果</h2>
                {isBase64Response ? (
                  <span className="text-[11px] text-emerald-300/80">
                    当前返回为 Base64 数据，已自动转换为可预览图片。
                  </span>
                ) : null}
              </div>
              {responseSummary ? (
                <span className="text-xs text-emerald-200/80">{responseSummary}</span>
              ) : null}
            </div>

            {hasImages ? (
              <div className="grid gap-6 md:grid-cols-2">
                {response?.images?.map((image, index) => (
                  <article
                    key={image.id ?? `image-${index}`}
                    className="group flex flex-col gap-4 overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-4 transition hover:border-emerald-300/30 hover:bg-black/30"
                  >
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/50">
                      <img
                        src={image.url}
                        alt={image.prompt ?? `AI 生成图像 ${index + 1}`}
                        className="max-h-[320px] w-full cursor-zoom-in object-cover transition duration-500 group-hover:scale-[1.02]"
                        onClick={() => setPreviewImage(image)}
                      />
                    </div>
                    <div className="space-y-2 text-xs text-zinc-300">
                      <div className="flex flex-wrap items-center gap-2 text-emerald-200/80">
                        <span>序号：#{index + 1}</span>
                        {image.size ? <span>尺寸：{image.size}</span> : null}
                        {image.seed != null ? <span>Seed：{image.seed}</span> : null}
                      </div>
                      {image.prompt ? (
                        <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-100">
                          {image.prompt}
                        </p>
                      ) : null}
                      {image.revisedPrompt && image.revisedPrompt !== image.prompt ? (
                        <p className="whitespace-pre-wrap text-xs leading-6 text-zinc-400">
                          <span className="font-medium text-zinc-200">模型修订：</span>
                          {image.revisedPrompt}
                        </p>
                      ) : null}
                      {image.created ? (
                        <p className="text-xs text-zinc-500">
                          {formatTimestamp(image.created)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(image)}
                        className="inline-flex items-center justify-center rounded-full border border-emerald-300/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300 hover:text-white"
                      >
                        放大查看
                      </button>
                      <a
                        href={image.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex flex-1 items-center justify-center rounded-full border border-emerald-300/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300 hover:text-white"
                      >
                        新标签打开
                      </a>
                      <a
                        href={image.url}
                        download={`ai-image-${(image.id ?? `image-${index + 1}`).toString()}.png`}
                        className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                      >
                        下载
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/20 p-12 text-sm text-zinc-400">
                输入提示词并生成后，结果图像将在此处展示。
              </div>
            )}

            {response?.raw ? (
              <details className="rounded-2xl border border-white/5 bg-black/30 p-4 text-sm text-zinc-300">
                <summary className="cursor-pointer select-none font-medium text-zinc-200">
                  查看原始响应 JSON
                </summary>
                <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-black/40 p-4 text-xs leading-6 text-emerald-200">
                  {JSON.stringify(response.raw, null, 2)}
                </pre>
              </details>
            ) : null}
          </section>
        </div>
      </main>
      {previewImage ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-6 py-12 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-black/90 p-6 shadow-[0_20px_80px_rgba(16,185,129,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-zinc-200 transition hover:border-white/40 hover:text-white"
              aria-label="关闭放大预览"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.6}
              >
                <path d="M6 6 18 18" />
                <path d="M6 18 18 6" />
              </svg>
            </button>
            <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60">
                <img
                  src={previewImage.url}
                  alt={previewImage.prompt ?? "AI 生成图像大图"}
                  className="h-full max-h-[70vh] w-full object-contain"
                />
              </div>
              <div className="flex flex-col gap-4 text-sm text-zinc-200">
                <div className="space-y-2 rounded-2xl border border-white/10 bg-black/40 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
                    Image Meta
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-zinc-400">
                    {previewImage.size ? <span>尺寸：{previewImage.size}</span> : null}
                    {previewImage.seed != null ? <span>Seed：{previewImage.seed}</span> : null}
                    {previewImage.created ? (
                      <span>生成时间：{formatTimestamp(previewImage.created)}</span>
                    ) : null}
                  </div>
                </div>
                {previewImage.prompt ? (
                  <div className="space-y-2 rounded-2xl border border-white/10 bg-black/40 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/80">
                      Prompt
                    </p>
                    <p className="whitespace-pre-wrap text-base leading-7 text-zinc-100">
                      {previewImage.prompt}
                    </p>
                  </div>
                ) : null}
                {previewImage.revisedPrompt && previewImage.revisedPrompt !== previewImage.prompt ? (
                  <div className="space-y-2 rounded-2xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-300/60">
                      Model Revised Prompt
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {previewImage.revisedPrompt}
                    </p>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <a
                    href={previewImage.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-emerald-300/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-300 hover:text-white"
                  >
                    新标签打开
                  </a>
                  <a
                    href={previewImage.url}
                    download={`ai-image-${previewImage.id}.png`}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                  >
                    下载
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
