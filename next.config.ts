import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 조건·단계 정보를 응답 헤더로도 노출하지 않는다.
  poweredByHeader: false,
  // 개발 인디케이터가 IRB 캡처본에 찍히지 않게 한다.
  devIndicators: false,
};

export default nextConfig;
