import type { Metadata } from "next";
import { Inter, Noto_Sans_SC, Poppins } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const logoFont = localFont({
  variable: "--font-logo",
  src: [
    {
      path: "../public/fonts/Logo.ttf",
      weight: "400",
      style: "normal",
    },
  ],
});

export const metadata: Metadata = {
  title: "Rille Chat",
  description: "一个现代化的开源 AI 聊天应用，支持多模型、树状对话、项目管理和文件上传等功能",
  icons: {
    icon: "/imgs/logo-black.png",
  },
  keywords: ["AI", "Chat", "OpenAI", "GPT", "Claude", "DeepSeek", "开源"],
  authors: [{ name: "Rille Chat" }],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${notoSansSC.variable} ${poppins.variable} ${logoFont.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
