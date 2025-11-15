import React from "react";
import ReactDOM from "react-dom/client";
import AppLauncherDemo from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

// 檢查根元素是否存在
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("找不到 #root 元素，請確認 index.html 中有 <div id='root'></div>");
}

// 添加錯誤處理
try {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <AppLauncherDemo />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (error) {
  console.error("React 初始化失敗:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: system-ui;">
      <h1 style="color: red;">應用程式載入失敗</h1>
      <p>請檢查瀏覽器控制台的錯誤訊息</p>
      <pre style="background: #f5f5f5; padding: 10px; margin-top: 20px; text-align: left; overflow: auto;">
        ${error instanceof Error ? error.toString() : String(error)}
      </pre>
    </div>
  `;
}
