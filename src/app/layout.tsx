import type {Metadata} from "next";
import "@fontsource/noto-sans-kr/400.css";
import "@fontsource/noto-sans-kr/500.css";
import "@fontsource/noto-sans-kr/700.css";
import "./globals.css";
export const metadata:Metadata={title:"AURA 연구",description:"AURA 연구 참여",robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}) {
  return <html lang="ko"><body><header className="app-header">AURA</header>{children}</body></html>;
}
