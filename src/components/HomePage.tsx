import React from "react";
import { isValidUrl } from "../utils/security";

/**
 * 首頁組件
 * 包含社群連結、YT頻道嵌入等
 */
interface HomePageProps {
  isDark: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({ isDark }) => {
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
      {/* 標題區 */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
          AIJob AI工具庫
        </h1>
        <div className="max-w-3xl mx-auto space-y-3">
          <p className="text-xl text-slate-700 dark:text-slate-300 font-medium">
            歡迎使用 AIJob AI工具庫
          </p>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            這是一個免費提供給大家使用的 AI 工具集合平台。我們精心收錄了市面上各種實用的 AI 工具與智能體，涵蓋 AI 員工、AI 對話、AI 寫程式工具、部署平台、AI 自動化工作流等多個分類，幫助你快速找到適合的工具，提升工作效率。
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 mt-4">
            無論你是開發者、設計師、行銷人員，或是想要探索 AI 應用的任何人，都能在這裡找到適合的工具。
          </p>
        </div>
      </div>

      {/* YT影片嵌入 */}
      {youtubeEmbedUrl && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-slate-900 dark:text-white text-center">
            YouTube 頻道
          </h2>
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-xl shadow-lg"
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
    </div>
  );
};

