# 使用 Node.js 18 作為基礎映像
FROM node:18-alpine

# 明確標記這是 Node.js 應用
LABEL runtime="nodejs"
LABEL framework="express"

# 設定工作目錄
WORKDIR /app

# 複製 .npmrc 配置文件（確保可選依賴被安裝）
COPY .npmrc ./

# 複製 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安裝依賴（包括 devDependencies，因為需要 vite 來建置）
# 清理並重新安裝以確保可選依賴項（如 rollup 的原生模組）被正確安裝
RUN rm -rf node_modules package-lock.json && \
    npm install --force

# 複製所有檔案
COPY . .

# 建置應用程式
RUN npm run build

# 驗證建置結果
RUN ls -la dist/ || echo "警告: dist 目錄不存在或為空"

# 創建非 root 用戶
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 更改檔案所有者
RUN chown -R nodejs:nodejs /app

# 暴露端口
EXPOSE 8080

# 設定環境變數
ENV PORT=8080
ENV NODE_ENV=production

# 切換到非 root 用戶
USER nodejs

# 啟動應用程式（明確使用 node）
CMD ["node", "server.js"]


