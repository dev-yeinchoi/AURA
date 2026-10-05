import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 조건·단계 정보를 응답 헤더로도 노출하지 않는다.
  poweredByHeader: false,
};

export default nextConfig;
