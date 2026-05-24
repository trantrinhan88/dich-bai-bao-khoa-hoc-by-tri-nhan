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
    <div className="min-h-screen bg-[#fcfbf7] text-[#111111] p-4 md:p-8 lg:p-12 selection:bg-neutral-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ================= MAIN TRANSLATION INTERFACE ================= */}
        <main className="animate-fadeIn">
          <TranslationStudio />
        </main>



      </div>
    </div>
  );
}
