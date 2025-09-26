/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 支持SCSS
  sassOptions: {
    includePaths: ['./styles'],
  },
  // 支持动态导入和ESM外部包
  experimental: {
    esmExternals: true,
  },
  // 处理Drawnix相关的外部依赖
  webpack: (config, { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }) => {
    // 处理canvas相关依赖 (Drawnix可能需要)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig