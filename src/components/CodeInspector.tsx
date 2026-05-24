'use strict';
'use client';

import React, { useState } from 'react';

const TYPES_CODE = `// types/magazine.ts

export interface IArticleItem {
  id: string;
  title: string;
  subtitle?: string;
  contentSnippet?: string;
  pageNumber?: number;
  badge?: string; // Dùng cho các thẻ phân loại
}

export interface IMagazineColumn {
  columnId: 'left' | 'center' | 'right';
  columnHeader: string;
  articles: IArticleItem[];
}

export interface IMagazineData {
  volumeInfo: string;
  publishDate: string;
  layoutColumns: IMagazineColumn[];
}`;

const PORTAL_CODE = `// app/magazine-portal/page.tsx
import React from 'react';
import { IMagazineData } from '@/types/magazine';

interface Props {
  magazineData: IMagazineData;
}

export default function MagazinePortal({ magazineData }: Props) {
  return (
    <div className="min-h-screen bg-[#fcfbf7] text-[#111111] font-serif p-4 md:p-8">
      
      {/* KHU VỰC ĐẦU BÁO (HEADER) */}
      <header className="border-b-4 border-black pb-4 mb-10 flex flex-col md:flex-row justify-between items-baseline">
        <div>
          <h1 className="text-5xl md:text-7xl font-sans font-black uppercase tracking-tighter">
            E-MAGAZINE PORTAL
          </h1>
          <p className="text-sm font-sans font-bold mt-2 tracking-wide uppercase text-gray-600">
            {magazineData.volumeInfo} — {magazineData.publishDate}
          </p>
        </div>
      </header>

      {/* HỆ THỐNG GRID ĐA CỘT (Từ trái qua phải trên Desktop) */}
      <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
        {magazineData.layoutColumns.map((column, index) => (
          <section 
            key={column.columnId} 
            className={\`flex flex-col h-full space-y-6 pb-6 \${
              index !== magazineData.layoutColumns.length - 1 ? 'lg:border-r lg:border-gray-200 lg:pr-6' : ''
            }\`}
          >
            <h2 className="text-lg font-sans font-black border-b-2 border-black pb-1 uppercase tracking-tight text-neutral-800">
              {column.columnHeader}
            </h2>

            <div className="space-y-6 flex-grow">
              {column.articles.map((article) => (
                <article key={article.id} className="group border-b border-gray-100 pb-4 last:border-0 cursor-pointer">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      {article.badge && (
                        <span className="text-xs font-sans font-bold tracking-wider text-red-700 uppercase block">
                          {article.badge}
                        </span>
                      )}
                      <h3 className="text-lg font-bold leading-snug group-hover:text-blue-900 transition-colors">
                        {article.title}
                      </h3>
                    </div>
                    {article.pageNumber && (
                      <span className="font-sans text-sm font-bold text-neutral-400 group-hover:text-black pt-1">
                        {article.pageNumber}
                      </span>
                    )}
                  </div>
                  {article.contentSnippet && (
                    <p className="text-sm text-neutral-600 font-sans leading-relaxed mt-2">
                      {article.contentSnippet}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>
      
    </div>
  );
}`;

export default function CodeInspector() {
  const [activeTab, setActiveTab] = useState<'types' | 'portal'>('types');
  const [copied, setCopied] = useState<boolean>(false);

  const getCode = () => {
    return activeTab === 'types' ? TYPES_CODE : PORTAL_CODE;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCode());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Không thể copy code: ', err);
    }
  };

  // Simple and fast syntax highlighter for display
  const highlight = (code: string) => {
    // Escape HTML first
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Highlight comments: // ...
    escaped = escaped.replace(/(\/\/.*)/g, '<span class="text-emerald-600 italic font-mono">$1</span>');

    // Highlight types and keywords: export, interface, string, number, import, from, return, const, let, function, default, export default
    const keywords = [
      'export', 'interface', 'string', 'number', 'boolean', 'import', 'from',
      'return', 'const', 'let', 'function', 'default', 'any', 'Props', 'void'
    ];
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
      escaped = escaped.replace(regex, `<span class="text-blue-700 font-bold">$1</span>`);
    });

    // Highlight strings
    escaped = escaped.replace(/('[^']*'|"[^"]*")/g, '<span class="text-amber-700">$1</span>');

    // Highlight TSX template literals
    escaped = escaped.replace(/(\`[^\`]*\`)/g, '<span class="text-rose-700">$1</span>');

    return escaped;
  };

  return (
    <div className="bg-[#fdfdfc] border-2 border-black rounded-lg overflow-hidden shadow-sm flex flex-col text-sm text-[#111111] font-sans">
      
      {/* Header bar */}
      <div className="bg-black text-[#fcfbf7] px-4 py-3 flex flex-wrap justify-between items-center gap-2 border-b-2 border-black">
        <h4 className="font-sans font-black uppercase tracking-wider text-xs flex items-center gap-1.5">
          🛠️ SECTION 2: KIẾN TRÚC MÃ NGUỒN NEXT.JS
        </h4>
        
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="text-xs uppercase font-extrabold tracking-wider bg-[#fcfbf7] hover:bg-neutral-200 text-black px-3 py-1 rounded-sm active:scale-95 transition-all flex items-center gap-1"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
              Đã sao chép!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Sao chép
            </>
          )}
        </button>
      </div>

      {/* Tabs list */}
      <div className="bg-[#f5f2eb] px-2 pt-2 border-b border-neutral-300 flex gap-1">
        <button
          onClick={() => setActiveTab('types')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t border-t border-x border-black transition-all ${
            activeTab === 'types'
              ? 'bg-[#fdfdfc] text-black border-black border-b-[#fdfdfc] translate-y-[1px] z-10'
              : 'bg-neutral-200 text-neutral-500 border-transparent hover:bg-neutral-300'
          }`}
        >
          types/magazine.ts
        </button>
        <button
          onClick={() => setActiveTab('portal')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t border-t border-x border-black transition-all ${
            activeTab === 'portal'
              ? 'bg-[#fdfdfc] text-black border-black border-b-[#fdfdfc] translate-y-[1px] z-10'
              : 'bg-neutral-200 text-neutral-500 border-transparent hover:bg-neutral-300'
          }`}
        >
          app/magazine-portal/page.tsx
        </button>
      </div>

      {/* Code window */}
      <div className="p-4 bg-[#fdfdfc] overflow-x-auto max-h-[350px] font-mono text-xs leading-relaxed text-neutral-800">
        <pre 
          className="whitespace-pre"
          dangerouslySetInnerHTML={{ __html: highlight(getCode()) }}
        />
      </div>

      {/* Footer / Context */}
      <div className="bg-[#f5f2eb] border-t border-neutral-300 px-4 py-2.5 text-[11px] text-neutral-500 font-sans italic leading-relaxed">
        {activeTab === 'types' 
          ? "Đặc tả Interface: Đảm bảo dữ liệu từ biên dịch viên được ánh xạ tuần tự 3 cột left - center - right."
          : "Grid Responsive: Tự động giữ nguyên thứ tự cột trên Desktop nhưng xếp chồng thông minh trên Mobile."
        }
      </div>

    </div>
  );
}
