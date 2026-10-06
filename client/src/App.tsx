import React, { useState, useEffect } from 'react';
import { ModernAnimatedBackground } from './components/background/ModernAnimatedBackground';
import { MicrolearningHeroShowcase } from './components/showcase/MicrolearningHeroShowcase';
import { AuthActionCard } from './components/auth/AuthActionCard';
import { StudyDashboard } from './components/dashboard/StudyDashboard';
import { GraduationCap, Loader2 } from 'lucide-react';
import { getAndClearPendingOAuthToken } from './services/socialAuth';
import { authApi } from './services/authApi';

import { ErrorBoundary } from './components/common/ErrorBoundary';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('accessToken'));
  });
  const [isProcessingOAuth, setIsProcessingOAuth] = useState<boolean>(false);

  // Tự động nhận diện và hoàn tất đăng nhập Google khi chuyển hướng quay trở lại (Đặc biệt trên Mobile Web)
  useEffect(() => {
    const { idToken } = getAndClearPendingOAuthToken();
    if (idToken) {
      setIsProcessingOAuth(true);
      authApi
        .googleLogin({ idToken })
        .then((response) => {
          localStorage.setItem('accessToken', response.accessToken);
          localStorage.setItem('refreshToken', response.refreshToken);
          setIsAuthenticated(true);
        })
        .catch((err: unknown) => {
          console.error('Lỗi tự động xác thực Google OAuth:', err);
        })
        .finally(() => {
          setIsProcessingOAuth(false);
        });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
  };

  // Màn hình chờ khi đang xử lý token từ Google OAuth (chống chớp tắt / văng trang)
  if (isProcessingOAuth) {
    return (
      <div className="min-h-screen w-full bg-[#070B17] text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4 shadow-lg shadow-indigo-600/20">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
        <h2 className="text-xl font-extrabold text-white mb-1.5 tracking-tight">Đang đăng nhập bằng Google...</h2>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Hệ thống đang đồng bộ dữ liệu tài khoản và chuẩn bị không gian học tập cho bạn.
        </p>
      </div>
    );
  }

  // 1. Nếu đã đăng nhập: Hiển thị ngay màn hình học tập và đồng bộ Offline-First (StudyDashboard)
  if (isAuthenticated) {
    return (
      <ErrorBoundary fallbackTitle="Không thể tải bảng điều khiển học tập">
        <StudyDashboard onLogout={handleLogout} />
      </ErrorBoundary>
    );
  }

  // 2. Nếu chưa đăng nhập: Hiển thị trang giới thiệu và khung Đăng nhập / Đăng ký
  return (
    <div className="relative min-h-screen w-full bg-[#070B17] text-slate-100 flex flex-col justify-center selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Academic Night Background */}
      <ModernAnimatedBackground />

      {/* Mobile Branding Bar (Visible only on screens below lg) */}
      <div className="lg:hidden flex items-center justify-center gap-3 py-6 px-4 z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-cyan-400 p-[1.5px] shadow-lg shadow-indigo-500/30">
          <div className="w-full h-full bg-[#080D1A] rounded-[10px] flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-cyan-300" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">
            MicroLearn
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">
            Nền tảng học thông minh
          </span>
        </div>
      </div>

      {/* Main Container - 1440px layout */}
      <main className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-2 sm:py-4 lg:py-8 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 xl:gap-14 w-full items-center">
          {/* Right Column: Clean Dark Academic Auth Card (~40%) - Hiển thị lên ĐẦU TIÊN trên Mobile (order-1) */}
          <div className="order-1 lg:order-2 lg:col-span-5 xl:col-span-5 w-full flex justify-center">
            <AuthActionCard />
          </div>

          {/* Left Column: Education Hero & Interactive Tablet Showcase (~60%) - Hiển thị sau trên Mobile (order-2) */}
          <div className="order-2 lg:order-1 lg:col-span-7 xl:col-span-7 h-full">
            <MicrolearningHeroShowcase />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
