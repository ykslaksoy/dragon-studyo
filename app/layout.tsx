import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import { ForceScrollTop } from "./components/ForceScrollTop";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Dragon Stüdyo",
  description: "Dragon Stüdyo — site yayında.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#070708",
};

const SCROLL_TOP_BOOT = `
(function(){
  try{if("scrollRestoration" in history)history.scrollRestoration="manual";}catch(e){}
  try{
    if(location.hash){
      history.replaceState(null,"",location.pathname+location.search);
    }
  }catch(e){}
  function t(){window.scrollTo(0,0);document.documentElement.scrollTop=0;if(document.body)document.body.scrollTop=0;}
  t();
  document.addEventListener("DOMContentLoaded",t,{once:true});
  window.addEventListener("load",t,{once:true});
  window.addEventListener("pageshow",function(){t();});
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCROLL_TOP_BOOT }} />
      </head>
      <body className="m-0 flex min-h-dvh w-full max-w-[100vw] flex-col overflow-x-clip bg-[#070708] p-0 font-sans text-white">
        <ForceScrollTop />
        {children}
      </body>
    </html>
  );
}
