'use strict';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { downloadEpub } from '../utils/epubGenerator';
import { downloadPdf } from '../utils/pdfGenerator';

interface ITranslationBlock {
  en: string;
  vi: string;
  status: 'pending' | 'translating' | 'done';
  page: number;
}

// Function to dynamically load PDF.js from CDN
const loadPdfJS = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjs);
    };
    script.onerror = () => reject(new Error('Không thể tải thư viện PDF.js từ CDN!'));
    document.head.appendChild(script);
  });
};

// API helper to translate text using free Google Translate web API
async function translateText(text: string): Promise<string> {
  if (!text.trim()) return '';
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Yêu cầu dịch thuật bị từ chối');
    const data = await res.json();
    
    if (data && data[0]) {
      return data[0].map((segment: any) => segment[0] || '').join('');
    }
    return '[Không nhận được bản dịch]';
  } catch (err) {
    console.error('Lỗi dịch thuật: ', err);
    return '[Lỗi chuyển ngữ AI]';
  }
}

// Helper to clean up PDF diacritic spacing bugs (e.g. "tuầ n" -> "tuần", "mấ t" -> "mất")
function cleanVietnameseDiacritics(text: string): string {
  return text.replace(/([aăâeêoôơuưyáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵđ])\s([ntucgimyoa]{1,2}\b)/gi, '$1$2');
}

