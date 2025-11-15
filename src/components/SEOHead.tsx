import React from "react";

/**
 * SEO Head 組件
 * 用於動態更新頁面的 meta 標籤和結構化資料
 */
interface SEOHeadProps {
  title?: string;
  description?: string;
  currentPage?: "home" | "tools";
}

export const SEOHead: React.FC<SEOHeadProps> = ({ 
  title = "AIJob 自動化學院 - AI 工具庫與自動化教學",
  description = "AIJob 自動化學院專注於 AI 與自動化技術教學，提供 AI 工具庫、n8n 自動化課程、LINE 社群、Discord 社群等資源，從零打造你的工作流效率。",
  currentPage = "home"
}) => {
  const siteUrl = "https://aijobaitools.zeabur.app";
  const imageUrl = "https://static.wixstatic.com/media/9705bb_dd62dc9b5ff6496a9a9560ca516f9851~mv2.png";

  React.useEffect(() => {
    // 動態更新 document.title
    document.title = title;
    
    // 動態更新 meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // 更新 Open Graph
    const updateOGMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateOGMeta('og:title', title);
    updateOGMeta('og:description', description);
    updateOGMeta('og:url', siteUrl + (currentPage === "tools" ? "/tools" : "/"));

    // 更新 Twitter Card
    const updateTwitterMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateTwitterMeta('twitter:title', title);
    updateTwitterMeta('twitter:description', description);

    // 添加結構化資料（使用最新的資料）
    const currentStructuredData = {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "name": "AIJob 自動化學院",
      "alternateName": "AIJob 自動化學院",
      "url": siteUrl,
      "logo": imageUrl,
      "description": description,
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "TW",
        "addressRegion": "台北市",
        "addressLocality": "內湖區",
        "streetAddress": "康寧路三段之7號3樓"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+886-02-6605-7111",
        "contactType": "customer service",
        "email": "aiagentg888@gmail.com",
        "areaServed": "TW",
        "availableLanguage": ["zh-Hant", "zh-TW"]
      },
      "sameAs": [
        "https://www.aijob.com.tw/",
        "https://www.instagram.com/aijobschool/",
        "https://youtube.com/@aijobschool",
        "https://discord.gg/Dzm2P7rHyg"
      ],
      "offers": {
        "@type": "Offer",
        "name": "n8n 行銷 AI 自動化課程",
        "url": "https://onsell.aijob.com.tw",
        "priceCurrency": "TWD",
        "availability": "https://schema.org/InStock"
      }
    };

    let script = document.querySelector('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(currentStructuredData, null, 2);
  }, [title, description, currentPage, siteUrl, imageUrl]);

  return null; // 此組件不渲染任何內容
};

