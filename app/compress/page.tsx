"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type CompressionResult = {
  blob: Blob;
  url: string;
  mimeType: string;
};

const MIN_QUALITY = 20;
const MAX_QUALITY = 100;

function formatFileSize(size: number | null) {
  if (!size) return "-";
  if (size < 1024) return `${size.toFixed(0)} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function deriveDownloadName(original: File | null, mimeType: string) {
  if (!original) return "compressed-image";
  const base = original.name.replace(/\.[^/.]+$/, "");
  const extension = mimeType.split("/")[1] ?? "jpg";
  return `${base}-compressed.${extension}`;
}

async function compressImage(file: File, quality: number): Promise<CompressionResult> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("无法读取图片，请重试。"));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败，请使用其他文件。"));
    img.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("浏览器暂不支持 Canvas 操作。");
  }

  const supportsAlpha = ["image/png", "image/webp"].includes(file.type);
  const targetType = supportsAlpha ? "image/webp" : "image/jpeg";

  if (targetType === "image/jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.drawImage(image, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error("压缩失败，请稍后重试。"));
        }
      },
      targetType,
      quality,
    );
  });

  return {
    blob,
    url: URL.createObjectURL(blob),
    mimeType: targetType,
  };
}

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressionQuality, setCompressionQuality] = useState(70);
  const [compressedResult, setCompressedResult] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (compressedResult?.url) {
        URL.revokeObjectURL(compressedResult.url);
      }
    };
  }, [compressedResult]);

  const compressionRatio = useMemo(() => {
    if (!file || !compressedResult) return null;
    const ratio = (1 - compressedResult.blob.size / file.size) * 100;
    return Number.isFinite(ratio) ? Math.max(ratio, 0) : null;
  }, [file, compressedResult]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;

    setError(null);
    setFile(nextFile);
    setCompressedResult((prev) => {
      if (prev?.url) {
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(nextFile));
  };

  const handleCompress = async () => {
    if (!file) return;
    setIsCompressing(true);
    setError(null);
    try {
      const result = await compressImage(file, compressionQuality / 100);
      setCompressedResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "压缩过程中出现未知错误。");
    } finally {
      setIsCompressing(false);
    }
  };

  const downloadName = useMemo(
    () => deriveDownloadName(file, compressedResult?.mimeType ?? "image/jpeg"),
    [file, compressedResult],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-16 md:px-12 lg:px-20">
        <header className="mb-12 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-4">
            <span className="text-sm font-medium uppercase tracking-[0.4em] text-emerald-300">
              COMPRESS
            </span>
            <h1 className="text-3xl font-semibold md:text-4xl">智能图片压缩</h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
              自由调节压缩比例，在本地完成处理，保护图片隐私安全。支持 JPG 与 PNG
              等常见格式。
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
              <p className="text-sm text-zinc-300">最多可上传 10MB 的图片文件。</p>
              <label className="group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-black/20 py-10 transition hover:border-emerald-300/60 hover:bg-emerald-300/5">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <svg
                  aria-hidden="true"
                  className="h-8 w-8 text-emerald-300"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 16V4M5 9l7-7 7 7" />
                  <path d="M20 16v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-3" />
                </svg>
                <div className="text-center text-sm text-zinc-200">
                  <p className="font-medium">
                    {file ? file.name : "点击或拖拽图片到此处"}
                  </p>
                  {file && <p className="mt-1 text-xs text-zinc-400">{formatFileSize(file.size)}</p>}
                </div>
              </label>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between text-sm text-zinc-300">
                <span>压缩比例</span>
                <span>{compressionQuality}%</span>
              </div>
              <input
                type="range"
                min={MIN_QUALITY}
                max={MAX_QUALITY}
                step={5}
                value={compressionQuality}
                onChange={(event) => setCompressionQuality(Number(event.target.value))}
                className="w-full accent-emerald-300"
                disabled={!file}
              />
              <p className="text-xs text-zinc-400">
                提示：较低的压缩比例能显著减小文件体积，但可能会影响画质。
              </p>
              <p className="text-xs text-zinc-500">
                PNG 与 WebP 将自动转换为 WebP 以保留透明背景并提升压缩效率。
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleCompress}
                disabled={!file || isCompressing}
                className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-400/40"
              >
                {isCompressing ? "压缩中..." : "开始压缩"}
              </button>
              {compressedResult && (
                <a
                  href={compressedResult.url}
                  download={downloadName}
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/60 hover:text-emerald-200"
                >
                  保存压缩图片
                </a>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
              <div className="flex justify-between">
                <span>原始大小</span>
                <span>{formatFileSize(file?.size ?? null)}</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span>压缩后大小</span>
                <span>{formatFileSize(compressedResult?.blob.size ?? null)}</span>
              </div>
              <div className="mt-2 flex justify-between text-emerald-300">
                <span>节省比例</span>
                <span>
                  {compressionRatio !== null ? `${compressionRatio.toFixed(1)}%` : "-"}
                </span>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-base font-semibold text-white">原始图片</h2>
              <div className="mt-4 flex h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="原始图片预览"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <p className="text-sm text-zinc-400">上传图片后即可查看预览。</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-300/40 bg-emerald-300/10 p-6">
              <h2 className="text-base font-semibold text-white">压缩结果预览</h2>
              <div className="mt-4 flex h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                {compressedResult ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={compressedResult.url}
                    alt="压缩后的图片预览"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <p className="text-sm text-zinc-400">完成压缩后可查看效果对比。</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
