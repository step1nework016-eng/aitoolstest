import React from "react";
import { AdminPanel } from "./components/AdminPanel";
import { LoadingAnimation } from "./components/LoadingAnimation";
import { HomePage } from "./components/HomePage";
import { SEOHead } from "./components/SEOHead";
import { sanitizeAppName, sanitizeDescription, sanitizeCategoryName, sanitizeTags, isValidUrl, validateCatalog } from "./utils/security";
import { isValidImageMime, isValidFileSize, isValidDataUrl, validateImageFileContent, validatePasswordStrength } from "./utils/advancedSecurity";

/** ========= 型別 ========= */
type Category = string;

type App = {
  name: string;                // 顯示名稱
  icon: string;                // emoji、/images/xxx.png、http(s) 或 data:image/... base64
  description: string;
  href: string;
  category: Category;
  tags?: string[];
};

type Catalog = {
  categories: Category[];
  apps: App[];
};

/** ========= SHA-256（把密語轉 hex） ========= */
async function sha256Hex(text: string) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** 從環境變數讀取目標雜湊（在 Zeabur 設定 VITE_ADMIN_HASH） */
const ADMIN_HASH = (import.meta.env.VITE_ADMIN_HASH as string) || "";

/** 從環境變數讀取後端 API endpoint（可選，用於自動上傳 catalog.json） */
const CATALOG_API_ENDPOINT = (import.meta.env.VITE_CATALOG_API_ENDPOINT as string) || "";

/** 是否顯示管理員登入按鈕（預設為 true，設為 false 可隱藏按鈕，但仍可使用 URL Hash 登入） */
const SHOW_ADMIN_LOGIN_BUTTON = (import.meta.env.VITE_SHOW_ADMIN_LOGIN as string) !== "false";

/** ========= Fallback（catalog.json 載入失敗時使用） ========= */
const fallbackCatalog: Catalog = {
  categories: ["AI員工", "AI對話", "AI寫程式工具", "部署平台"],
  apps: [
    // --- AI員工 ---
    {
      name: "ReelMind短影音智能體",
      icon: "🎬",
      description: "輸入需求即可自動生成帳號定位、腳本選題與短影音腳本。",
      href: "https://reelmind.aijob.com.tw",
      category: "AI員工",
      tags: ["短影音", "內容策略", "影片腳本"],
    },
    {
      name: "HR招募智能體",
      icon: "💼",
      description: "快速生成職缺描述、面試問題與人才畫像分析。",
      href: "https://step1nerecruit.zeabur.app/",
      category: "AI員工",
      tags: ["HR", "招募", "面試題目"],
    },

    // --- AI對話 ---
    {
      name: "GPT",
      icon: "/images/ChatGPT.png",
      description: "使用 OpenAI GPT 系列模型進行智能對話。",
      href: "https://chat.openai.com/",
      category: "AI對話",
      tags: ["通用", "英文", "程式"],
    },
    {
      name: "Gemini",
      icon: "/images/gemini.png",
      description: "由 Google 推出的多模態 AI 對話系統。",
      href: "https://gemini.google.com/",
      category: "AI對話",
      tags: ["多模態", "圖片", "影片"],
    },
    {
      name: "Manus",
      icon: "/images/manus.png",
      description: "高效能中文 AI 對話系統，支援多場景應用。",
      href: "https://manus.im/",
      category: "AI對話",
      tags: ["中文", "效率", "本地化"],
    },

    // --- AI寫程式工具 ---
    {
      name: "StackBlitz",
      icon: "🛠️",
      description: "雲端即開即寫的前端開發環境，支援 Vite/Next 等。",
      href: "https://stackblitz.com/",
      category: "AI寫程式工具",
      tags: ["前端", "線上IDE", "快速實驗"],
    },
    {
      name: "Codesandbox",
      icon: "🧰",
      description: "線上沙盒環境，快速建立 React/Vue 專案範本。",
      href: "https://codesandbox.io/",
      category: "AI寫程式工具",
      tags: ["沙盒", "模板", "原型"],
    },
    {
      name: "GitHub Codespaces",
      icon: "💻",
      description: "雲端 VS Code 開發環境，整合 GitHub 專案。",
      href: "https://github.com/features/codespaces",
      category: "AI寫程式工具",
      tags: ["雲端IDE", "GitHub"],
    },

    // --- 部署平台 ---
    {
      name: "Zeabur",
      icon: "🟦",
      description: "一鍵自動化部署，支援 Node/Static/DB 等服務。",
      href: "https://zeabur.com",
      category: "部署平台",
      tags: ["Serverless", "自動部署", "Logs"],
    },
    {
      name: "Vercel",
      icon: "▲",
      description: "前端友善的 Serverless 平台，Next.js 官方好夥伴。",
      href: "https://vercel.com/",
      category: "部署平台",
      tags: ["Serverless", "Edge", "Next.js"],
    },
    {
      name: "Netlify",
      icon: "🌿",
      description: "靜態網站與函式部署，CI/CD 內建。",
      href: "https://www.netlify.com/",
      category: "部署平台",
      tags: ["靜態", "Functions", "CI/CD"],
    },
  ],
};