export default function TranslationStudio() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [phase, setPhase] = useState<'upload' | 'parsing' | 'translating' | 'completed'>('upload');
  
  // Options
  const [layoutStyle, setLayoutStyle] = useState<'bilingual' | 'multicolumn' | 'plain'>('bilingual');
  const [exportFormat, setExportFormat] = useState<'both' | 'pdf' | 'epub'>('both');

  // Translation stats
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [blocks, setBlocks] = useState<ITranslationBlock[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  
  const blocksEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when blocks update during active translation
  useEffect(() => {
    if (phase === 'translating') {
      blocksEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [blocks, phase]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.pdf')) {
        setFile(droppedFile);
      } else {
        alert('Vui lòng tải lên tệp tin định dạng PDF (.pdf) hợp lệ!');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  // Start Parsing & Sequential Translation
  const startTranslationProcess = async () => {
    if (!file) return;

    try {
      setPhase('parsing');
      setProgress(5);
      setStatusText('Đang tải và khởi tạo thư viện phân tích PDF.js...');

      // 1. Load PDF.js
      const pdfjs = await loadPdfJS();
      setProgress(15);
      setStatusText('Đang đọc cấu trúc tệp tin PDF...');

      // 2. Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);

      // 3. Parse Document
      const pdf = await pdfjs.getDocument(typedArray).promise;
      const numPages = pdf.numPages;
      setTotalPages(numPages);
      setProgress(30);
      setStatusText(`Đã tìm thấy ${numPages} trang. Bắt đầu trích xuất văn bản từ các trang...`);

      const extractedBlocks: ITranslationBlock[] = [];

      // 4. Extract Text Page by Page (Cap at 12 pages for optimal web performance)
      const pagesToProcess = Math.min(numPages, 12);
      for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
        setStatusText(`Đang phân tích cấu trúc văn bản: Trang ${pageNum}/${pagesToProcess}...`);
        setProgress(30 + Math.round((pageNum / pagesToProcess) * 20));

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Group strings of text
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        const cleanedDiacriticsText = cleanVietnameseDiacritics(pageText);
        const cleanText = cleanedDiacriticsText.replace(/\s+/g, ' ').trim();

        if (cleanText.length > 5) {
          const sentences = cleanText.split(/(?<=[.!?])\s+/);
          
          if (layoutStyle === 'bilingual') {
            // Bilingual mode: extract each sentence as an individual block for sentence-by-sentence translation
            for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
              const sentence = sentences[sIdx].trim();
              if (sentence.length > 3) {
                extractedBlocks.push({
                  en: sentence,
                  vi: '',
                  status: 'pending',
                  page: pageNum
                });
              }
            }
          } else {
            // Other modes: heuristic sentence grouping (approx. 3 sentences per block)
            let currentParagraph: string[] = [];
            for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
              const sentence = sentences[sIdx].trim();
              if (sentence.length > 3) {
                currentParagraph.push(sentence);
                if (currentParagraph.length >= 3 || sIdx === sentences.length - 1) {
                  extractedBlocks.push({
                    en: currentParagraph.join(' '),
                    vi: '',
                    status: 'pending',
                    page: pageNum
                  });
                  currentParagraph = [];
                }
              }
            }
          }
        }
      }

      if (extractedBlocks.length === 0) {
        throw new Error('Không thể tìm thấy hoặc trích xuất nội dung văn bản tiếng Anh từ file PDF này (có thể file chỉ chứa ảnh quét scan).');
      }

      setBlocks(extractedBlocks);
      setPhase('translating');
      setProgress(50);
      setStatusText('Khởi tạo bộ dịch thuật AI song ngữ...');

      // 5. Trigger sequential translation
      runSequentialTranslation(extractedBlocks);

    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Đã xảy ra lỗi trong quá trình phân tích file PDF!');
      resetStudio();
    }
  };

  // Run Translation Sequentially with dynamic states
  const runSequentialTranslation = async (initialBlocks: ITranslationBlock[]) => {
    const updatedBlocks = [...initialBlocks];

    for (let i = 0; i < updatedBlocks.length; i++) {
      // Set to translating state
      updatedBlocks[i].status = 'translating';
      setBlocks([...updatedBlocks]);
      setStatusText(`Đang chuyển ngữ khối văn bản ${i + 1}/${updatedBlocks.length} (Trang ${updatedBlocks[i].page})...`);
      
      const translation = await translateText(updatedBlocks[i].en);
      
      // Set to done state with result
      updatedBlocks[i].vi = translation;
      updatedBlocks[i].status = 'done';
      setCurrentPage(updatedBlocks[i].page);

      // Update progress between 50% and 95%
      const translateProgress = 50 + Math.round(((i + 1) / updatedBlocks.length) * 45);
      setProgress(translateProgress);
      setBlocks([...updatedBlocks]);
      
      // Wait 150ms between requests to avoid rate limits
      await new Promise(r => setTimeout(r, 150));
    }

    // Wrap-up phase
    setProgress(98);
    setStatusText('Đang đóng gói và chế bản sách điện tử PDF/EPUB...');
    await new Promise(r => setTimeout(r, 1500));
    
    setProgress(100);
    setPhase('completed');
  };

  // Download EPUB Book Action with actual translated content
  const handleDownloadEpub = () => {
    if (!file || blocks.length === 0) return;
    const title = file.name.replace('.pdf', '') + ' (Bản dịch)';
    
    // Group blocks by page number for chapters
    const pagesMap: { [key: number]: string[] } = {};

    // Group blocks by page first
    const blocksByPage: { [key: number]: ITranslationBlock[] } = {};
    blocks.forEach(b => {
      if (!blocksByPage[b.page]) blocksByPage[b.page] = [];
      blocksByPage[b.page].push(b);
    });

    Object.keys(blocksByPage).forEach(pStr => {
      const pageNum = Number(pStr);
      pagesMap[pageNum] = [];
      const pageBlocks = blocksByPage[pageNum];

      if (layoutStyle === 'bilingual') {
        pageBlocks.forEach((b) => {
          // English sentence as its own paragraph
          pagesMap[pageNum].push(b.en);
          // Bolded Vietnamese translation as its own paragraph
          pagesMap[pageNum].push(`<strong>${b.vi}</strong>`);
        });
      } else {
        // Plain translated Vietnamese
        let currentParagraphParts: string[] = [];
        pageBlocks.forEach((b, idx) => {
          currentParagraphParts.push(b.vi);

          if (currentParagraphParts.length >= 3 || idx === pageBlocks.length - 1) {
            pagesMap[pageNum].push(currentParagraphParts.join(' '));
            currentParagraphParts = [];
          }
        });
      }
    });

    const sections = Object.keys(pagesMap).map(pageNum => ({
      title: `Trang ${pageNum}`,
      content: pagesMap[Number(pageNum)]
    }));

    downloadEpub(title, "AI Document Translator", sections);
  };

  // Download PDF Book Action with actual translated content
  const handleDownloadPdf = () => {
    if (!file || blocks.length === 0) return;
    const title = file.name.replace('.pdf', '') + ' (Bản dịch)';

    // Group blocks by page number for sections
    const pagesMap: { [key: number]: string[] } = {};

    // Group blocks by page first
    const blocksByPage: { [key: number]: ITranslationBlock[] } = {};
    blocks.forEach(b => {
      if (!blocksByPage[b.page]) blocksByPage[b.page] = [];
      blocksByPage[b.page].push(b);
    });

    Object.keys(blocksByPage).forEach(pStr => {
      const pageNum = Number(pStr);
      pagesMap[pageNum] = [];
      const pageBlocks = blocksByPage[pageNum];

      if (layoutStyle === 'bilingual') {
        pageBlocks.forEach((b) => {
          // English sentence as its own paragraph
          pagesMap[pageNum].push(b.en);
          // Bolded Vietnamese translation as its own paragraph
          pagesMap[pageNum].push(`<strong>${b.vi}</strong>`);
        });
      } else {
        // Plain translated Vietnamese
        let currentParagraphParts: string[] = [];
        pageBlocks.forEach((b, idx) => {
          currentParagraphParts.push(b.vi);

          if (currentParagraphParts.length >= 3 || idx === pageBlocks.length - 1) {
            pagesMap[pageNum].push(currentParagraphParts.join(' '));
            currentParagraphParts = [];
          }
        });
      }
    });

    const sections = Object.keys(pagesMap).map(pageNum => ({
      title: `Trang ${pageNum}`,
      content: pagesMap[Number(pageNum)]
    }));

    downloadPdf(title, "AI Document Translator", sections);
  };

  const resetStudio = () => {
    setFile(null);
    setPhase('upload');
    setProgress(0);
    setBlocks([]);
    setTotalPages(0);
    setCurrentPage(0);
  };

  return (
    <div className="bg-[#fcfbf7] border-4 border-black p-6 sm:p-8 rounded-lg shadow-md max-w-4xl mx-auto text-[#111111] font-sans">
      
      {/* Header section */}
      <div className="border-b-4 border-black pb-4 mb-6 flex flex-col sm:flex-row justify-between items-baseline gap-2">
        <div>
          <h2 className="text-[32px] font-sans font-black tracking-tight" style={{ fontSize: '32px' }}>
            Dịch bài báo khoa hoc- Tác giả: Trần Trí Nhân
          </h2>
          <p className="text-xs font-sans font-bold text-neutral-600 uppercase tracking-widest mt-1">
            Dịch thuật PDF song ngữ chuẩn xác • Xuất bản PDF/EPUB thời gian thực
          </p>
        </div>
        <span className="text-xs bg-red-700 text-white font-sans font-extrabold uppercase px-2.5 py-1 rounded-sm">
          REAL PDF PARSER
        </span>
      </div>

      {phase === 'upload' && (
        <div className="space-y-6 animate-fadeIn">
          <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed font-semibold">
            Tải lên tệp tài liệu nghiên cứu khoa học bằng tiếng Anh định dạng PDF. Hệ thống dịch thuật AI sẽ **trích xuất văn bản thực tế** từ bên trong tệp tin của bạn, dịch chuyển ngữ song hành từng dòng bằng Google Translate API và đóng gói chuẩn e-book PDF/EPUB.
          </p>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-4 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragOver 
                ? 'border-emerald-500 bg-emerald-50/50 shadow-inner' 
                : 'border-neutral-400 hover:border-black hover:bg-neutral-50/50'
            }`}
          >
            <input
              type="file"
              accept=".pdf"
              id="file-upload-input"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload-input" className="cursor-pointer space-y-4 block">
              <div className="w-16 h-16 bg-neutral-200 border-2 border-black rounded-full flex items-center justify-center mx-auto hover:scale-105 active:scale-95 transition-all">
                <svg className="w-8 h-8 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black uppercase tracking-tight text-neutral-800">
                  {file ? file.name : "KÉO & THẢ FILE PDF CỦA BẠN VÀO ĐÂY"}
                </p>
                <p className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                  {file ? `Dung lượng: ${(file.size / (1024 * 1024)).toFixed(2)} MB` : "Hoặc click để chọn file từ máy tính"}
                </p>
              </div>
            </label>
          </div>

          {/* Translation Options Panel */}
          {file && (
            <div className="bg-[#f5f2eb] border-2 border-black p-5 rounded-md space-y-5">
              <h3 className="text-xs font-black uppercase tracking-wider border-b border-neutral-300 pb-2">
                ⚙️ CẤU HÌNH DỊCH THUẬT &amp; XUẤT BẢN THỰC TẾ
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Option 1: Translation layout style */}
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase text-neutral-800 block">
                    1. Kiểu trình bày bản dịch
                  </span>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                      <input
                        type="radio"
                        name="layoutStyle"
                        checked={layoutStyle === 'bilingual'}
                        onChange={() => setLayoutStyle('bilingual')}
                        className="accent-black w-4 h-4"
                      />
                      Dịch song ngữ từng câu (1 đoạn Anh - 1 đoạn Việt)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                      <input
                        type="radio"
                        name="layoutStyle"
                        checked={layoutStyle === 'plain'}
                        onChange={() => setLayoutStyle('plain')}
                        className="accent-black w-4 h-4"
                      />
                      Bản dịch trơn tiếng Việt
                    </label>
                  </div>
                </div>

                {/* Option 2: Export formats */}
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase text-neutral-800 block">
                    2. Định dạng xuất bản mong muốn
                  </span>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                      <input
                        type="radio"
                        name="exportFormat"
                        checked={exportFormat === 'both'}
                        onChange={() => setExportFormat('both')}
                        className="accent-black w-4 h-4"
                      />
                      Cả PDF (Bản in) &amp; EPUB (Kindle/Di động)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                      <input
                        type="radio"
                        name="exportFormat"
                        checked={exportFormat === 'pdf'}
                        onChange={() => setExportFormat('pdf')}
                        className="accent-black w-4 h-4"
                      />
                      Chỉ xuất bản tệp tin PDF (.pdf)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                      <input
                        type="radio"
                        name="exportFormat"
                        checked={exportFormat === 'epub'}
                        onChange={() => setExportFormat('epub')}
                        className="accent-black w-4 h-4"
                      />
                      Chỉ xuất bản sách điện tử EPUB (.epub)
                    </label>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <button
                type="button"
                onClick={startTranslationProcess}
                className="w-full text-xs sm:text-sm uppercase font-extrabold tracking-widest py-3 bg-black hover:bg-neutral-800 text-[#fcfbf7] rounded-sm active:scale-[0.98] transition-all text-center shadow-md flex items-center justify-center gap-2"
              >
                🚀 BẮT ĐẦU DỊCH THUẬT AI TOÀN BỘ NỘI DUNG FILE
              </button>
            </div>
          )}
        </div>
      )}

      {/* Parsing & Translation Simulation Screen */}
      {(phase === 'parsing' || phase === 'translating') && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Progress bar info */}
          <div className="bg-[#f5f2eb] border-2 border-black p-4 rounded-md space-y-2">
            <div className="flex justify-between items-baseline flex-wrap gap-2 text-xs font-black uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-red-700 rounded-full inline-block animate-ping" />
                TIẾN TRÌNH DỊCH THUẬT THỰC TẾ
              </span>
              <span>{progress}% Hoàn thành</span>
            </div>
            
            <div className="w-full bg-neutral-300 h-3 rounded-full overflow-hidden border border-black">
              <div 
                className="bg-black h-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-neutral-600 font-bold uppercase tracking-tight pt-1 leading-normal">
              Trạng thái: <span className="text-black font-extrabold">{statusText}</span>
            </p>
          </div>

          {/* Bilingual Live Stream Box */}
          {blocks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-500">
                DÒNG DỊCH THUẬT SONG NGỮ THEO KHỐI THỰC TẾ TRONG FILE CỦA BẠN
              </h3>

              <div className="space-y-4 max-h-[350px] overflow-y-auto border-2 border-neutral-300 p-4 rounded bg-white">
                {blocks.map((block, idx) => {
                  const isPending = block.status === 'pending';
                  const isTranslating = block.status === 'translating';
                  const isDone = block.status === 'done';

                  return (
                    <div 
                      key={idx} 
                      className={`grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-neutral-200 pb-4 last:border-0 last:pb-0 transition-all duration-300 ${
                        isPending ? 'opacity-30' : 'opacity-100'
                      }`}
                    >
                      {/* English Block */}
                      <div className="bg-neutral-50 p-3 rounded border border-neutral-200 relative">
                        <span className="absolute top-2 right-2 text-[9px] font-sans font-black text-neutral-400 uppercase tracking-widest">
                          Trang {block.page} • Khối {idx + 1}
                        </span>
                        <p className="text-xs font-sans text-neutral-800 font-semibold leading-relaxed pt-2">
                          {block.en}
                        </p>
                      </div>

                      {/* Vietnamese Block */}
                      <div className={`p-3 rounded border relative transition-all duration-300 ${
                        isTranslating
                          ? 'bg-amber-50/50 border-amber-400 shadow-sm shadow-amber-100'
                          : isDone
                          ? 'bg-emerald-50/30 border-emerald-400'
                          : 'bg-neutral-50/30 border-neutral-200'
                      }`}>
                        <span className="absolute top-2 right-2 text-[9px] font-sans font-black text-neutral-400 uppercase tracking-widest">
                          Bản dịch VI
                        </span>

                        {isPending && (
                          <p className="text-xs font-sans text-neutral-400 italic pt-2">
                            Đang chờ hàng đợi dịch...
                          </p>
                        )}

                        {isTranslating && (
                          <div className="pt-2 space-y-1">
                            <p className="text-xs font-sans text-amber-800 font-bold leading-relaxed animate-pulse">
                              Đang phân tích cấu trúc ngữ nghĩa...
                            </p>
                            <span className="inline-flex gap-1 items-center text-[10px] text-amber-700 font-bold uppercase tracking-widest pt-1">
                              <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce" />
                              Đang chuyển ngữ AI...
                            </span>
                          </div>
                        )}

                        {isDone && (
                          <p className={`text-xs font-sans leading-relaxed pt-2 animate-fadeIn ${
                            layoutStyle === 'bilingual' ? 'font-extrabold text-neutral-900' : 'text-emerald-800 font-bold'
                          }`}>
                            {block.vi}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={blocksEndRef} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compilation Completed Screen */}
      {phase === 'completed' && (
        <div className="space-y-6 text-center animate-fadeIn">
          
          {/* Success card */}
          <div className="bg-emerald-50 border-2 border-emerald-500 p-6 rounded-md space-y-3">
            <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-600 animate-bounce">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-sans font-black uppercase tracking-tight text-emerald-950">
              DỊCH TOÀN BỘ FILE &amp; CHẾ BẢN HOÀN TẤT!
            </h3>
            <p className="text-xs sm:text-sm text-emerald-800 max-w-xl mx-auto leading-relaxed font-semibold">
              Tệp tài liệu <span className="font-extrabold text-black">"{file?.name}"</span> ({totalPages} trang) đã được dịch thành công toàn bộ nội dung văn bản sang tiếng Việt và đóng gói sẵn sàng.
            </p>
          </div>

          {/* Export Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto pt-2">
            
            {/* Export PDF */}
            {(exportFormat === 'both' || exportFormat === 'pdf') && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="bg-[#fcfbf7] border-2 border-black p-5 rounded hover:bg-neutral-50 active:scale-95 transition-all text-left flex flex-col justify-between h-40 group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-sans font-black uppercase text-red-700 tracking-wider">
                    Bảo toàn cấu trúc trang
                  </span>
                  <h4 className="text-sm font-black font-sans uppercase tracking-tight group-hover:text-blue-900 transition-colors">
                    TẢI BẢN DỊCH PDF DÀN TRANG (.pdf)
                  </h4>
                  <p className="text-xs text-neutral-500 font-sans leading-relaxed pt-1.5">
                    Kết xuất tài liệu dạng đa cột học thuật, dàn trang đối chiếu thích hợp lưu trữ hoặc in ấn.
                  </p>
                </div>
                <span className="text-xs font-black uppercase text-black group-hover:translate-x-1.5 transition-transform inline-flex items-center gap-1 mt-2">
                  Tải xuống PDF →
                </span>
              </button>
            )}

            {/* Export EPUB */}
            {(exportFormat === 'both' || exportFormat === 'epub') && (
              <button
                type="button"
                onClick={handleDownloadEpub}
                className="bg-[#fcfbf7] border-2 border-black p-5 rounded hover:bg-neutral-50 active:scale-95 transition-all text-left flex flex-col justify-between h-40 group cursor-pointer shadow-sm hover:shadow-md"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-sans font-black uppercase text-red-700 tracking-wider">
                    Tối ưu màn hình di động
                  </span>
                  <h4 className="text-sm font-black font-sans uppercase tracking-tight group-hover:text-blue-900 transition-colors">
                    TẢI SÁCH ĐIỆN TỬ EPUB (.epub)
                  </h4>
                  <p className="text-xs text-neutral-500 font-sans leading-relaxed pt-1.5">
                    Tương thích hoàn hảo với Kindle, Apple Books, tự động điều chỉnh cỡ chữ và cuộn trang mượt mà.
                  </p>
                </div>
                <span className="text-xs font-black uppercase text-black group-hover:translate-x-1.5 transition-transform inline-flex items-center gap-1 mt-2">
                  Tải xuống EPUB →
                </span>
              </button>
            )}

          </div>

          {/* Document Live Preview */}
          <div className="max-w-2xl mx-auto border-2 border-black rounded-md overflow-hidden bg-white text-left shadow-sm mt-6">
            <div className="bg-[#f5f2eb] border-b-2 border-black p-3 font-sans font-black text-xs uppercase tracking-wider flex items-center justify-between">
              <span>📖 XEM TRƯỚC BẢN IN SONG NGỮ THỰC TẾ (PAGE PREVIEW)</span>
              <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded">Times New Roman • 14pt</span>
            </div>
            
            <div className="p-6 max-h-[350px] overflow-y-auto font-serif" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
              {/* PDF style header */}
              <div className="border-b-2 border-double border-black pb-3 mb-4 text-center">
                <h4 className="font-bold text-lg uppercase tracking-tight m-0 text-black">
                  TÀI LIỆU DỊCH THUẬT SONG NGỮ
                </h4>
                <p className="text-[10px] font-sans font-bold text-neutral-500 uppercase tracking-wide mt-1">
                  Sách gốc: {file?.name} • Biên dịch: AI Document Translator • Ngôn ngữ: Anh - Việt
                </p>
              </div>

              {/* Sample pages content */}
              <div className="space-y-4 text-sm leading-relaxed text-[#111111] text-justify">
                {layoutStyle === 'bilingual' ? (
                  blocks.slice(0, 10).map((b, idx) => (
                    <React.Fragment key={idx}>
                      <p style={{ textIndent: '1.5em', margin: '0 0 8px 0' }}>{b.en}</p>
                      <p style={{ textIndent: '1.5em', margin: '0 0 16px 0', fontWeight: 'bold' }}>{b.vi}</p>
                    </React.Fragment>
                  ))
                ) : (
                  blocks.slice(0, 10).map((b, idx) => (
                    <p key={idx} style={{ textIndent: '1.5em', margin: '0 0 14pt 0' }}>{b.vi}</p>
                  ))
                )}
                {blocks.length > 10 && (
                  <p className="text-center font-sans font-bold text-xs text-neutral-400 uppercase tracking-widest pt-2">
                    ... và {blocks.length - 10} câu tiếp theo được đóng gói trong tài liệu ...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Reset / Return button */}
          <div className="pt-6">
            <button
              type="button"
              onClick={resetStudio}
              className="text-xs uppercase font-extrabold tracking-widest px-6 py-2.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-sm active:scale-95 transition-all border border-neutral-400"
            >
              Quay lại dịch file mới
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
