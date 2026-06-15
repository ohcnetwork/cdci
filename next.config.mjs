/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static, frontend-only build → deployable to any static host (Cloudflare Pages).
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
  // Concept permalinks are resolved client-side from bucketed JSON, so we don't
  // pre-render 186k routes. A single dynamic shell handles /concept/[sctid].
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
