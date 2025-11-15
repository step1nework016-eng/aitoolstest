import React from "react";

interface LoadingAnimationProps {
  onComplete: () => void;
}

/**
 * 載入動畫組件
 * 顯示動態渲染動畫後進入主應用
 */
export const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ onComplete }) => {
  const [progress, setProgress] = React.useState(0);
  const [showContent, setShowContent] = React.useState(false);

  React.useEffect(() => {
    // 顯示內容動畫
    const showTimer = setTimeout(() => setShowContent(true), 300);
    
    // 進度條動畫（模擬載入）
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        // 前80%快速，後20%慢速
        const increment = prev < 80 ? 8 : 2;
        return Math.min(prev + increment, 100);
      });
    }, 50);

    // 完成後延遲進入主應用
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2500); // 總共約2.5秒

    return () => {
      clearTimeout(showTimer);
      clearInterval(progressInterval);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
      <div className={`text-center transition-all duration-700 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        {/* Logo/標題 */}
        <div className="mb-8">
          <div className="text-6xl md:text-8xl font-bold text-white mb-4 animate-pulse">
            AIJob
          </div>
          <div className="text-xl md:text-2xl text-white/90 font-medium">
            AI 工具庫
          </div>
        </div>

        {/* 進度條 */}
        <div className="w-64 md:w-80 mx-auto mb-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-white/80 text-sm mt-2">{progress}%</div>
        </div>

        {/* 載入文字 */}
        <div className="text-white/70 text-sm md:text-base animate-pulse">
          載入中...
        </div>

        {/* 動態點 */}
        <div className="flex justify-center gap-2 mt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-white rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

