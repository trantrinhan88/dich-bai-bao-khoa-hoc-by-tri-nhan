'use strict';
'use client';

import React, { useState } from 'react';
import { magazineData } from '@/data/magazineData';
import CrosswordGame from '@/components/CrosswordGame';
import CodeInspector from '@/components/CodeInspector';
import DoDTracker from '@/components/DoDTracker';
import TranslationStudio from '@/components/TranslationStudio';

export default function MainPortal() {
  const [activeTab, setActiveTab] = useState<'magazine' | 'translation'>('magazine');

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* ================= THANH TÙY CHỌN CHẾ ĐỘ (TAB SWITCHER) ================= */}
      <div className="flex justify-center sm:justify-start gap-2 border-b-2 border-black pb-2 bg-[#f5f2eb] p-2 rounded-md">
        <button
          onClick={() => setActiveTab('magazine')}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded border-2 border-black transition-all ${
            activeTab === 'magazine'
              ? 'bg-black text-[#fcfbf7] shadow-sm'
              : 'bg-white text-black hover:bg-neutral-100'
          }`}
        >
          📰 ĐỌC BÁO E-MAGAZINE (QUY TẮC)
        </button>
        <button
          onClick={() => setActiveTab('translation')}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded border-2 border-black transition-all flex items-center gap-1.5 ${
            activeTab === 'translation'
              ? 'bg-black text-[#fcfbf7] shadow-sm'
              : 'bg-white text-black hover:bg-neutral-100'
          }`}
        >
          🚀 STUDIO DỊCH THUẬT PDF &amp; XUẤT BẢN
        </button>
      </div>

      {activeTab === 'magazine' ? (
        <div className="space-y-12 animate-fadeIn">
          {/* ================= PHẦN DẪN NHẬP (INTRODUCTION) ================= */}
          <section className="bg-black text-[#fcfbf7] p-6 rounded-md flex flex-col md:flex-row gap-6 justify-between items-center shadow-md">
            <div className="space-y-2 md:max-w-2xl">
              <h2 className="text-lg font-sans font-black uppercase tracking-wider text-red-500">
                🏛️ QUY TẮC CHUNG: DỊCH THUẬT &amp; LẬP TRÌNH E-MAGAZINE
              </h2>
              <p className="text-xs sm:text-sm font-serif leading-relaxed text-neutral-300">
                Biên dịch viên và kỹ sư dữ liệu thực hiện phân luồng nội dung theo nguyên tắc <strong>Từ trái qua phải - Từ trên xuống dưới</strong>. Grid của ứng dụng sẽ tự động sắp xếp tối ưu, giữ nguyên luồng đọc trên mọi thiết bị di động.
              </p>
            </div>
            <div className="bg-[#fcfbf7] text-black px-4 py-2 text-xs font-black uppercase tracking-widest rounded-sm border border-neutral-300 shadow-sm shrink-0">
              DỊCH THUẬT CHUẨN KHOA HỌC
            </div>
          </section>

          {/* ================= HỆ THỐNG GRID ĐA CỘT (MAIN MAGAZINE GRID) ================= */}
          <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start relative">
            {magazineData.layoutColumns.map((column, index) => (
              <section 
                key={column.columnId} 
                className={`flex flex-col h-full space-y-6 pb-6 ${
                  index !== magazineData.layoutColumns.length - 1 
                    ? 'lg:border-r lg:border-dashed lg:border-neutral-300 lg:pr-8' 
                    : ''
                }`}
              >
                {/* Tiêu đề của từng cột */}
                <div className="border-b-2 border-black pb-2 flex justify-between items-baseline">
                  <h2 className="text-sm sm:text-base font-sans font-black uppercase tracking-tight text-neutral-900">
                    {column.columnHeader}
                  </h2>
                  <span className="text-[10px] font-sans font-black uppercase tracking-widest text-neutral-400">
                    CỘT 0{index + 1}
                  </span>
                </div>

                {/* Danh sách bài viết bên trong cột */}
                <div className="space-y-8 flex-grow">
                  {column.articles.map((article) => (
                    <article 
                      key={article.id} 
                      className="group border-b border-neutral-200 pb-6 last:border-0 last:pb-0"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1.5 flex-grow">
                          {article.badge && (
                            <span className="text-[10px] font-sans font-extrabold tracking-wider text-red-700 uppercase bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-sm inline-block">
                              {article.badge}
                            </span>
                          )}
                          <h3 className="text-lg font-black font-serif leading-snug group-hover:text-blue-900 transition-colors duration-200 cursor-pointer">
                            {article.title}
                          </h3>
                          {article.subtitle && (
                            <h4 className="text-xs text-neutral-500 font-serif italic leading-snug font-medium pt-0.5">
                              {article.subtitle}
                            </h4>
                          )}
                        </div>
                        {article.pageNumber && (
                          <span className="font-sans text-xs font-black text-neutral-400 bg-neutral-100 border border-neutral-200 w-6 h-6 flex items-center justify-center rounded-full group-hover:bg-black group-hover:text-white transition-all pt-[1px]">
                            {article.pageNumber}
                          </span>
                        )}
                      </div>
                      {article.contentSnippet && (
                        <p className="text-xs sm:text-sm text-neutral-700 font-sans leading-relaxed mt-3 font-medium">
                          {article.contentSnippet}
                        </p>
                      )}

                      {/* Lồng trò chơi ô chữ tương tác vào cuối Cột 3 để minh họa Client Component logic */}
                      {article.id === 'back-tech' && (
                        <div className="mt-5 animate-fadeIn">
                          <CrosswordGame />
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </main>

          {/* Nét đứt ngăn cách báo in */}
          <div className="border-t-4 border-double border-black pt-8"></div>

          {/* ================= BẢNG ĐIỀU KHIỂN & INSPECTOR TƯƠNG TÁC (TECHNICAL DASHBOARD) ================= */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Trình thanh sát mã nguồn */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-sans font-black uppercase tracking-tight text-neutral-900">
                  💻 TRÌNH THANH SÁT MÃ NGUỒN (CODE INSPECTOR)
                </h3>
                <p className="text-xs text-neutral-500 font-sans font-medium">
                  Kiểm duyệt kiến trúc cấu trúc hóa kiểu dữ liệu TypeScript và Component hiển thị đa cột Next.js.
                </p>
              </div>
              <CodeInspector />
            </div>

            {/* Bảng theo dõi tiêu chí DoD */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-sans font-black uppercase tracking-tight text-neutral-900">
                  📊 THEO DÕI TIÊU CHÍ HOÀN THÀNH (DOD TRACKER)
                </h3>
                <p className="text-xs text-neutral-500 font-sans font-medium">
                  Bảo chứng chất lượng sản phẩm chuẩn đầu ra, tối ưu hóa công cụ tìm kiếm và độ sắc nét Typography.
                </p>
              </div>
              <DoDTracker />
            </div>
          </section>
        </div>
      ) : (
        <div className="animate-fadeIn">
          <TranslationStudio />
        </div>
      )}

    </div>
  );
}
