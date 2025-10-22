This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 最近更新

- 首页焕新为“AI Image Studio”，提供图片压缩、抠图去背景、图片识别与 AI 生图入口。
- 新增 `/compress` 页面，支持本地上传预览、调节压缩比例、Canvas 压缩与下载压缩结果。PNG / WebP 自动转成 WebP，透明背景仍可保留。
- 新增 `/remove-background` 页面，可输入 remove.bg API Key、批量上传图片并自动排队调用官方接口生成透明背景图，支持积分剩余提示、错误码反馈与结果下载。
- 新增 `/identify` 页面，支持上传图片、填写火山引擎 ARK API Key，后端统一调用多模态识别接口并以卡片方式展示 `message.content` 文本，同时保留原始 JSON 详情。
- 新增 `/generate` 页面，可输入提示词与反向提示词，调用火山引擎生图接口（模型 `ep-20251023012547-2jjbx`）生成高清图片，支持尺寸/水印配置、可选 API Key、预览、放大查看与下载成品图，并附带原始响应查看；若接口暂不支持 URL 返回，会自动降级到 Base64 并在前端提示，保证生成流程可用。

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
