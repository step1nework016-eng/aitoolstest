import React from "react";
import { sanitizeAppName, sanitizeDescription, sanitizeCategoryName, sanitizeTags, isValidUrl } from "../utils/security";
import { isValidImageMime, isValidFileSize, isValidDataUrl, validateImageFileContent } from "../utils/advancedSecurity";

/** ========= 型別定義 ========= */
type Category = string;

type App = {
  name: string;
  icon: string;
  description: string;
  href: string;
  category: Category;
  tags?: string[];
};

type Catalog = {
  categories: Category[];
  apps: App[];
};

type AdminPanelProps = {
  catalog: Catalog;
  isDark: boolean;
  onCatalogChange: (newCatalog: Catalog) => void;
  onSave: (catalog: Catalog) => Promise<boolean>;
  onShowToast: (message: string) => void;
  onClose: () => void;
};

/** ========= 管理面板主組件 ========= */
export const AdminPanel: React.FC<AdminPanelProps> = ({
  catalog,
  isDark,
  onCatalogChange,
  onSave,
  onShowToast,
  onClose,
}) => {
  const [activeTab, setActiveTab] = React.useState<"apps" | "categories">("apps");
  const [editingApp, setEditingApp] = React.useState<App | null>(null);
  const [editingCategory, setEditingCategory] = React.useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  /** ====== 應用程式管理 ====== */
  const handleCreateApp = () => {
    setEditingApp({
      name: "",
      icon: "🧩",
      description: "",
      href: "",
      category: catalog.categories[0] || "AI員工",
      tags: [],
    });
  };

  const handleEditApp = (app: App) => {
    setEditingApp({ ...app });
  };

  const handleDeleteApp = async (app: App) => {
    if (!window.confirm(`確定要刪除「${app.name}」嗎？此操作無法復原。`)) return;

    const newCatalog = {
      ...catalog,
      apps: catalog.apps.filter(
        (a) => !(a.name === app.name && a.href === app.href)
      ),
    };
    onCatalogChange(newCatalog);

    setIsSaving(true);
    const success = await onSave(newCatalog);
    setIsSaving(false);

    if (success) {
      onShowToast("已刪除應用程式 ✓");
    } else {
      onShowToast("已刪除（草稿）• 請匯出 catalog.json 並上傳");
    }
  };

  const handleSaveApp = async (app: App) => {
    // 輸入驗證和清理
    if (!app.name || !app.name.trim()) {
      onShowToast("應用程式名稱不能為空");
      return;
    }

    if (!app.href || !app.href.trim()) {
      onShowToast("應用程式連結不能為空");
      return;
    }

    if (!isValidUrl(app.href)) {
      onShowToast("應用程式連結格式無效");
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

    const isEdit = catalog.apps.some(
      (a) => a.name === editingApp?.name && a.href === editingApp?.href
    );

    let newCatalog: Catalog;
    if (isEdit && editingApp) {
      // 編輯模式：替換現有應用
      newCatalog = {
        ...catalog,
        apps: catalog.apps.map((a) =>
          a.name === editingApp.name && a.href === editingApp.href ? sanitizedApp : a
        ),
      };
    } else {
      // 新增模式：添加新應用
      newCatalog = {
        ...catalog,
        apps: [...catalog.apps, sanitizedApp],
      };
    }

    onCatalogChange(newCatalog);
    setEditingApp(null);

    setIsSaving(true);
    const success = await onSave(newCatalog);
    setIsSaving(false);

    if (success) {
      onShowToast(isEdit ? "已更新應用程式 ✓" : "已新增應用程式 ✓");
    } else {
      onShowToast(isEdit ? "已更新（草稿）• 請匯出 catalog.json 並上傳" : "已新增（草稿）• 請匯出 catalog.json 並上傳");
    }
  };

  /** ====== 分類管理 ====== */
  const handleCreateCategory = () => {
    setNewCategoryName("");
    setEditingCategory("");
  };

  const handleEditCategory = (category: string) => {
    setNewCategoryName(category);
    setEditingCategory(category);
  };

  const handleDeleteCategory = async (category: string) => {
    // 檢查是否有應用程式使用此分類
    const appsInCategory = catalog.apps.filter((a) => a.category === category);
    if (appsInCategory.length > 0) {
      const confirm = window.confirm(
        `「${category}」分類中有 ${appsInCategory.length} 個應用程式。\n\n刪除分類後，這些應用程式將被移到第一個分類。\n\n確定要刪除嗎？`
      );
      if (!confirm) return;

      // 將應用程式移到第一個分類
      const firstCategory = catalog.categories.find((c) => c !== category) || catalog.categories[0];
      const newCatalog = {
        categories: catalog.categories.filter((c) => c !== category),
        apps: catalog.apps.map((a) =>
          a.category === category ? { ...a, category: firstCategory } : a
        ),
      };
      onCatalogChange(newCatalog);

      setIsSaving(true);
      const success = await onSave(newCatalog);
      setIsSaving(false);

      if (success) {
        onShowToast("已刪除分類並移動應用程式 ✓");
      } else {
        onShowToast("已刪除（草稿）• 請匯出 catalog.json 並上傳");
      }
    } else {
      const newCatalog = {
        ...catalog,
        categories: catalog.categories.filter((c) => c !== category),
      };
      onCatalogChange(newCatalog);

      setIsSaving(true);
      const success = await onSave(newCatalog);
      setIsSaving(false);

      if (success) {
        onShowToast("已刪除分類 ✓");
      } else {
        onShowToast("已刪除（草稿）• 請匯出 catalog.json 並上傳");
      }
    }
  };

  const handleSaveCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;

    // 驗證和清理分類名稱
    const sanitizedName = sanitizeCategoryName(name);
    if (!sanitizedName) {
      onShowToast("分類名稱無效");
      return;
    }

    const isEdit = editingCategory !== null && editingCategory !== "";

    if (isEdit && editingCategory) {
      // 編輯模式：重新命名分類
      if (editingCategory === name) {
        setEditingCategory(null);
        setNewCategoryName("");
        return;
      }

      if (catalog.categories.includes(name) && name !== editingCategory) {
        alert("此分類名稱已存在");
        return;
      }

      const newCatalog = {
        categories: catalog.categories.map((c) => (c === editingCategory ? name : c)),
        apps: catalog.apps.map((a) =>
          a.category === editingCategory ? { ...a, category: name } : a
        ),
      };
      onCatalogChange(newCatalog);
      setEditingCategory(null);
      setNewCategoryName("");

      setIsSaving(true);
      const success = await onSave(newCatalog);
      setIsSaving(false);

      if (success) {
        onShowToast("已更新分類名稱 ✓");
      } else {
        onShowToast("已更新（草稿）• 請匯出 catalog.json 並上傳");
      }
    } else {
      // 新增模式：添加新分類
      if (catalog.categories.includes(sanitizedName)) {
        onShowToast("此分類名稱已存在");
        return;
      }

      const newCatalog = {
        ...catalog,
        categories: [...catalog.categories, sanitizedName],
      };
      onCatalogChange(newCatalog);
      setNewCategoryName("");

      setIsSaving(true);
      const success = await onSave(newCatalog);
      setIsSaving(false);

      if (success) {
        onShowToast("已新增分類 ✓");
      } else {
        onShowToast("已新增（草稿）• 請匯出 catalog.json 並上傳");
      }
    }
  };

  /** ====== 匯出功能 ====== */
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(catalog, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "catalog.json";
    a.click();
    onShowToast("已下載 catalog.json • 請上傳到 public/ 目錄並重新部署");
  };

  /** ====== UI 渲染 ====== */
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 ${
        isDark ? "text-slate-100" : "text-slate-900"
      }`}
      onClick={(e) => {
        // 點擊背景時關閉面板
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col ${
          isDark ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 標題列 */}
        <div
          className={`flex items-center justify-between p-6 border-b ${
            isDark ? "border-slate-700" : "border-slate-200"
          }`}
        >
          <div>
            <h2 className="text-2xl font-bold">📋 管理面板</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              管理應用程式和分類
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <span className="text-xs text-indigo-500 animate-pulse">儲存中...</span>
            )}
            <button
              onClick={handleExport}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-100"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              ⬇️ 匯出 catalog.json
            </button>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-100"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              ✕ 關閉
            </button>
          </div>
        </div>

        {/* 標籤切換 */}
        <div
          className={`flex border-b ${
            isDark ? "border-slate-700" : "border-slate-200"
          }`}
        >
          <button
            onClick={() => setActiveTab("apps")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "apps"
                ? "text-indigo-500 border-b-2 border-indigo-500"
                : isDark
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📱 應用程式 ({catalog.apps.length})
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === "categories"
                ? "text-indigo-500 border-b-2 border-indigo-500"
                : isDark
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            📂 分類 ({catalog.categories.length})
          </button>
        </div>

        {/* 內容區域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "apps" ? (
            <AppsManagement
              apps={catalog.apps}
              categories={catalog.categories}
              isDark={isDark}
              onCreate={handleCreateApp}
              onEdit={handleEditApp}
              onDelete={handleDeleteApp}
            />
          ) : (
            <CategoriesManagement
              categories={catalog.categories}
              apps={catalog.apps}
              isDark={isDark}
              newCategoryName={newCategoryName}
              editingCategory={editingCategory}
              onNewCategoryChange={setNewCategoryName}
              onCreate={handleCreateCategory}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              onSave={handleSaveCategory}
            />
          )}
        </div>

        {/* 編輯應用程式 Modal */}
        {editingApp && (
          <AppEditorModal
            app={editingApp}
            categories={catalog.categories}
            isDark={isDark}
            onClose={() => setEditingApp(null)}
            onSave={handleSaveApp}
          />
        )}
      </div>
    </div>
  );
};

/** ========= 應用程式管理列表 ========= */
const AppsManagement: React.FC<{
  apps: App[];
  categories: Category[];
  isDark: boolean;
  onCreate: () => void;
  onEdit: (app: App) => void;
  onDelete: (app: App) => void;
}> = ({ apps, categories, isDark, onCreate, onEdit, onDelete }) => {
  const [searchKeyword, setSearchKeyword] = React.useState("");
  const [filterCategory, setFilterCategory] = React.useState<string>("all");

  const filteredApps = apps.filter((app) => {
    const matchKeyword =
      !searchKeyword ||
      app.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      app.description.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (app.tags || []).some((tag) =>
        tag.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    const matchCategory = filterCategory === "all" || app.category === filterCategory;
    return matchKeyword && matchCategory;
  });

  return (
    <div className="space-y-4">
      {/* 操作列 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onCreate}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isDark
              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
              : "bg-indigo-600 hover:bg-indigo-700 text-white"
          }`}
        >
          ➕ 新增應用程式
        </button>

        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="搜尋應用程式..."
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              isDark
                ? "border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
                : "border-slate-200 bg-white text-slate-700 placeholder:text-slate-400"
            }`}
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              isDark
                ? "border-slate-700 bg-slate-800 text-slate-100"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <option value="all">全部分類</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 應用程式列表 */}
      {filteredApps.length === 0 ? (
        <div
          className={`text-center py-12 rounded-lg ${
            isDark ? "bg-slate-800/50" : "bg-slate-50"
          }`}
        >
          <p className="text-slate-500 dark:text-slate-400">
            {searchKeyword || filterCategory !== "all"
              ? "找不到符合條件的應用程式"
              : "尚無應用程式，點擊上方按鈕新增"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredApps.map((app, index) => (
            <div
              key={`${app.name}-${app.href}-${index}`}
              className={`p-4 rounded-lg border ${
                isDark
                  ? "bg-slate-800/50 border-slate-700"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* 圖示 */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center overflow-hidden ${
                      isDark ? "bg-slate-700" : "bg-white"
                    }`}
                  >
                    {renderIcon(app.icon, app.name)}
                  </div>
                </div>

                {/* 內容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm">{app.name}</h3>
                      <p className="text-xs text-indigo-500 mt-0.5">{app.category}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {app.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <a
                          href={app.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-500 hover:underline"
                        >
                          {app.href}
                        </a>
                      </div>
                      {app.tags && app.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {app.tags.map((tag) => (
                            <span
                              key={tag}
                              className={`text-[10px] px-2 py-0.5 rounded-full ${
                                isDark
                                  ? "bg-slate-700 text-slate-300"
                                  : "bg-slate-200 text-slate-700"
                              }`}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 操作按鈕 */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => onEdit(app)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isDark
                            ? "bg-slate-700 hover:bg-slate-600 text-slate-100"
                            : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                        }`}
                      >
                        ✏️ 編輯
                      </button>
                      <button
                        onClick={() => onDelete(app)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isDark
                            ? "bg-rose-600/20 hover:bg-rose-600/30 text-rose-400"
                            : "bg-rose-50 hover:bg-rose-100 text-rose-600"
                        }`}
                      >
                        🗑️ 刪除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** ========= 分類管理列表 ========= */
const CategoriesManagement: React.FC<{
  categories: Category[];
  apps: App[];
  isDark: boolean;
  newCategoryName: string;
  editingCategory: string | null;
  onNewCategoryChange: (name: string) => void;
  onCreate: () => void;
  onEdit: (category: string) => void;
  onDelete: (category: string) => void;
  onSave: () => void;
}> = ({
  categories,
  apps,
  isDark,
  newCategoryName,
  editingCategory,
  onNewCategoryChange,
  onCreate,
  onEdit,
  onDelete,
  onSave,
}) => {
  return (
    <div className="space-y-4">
      {/* 新增分類表單 */}
      <div
        className={`p-4 rounded-lg border ${
          isDark ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"
        }`}
      >
        <h3 className="text-sm font-semibold mb-3">
          {editingCategory ? "✏️ 編輯分類" : "➕ 新增分類"}
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => onNewCategoryChange(e.target.value)}
            placeholder="輸入分類名稱..."
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              isDark
                ? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500"
                : "border-slate-200 bg-white text-slate-700 placeholder:text-slate-400"
            }`}
          />
          <button
            onClick={onSave}
            disabled={!newCategoryName.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              newCategoryName.trim()
                ? isDark
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
                : isDark
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {editingCategory ? "💾 儲存" : "➕ 新增"}
          </button>
          {editingCategory && (
            <button
              onClick={() => {
                onNewCategoryChange("");
                onCreate();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? "bg-slate-700 hover:bg-slate-600 text-slate-100"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
              }`}
            >
              取消
            </button>
          )}
        </div>
      </div>

      {/* 分類列表 */}
      {categories.length === 0 ? (
        <div
          className={`text-center py-12 rounded-lg ${
            isDark ? "bg-slate-800/50" : "bg-slate-50"
          }`}
        >
          <p className="text-slate-500 dark:text-slate-400">尚無分類，請新增分類</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {categories.map((category) => {
            const appsInCategory = apps.filter((a) => a.category === category);
            const isEditing = editingCategory === category;

            return (
              <div
                key={category}
                className={`p-4 rounded-lg border ${
                  isDark
                    ? "bg-slate-800/50 border-slate-700"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{category}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {appsInCategory.length} 個應用程式
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(category)}
                      disabled={isEditing}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isEditing
                          ? isDark
                            ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : isDark
                          ? "bg-slate-700 hover:bg-slate-600 text-slate-100"
                          : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                      }`}
                    >
                      ✏️ 編輯
                    </button>
                    <button
                      onClick={() => onDelete(category)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isDark
                          ? "bg-rose-600/20 hover:bg-rose-600/30 text-rose-400"
                          : "bg-rose-50 hover:bg-rose-100 text-rose-600"
                      }`}
                    >
                      🗑️ 刪除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** ========= 應用程式編輯器 Modal ========= */
const AppEditorModal: React.FC<{
  app: App;
  categories: Category[];
  isDark: boolean;
  onClose: () => void;
  onSave: (app: App) => void;
}> = ({ app, categories, isDark, onClose, onSave }) => {
  const [name, setName] = React.useState(app.name);
  const [href, setHref] = React.useState(app.href);
  const [icon, setIcon] = React.useState(app.icon);
  const [category, setCategory] = React.useState<Category>(app.category);
  const [description, setDescription] = React.useState(app.description);
  const [tags, setTags] = React.useState((app.tags || []).join(", "));
  const [preview, setPreview] = React.useState<string | null>(null);
  const [isFetchingLogo, setIsFetchingLogo] = React.useState(false);
  const [uploadedImages, setUploadedImages] = React.useState<string[]>([]);

  const canSave = name.trim() && href.trim();

  // Logo 快取功能（與主應用相同）
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
      const entries = Object.entries(cacheData);
      if (entries.length > 100) {
        const recent = entries.slice(-100);
        localStorage.setItem("aijob-logo-cache", JSON.stringify(Object.fromEntries(recent)));
      } else {
        localStorage.setItem("aijob-logo-cache", JSON.stringify(cacheData));
      }
    } catch {}
  };

  const fetchLogoFromUrl = async (url: string, useCache = true) => {
    if (!url || !url.trim()) return null;

    try {
      let domain = "";
      try {
        const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
        domain = urlObj.hostname;
      } catch {
        return null;
      }

      if (useCache) {
        const cached = getCachedLogo(url);
        if (cached) {
          return cached;
        }
      }

      const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      const testImage = (imgUrl: string): Promise<boolean> => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = imgUrl;
          setTimeout(() => resolve(false), 3000);
        });
      };

      const googleWorks = await testImage(googleFaviconUrl);
      if (googleWorks) {
        setCachedLogo(url, googleFaviconUrl);
        return googleFaviconUrl;
      }

      try {
        const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
        const faviconUrl = `${urlObj.origin}/favicon.ico`;
        const faviconWorks = await testImage(faviconUrl);
        if (faviconWorks) {
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

  // URL 變更時自動抓取 Logo
  React.useEffect(() => {
    if (!href || !href.trim()) {
      setIcon("🧩");
      setPreview(null);
      return;
    }

    const cached = getCachedLogo(href);
    if (cached) {
      setIcon(cached);
      setPreview(cached);
      if (!name.trim()) {
        try {
          const urlObj = new URL(href.startsWith("http") ? href : `https://${href}`);
          const domainName = urlObj.hostname.replace("www.", "").split(".")[0];
          setName(domainName.charAt(0).toUpperCase() + domainName.slice(1));
        } catch {}
      }
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingLogo(true);
      try {
        const logoUrl = await fetchLogoFromUrl(href, false);
        if (logoUrl) {
          setIcon(logoUrl);
          setPreview(logoUrl);
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
  }, [href]);

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
      setIcon(dataUrls[0]);
      setPreview(dataUrls[0]);
    }
  };

  const handleFetchLogo = async () => {
    if (!href || !href.trim()) {
      alert("請先輸入 URL");
      return;
    }

    setIsFetchingLogo(true);
    try {
      const logoUrl = await fetchLogoFromUrl(href, false);
      if (logoUrl) {
        setIcon(logoUrl);
        setPreview(logoUrl);
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div
        className={`w-full max-w-2xl rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto ${
          isDark ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {app.name ? "✏️ 編輯應用程式" : "➕ 新增應用程式"}
          </h3>
          <button
            onClick={onClose}
            className={`text-slate-400 hover:text-slate-600 dark:hover:text-slate-200`}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">名稱 *</label>
            <input
              className={`w-full rounded-lg border px-3 py-2 text-sm ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-slate-100"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              placeholder="例如：我的工具"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">連結（URL） *</label>
            <div className="flex gap-2">
              <input
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-slate-100"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
                placeholder="https://example.com"
                value={href}
                onChange={(e) => setHref(e.target.value)}
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
              >
                {isFetchingLogo ? "抓取中..." : "🔄 抓取 Logo"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">圖示</label>
              <input
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-slate-100"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
                placeholder="🧩 或 /images/myicon.png"
                value={icon}
                onChange={(e) => {
                  setIcon(e.target.value);
                  setPreview(null);
                }}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">上傳圖片</label>
              <input
                type="file"
                accept="image/*"
                multiple
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-slate-100"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
                onChange={onFileChange}
              />
            </div>
          </div>

          {(preview || icon.startsWith("data:image") || icon.startsWith("http") || uploadedImages.length > 0) && (
            <div>
              <div className="text-xs text-slate-500 mb-2">預覽：</div>
              <div className="h-20 w-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-indigo-300 border-dashed">
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
              {uploadedImages.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {uploadedImages.map((img, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setIcon(img);
                        setPreview(img);
                      }}
                      className={`h-12 w-12 rounded-lg overflow-hidden border-2 ${
                        (preview || icon) === img
                          ? "border-indigo-500 ring-2 ring-indigo-200"
                          : "border-slate-200"
                      }`}
                    >
                      <img src={img} alt={`圖片 ${index + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium block mb-1">分類</label>
            <select
              className={`w-full rounded-lg border px-3 py-2 text-sm ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-slate-100"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">簡介</label>
            <textarea
              className={`w-full rounded-lg border px-3 py-2 text-sm ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-slate-100"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              rows={3}
              placeholder="這個工具可以幫你做什麼？"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1">標籤（以逗號分隔）</label>
            <input
              className={`w-full rounded-lg border px-3 py-2 text-sm ${
                isDark
                  ? "border-slate-700 bg-slate-800 text-slate-100"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              placeholder="例如：中文, 高效率"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDark
                ? "bg-slate-700 hover:bg-slate-600 text-slate-100"
                : "bg-slate-200 hover:bg-slate-300 text-slate-700"
            }`}
          >
            取消
          </button>
          <button
            disabled={!canSave}
            onClick={() =>
              onSave({
                name: name.trim(),
                href: href.trim(),
                icon: icon.trim() || "🧩",
                category,
                description: description.trim(),
                tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
              })
            }
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              canSave
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-slate-300 cursor-not-allowed text-slate-500"
            }`}
          >
            💾 儲存
          </button>
        </div>
      </div>
    </div>
  );
};

/** ========= 圖示渲染 ========= */
function renderIcon(icon: string, alt = "") {
  const isImage =
    typeof icon === "string" &&
    (icon.startsWith("/images/") || icon.startsWith("http") || icon.startsWith("data:image"));
  if (isImage)
    return <img src={icon} alt={alt} className="h-full w-full object-contain" loading="lazy" />;
  return <span className="text-2xl">{icon}</span>;
}

/** ========= File → DataURL ========= */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("讀取檔案失敗"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

