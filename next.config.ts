import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Docker를 위한 standalone 출력 모드 활성화
  output: 'standalone',
};

export default nextConfig;
