import React from 'react';
import TranslationStudio from '@/components/TranslationStudio';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Translation & Publishing Studio - Dịch PDF Song Ngữ',
  description: 'Bộ công cụ dịch thuật tài liệu PDF tiếng Anh sang tiếng Việt và xuất bản sách điện tử PDF/EPUB chuyên nghiệp.',
  keywords: 'Dịch thuật PDF, Xuất bản sách điện tử, EPUB, PDF song ngữ, AI Translation',
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] selection:bg-blue-100 relative overflow-hidden">
      
      {/* ================= AMBIENT GLOW BACKDROPS (iPhone Siri/WWDC style) ================= */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] rounded-full bg-blue-400/10 blur-[120px] pointer-events-none animate-pulseGlow" />
      <div className="absolute top-[20%] right-[-200px] w-[500px] h-[500px] rounded-full bg-purple-400/10 blur-[100px] pointer-events-none" style={{ animationDelay: '1.5s' }} />
      <div className="absolute bottom-[-100px] left-[10%] w-[600px] h-[600px] rounded-full bg-pink-400/10 blur-[130px] pointer-events-none" />

      {/* ================= GLOBAL APPLE NAV BAR (44px) ================= */}
      <nav className="h-11 bg-black/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-50 relative text-[12px] font-sans font-normal tracking-tight text-[#cccccc] select-none">
        <div className="max-w-[1024px] w-full mx-auto flex items-center justify-between">
          {/* Glowing Apple Brand Logo */}
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
            <svg className="w-4 h-4 iphone-gradient-text" viewBox="0 0 170 170" fill="currentColor" style={{ filter: 'drop-shadow(0 0 4px rgba(255, 46, 147, 0.4))' }}>
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.13-1.92-14.38-6.12-3.32-2.62-7.2-7.25-11.66-13.88-9.97-14.92-16.73-31.56-20.3-49.95-2.26-11.75-2.28-22.95-.08-33.6 2.2-10.66 6.36-19.23 12.48-25.7 6.13-6.48 13.59-9.76 22.38-9.87 4.12 0 8.95 1.16 14.47 3.49 5.53 2.33 9.4 3.49 11.6 3.49 2.07 0 5.69-1.04 10.87-3.11 7.23-2.88 13.72-4.14 19.45-3.77 15.66 1.03 27.67 6.94 36.03 17.75-13.82 8.35-20.57 19.78-20.25 34.28.32 10.98 4.3 20.08 11.95 27.29 7.64 7.22 16.77 11.28 27.38 12.18-2.33 6.64-5.57 13.27-9.72 19.86zM119.22 30.24c0-7.85 2.76-15.11 8.28-21.79 5.53-6.68 12.35-10.45 20.48-11.3 1.03 8.35-1.72 16.03-8.24 23.01-6.52 6.98-13.62 10.69-21.32 9.94.39-4.22.8-5.63.8-9.86z"/>
            </svg>
            <span className="font-apple-display text-white tracking-tight font-bold">Apple AI Studio</span>
          </div>

          {/* Simulated menu items (hidden on mobile, scannable on desktop) */}
          <div className="hidden md:flex items-center gap-8 text-[#aaaaaa]">
            <span className="hover:text-white transition-colors cursor-pointer">Store</span>
            <span className="hover:text-white transition-colors cursor-pointer">Mac</span>
            <span className="hover:text-white transition-colors cursor-pointer">iPad</span>
            <span className="hover:text-white transition-colors cursor-pointer">iPhone</span>
            <span className="hover:text-white transition-colors cursor-pointer">Watch</span>
            <span className="hover:text-white transition-colors cursor-pointer">Support</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="bg-white/10 text-white hover:bg-white/15 px-2.5 py-0.5 rounded text-[10px] font-sans font-bold uppercase tracking-widest transition-all">
              v2.5 Lite
            </span>
          </div>
        </div>
      </nav>

      {/* ================= SUB APPLE NAV BAR / PRODUCT STRIP (52px) ================= */}
      <header className="h-[52px] sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-black/[0.06] flex items-center justify-between px-6 select-none">
        <div className="max-w-[1024px] w-full mx-auto flex items-center justify-between">
          <h1 className="font-apple-display text-[18px] font-semibold tracking-tight text-[#1d1d1f]">
            AI PDF Translation Studio
          </h1>
          <div className="flex items-center gap-5 text-[13px] font-sans">
            <span className="hidden sm:inline text-neutral-500 font-medium">Trần Trí Nhân Edition</span>
            <a 
              href="#translation-studio-widget" 
              className="bg-[#0066cc] text-white hover:bg-[#0071e3] px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-all duration-200 shadow-sm active:scale-95 hover:shadow"
            >
              Dịch ngay
            </a>
          </div>
        </div>
      </header>

      {/* ================= PREMIUM HERO DISPLAY SECTION ================= */}
      <section className="max-w-[1024px] mx-auto px-6 pt-16 pb-12 text-center relative select-none z-10">
        <div className="space-y-4 animate-fadeIn">
          {/* Mini Gradient Label */}
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-sans font-bold uppercase tracking-widest text-[#0066cc] bg-blue-50 border border-blue-100/50">
            Chuyển ngữ &amp; Chế bản chuyên sâu
          </span>
          {/* Main Hero Title with SF Pro tight style and gradient text */}
          <h2 className="font-apple-display text-4xl sm:text-5xl md:text-[62px] text-[#1d1d1f] font-semibold tracking-tighter leading-[1.08] max-w-4xl mx-auto">
            Dịch thuật khoa học.<br />
            <span className="iphone-gradient-text" style={{ filter: 'drop-shadow(0 0 10px rgba(134, 46, 156, 0.15))' }}>
              Sáng tạo bản in cao cấp.
            </span>
          </h2>
          {/* Tagline */}
          <p className="text-neutral-500 text-lg md:text-[21px] font-sans font-normal tracking-tight leading-relaxed max-w-2xl mx-auto pt-2">
            Đóng gói PDF song ngữ đối chiếu và sách điện tử EPUB tự động thông minh bằng trí tuệ nhân tạo Gemini 2.5 &amp; DeepSeek v4.
          </p>
        </div>
      </section>

      {/* ================= MAIN APPLICATION WIDGET ================= */}
      <main id="translation-studio-widget" className="max-w-[1024px] mx-auto px-6 pb-24 relative z-10 animate-fadeIn" style={{ animationDelay: '0.15s' }}>
        <TranslationStudio />
      </main>

      {/* ================= SUBTLE LEGAL FOOTER ================= */}
      <footer className="bg-[#fafafc] border-t border-black/[0.05] py-12 px-6 text-center text-[12px] font-sans font-normal text-neutral-400 select-none">
        <div className="max-w-[1024px] w-full mx-auto space-y-3">
          <p className="leading-relaxed">
            Thiết kế tuân thủ nguyên tắc Apple Human Interface Guidelines &amp; Visual Identity. 
            Mã nguồn tối ưu cho hiển thị Retina và thao tác vuốt chạm trên thiết bị di động.
          </p>
          <p className="font-medium text-neutral-500">
            © 2026 Trần Trí Nhân • AI Translation &amp; Publishing Services. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
