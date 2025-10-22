"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const STORAGE_KEY = "remove-bg-api-key";

type QueueStatus = "pending" | "processing" | "success" | "error";

type QueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  resultUrl?: string;
  resultBlob?: Blob;
  status: QueueStatus;
  error?: string;
  creditsRemaining?: string | null;
  creditsCharged?: string | null;
  creditType?: string | null;
};

type CreditInfo = {
  remaining?: string | null;
  charged?: string | null;
  type?: string | null;
};

const STATUS_LABEL: Record<QueueStatus, string> = {
  pending: "待处理",
  processing: "处理中",
  success: "完成",
  error: "失败",
};

function formatFileSize(size: number | null | undefined) {
  if (!size) return "-";
  if (size < 1024) return `${size.toFixed(0)} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function createQueueItem(file: File): QueueItem {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
    status: "pending",
  };
}

export default function RemoveBackgroundPage() {
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [lastCreditInfo, setLastCreditInfo] = useState<CreditInfo | null>(null);

  const queueRef = useRef<QueueItem[]>([]);

  useEffect(() => {
    try {
      if (apiKey) {
        window.localStorage.setItem(STORAGE_KEY, apiKey);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, [apiKey]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => {
        URL.revokeObjectURL(item.previewUrl);
        if (item.resultUrl) {
          URL.revokeObjectURL(item.resultUrl);
        }
      });
    };
  }, []);

  const activeItem = useMemo(() => {
    if (!queue.length) return null;
    return queue.find((item) => item.id === activeId) ?? queue[0];
  }, [queue, activeId]);

  const pendingCount = useMemo(
    () => queue.filter((item) => item.status === "pending").length,
    [queue],
  );
  const processingCount = useMemo(
    () => queue.filter((item) => item.status === "processing").length,
    [queue],
  );
  const successCount = useMemo(
    () => queue.filter((item) => item.status === "success").length,
    [queue],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setGlobalError(null);

    const newItems = files.map((file) => createQueueItem(file));
    setQueue((prev) => [...prev, ...newItems]);
    if (!activeId && newItems.length > 0) {
      setActiveId(newItems[0].id);
    }

    event.target.value = "";
  };

  const handleRemoveItem = (id: string) => {
    const target = queue.find((item) => item.id === id);
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
      if (target.resultUrl) {
        URL.revokeObjectURL(target.resultUrl);
      }
    }
    setQueue((prev) => prev.filter((item) => item.id !== id));
    setActiveId((current) => {
      if (current === id) {
        const remaining = queue.filter((item) => item.id !== id);
        return remaining[0]?.id ?? null;
      }
      return current;
    });
  };

  const handleClearQueue = () => {
    queue.forEach((item) => {
      URL.revokeObjectURL(item.previewUrl);
      if (item.resultUrl) {
        URL.revokeObjectURL(item.resultUrl);
      }
    });
    setQueue([]);
    setActiveId(null);
  };

  const updateQueueItem = (id: string, updater: Partial<QueueItem>) => {
    setQueue((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (updater.resultUrl && item.resultUrl && item.resultUrl !== updater.resultUrl) {
          URL.revokeObjectURL(item.resultUrl);
        }
        return { ...item, ...updater };
      }),
    );
  };

  const handleProcessQueue = async () => {
    if (!apiKey.trim()) {
      setGlobalError("请先填写 remove.bg 的 API Key。");
      return;
    }
    if (!queue.length) {
      setGlobalError("请先上传至少一张图片。");
      return;
    }

    const itemsToProcess = queueRef.current.filter(
      (item) => item.status === "pending" || item.status === "error",
    );
    if (!itemsToProcess.length) {
      setGlobalError("队列中暂无待处理的图片。");
      return;
    }

    setGlobalError(null);
    setIsProcessing(true);

    for (const item of itemsToProcess) {
      updateQueueItem(item.id, { status: "processing", error: undefined });
      try {
        const formData = new FormData();
        formData.append("image", item.file);
        formData.append("apiKey", apiKey.trim());

        const response = await fetch("/api/remove-background", {
          method: "POST",
          body: formData,
        });

        const creditsRemaining =
          response.headers.get("x-credits-remaining") ??
          response.headers.get("x-credit-balance") ??
          null;
        const creditsCharged = response.headers.get("x-credits-charged") ?? null;
        const creditType = response.headers.get("x-credit-type") ?? null;

        if (!response.ok) {
          let message = "去除背景失败，请稍后再试。";
          let errorCode: string | undefined;
          const contentType = response.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            const body = await response.json();
            message = body?.error || message;
            errorCode = body?.code;
          } else {
            const text = await response.text();
            message = text || message;
          }
          const combinedMessage =
            errorCode && errorCode !== ""
              ? `${message}${message.endsWith("。") ? "" : "。"}错误码：${errorCode}`
              : message;
          updateQueueItem(item.id, {
            status: "error",
            error: combinedMessage,
            creditsRemaining,
            creditsCharged,
            creditType,
          });
          setLastCreditInfo({ remaining: creditsRemaining, charged: creditsCharged, type: creditType });
          continue;
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        updateQueueItem(item.id, {
          status: "success",
          resultBlob: blob,
          resultUrl: url,
          error: undefined,
          creditsRemaining,
          creditsCharged,
          creditType,
        });
        setLastCreditInfo({ remaining: creditsRemaining, charged: creditsCharged, type: creditType });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "去除背景时出现未知错误，请重试。";
        updateQueueItem(item.id, {
          status: "error",
          error: message,
        });
      }
    }

    setIsProcessing(false);
  };

  const totalCount = queue.length;
  const hasQueue = totalCount > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-16 md:px-12 lg:px-20">
        <header className="mb-12 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <span className="text-sm font-medium uppercase tracking-[0.4em] text-sky-300">
              REMOVE BACKGROUND
            </span>
            <h1 className="text-3xl font-semibold md:text-4xl">智能抠图去背景</h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
              支持批量上传图片，自动排队调用 remove.bg API，展示剩余积分、错误详情并生成透明背景 PNG。
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
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">配置 API Key</h2>
              <p className="text-sm text-zinc-300">
                输入 remove.bg 控制台生成的 API Key，信息仅保存在浏览器本地。
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="输入 remove.bg API Key"
                className="w-full rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-sky-300"
              />
              <p className="text-xs text-zinc-500">
                温馨提示：remove.bg 会按调用次数扣除积分，请确保账户剩余积分充足。
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">上传图片</h2>
              <label className="group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-black/20 py-10 transition hover:border-sky-300/60 hover:bg-sky-300/5">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <svg
                  aria-hidden="true"
                  className="h-8 w-8 text-sky-300"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path d="m12 5 6 6-6 6" />
                  <path d="m6 5 6 6-6 6" />
                </svg>
                <div className="text-center text-sm text-zinc-200">
                  <p className="font-medium">
                    {hasQueue ? `已加入 ${totalCount} 张图片` : "点击或拖拽图片到此处"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    支持多张图片批量上传，建议单张不超过 8MB。
                  </p>
                </div>
              </label>
            </div>

            {globalError && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {globalError}
              </div>
            )}

            {lastCreditInfo && (
              <div className="rounded-2xl border border-sky-400/40 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
                <div className="flex justify-between">
                  <span>最近扣除</span>
                  <span>
                    {lastCreditInfo.charged ?? "-"}
                    {lastCreditInfo.type ? ` ${lastCreditInfo.type}` : ""}
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>剩余积分</span>
                  <span>{lastCreditInfo.remaining ?? "-"}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleProcessQueue}
                disabled={isProcessing || !queue.length}
                className="inline-flex items-center justify-center rounded-full bg-sky-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-sky-400/40"
              >
                {isProcessing ? `批量处理中 (${processingCount}/${totalCount})` : "开始批量去背景"}
              </button>
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>待处理：{pendingCount}</span>
                <span>已完成：{successCount}</span>
              </div>
              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearQueue}
                  className="text-left text-xs text-zinc-500 underline underline-offset-2 transition hover:text-zinc-300"
                >
                  清空队列
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">处理队列</h2>
                <span className="rounded-full bg-slate-900/60 px-3 py-1 text-xs text-zinc-400">
                  共 {totalCount} 张
                </span>
              </div>

              {queue.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-6 text-center text-sm text-zinc-400">
                  暂无待处理图片，上传后将显示在这里。
                </p>
              ) : (
                <div className="flex max-h-[360px] flex-col gap-3 overflow-y-auto pr-2">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className={`relative flex gap-3 rounded-2xl border px-4 py-3 transition ${
                        activeItem?.id === item.id
                          ? "border-sky-300/70 bg-sky-300/10"
                          : "border-white/10 bg-black/20 hover:border-white/20"
                      }`}
                    >
                      <button
                        type="button"
                        className="absolute inset-0"
                        onClick={() => setActiveId(item.id)}
                        aria-label="选择该图片"
                      />
                      <div className="pointer-events-none flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.previewUrl}
                          alt={item.file.name}
                          className="h-16 w-16 rounded-xl object-cover"
                        />
                      </div>
                      <div className="pointer-events-none flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-medium text-white">{item.file.name}</p>
                          <span
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                              item.status === "success"
                                ? "bg-emerald-400/20 text-emerald-200"
                                : item.status === "processing"
                                  ? "bg-sky-400/20 text-sky-200"
                                  : item.status === "error"
                                    ? "bg-red-500/20 text-red-200"
                                    : "bg-zinc-500/10 text-zinc-300"
                            }`}
                          >
                            {STATUS_LABEL[item.status]}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">{formatFileSize(item.file.size)}</p>
                        {item.creditsCharged && (
                          <p className="text-xs text-zinc-400">
                            扣除：{item.creditsCharged}
                            {item.creditType ? ` ${item.creditType}` : ""} | 剩余：
                            {item.creditsRemaining ?? "-"}
                          </p>
                        )}
                        {item.status === "error" && item.error && (
                          <p className="text-xs text-red-300">{item.error}</p>
                        )}
                      </div>
                      <div className="pointer-events-auto flex flex-col items-end gap-2">
                        {item.status === "success" && item.resultUrl && (
                          <a
                            href={item.resultUrl}
                            download={`${item.file.name.replace(/\.[^/.]+$/, "")}-no-bg.png`}
                            className="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white transition hover:border-sky-300/60 hover:text-sky-200"
                          >
                            下载
                            <svg
                              aria-hidden="true"
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 5v12" />
                              <path d="m7 14 5 5 5-5" />
                            </svg>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveItem(item.id);
                          }}
                          className="rounded-full bg-white/5 p-1.5 text-zinc-400 transition hover:bg-red-500/20 hover:text-red-200"
                          aria-label="移出队列"
                        >
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
                            <path d="M6 6 18 18" />
                            <path d="M6 18 18 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-base font-semibold text-white">原始图片预览</h2>
              <div className="mt-4 flex h-[340px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                {activeItem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeItem.previewUrl}
                    alt={activeItem.file.name}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <p className="text-sm text-zinc-400">上传图片后，可在此查看原图。</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-sky-400/40 bg-sky-400/10 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">去背景效果</h2>
                {activeItem?.status === "success" && activeItem.resultUrl && (
                  <a
                    href={activeItem.resultUrl}
                    download={`${activeItem.file.name.replace(/\.[^/.]+$/, "")}-no-bg.png`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-white transition hover:border-sky-300/60 hover:text-sky-200"
                  >
                    下载当前图片
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 5v12" />
                      <path d="m7 14 5 5 5-5" />
                    </svg>
                  </a>
                )}
              </div>
              <div className="mt-4 flex h-[340px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(148,163,184,0.12),_transparent_60%)]">
                {activeItem ? (
                  activeItem.status === "success" && activeItem.resultUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeItem.resultUrl}
                      alt={`${activeItem.file.name} 去背景结果`}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : activeItem.status === "processing" ? (
                    <p className="text-sm text-sky-200">正在处理中，请稍候...</p>
                  ) : activeItem.status === "error" ? (
                    <p className="text-sm text-red-200">{activeItem.error ?? "处理失败"}</p>
                  ) : (
                    <p className="text-sm text-zinc-300">点击“开始批量去背景”后查看处理结果。</p>
                  )
                ) : (
                  <p className="text-sm text-zinc-400">选择队列中的图片以查看处理结果。</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
