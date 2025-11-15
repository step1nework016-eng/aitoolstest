# 🧠 AIJob 工具庫 (AI Tool Launcher Demo)

集中管理你的 **AI 工具與智能體**，快速開啟對應任務、聊天或生成工作。這個專案展示了如何以 React + Tailwind + Vite 打造可動態擴充的 AI 工具啟動平台，並部署至 Zeabur 雲端。

---

## 🚀 專案特色

### 🔹 一站式 AI 工具啟動中心
- 將常用 AI 工具（如 GPT、Gemini、Manus、ReelMind）集中於單一介面。
- 以卡片化設計顯示工具資訊與標籤（Tag）。
- 支援「收藏」與「搜尋」功能，快速找到目標工具。

### 🔹 外部連結支援
- 支援外部工具快速導向，例如：
  - [ReelMind 短影音智能體](https://reelmind.aijob.com.tw)：輸入需求即可自動生成帳號定位、腳本選題與短影音腳本。

### 🔹 RWD 響應式設計
- 適用桌機與手機，側邊導覽欄可自動隱藏或展開。

### 🔹 Zeabur 雲端部署
- 一鍵自動化部署，無需額外伺服器設定。

---

## 🧩 技術架構

| 技術 | 用途 |
|-------|------|
| **React + TypeScript** | 建立主視覺與元件邏輯 |
| **Vite** | 快速開發與打包工具 |
| **Tailwind CSS** | UI 樣式框架 |
| **Zeabur** | 雲端部署與持續整合 |

---

## ⚙️ 安裝與啟動

```bash
# 1️⃣ 安裝依賴
npm install

# 2️⃣ 啟動開發伺服器
npm run dev

# 3️⃣ 打包專案
npm run build

# 4️⃣ 預覽本地部署結果
npm run preview
```

---

## ☁️ 部署教學（Zeabur）

1. 前往 [Zeabur](https://zeabur.com) 建立新專案。
2. 連結你的 GitHub 儲存庫（例如 `AIJobtool`）。
3. 部署設定：
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. 按下 Deploy，即可自動化上線。

---

## 📦 檔案結構

```
AIJobtool/
├── index.html            # 主入口 HTML
├── package.json          # 專案依賴與指令
├── tsconfig.json         # TypeScript 設定
├── vite.config.ts        # Vite 打包設定
└── src/
    ├── App.tsx           # 主應用程式元件
    ├── main.tsx          # React 入口
    └── index.css         # 樣式表
```

---

## 🧭 如何新增新工具（AI 智能體）

1. 打開 `src/App.tsx`
2. 在 `apps` 陣列中新增一個物件：

```ts
{
  name: "你的工具名稱",
  icon: "💡",
  description: "工具簡介文字",
  href: "https://example.com",
  category: "AI智能體",
  tags: ["標籤1", "標籤2"]
}
```

3. 儲存後重新部署，即可在介面中自動顯示卡片。

---

## 🧩 已整合應用程式清單

| 名稱 | 類型 | 功能 |
|------|------|------|
| **ReelMind 短影音智能體** | 內容生成 | 自動生成短影音腳本、定位與主題 |
| **HR 招募智能體** | 人才分析 | 面試模擬與人才畫像分析 |
| **GPT / Gemini / Manus** | 對話型 AI | 不同模型的智能聊天支援 |

---

## 🧑‍💻 作者與版權

© 2025 AIJob 學院 — 專案示範用於 AI 工具整合與自動化教學。