/** ========= 主元件 ========= */
const AppLauncherDemo: React.FC = () => {
  const [catalog, setCatalog] = React.useState<Catalog>(fallbackCatalog);

  const [activeCategory, setActiveCategory] = React.useState<string>(fallbackCatalog.categories[0]);
  const [selectedApp, setSelectedApp] = React.useState<App | null>(null);
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [keyword, setKeyword] = React.useState<string>("");
  const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(false);
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [activeTag, setActiveTag] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimeoutRef = React.useRef<number | null>(null);

  // 頁面狀態：載入動畫、首頁/工具庫切換
  // 暫時禁用載入動畫以排查問題
  const [showLoading, setShowLoading] = React.useState<boolean>(false);
  const [currentPage, setCurrentPage] = React.useState<"home" | "tools">("home");

  // Admin 狀態 & 管理用暫存
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);
  const [createOpen, setCreateOpen] = React.useState<boolean>(false);
  const [newCategory, setNewCategory] = React.useState<string>("");
  const [adminPanelOpen, setAdminPanelOpen] = React.useState<boolean>(false);
  const [adminLoginOpen, setAdminLoginOpen] = React.useState<boolean>(false);

  // 確保 Admin 狀態與環境變數同步（每次渲染時檢查）
  React.useEffect(() => {
    // 如果 ADMIN_HASH 未設定，強制關閉 Admin 模式
    if (!ADMIN_HASH || ADMIN_HASH.trim() === "") {
      setIsAdmin(false);
      return;
    }
    // 如果已登入，驗證 localStorage 中的值是否仍然有效
    if (isAdmin) {
      const stored = localStorage.getItem("aijob-admin-hash");
      const loginTime = localStorage.getItem("aijob-admin-login-time");
      
      // 檢查會話是否過期（24 小時）
      if (loginTime) {
        const loginTimestamp = parseInt(loginTime, 10);
        const sessionTimeout = 24 * 60 * 60 * 1000; // 24 小時
        if (Date.now() - loginTimestamp > sessionTimeout) {
          // 會話過期
          setIsAdmin(false);
          try {
            localStorage.removeItem("aijob-admin-hash");
            localStorage.removeItem("aijob-admin-secret");
            localStorage.removeItem("aijob-admin-login-time");
          } catch {}
          showToast("會話已過期，請重新登入");
          return;
        }
      }
      
      if (!stored || stored !== ADMIN_HASH) {
        setIsAdmin(false);
        try {
          localStorage.removeItem("aijob-admin-hash");
          localStorage.removeItem("aijob-admin-secret");
          localStorage.removeItem("aijob-admin-login-time");
        } catch {}
      }
    }
  }, [isAdmin]);

  const isDark = theme === "dark";

  /** ====== 初始化：收藏/主題、本機清理、載 catalog、Admin 登入/登出 ====== */
  React.useEffect(() => {
    // 收藏 / 主題
    try {
      const rawFav = localStorage.getItem("aijob-tool-favorites");
      if (rawFav) {
        const parsed = JSON.parse(rawFav);
        if (Array.isArray(parsed)) setFavorites(parsed);
      }
      const storedTheme = localStorage.getItem("aijob-theme");
      if (storedTheme === "light" || storedTheme === "dark") {
        setTheme(storedTheme as "light" | "dark");
      }
    } catch {}

    // 清除舊版本機自訂資料（統一走公開 catalog）
    try { localStorage.removeItem("aijob-custom-apps"); } catch {}

    // 載入公開 catalog.json
    // 優先從 API 載入（避免快取問題），失敗時使用靜態檔案
    const loadCatalog = async () => {
      try {
        // 先嘗試從 API 載入（避免瀏覽器快取）
        const apiEndpoint = CATALOG_API_ENDPOINT || '/api/catalog';
        const apiResponse = await fetch(apiEndpoint, { 
          cache: "no-store",
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (apiResponse.ok) {
          const data = await apiResponse.json();
          if (Array.isArray(data.categories) && Array.isArray(data.apps)) {
            setCatalog(data);
            if (!data.categories.includes(activeCategory)) {
              setActiveCategory(data.categories[0] || "AI員工");
            }
            return;
          }
        }
      } catch (error) {
        console.warn('API 載入失敗，嘗試靜態檔案:', error);
      }
      
      // API 載入失敗，嘗試靜態檔案（添加時間戳避免快取）
      try {
        const staticResponse = await fetch(`/catalog.json?t=${Date.now()}`, { 
          cache: "no-store",
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (staticResponse.ok) {
          const data = await staticResponse.json();
          if (Array.isArray(data.categories) && Array.isArray(data.apps)) {
            setCatalog(data);
            if (!data.categories.includes(activeCategory)) {
              setActiveCategory(data.categories[0] || "AI員工");
            }
            return;
          }
        }
      } catch (error) {
        console.warn('靜態檔案載入失敗:', error);
      }
      
      // 都失敗，檢查是否有 Admin 的草稿版本
      try {
        const adminDraft = localStorage.getItem("aijob-admin-catalog-draft");
        if (adminDraft) {
          const parsed = JSON.parse(adminDraft);
          if (Array.isArray(parsed.categories) && Array.isArray(parsed.apps)) {
            setCatalog(parsed);
            if (!parsed.categories.includes(activeCategory)) {
              setActiveCategory(parsed.categories[0] || "AI員工");
            }
          }
        }
      } catch {}
    };
    
    loadCatalog();

    // Admin：1) localStorage 已登入 2) #admin=密語 3) #logout=1
    // 只有在 ADMIN_HASH 有設定時才啟用 Admin 功能
    if (!ADMIN_HASH || ADMIN_HASH.trim() === "") {
      // 如果環境變數未設定，清除任何現有的登入狀態
      try { 
        localStorage.removeItem("aijob-admin-hash");
        localStorage.removeItem("aijob-admin-secret");
      } catch {}
      setIsAdmin(false);
    } else {
      // 檢查 localStorage 中的登入狀態
      const stored = localStorage.getItem("aijob-admin-hash");
      if (stored && stored === ADMIN_HASH) {
        setIsAdmin(true);
      } else {
        // 如果 localStorage 中的值與環境變數不符，清除它
        if (stored) {
          try { 
            localStorage.removeItem("aijob-admin-hash");
            localStorage.removeItem("aijob-admin-secret");
          } catch {}
        }
        setIsAdmin(false);
      }

      const hash = window.location.hash || "";
      const loginMatch = hash.match(/#admin=([^&]+)/i);
      const logout = /#logout=1/i.test(hash);

      const clearHash = () =>
        window.history.replaceState(null, "", window.location.pathname + window.location.search);

      (async () => {
        if (logout) {
          try { 
            localStorage.removeItem("aijob-admin-hash");
            localStorage.removeItem("aijob-admin-secret");
            localStorage.removeItem("aijob-admin-login-time");
          } catch {}
          setIsAdmin(false);
          clearHash();
          return;
        }
        if (loginMatch) {
          const raw = decodeURIComponent(loginMatch[1]);
          const digest = await sha256Hex(raw);
          if (digest === ADMIN_HASH) {
            try { 
              localStorage.setItem("aijob-admin-hash", ADMIN_HASH);
              // 儲存原始密碼（用於 API 授權，簡單 base64 編碼）
              localStorage.setItem("aijob-admin-secret", btoa(raw));
              // 記錄登入時間（用於會話過期檢查）
              localStorage.setItem("aijob-admin-login-time", Date.now().toString());
            } catch {}
            setIsAdmin(true);
          } else {
            // 密碼錯誤，確保登出狀態
            try { 
              localStorage.removeItem("aijob-admin-hash");
              localStorage.removeItem("aijob-admin-secret");
            } catch {}
            setIsAdmin(false);
          }
          clearHash();
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ====== 主題變更儲存 ====== */
  React.useEffect(() => {
    try { localStorage.setItem("aijob-theme", theme); } catch {}
  }, [theme]);

  /** ====== 只用公開 catalog ====== */
  const apps: App[] = React.useMemo(() => catalog.apps, [catalog.apps]);

  /** ====== 收藏 ====== */
  const saveFavorites = (next: string[]) => {
    setFavorites(next);
    try { localStorage.setItem("aijob-tool-favorites", JSON.stringify(next)); } catch {}
  };
  const showToast = (message: string) => {
    setToast(message);
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 1600);
  };
  const toggleFavorite = (app: App) => {
    const isFavorite = favorites.includes(app.name);
    const next = isFavorite ? favorites.filter(n => n !== app.name) : [...favorites, app.name];
    saveFavorites(next);
    showToast(isFavorite ? "已從收藏移除" : "已加入收藏");
  };

  /** ====== 刪除（只有 Admin 可對公開 catalog 做暫存刪除） ====== */
  const deleteApp = async (app: App) => {
    if (!isAdmin) return;
    if (!window.confirm(`確定刪除「${app.name}」？`)) return;
    
    const newCatalog = {
      ...catalog,
      apps: catalog.apps.filter(a => !(a.name === app.name && a.href === app.href))
    };
    setCatalog(newCatalog);
    setFavorites(prev => prev.filter(n => n !== app.name));
    
    // 自動儲存到 localStorage
    saveCatalogDraft(newCatalog);
    
    // 嘗試自動上傳到後端 API
    const uploaded = await uploadCatalogToAPI(newCatalog);
    
    if (uploaded) {
      showToast("已刪除並自動上傳到伺服器 ✓");
    } else {
      showToast("已刪除（草稿）• 請匯出 catalog.json 並上傳到 public/ 目錄");
    }
  };

  /** ====== 篩選 ====== */
  const normalizedKeyword = keyword.trim().toLowerCase();
  const filteredApps = apps.filter((app) => {
    if (app.category !== activeCategory) return false;
    if (activeTag && !(app.tags || []).includes(activeTag)) return false;
    if (!normalizedKeyword) return true;
    const text = (app.name + app.description + (app.tags || []).join(" ")).toLowerCase();
    return text.includes(normalizedKeyword);
  });
  const favoriteApps = apps.filter((app) => favorites.includes(app.name));
  const availableTags = Array.from(new Set(
    apps.filter(a => a.category === activeCategory && a.tags).flatMap(a => a.tags as string[])
  ));

  /** ====== 自動儲存 catalog 到 localStorage（Admin 專用） ====== */
  const saveCatalogDraft = (newCatalog: Catalog) => {
    if (!isAdmin) return;
    try {
      localStorage.setItem("aijob-admin-catalog-draft", JSON.stringify(newCatalog));
    } catch (error) {
      console.error("儲存草稿失敗:", error);
    }
  };

  /** ====== 自動上傳 catalog 到後端 API ====== */
  const uploadCatalogToAPI = async (catalogData: Catalog): Promise<boolean> => {
    console.log("\n" + "=".repeat(60));
    console.log("📤 開始上傳 catalog 到後端 API");
    console.log("=".repeat(60));
    
    // 如果沒有設定完整 URL，使用相對路徑（同一個服務）
    let apiEndpoint = CATALOG_API_ENDPOINT;
    if (!apiEndpoint || apiEndpoint.trim() === "") {
      console.error("❌ VITE_CATALOG_API_ENDPOINT 未設定！");
      console.log("💡 請在 Zeabur 環境變數中設定: VITE_CATALOG_API_ENDPOINT = /api/catalog");
      return false;
    }
    
    // 如果是相對路徑，補上當前域名
    if (apiEndpoint.startsWith('/')) {
      apiEndpoint = `${window.location.origin}${apiEndpoint}`;
    }

    console.log("🌐 API 端點:", apiEndpoint);
    console.log("📊 Catalog 資料:", {
      categories: catalogData.categories.length,
      apps: catalogData.apps.length
    });

    // 取得原始密碼（用於 API 授權）
    let adminSecret = "";
    try {
      const encoded = localStorage.getItem("aijob-admin-secret");
      if (encoded) {
        adminSecret = atob(encoded);
        console.log("🔑 Admin 密碼: 已取得");
      } else {
        console.error("❌ 無法從 localStorage 取得 Admin 密碼");
        console.log("💡 請重新登入 Admin: #admin=你的密碼");
      }
    } catch (error) {
      console.error("❌ 讀取 Admin 密碼失敗:", error);
      return false;
    }

    if (!adminSecret) {
      console.error("❌ 無法取得 Admin 密碼，跳過 API 上傳");
      return false;
    }

    try {
      console.log("📡 發送 POST 請求...");
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${adminSecret}`,
        },
        body: JSON.stringify(catalogData),
      });

      console.log("📥 收到回應:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        const result = await response.json().catch(() => ({}));
        console.log("✅ 上傳成功！", result);
        console.log("=".repeat(60) + "\n");
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ 上傳失敗:", response.status, response.statusText);
        console.error("錯誤詳情:", errorData);
        console.log("=".repeat(60) + "\n");
        return false;
      }
    } catch (error: any) {
      console.error("❌ 上傳 catalog 到 API 失敗:", error);
      console.error("錯誤類型:", error.name);
      console.error("錯誤訊息:", error.message);
      if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
        console.error("💡 這可能是網路錯誤或 CORS 問題");
        console.error("💡 請檢查：");
        console.error("   1. 後端服務是否正在運行");
        console.error("   2. API 端點是否正確");
        console.error("   3. 服務類型是否為 Node.js（不是 Static Site）");
      }
      console.log("=".repeat(60) + "\n");
      return false;
    }
  };

  /** ====== Admin：新增分類／匯出 catalog.json ====== */
  const addCategory = async () => {
    const n = newCategory.trim();
    if (!n) return;
    
    // 驗證和清理分類名稱
    const sanitizedName = sanitizeCategoryName(n);
    if (!sanitizedName) {
      showToast("分類名稱無效");
      return;
    }
    
    if (catalog.categories.includes(sanitizedName)) {
      showToast("已存在相同分類");
      return;
    }
    
    const newCatalog = { ...catalog, categories: [...catalog.categories, sanitizedName] };
    setCatalog(newCatalog);
    setNewCategory("");
    
    // 自動儲存到 localStorage
    saveCatalogDraft(newCatalog);
    
    // 嘗試自動上傳到後端 API
    const uploaded = await uploadCatalogToAPI(newCatalog);
    
    if (uploaded) {
      showToast("已新增分類並自動上傳到伺服器 ✓");
    } else {
      showToast("已新增分類（草稿）• 請匯出 catalog.json 並上傳到 public/ 目錄");
    }
  };

  const exportCatalog = () => {
    const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "catalog.json";
    a.click();
    showToast("已下載 catalog.json • 請上傳到 public/ 目錄並重新部署");
  };

  /** ====== UI ====== */
  // 顯示載入動畫
  if (showLoading) {
    return <LoadingAnimation onComplete={() => setShowLoading(false)} />;
  }

  // 根據當前頁面動態更新 SEO
  const seoTitle = currentPage === "home" 
    ? "AIJob 自動化學院 - AI 工具庫與自動化教學"
    : `AIJob ${activeCategory} - AI 工具庫`;
  const seoDescription = currentPage === "home"
    ? "AIJob 自動化學院專注於 AI 與自動化技術教學，提供 AI 工具庫、n8n 自動化課程、LINE 社群、Discord 社群等資源，從零打造你的工作流效率。"
    : `探索 ${activeCategory} 相關的 AI 工具與智能體，從這裡出發啟動工作流程。`;

  return (
    <>
      <SEOHead 
        title={seoTitle}
        description={seoDescription}
        currentPage={currentPage}
      />
      <div className={isDark ? "min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden"
                             : "min-h-screen bg-slate-50 text-slate-900 relative overflow-hidden"}>
      {/* 背景動態 */}
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-70 animate-pulse ${isDark ? "bg-indigo-900/40" : "bg-indigo-100"}`} />
        <div className={`absolute -bottom-32 -left-20 h-80 w-80 rounded-full blur-3xl opacity-70 animate-pulse ${isDark ? "bg-sky-900/40" : "bg-sky-100"}`} />
      </div>

      {/* 行動版頂欄 */}
      <div className={`fixed top-0 left-0 right-0 z-30 flex items-center justify-between border-b px-4 py-3 md:hidden ${
        isDark ? "bg-slate-900/90 border-slate-800 text-slate-100" : "bg-white/90 border-slate-200 text-slate-800 backdrop-blur-sm"}`}>
        <button onClick={() => setSidebarOpen(true)} className="text-xl">☰</button>
        <span className="font-semibold text-sm">AIJob 工具庫</span>
        <button onClick={() => setTheme(isDark ? "light" : "dark")} className="text-lg" aria-label="切換主題">
          {isDark ? "🌞" : "🌙"}
        </button>
      </div>

      {/* 主要版面 */}
      <div className="relative flex pt-12 md:pt-0">
        {/* 側邊欄 */}
        <aside
          className={`fixed md:static z-40 top-0 left-0 bottom-0 md:h-screen w-64 px-4 py-6 flex flex-col transform transition-all duration-200 ease-in-out border-r ${
            sidebarOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 md:translate-x-0 md:opacity-100"
          } ${isDark ? "bg-slate-900/90 border-slate-800 text-slate-100" : "bg-white/90 border-slate-200/80 text-slate-900 backdrop-blur-sm"}`}>
          {/* Logo 區塊 */}
          <div className="mb-8 flex flex-col items-center text-center">
            <img
              src="https://static.wixstatic.com/media/9705bb_dd62dc9b5ff6496a9a9560ca516f9851~mv2.png"
              alt="AIJOB Logo"
              className="w-28 h-auto mb-3 object-contain drop-shadow-md"
            />
            <div className="text-xs uppercase tracking-wide text-indigo-500 font-semibold">AIJob</div>
            <div className="text-xl font-bold mt-1">AI工具庫</div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-3">
              全站收錄多元且實用的 AI 工具與智能體模型，從新手到專業用戶都能快速找到最適合的解決方案，並全面提升你的工作效率。
            </p>
          </div>

          {/* 導航：首頁與分類 */}
          <nav className="space-y-1">
            {/* 首頁按鈕 */}
            <button
              type="button"
              onClick={() => { setCurrentPage("home"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                currentPage === "home"
                  ? "bg-indigo-500/10 text-indigo-500 shadow-sm"
                  : isDark
                  ? "text-slate-300 hover:bg-slate-800/80 hover:text-slate-50"
                  : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900"
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>首頁</span>
            </button>
            
            {/* 所有分類都是獨立的按鈕 */}
            {catalog.categories.map((cat) => (
            <button
                key={cat}
              type="button"
                onClick={() => { 
                  setCurrentPage("tools");
                  setActiveCategory(cat); 
                  setActiveTag(null); 
                  setSidebarOpen(false); 
                }}
              className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                  currentPage === "tools" && activeCategory === cat
                  ? "bg-indigo-500/10 text-indigo-500 shadow-sm"
                  : isDark
                  ? "text-slate-300 hover:bg-slate-800/80 hover:text-slate-50"
                  : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900"
              }`}>
                {getCategoryIcon(cat)}
                <span>{cat}</span>
              </button>
            ))}
          </nav>

          {/* 管理工具（只有 Admin 顯示） */}
          {isAdmin && (
            <div className="mt-4 space-y-2">
              <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-2 mb-2">
                <div className="text-[10px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                  <div className="font-semibold mb-1">📝 管理說明：</div>
                  <div>• 新增內容會自動儲存（此瀏覽器可見）</div>
                  {CATALOG_API_ENDPOINT ? (
                    <div className="text-green-600 dark:text-green-400">• 已設定 API，會自動上傳 ✓</div>
                  ) : (
                    <div className="text-amber-600 dark:text-amber-400">
                      • 未設定 API，需手動匯出上傳
                      <br />
                      <span className="text-[9px] text-amber-500">請設定 VITE_CATALOG_API_ENDPOINT</span>
                    </div>
                  )}
                  <div className="mt-1 text-[9px] text-slate-500">
                    💡 開啟瀏覽器控制台（F12）查看詳細日誌
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAdminPanelOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white text-sm font-medium px-3 py-2 shadow hover:bg-indigo-700 transition-colors">
                📋 開啟管理面板
              </button>

              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-600 text-white text-sm font-medium px-3 py-2 shadow hover:bg-slate-700 transition-colors">
                ➕ 快速新增應用程式
              </button>

              <div className="rounded-xl border p-2">
                <div className="text-xs mb-1 text-slate-500 dark:text-slate-400">快速新增分類</div>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-2 py-1 text-sm"
                    placeholder="輸入新分類名稱"
                    value={newCategory}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>)=>setNewCategory(e.target.value)}
                  />
                  <button
                    onClick={addCategory}
                    className="rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-xs px-3 py-1.5 hover:bg-black/80 dark:hover:bg-slate-600"
                  >
                    新增
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={exportCatalog}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                ⬇️ 匯出 catalog.json
              </button>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
                匯出後上傳到 <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">public/catalog.json</code> 並重新部署
              </div>

              <button
                type="button"
                onClick={() => { 
                  try { 
                    localStorage.removeItem("aijob-admin-hash");
                    localStorage.removeItem("aijob-admin-secret");
                    localStorage.removeItem("aijob-admin-login-time");
                  } catch {}; 
                  setIsAdmin(false); 
                }}
                className="w-full text-[11px] text-slate-400 hover:text-slate-200 underline">
                退出管理模式
              </button>
            </div>
          )}

          {/* 管理員登入按鈕（未登入時顯示，可透過 VITE_SHOW_ADMIN_LOGIN=false 隱藏） */}
          {!isAdmin && ADMIN_HASH && ADMIN_HASH.trim() !== "" && SHOW_ADMIN_LOGIN_BUTTON && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setAdminLoginOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                🔐 管理員登入
              </button>
            </div>
          )}

          {/* 社群連結（導航列底部） */}
          <div className="mt-auto pt-4 border-t border-slate-100/80 dark:border-slate-800">
            <div className="space-y-1.5">
              <a
                href="https://lin.ee/ZTgJbYG"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                  isDark
                    ? "text-slate-300 hover:bg-slate-800/80 hover:text-slate-50"
                    : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.63.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.086.766.062 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                </svg>
                <span>LINE 官方帳號</span>
              </a>
              <a
                href="https://line.me/ti/g2/xaKhtD6TG78lZ8tOLP2T4Lz0zD-edf8GJF8x5w?utm_source=invitation&utm_medium=link_copy&utm_campaign=default"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                  isDark
                    ? "text-slate-300 hover:bg-slate-800/80 hover:text-slate-50"
                    : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>LINE 社群</span>
              </a>
              <a
                href="https://discord.gg/Dzm2P7rHyg"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                  isDark
                    ? "text-slate-300 hover:bg-slate-800/80 hover:text-slate-50"
                    : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span>Discord 社群</span>
              </a>
              <a
                href="https://www.instagram.com/aijobschool/reels/"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                  isDark
                    ? "text-slate-300 hover:bg-slate-800/80 hover:text-slate-50"
                    : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span>Instagram</span>
              </a>
              <a
                href="https://www.aijob.com.tw/"
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                  isDark
                    ? "text-slate-300 hover:bg-slate-800/80 hover:text-slate-50"
                    : "text-slate-600 hover:bg-slate-50/80 hover:text-slate-900"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span>官方網站</span>
              </a>
            </div>
          </div>

          <div className="mt-4 pt-4 text-xs text-slate-400 border-t border-slate-100/80 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span>© {new Date().getFullYear()} AIJob</span>
              <button onClick={() => setTheme(isDark ? "light" : "dark")}
                className="hidden md:inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs hover:border-indigo-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isDark ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* 行動版關閉 */}
          <button
            className="md:hidden absolute top-3 right-3 text-slate-400 hover:text-slate-200"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </aside>

        {/* 主內容 */}
        <main className="flex-1 px-4 sm:px-6 py-6 md:py-8 md:ml-64">
          {currentPage === "home" ? (
            <HomePage isDark={isDark} />
          ) : (
            <>
              <header className="mb-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-xl font-semibold">{activeCategory}</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      點擊下方任一圖示卡片，即可開啟對應工具或頁面。
                    </p>
                  </div>
                  <div className="w-full sm:w-72">
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 text-sm">🔍</span>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyword(e.target.value)}
                    placeholder="搜尋工具名稱或關鍵字"
                    className={`w-full rounded-xl border py-1.5 pl-8 pr-3 text-xs sm:text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${
                      isDark ? "border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500"
                             : "border-slate-200 bg-white/80 text-slate-700 placeholder:text-slate-400"}`}
                  />
                </div>
              </div>
            </div>

            {favoriteApps.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span>⭐ 我的收藏</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">（跨分類顯示你常用的工具）</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {favoriteApps.map((app) => (
                    <button
                      key={app.name}
                      type="button"
                      onClick={() => setSelectedApp(app)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${
                        isDark ? "border-slate-700 bg-slate-900/80 text-slate-100 hover:border-indigo-400 hover:text-indigo-300"
                               : "border-slate-200 bg-white/80 text-slate-700 hover:border-indigo-300 hover:text-indigo-600"}`}>
                      <span className="inline-flex h-4 w-4 items-center justify-center overflow-hidden">
                        {renderIcon(app.icon, app.name)}
                      </span>
                      <span>{app.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableTags.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span>🏷️ 快速篩選標籤</span>
                  {activeTag && (
                    <button type="button" onClick={() => setActiveTag(null)}
                      className="text-[10px] text-indigo-500 hover:underline">
                      清除標籤
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setActiveTag((prev) => (prev === tag ? null : tag))}
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] transition-colors border ${
                        activeTag === tag
                          ? "border-indigo-400 bg-indigo-500/10 text-indigo-500"
                          : isDark
                          ? "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500"
                          : "border-sky-200 bg-sky-100 text-black hover:border-sky-300"}`}>
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </header>

          {/* App 卡片 */}
          <section>
            {filteredApps.length === 0 ? (
              <div className="text-sm text-slate-400 dark:text-slate-500">
                找不到符合條件的工具，試試其他關鍵字或切換分類。
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {filteredApps.map((app) => {
                  const isFavoriteApp = favorites.includes(app.name);
                  const isCatalogApp = catalog.apps.some(x => x.name === app.name && x.href === app.href);

                  return (
                    <div
                      key={app.name + app.href}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedApp(app)}
                      className="group relative rounded-2xl p-px transition-transform duration-150 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-indigo-300/60"
                    >
                      {/* hover 漸層光暈 */}
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-gradient-to-br from-indigo-200/80 via-sky-200/60 to-transparent dark:from-indigo-500/40 dark:via-sky-500/30" />

                      <div
                        className={`relative rounded-[14px] p-4 flex flex-col items-center text-center shadow-sm backdrop-blur-sm ${
                          isDark ? "bg-slate-900/90 border border-slate-800" : "bg-white/95 border border-slate-100"
                        }`}
                      >
                        {/* 收藏 */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(app); }}
                          className={`absolute right-3 top-3 text-lg transition-transform ${
                            isFavoriteApp ? "text-yellow-400 scale-110" : "text-slate-300 hover:text-slate-400"
                          }`}
                          aria-label={isFavoriteApp ? "移除收藏" : "加入收藏"}
                          title={isFavoriteApp ? "移除收藏" : "加入收藏"}
                        >
                          {isFavoriteApp ? "★" : "☆"}
                        </button>

                        {/* 刪除（只有 Admin 可以刪公開） */}
                        {isAdmin && isCatalogApp && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); deleteApp(app); }}
                            className="absolute left-3 top-3 text-sm text-rose-400 hover:text-rose-500"
                            aria-label="刪除應用"
                            title="刪除應用"
                          >
                            🗑️
                          </button>
                        )}

                        {/* 圖示 */}
                        <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${isDark ? "bg-slate-800" : "bg-indigo-50"} overflow-hidden`}>
                          {renderIcon(app.icon, app.name)}
                        </div>

                        <div className="font-semibold mb-1 text-sm">{app.name}</div>
                        <div className="text-[11px] text-indigo-500 mb-2">{app.category}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-3">{app.description}</div>
                        {app.tags && (
                          <div className="flex flex-wrap justify-center gap-1">
                            {app.tags.map((tag) => (
                              <span key={tag} className="rounded-full bg-sky-100 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] text-black dark:text-slate-400">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
            </>
          )}
        </main>
      </div>

      {/* 詳情 Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm">
          <div className={`relative max-w-md w-full mx-4 rounded-2xl shadow-2xl p-6 ${isDark ? "bg-slate-900 border border-slate-700" : "bg-white"}`}>
            <button type="button" onClick={() => setSelectedApp(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-200 text-sm">✕</button>
            <div className="flex flex-col items-center text-center">
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${isDark ? "bg-slate-800" : "bg-indigo-50"} overflow-hidden`}>
                {renderIcon(selectedApp.icon, selectedApp.name)}
              </div>
              <h2 className="text-lg font-semibold mb-1">{selectedApp.name}</h2>
              <div className="text-xs text-indigo-500 mb-3">{selectedApp.category}</div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">{selectedApp.description}</p>
              <a
                href={selectedApp.href}
                target={selectedApp.href.startsWith("http") ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white text-sm font-medium px-4 py-2.5 shadow hover:bg-indigo-700 transition-colors w-full mb-2"
              >
                立即前往工具
              </a>
              <button type="button" onClick={() => setSelectedApp(null)} className="text-xs text-slate-400 hover:text-slate-200 mt-1">
                下次再說，先關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增應用 Modal（只有 Admin；寫入公開 catalog 草稿） */}
      {isAdmin && createOpen && (
        <CreateAppModal
          categories={catalog.categories}
          onClose={() => setCreateOpen(false)}
          onCreate={async (app) => {
            // 輸入驗證和清理
            if (!app.name || !app.name.trim()) {
              showToast("應用程式名稱不能為空");
              return;
            }

            if (!app.href || !app.href.trim()) {
              showToast("應用程式連結不能為空");
              return;
            }

            if (!isValidUrl(app.href)) {
              showToast("應用程式連結格式無效");
              return;
            }

            // 清理輸入
            const sanitizedApp: App = {
              name: sanitizeAppName(app.name),
              href: app.href.trim(),
              icon: app.icon || "🧩",
              category: sanitizeCategoryName(app.category),
              description: sanitizeDescription(app.description || ""),
              tags: sanitizeTags(app.tags || []),
            };

            const newCatalog = { ...catalog, apps: [...catalog.apps, sanitizedApp] };
            setCatalog(newCatalog);
            setCreateOpen(false);
            
            // 自動儲存到 localStorage
            saveCatalogDraft(newCatalog);
            
            // 嘗試自動上傳到後端 API
            const uploaded = await uploadCatalogToAPI(newCatalog);
            
            if (uploaded) {
              showToast("已新增並自動上傳到伺服器 ✓");
            } else {
              showToast("已新增（草稿）• 請匯出 catalog.json 並上傳到 public/ 目錄");
            }
          }}
        />
      )}

      {/* 收藏提示 */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`rounded-xl px-3 py-2 text-xs shadow-lg flex items-center gap-2 ${
            isDark ? "bg-slate-900/95 border border-slate-700 text-slate-100" : "bg-white border border-slate-200 text-slate-700"}`}>
            <span>⭐</span>
            <span>{toast}</span>
          </div>
        </div>
      )}

      {/* 管理面板（只有 Admin 且開啟時顯示） */}
      {isAdmin && adminPanelOpen && (
        <AdminPanel
          catalog={catalog}
          isDark={isDark}
          onCatalogChange={(newCatalog) => {
            setCatalog(newCatalog);
            // 如果當前分類被刪除，切換到第一個分類
            if (!newCatalog.categories.includes(activeCategory)) {
              setActiveCategory(newCatalog.categories[0] || "");
            }
          }}
          onSave={async (catalogData) => {
            // 自動儲存到 localStorage
            saveCatalogDraft(catalogData);
            // 嘗試自動上傳到後端 API
            return await uploadCatalogToAPI(catalogData);
          }}
          onShowToast={showToast}
          onClose={() => setAdminPanelOpen(false)}
        />
      )}

      {/* 管理員登入對話框 */}
      {adminLoginOpen && (
        <AdminLoginModal
          isDark={isDark}
          onClose={() => setAdminLoginOpen(false)}
          onLogin={async (password: string) => {
            if (!ADMIN_HASH || ADMIN_HASH.trim() === "") {
              showToast("管理員功能未啟用");
              return false;
            }
            const digest = await sha256Hex(password);
            if (digest === ADMIN_HASH) {
              try {
                localStorage.setItem("aijob-admin-hash", ADMIN_HASH);
                localStorage.setItem("aijob-admin-secret", btoa(password));
                // 記錄登入時間（用於會話過期檢查）
                localStorage.setItem("aijob-admin-login-time", Date.now().toString());
                // 清除登入失敗記錄
                localStorage.removeItem("aijob-login-attempts");
                localStorage.removeItem("aijob-login-lockout");
              } catch {}
              setIsAdmin(true);
              setAdminLoginOpen(false);
              showToast("已登入管理員模式 ✓");
              return true;
            } else {
              showToast("密碼錯誤");
              return false;
            }
          }}
        />
      )}
      </div>
    </>
  );
};

/** ========= 分類圖示 ========= */
function getCategoryIcon(category: string) {
  const iconClass = "w-4 h-4";
  switch (category) {
    case "AI員工":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      );
    case "AI對話":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "AI寫程式工具":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      );
    case "部署平台":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
      );
    case "AI 自動化(workflow)":
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
  }
}

/** ========= 圖示渲染：emoji / 路徑 / http(s) / data:image ========= */
function renderIcon(icon: string, alt = "") {
  const isImage =
    typeof icon === "string" &&
    (icon.startsWith("/images/") || icon.startsWith("http") || icon.startsWith("data:image"));
  if (isImage) return <img src={icon} alt={alt} className="h-full w-full object-contain" loading="lazy" />;
  // 如果是emoji，嘗試轉換為icon或保持原樣
  return <span className="text-2xl">{icon}</span>;
}

/** ========= 新增應用 Modal（Admin 專用） ========= */
function CreateAppModal({
  onClose,
  onCreate,
  categories,
}: {
  onClose: () => void;
  onCreate: (app: App) => void;
  categories: Category[];
}) {
  const [name, setName] = React.useState("");
  const [href, setHref] = React.useState("");
  const [icon, setIcon] = React.useState("🧩");
  const [category, setCategory] = React.useState<Category>(categories[0] || "AI員工");
  const [description, setDescription] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [preview, setPreview] = React.useState<string | null>(null);
  const [isFetchingLogo, setIsFetchingLogo] = React.useState(false);
  const [uploadedImages, setUploadedImages] = React.useState<string[]>([]);

  const canSave = name.trim() && href.trim();

  // Logo 快取（使用 localStorage）
  const getCachedLogo = (url: string): string | null => {
    try {
      const cache = localStorage.getItem("aijob-logo-cache");
      if (cache) {
        const cacheData = JSON.parse(cache);
        const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
        return cacheData[domain] || null;
      }
    } catch {}
    return null;
  };

  const setCachedLogo = (url: string, logoUrl: string) => {
    try {
      const cache = localStorage.getItem("aijob-logo-cache");
      const cacheData = cache ? JSON.parse(cache) : {};
      const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
      cacheData[domain] = logoUrl;
      // 限制快取大小（最多保留 100 個）
      const entries = Object.entries(cacheData);
      if (entries.length > 100) {
        const recent = entries.slice(-100);
        localStorage.setItem("aijob-logo-cache", JSON.stringify(Object.fromEntries(recent)));
      } else {
        localStorage.setItem("aijob-logo-cache", JSON.stringify(cacheData));
      }
    } catch {}
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files) as File[];
    
    // 驗證 MIME 類型
    const imageFiles = fileList.filter((f: File) => {
      if (!isValidImageMime(f.type)) {
        return false;
      }
      return true;
    });
    
    if (imageFiles.length === 0) {
      alert("請選擇有效的圖片檔（JPEG、PNG、GIF、WebP、SVG）");
      return;
    }

    // 驗證檔案大小
    const oversized = imageFiles.filter((f: File) => !isValidFileSize(f.size, 2));
    if (oversized.length > 0) {
      alert(`以下圖片超過 2MB，將被跳過：${oversized.map((f: File) => f.name).join(", ")}`);
    }

    const validFiles = imageFiles.filter((f: File) => isValidFileSize(f.size, 2));
    if (validFiles.length === 0) return;

    // 轉換所有圖片為 data URL
    const dataUrls: string[] = [];
    for (const file of validFiles) {
      try {
        const dataUrl = await fileToDataUrl(file);
        
        // 驗證 Data URL 格式
        if (!isValidDataUrl(dataUrl)) {
          console.error(`檔案 ${file.name} 的 Data URL 格式無效`);
          continue;
        }
        
        // 驗證圖片內容
        const isValid = await validateImageFileContent(dataUrl);
        if (!isValid) {
          console.error(`檔案 ${file.name} 的圖片內容無效或尺寸過大`);
          continue;
        }
        
        dataUrls.push(dataUrl);
      } catch (error) {
        console.error(`轉換 ${file.name} 失敗:`, error);
      }
    }

    if (dataUrls.length > 0) {
      setUploadedImages(dataUrls);
      // 使用第一張圖片作為預設圖示
      setIcon(dataUrls[0]);
      setPreview(dataUrls[0]);
    }
  };

  /** ========= 從 URL 自動抓取 Logo（優先使用快取） ========= */
  const fetchLogoFromUrl = async (url: string, useCache = true) => {
    if (!url || !url.trim()) return null;
    
    try {
      // 解析 URL 取得域名
      let domain = "";
      try {
        const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
        domain = urlObj.hostname;
      } catch {
        return null;
      }

      // 優先檢查快取
      if (useCache) {
        const cached = getCachedLogo(url);
        if (cached) {
          console.log("✅ 使用快取的 Logo:", domain);
          return cached;
        }
      }

      // 方法 1: 使用 Google 的 favicon 服務（最可靠，無 CORS 問題）
      const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      
      // 測試圖片是否存在
      const testImage = (imgUrl: string): Promise<boolean> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = imgUrl;
          // 設定超時
          setTimeout(() => resolve(false), 3000);
        });
      };

      // 先嘗試 Google favicon 服務
      const googleWorks = await testImage(googleFaviconUrl);
      if (googleWorks) {
        // 儲存到快取
        setCachedLogo(url, googleFaviconUrl);
        return googleFaviconUrl;
      }

      // 方法 2: 嘗試直接獲取 favicon.ico
      try {
        const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
        const faviconUrl = `${urlObj.origin}/favicon.ico`;
        const faviconWorks = await testImage(faviconUrl);
        if (faviconWorks) {
          // 儲存到快取
          setCachedLogo(url, faviconUrl);
          return faviconUrl;
        }
      } catch {}

      return null;
    } catch (error) {
      console.error("抓取 Logo 失敗:", error);
      return null;
    }
  };

  // URL 變更時自動抓取 Logo（使用 debounce，優先使用快取）
  React.useEffect(() => {
    if (!href || !href.trim()) {
      setIcon("🧩");
      setPreview(null);
      return;
    }

    // 優先檢查快取
    const cached = getCachedLogo(href);
    if (cached) {
      setIcon(cached);
      setPreview(cached);
      // 如果名稱還沒填，嘗試從 URL 推斷
      if (!name.trim()) {
        try {
          const urlObj = new URL(href.startsWith("http") ? href : `https://${href}`);
          const domainName = urlObj.hostname.replace("www.", "").split(".")[0];
          setName(domainName.charAt(0).toUpperCase() + domainName.slice(1));
        } catch {}
      }
      return;
    }

    // Debounce：等待用戶停止輸入 1 秒後再抓取
    const timer = setTimeout(async () => {
      setIsFetchingLogo(true);
      try {
        const logoUrl = await fetchLogoFromUrl(href, false);
        if (logoUrl) {
          setIcon(logoUrl);
          setPreview(logoUrl);
          // 如果名稱還沒填，嘗試從 URL 推斷
          if (!name.trim()) {
            try {
              const urlObj = new URL(href.startsWith("http") ? href : `https://${href}`);
              const domainName = urlObj.hostname.replace("www.", "").split(".")[0];
              setName(domainName.charAt(0).toUpperCase() + domainName.slice(1));
            } catch {}
          }
        }
      } catch (error) {
        console.error("自動抓取 Logo 失敗:", error);
      } finally {
        setIsFetchingLogo(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [href]);

  const handleFetchLogo = async () => {
    if (!href || !href.trim()) {
      alert("請先輸入 URL");
      return;
    }

    setIsFetchingLogo(true);
    try {
      // 強制重新抓取（不使用快取）
      const logoUrl = await fetchLogoFromUrl(href, false);
      if (logoUrl) {
        setIcon(logoUrl);
        setPreview(logoUrl);
        // 如果名稱還沒填，嘗試從 URL 推斷
        if (!name.trim()) {
          try {
            const urlObj = new URL(href.startsWith("http") ? href : `https://${href}`);
            const domainName = urlObj.hostname.replace("www.", "").split(".")[0];
            setName(domainName.charAt(0).toUpperCase() + domainName.slice(1));
          } catch {}
        }
      } else {
        alert("無法自動抓取該網站的 Logo，請手動輸入或上傳圖片");
      }
    } catch (error) {
      alert("抓取 Logo 時發生錯誤，請手動輸入或上傳圖片");
    } finally {
      setIsFetchingLogo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">新增應用</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="text-sm">
            名稱
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="例如：我的工具"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            />
          </label>

          <label className="text-sm">
            連結（URL）
            <div className="mt-1 flex gap-2">
              <input
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="https://example.com"
                value={href}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHref(e.target.value)}
              />
              <button
                type="button"
                onClick={handleFetchLogo}
                disabled={isFetchingLogo || !href.trim()}
                className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                  isFetchingLogo || !href.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                }`}
                title="重新抓取網站 Logo（會自動快取）"
              >
                {isFetchingLogo ? "抓取中..." : "🔄 重新抓取"}
              </button>
            </div>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              圖示（文字路徑或 emoji）
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="🧩 或 /images/myicon.png 或 https://..."
                value={icon}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setIcon(e.target.value); setPreview(null); }}
              />
            </label>

            <label className="text-sm">
              或直接上傳圖片（可多選）
              <input
                type="file"
                accept="image/*"
                multiple
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white"
                onChange={onFileChange}
              />
              {uploadedImages.length > 1 && (
                <div className="mt-2 text-xs text-slate-500">
                  已上傳 {uploadedImages.length} 張圖片，點擊下方圖片切換
                </div>
              )}
            </label>
          </div>

          {(preview || icon.startsWith("data:image") || icon.startsWith("http") || uploadedImages.length > 0) && (
            <div className="mt-1">
              <div className="text-xs text-slate-500 mb-2">預覽：</div>
              
              {/* 主要預覽 */}
              <div className="h-20 w-20 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border-2 border-indigo-300 border-dashed mb-2">
                <img 
                  src={preview || icon} 
                  alt="預覽" 
                  className="h-full w-full object-contain"
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    const target = e.currentTarget;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) {
                      // 使用安全的 DOM 操作，避免 XSS
                      const fallback = document.createElement('span');
                      fallback.className = 'text-2xl';
                      fallback.textContent = '🧩';
                      parent.innerHTML = '';
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>

              {/* 多張圖片選擇器 */}
              {uploadedImages.length > 1 && (
                <div className="mt-2">
                  <div className="text-xs text-slate-500 mb-1">選擇圖片：</div>
                  <div className="flex flex-wrap gap-2">
                    {uploadedImages.map((img, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setIcon(img);
                          setPreview(img);
                        }}
                        className={`h-12 w-12 rounded-lg overflow-hidden border-2 transition-all ${
                          (preview || icon) === img
                            ? "border-indigo-500 ring-2 ring-indigo-200"
                            : "border-slate-200 hover:border-indigo-300"
                        }`}
                      >
                        <img 
                          src={img} 
                          alt={`圖片 ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <label className="text-sm">
            分類
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={category}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value as Category)}
            >
              {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </label>

          <label className="text-sm">
            簡介
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={3}
              placeholder="這個工具可以幫你做什麼？"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            />
          </label>

          <label className="text-sm">
            標籤（以逗號分隔）
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="例如：中文, 高效率"
              value={tags}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            disabled={!canSave}
            onClick={() =>
              onCreate({
                name: name.trim(),
                href: href.trim(),
                icon: icon.trim() || "🧩",
                category,
                description: description.trim(),
                tags: tags.split(",").map(t => t.trim()).filter(Boolean),
              })
            }
            className={`rounded-lg px-4 py-2 text-sm text-white ${
              canSave ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-300 cursor-not-allowed"
            }`}
          >
            新增
          </button>
        </div>
      </div>
    </div>
  );
}

/** ========= File → DataURL(base64) ========= */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("讀取檔案失敗"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/** ========= 管理員登入對話框 ========= */
const AdminLoginModal: React.FC<{
  isDark: boolean;
  onClose: () => void;
  onLogin: (password: string) => Promise<boolean>;
}> = ({ isDark, onClose, onLogin }) => {
  const [password, setPassword] = React.useState("");
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = React.useState(0);
  const [lockoutUntil, setLockoutUntil] = React.useState<number | null>(null);
  const [passwordStrength, setPasswordStrength] = React.useState<{ score: number; feedback: string[] } | null>(null);

  // 檢查登入嘗試次數（從 localStorage）
  React.useEffect(() => {
    try {
      const attempts = localStorage.getItem("aijob-login-attempts");
      const lockout = localStorage.getItem("aijob-login-lockout");
      if (attempts) {
        setLoginAttempts(parseInt(attempts, 10));
      }
      if (lockout) {
        const lockoutTime = parseInt(lockout, 10);
        if (Date.now() < lockoutTime) {
          setLockoutUntil(lockoutTime);
        } else {
          localStorage.removeItem("aijob-login-attempts");
          localStorage.removeItem("aijob-login-lockout");
        }
      }
    } catch {}
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 檢查鎖定狀態
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`帳號已鎖定，請在 ${remaining} 秒後再試`);
      return;
    }

    if (!password.trim()) {
      setError("請輸入密碼");
      return;
    }

    setIsLoggingIn(true);
    setError(null);

    const success = await onLogin(password);
    if (!success) {
      // 增加失敗次數
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      try {
        localStorage.setItem("aijob-login-attempts", newAttempts.toString());
        
        // 如果失敗 5 次，鎖定 15 分鐘
        if (newAttempts >= 5) {
          const lockoutTime = Date.now() + 15 * 60 * 1000; // 15 分鐘
          setLockoutUntil(lockoutTime);
          localStorage.setItem("aijob-login-lockout", lockoutTime.toString());
          setError("登入失敗次數過多，帳號已鎖定 15 分鐘");
        } else {
          setError(`密碼錯誤，請重試（剩餘 ${5 - newAttempts} 次機會）`);
        }
      } catch {}
      
      setIsLoggingIn(false);
    } else {
      // 登入成功，清除失敗記錄
      setPassword("");
      setLoginAttempts(0);
      try {
        localStorage.removeItem("aijob-login-attempts");
        localStorage.removeItem("aijob-login-lockout");
      } catch {}
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl p-6 ${
          isDark ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">🔐 管理員登入</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              輸入管理員密碼以進入管理模式
            </p>
          </div>
          <button
            onClick={onClose}
            className={`text-slate-400 hover:text-slate-600 dark:hover:text-slate-200`}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">管理員密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                const newPassword = e.target.value;
                setPassword(newPassword);
                setError(null);
                // 即時檢查密碼強度（僅在輸入時顯示，不阻止登入）
                if (newPassword.length > 0) {
                  const strength = validatePasswordStrength(newPassword);
                  setPasswordStrength(strength);
                } else {
                  setPasswordStrength(null);
                }
              }}
              placeholder="請輸入密碼"
              className={`w-full rounded-lg border px-3 py-2 text-sm ${
                error
                  ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
                  : isDark
                  ? "border-slate-700 bg-slate-800 text-slate-100 focus:border-indigo-500 focus:ring-indigo-500"
                  : "border-slate-200 bg-white text-slate-700 focus:border-indigo-500 focus:ring-indigo-500"
              } focus:outline-none focus:ring-2`}
              autoFocus
              disabled={isLoggingIn || (lockoutUntil !== null && Date.now() < lockoutUntil)}
            />
            {error && (
              <p className="text-xs text-rose-500 mt-1">{error}</p>
            )}
            {lockoutUntil && Date.now() < lockoutUntil && (
              <p className="text-xs text-amber-500 mt-1">
                ⚠️ 帳號已鎖定，請在 {Math.ceil((lockoutUntil - Date.now()) / 1000)} 秒後再試
              </p>
            )}
            {loginAttempts > 0 && loginAttempts < 5 && (
              <p className="text-xs text-amber-500 mt-1">
                ⚠️ 登入失敗 {loginAttempts} 次，剩餘 {5 - loginAttempts} 次機會
              </p>
            )}
            {passwordStrength && password.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        passwordStrength.score >= 80 ? 'bg-green-500' :
                        passwordStrength.score >= 60 ? 'bg-yellow-500' :
                        passwordStrength.score >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {passwordStrength.score}/100
                  </span>
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <ul className="text-xs text-slate-500 dark:text-slate-400 mt-1 space-y-0.5">
                    {passwordStrength.feedback.slice(0, 3).map((msg, idx) => (
                      <li key={idx}>• {msg}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoggingIn}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? "bg-slate-700 hover:bg-slate-600 text-slate-100"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
              } ${isLoggingIn ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoggingIn || !password.trim() || (lockoutUntil !== null && Date.now() < lockoutUntil)}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isLoggingIn || !password.trim() || (lockoutUntil !== null && Date.now() < lockoutUntil)
                  ? "bg-slate-300 cursor-not-allowed text-slate-500"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {isLoggingIn ? "登入中..." : (lockoutUntil !== null && Date.now() < lockoutUntil) ? "已鎖定" : "登入"}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            💡 提示：您也可以在網址列輸入 <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">#admin=你的密碼</code> 來登入
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppLauncherDemo;
