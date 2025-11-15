import React, { useState, useEffect } from "react";
import { isValidUrl } from "../utils/security";

/**
 * 首頁組件
 * 包含社群連結、YT頻道嵌入等
 */
interface HomePageProps {
  isDark?: boolean; // 保留參數以兼容，但不再使用
}

export const HomePage: React.FC<HomePageProps> = () => {
  const [titleVisible, setTitleVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);

  // 頁面載入動畫 - 漸進式顯示
  useEffect(() => {
    setTimeout(() => setTitleVisible(true), 100);
    setTimeout(() => setContentVisible(true), 300);
    setTimeout(() => setVideoVisible(true), 500);
  }, []);
  // 安全驗證所有外部連結
  const links = {
    youtube: "https://youtu.be/Wqulhvlj5gk?si=XWPnNGuOqpQiEhZb",
    lineOfficial: "https://lin.ee/ZTgJbYG",
    lineCommunity: "https://line.me/ti/g2/xaKhtD6TG78lZ8tOLP2T4Lz0zD-edf8GJF8x5w?utm_source=invitation&utm_medium=link_copy&utm_campaign=default",
    instagram: "https://www.instagram.com/aijobschool/reels/",
    discord: "https://discord.gg/Dzm2P7rHyg",
    officialWebsite: "https://www.aijob.com.tw/",
  };

  // 驗證所有連結
  const validatedLinks = Object.entries(links).reduce((acc, [key, url]) => {
    if (isValidUrl(url)) {
      acc[key] = url;
    }
    return acc;
  }, {} as Record<string, string>);

  // YT影片ID提取（從URL中提取）
  const getYoutubeVideoId = (url: string): string | null => {
    try {
      // 處理 https://youtu.be/Wqulhvlj5gk?si=... 格式
      const match1 = url.match(/youtu\.be\/([^?&]+)/);
      if (match1) return match1[1];
      // 處理 https://www.youtube.com/watch?v=... 格式
      const match2 = url.match(/[?&]v=([^&]+)/);
      if (match2) return match2[1];
      return null;
    } catch {
      return null;
    }
  };

  const youtubeVideoId = validatedLinks.youtube ? getYoutubeVideoId(validatedLinks.youtube) : null;

  // YT嵌入URL（使用影片ID）
  const youtubeEmbedUrl = youtubeVideoId 
    ? `https://www.youtube.com/embed/${youtubeVideoId}`
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* 標題區 - 淡入+滑入動畫 */}
      <div className={`text-center mb-12 transition-all duration-1000 ${
        titleVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 -translate-y-8'
      }`}>
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent animate-gradient">
          AIJob AI工具庫
        </h1>
        <div className={`max-w-3xl mx-auto space-y-3 transition-all duration-700 delay-200 ${
          contentVisible 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4'
        }`}>
          <p className="text-xl text-slate-700 font-medium">
            歡迎使用 AIJob AI工具庫
          </p>
          <p className="text-base text-slate-600 leading-relaxed">
            這是一個免費提供給大家使用的 AI 工具集合平台。我們精心收錄了市面上各種實用的 AI 工具與智能體，涵蓋 AI 員工、AI 對話、AI 寫程式工具、部署平台、AI 自動化工作流等多個分類，幫助你快速找到適合的工具，提升工作效率。
          </p>
          <p className="text-sm text-slate-500 mt-4">
            無論你是開發者、設計師、行銷人員，或是想要探索 AI 應用的任何人，都能在這裡找到適合的工具。
          </p>
        </div>
      </div>

      {/* YT影片嵌入 - 淡入+縮放動畫 */}
      {youtubeEmbedUrl && (
        <div className={`mb-12 transition-all duration-1000 delay-300 ${
          videoVisible 
            ? 'opacity-100 scale-100' 
            : 'opacity-0 scale-95'
        }`}>
          <h2 className="text-2xl font-semibold mb-6 text-slate-900 text-center">
            YouTube 頻道
          </h2>
          <div className="relative w-full group" style={{ paddingBottom: '56.25%' }}>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl -z-10"></div>
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-[1.02]"
              src={youtubeEmbedUrl}
              title="AIJob YouTube Channel"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
              style={{ border: 0 }}
              sandbox="allow-scripts allow-same-origin allow-presentation"
            />
          </div>
        </div>
      )}

      {/* 動態背景裝飾 */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

