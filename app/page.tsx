import Link from "next/link";

const features = [
  {
    title: "图片压缩",
    description: "智能压缩图片体积，同时保持高画质，适用于网页、分享与存储场景。",
    href: "/compress",
    accent: "from-emerald-400/40 via-emerald-400/10 to-transparent",
    icon: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
        <path d="M9 9h6M9 12h2.5m3 0H15M9 15h6" />
      </svg>
    ),
  },
  {
    title: "抠图去背景",
    description: "一键识别主体并去除背景，快速生成电商、头像与海报素材。",
    href: "/remove-background",
    accent: "from-sky-400/40 via-sky-400/10 to-transparent",
    icon: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4 18.5c0-2.485 2.343-4.5 5.234-4.5h5.532C17.657 14 20 16.015 20 18.5" />
        <path d="M9.5 7.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z" />
        <path d="m5.5 5.5 13 13" opacity="0.3" />
      </svg>
    ),
  },
  {
    title: "图片识别",
    description: "识别图片中的文字、场景与物体，快速提取关键信息，支持多语言。",
    href: "/identify",
    accent: "from-amber-400/40 via-amber-400/10 to-transparent",
    icon: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M5 5.5C5 4.12 6.343 3 8 3h8c1.657 0 3 1.12 3 2.5v13c0 1.38-1.343 2.5-3 2.5H8c-1.657 0-3-1.12-3-2.5z" />
        <path d="M9 8h6M9 12h3.5" />
        <circle cx="12" cy="16" r="1.5" />
      </svg>
    ),
  },
  {
    title: "AI生图",
    description: "输入提示词，生成高质量创意图片，支持风格化与尺寸多选。",
    href: "/generate",
    accent: "from-fuchsia-400/40 via-fuchsia-400/10 to-transparent",
    icon: (
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="m12 3 2.472 4.853 5.362.78-3.878 3.778.916 5.349L12 15.77l-4.872 2.99.916-5.349L4.166 8.633l5.362-.78z" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black font-sans text-white">
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-16 md:px-12 lg:px-20">
        <header className="mb-16 flex flex-col gap-6 text-center md:max-w-3xl md:text-left">
          <span className="text-sm font-medium uppercase tracking-[0.4em] text-emerald-300">
            AI IMAGE STUDIO
          </span>
          <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
            一站式图片智能处理平台
          </h1>
          <p className="text-lg leading-8 text-zinc-200 md:text-xl">
            汇集压缩、抠图、识别与AI生图能力，打造高效的视觉创意工作流，让图片处理既专业又轻松。
          </p>
          <div className="flex flex-col items-center gap-3 md:flex-row md:items-start">
            <Link
              href="/generate"
              className="inline-flex items-center justify-center rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              开始创作
            </Link>
            <span className="text-sm text-zinc-400">
              即将开放更多智能工具，敬请期待。
            </span>
          </div>
        </header>

        <section className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 transition duration-300 hover:border-white/20 hover:bg-white/10"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 blur-lg transition duration-500 group-hover:opacity-100`}
              />
              <div className="relative flex flex-col gap-6">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-200">
                  {feature.icon}
                </span>
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-white">
                    {feature.title}
                  </h2>
                  <p className="text-sm leading-7 text-zinc-200">
                    {feature.description}
                  </p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300 transition group-hover:text-white">
                  进入功能
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  >
                    <path d="M7 17 17 7" />
                    <path d="M8 7h9v9" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
