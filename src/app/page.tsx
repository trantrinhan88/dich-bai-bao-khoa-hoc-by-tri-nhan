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
