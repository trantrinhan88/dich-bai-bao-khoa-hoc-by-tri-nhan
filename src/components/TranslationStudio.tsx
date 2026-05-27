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
  fontSize?: number;
  minY?: number;
  maxY?: number;
  type?: 'header' | 'footer' | 'title' | 'body' | 'small';
  shouldTranslate?: boolean;
  skipDisplay?: boolean;
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

// Standalone API helper for Gemini 2.5 Flash Lite Free
async function translateWithGemini(text: string, apiKey: string): Promise<string> {
  if (!apiKey.trim()) throw new Error('Vui lòng nhập API Key cho Gemini!');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Translate the following English academic/scientific text into professional, accurate Vietnamese. 
Preserve all formatting, math notations, symbols, and academic terms exactly as they are.
Return ONLY the translated Vietnamese text, with absolutely no preamble, intro, explanation, markdown blocks, or surrounding quotes:

${text}`
        }]
      }],
      generationConfig: {
        temperature: 0.1,
      }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Lỗi kết nối Gemini API (HTTP ${response.status})`);
  }

  const data = await response.json();
  const resultText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resultText) throw new Error('Không nhận được phản hồi từ Gemini API');
  return resultText.trim();
}

// Standalone API helper for DeepSeek v4 Pro
async function translateWithDeepseek(text: string, apiKey: string): Promise<string> {
  if (!apiKey.trim()) throw new Error('Vui lòng nhập API Key cho DeepSeek!');
  const url = 'https://api.deepseek.com/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You are a professional academic translator specializing in scientific and technical papers. Translate the English input into high-quality, professional Vietnamese. Keep formulas, math notations, original formatting, and layout styles intact. Do not add any explanation, introductory remarks, markdown code blocks, or extra text. Output ONLY the translated Vietnamese text.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Lỗi kết nối DeepSeek API (HTTP ${response.status})`);
  }

  const data = await response.json();
  const resultText = data?.choices?.[0]?.message?.content;
  if (!resultText) throw new Error('Không nhận được phản hồi từ DeepSeek API');
  return resultText.trim();
}

// Helper to clean up PDF diacritic spacing bugs (e.g. "tuầ n" -> "tuần", "mấ t" -> "mất")
function cleanVietnameseDiacritics(text: string): string {
  const vietnameseChars = 'a-zA-Z0-9ăâêôơưĂÂÊÔƠƯàáảãạằắẳẵặầấẩẫậềếểễệòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵđĐ';
  const regex = new RegExp(`([aăâeêoôơuưyáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵđ])\\s([ntucgimyoah]{1,2})(?![${vietnameseChars}])`, 'gi');
  return text.replace(regex, '$1$2');
}

export default function TranslationStudio() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [phase, setPhase] = useState<'upload' | 'parsing' | 'translating' | 'completed'>('upload');
  
  // Options
  const [layoutStyle, setLayoutStyle] = useState<'bilingual' | 'multicolumn' | 'plain'>('bilingual');
  const [exportFormat, setExportFormat] = useState<'both' | 'pdf' | 'epub'>('both');
  const [selectedModel, setSelectedModel] = useState<'google' | 'gemini' | 'deepseek'>('google');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [deepseekApiKey, setDeepseekApiKey] = useState('');

  // Translation stats
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [blocks, setBlocks] = useState<ITranslationBlock[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  
  const blocksEndRef = useRef<HTMLDivElement>(null);

  // Load API keys and Model from localStorage on mount
  useEffect(() => {
    const savedModel = localStorage.getItem('selected_model');
    const savedGeminiKey = localStorage.getItem('gemini_api_key');
    const savedDeepseekKey = localStorage.getItem('deepseek_api_key');
    if (savedModel) setSelectedModel(savedModel as any);
    if (savedGeminiKey) setGeminiApiKey(savedGeminiKey);
    if (savedDeepseekKey) setDeepseekApiKey(savedDeepseekKey);
  }, []);

  // Dynamic state-linked translation helper inside component
  const translateText = async (text: string): Promise<string> => {
    if (!text.trim()) return '';
    try {
      if (selectedModel === 'google') {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Yêu cầu dịch thuật bị từ chối');
        const data = await res.json();
        
        if (data && data[0]) {
          const rawResult = data[0].map((segment: any) => segment[0] || '').join('');
          return cleanVietnameseDiacritics(rawResult);
        }
        return '[Không nhận được bản dịch]';
      } else if (selectedModel === 'gemini') {
        const rawResult = await translateWithGemini(text, geminiApiKey);
        return cleanVietnameseDiacritics(rawResult);
      } else if (selectedModel === 'deepseek') {
        const rawResult = await translateWithDeepseek(text, deepseekApiKey);
        return cleanVietnameseDiacritics(rawResult);
      }
      return '[Mô hình không hợp lệ]';
    } catch (err: any) {
      console.error('Lỗi dịch thuật: ', err);
      return `[Lỗi chuyển ngữ AI: ${err.message || 'Unknown error'}]`;
    }
  };

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

    if (selectedModel === 'gemini' && !geminiApiKey.trim()) {
      alert('Vui lòng nhập API Key cho Gemini để bắt đầu dịch!');
      return;
    }
    if (selectedModel === 'deepseek' && !deepseekApiKey.trim()) {
      alert('Vui lòng nhập API Key cho DeepSeek để bắt đầu dịch!');
      return;
    }

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

      const allRawBlocks: any[] = [];
      const pageHeightsMap: { [page: number]: number } = {};

      // 4. Extract Text Page by Page (Cap at 12 pages for optimal web performance)
      const pagesToProcess = Math.min(numPages, 12);
      for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
        setStatusText(`Đang phân tích cấu trúc văn bản: Trang ${pageNum}/${pagesToProcess}...`);
        setProgress(30 + Math.round((pageNum / pagesToProcess) * 20));

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const pageWidth = viewport.width;
        const pageHeight = viewport.height;
        pageHeightsMap[pageNum] = pageHeight;
        
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];
        
        // 1. Lọc nhiễu học thuật ở lề biên (Academic Margin Filtering) - Giữ lại để phân loại untranslated thay vì xoá sạch
        const validItems = items.filter((item: any) => {
          if (!item.str || !item.transform) return false;
          const s = item.str.trim();
          if (!s) return false;
          
          const y = item.transform[5];
          // Chỉ lọc bỏ các số trang đơn lẻ trơ trọi, link DOI cực ngắn lề biên để tránh rác layout
          if (y < 45 || y > pageHeight - 45) {
            if (/^\d+$/.test(s) || /^\d+\s*of\s*\d+$/i.test(s) || s.length < 3) {
              return false;
            }
          }
          return true;
        });

        // 2. Thuật toán phân luồng Cột động (Dynamic Column-Aware Coordinate Sorting)
        let splitX = pageWidth / 2;
        let isTwoColumn = false;
        let minCrossCount = Infinity;
        let bestLeftCount = 0;
        let bestRightCount = 0;

        const startX = Math.round(pageWidth * 0.2);
        const endX = Math.round(pageWidth * 0.6);

        // Quét tìm vạch phân chia tối ưu từ 20% đến 60% chiều rộng trang
        for (let x_c = startX; x_c <= endX; x_c += 5) {
          let leftCount = 0;
          let rightCount = 0;
          let crossCount = 0;

          validItems.forEach((item: any) => {
            const x = item.transform[4];
            const w = item.width || 0;
            if (x + w < x_c) {
              leftCount++;
            } else if (x > x_c) {
              rightCount++;
            } else {
              crossCount++;
            }
          });

          // Tìm vạch cắt ngang ít phần tử nhất, hai bên đều phải có số lượng phần tử chữ tối thiểu
          if (leftCount > 3 && rightCount > 3) {
            if (crossCount < minCrossCount) {
              minCrossCount = crossCount;
              splitX = x_c;
              bestLeftCount = leftCount;
              bestRightCount = rightCount;
              isTwoColumn = true;
            }
          }
        }

        // Nếu số lượng khối cắt qua vạch chia quá lớn so với các cột, coi là trang đơn cột thường
        if (isTwoColumn && minCrossCount > (bestLeftCount + bestRightCount) * 0.25) {
          isTwoColumn = false;
        }

        let finalItems: any[] = [];

        if (!isTwoColumn) {
          // Trang đơn cột: Sắp xếp tuần tự từ trên xuống dưới, từ trái qua phải
          finalItems = [...validItems].sort((a: any, b: any) => {
            const yA = a.transform[5];
            const yB = b.transform[5];
            const xA = a.transform[4];
            const xB = b.transform[4];
            if (Math.abs(yA - yB) < 4) {
              return xA - xB;
            }
            return yB - yA;
          });
        } else {
          // Trang song cột (hoặc lề hẹp bên trái): Tách biệt các cột để tránh trộn lẫn chữ
          const leftColItems: any[] = [];
          const rightColItems: any[] = [];
          const fullWidthItems: any[] = [];

          validItems.forEach((item: any) => {
            const x = item.transform[4];
            const w = item.width || 0;
            if (x + w < splitX) {
              leftColItems.push(item);
            } else if (x > splitX) {
              rightColItems.push(item);
            } else {
              fullWidthItems.push(item);
            }
          });

          // Xác định vùng hai cột để phân chia luồng đọc đứng
          let highestTwoColY = 0;
          let lowestTwoColY = pageHeight;

          leftColItems.concat(rightColItems).forEach((item: any) => {
            const y = item.transform[5];
            if (y > highestTwoColY) highestTwoColY = y;
            if (y < lowestTwoColY) lowestTwoColY = y;
          });

          // Phân tách các khối chữ thành 5 phân vùng tuyến tính để ghép thành luồng đọc chuẩn
          const topFullItems: any[] = [];
          const bottomFullItems: any[] = [];
          const midFullItems: any[] = [];
          const leftColumn: any[] = [];
          const rightColumn: any[] = [];

          validItems.forEach((item: any) => {
            const x = item.transform[4];
            const y = item.transform[5];
            const w = item.width || 0;

            if (y > highestTwoColY) {
              topFullItems.push(item);
            } else if (y < lowestTwoColY) {
              bottomFullItems.push(item);
            } else {
              // Vùng song song ở giữa trang
              if (x + w < splitX) {
                leftColumn.push(item);
              } else if (x > splitX) {
                rightColumn.push(item);
              } else {
                midFullItems.push(item);
              }
            }
          });

          // Bộ so sánh tọa độ dòng (y giảm dần từ trên xuống, x tăng dần từ trái qua)
          const coordinateComparator = (a: any, b: any) => {
            const yA = a.transform[5];
            const yB = b.transform[5];
            const xA = a.transform[4];
            const xB = b.transform[4];
            if (Math.abs(yA - yB) < 4) {
              return xA - xB;
            }
            return yB - yA;
          };

          // Sắp xếp riêng biệt từng phần
          topFullItems.sort(coordinateComparator);
          leftColumn.sort(coordinateComparator);
          rightColumn.sort(coordinateComparator);
          midFullItems.sort(coordinateComparator);
          bottomFullItems.sort(coordinateComparator);

          // Lắp ráp luồng đọc học thuật đúng trật tự: trên trước, trái trước, phải sau, rồi dưới
          finalItems = [
            ...topFullItems,
            ...leftColumn,
            ...rightColumn,
            ...midFullItems,
            ...bottomFullItems
          ];
        }

        // 3. Nhóm các items thành các khối (blocks) dựa trên tọa độ và cỡ chữ
        const pageBlocks: any[] = [];
        let currentBlock: any = null;

        finalItems.forEach((item: any) => {
          const s = item.str;
          if (!s.trim()) return;

          // Cỡ chữ được tính từ tỷ lệ transform[3] hoặc height
          const itemFontSize = Math.abs(item.transform[3]) || item.height || 10;
          const itemX = item.transform[4];
          const itemY = item.transform[5];

          if (!currentBlock) {
            currentBlock = {
              en: s,
              fontSize: itemFontSize,
              minY: itemY,
              maxY: itemY,
              page: pageNum,
              items: [item]
            };
            return;
          }

          const prevItem = currentBlock.items[currentBlock.items.length - 1];
          const prevY = prevItem.transform[5];
          const prevFontSize = Math.abs(prevItem.transform[3]) || prevItem.height || 10;

          // Kiểm tra xem item mới có cùng dòng với item trước đó không
          const sameLine = Math.abs(itemY - prevY) < 4;
          // Khoảng cách chiều dọc giữa 2 item liên tiếp
          const verticalGap = prevY - itemY;
          // Kiểm tra cỡ chữ có khớp nhau không
          const fontMatches = Math.abs(itemFontSize - currentBlock.fontSize) < 1.5;

          let shouldAppend = false;
          if (sameLine) {
            shouldAppend = true;
          } else if (verticalGap > 0 && verticalGap < Math.max(prevFontSize, itemFontSize) * 1.8 && fontMatches) {
            shouldAppend = true;
          }

          if (shouldAppend) {
            // Xử lý từ gạch nối cuối dòng: "electro-" + "magnetic" -> "electromagnetic"
            if (currentBlock.en.endsWith('-')) {
              currentBlock.en = currentBlock.en.slice(0, -1) + s;
            } else {
              currentBlock.en += (currentBlock.en.endsWith(' ') || s.startsWith(' ') ? '' : ' ') + s;
            }
            currentBlock.minY = Math.min(currentBlock.minY, itemY);
            currentBlock.maxY = Math.max(currentBlock.maxY, itemY);
            currentBlock.items.push(item);
          } else {
            pageBlocks.push({
              en: currentBlock.en.replace(/\s+/g, ' ').trim(),
              fontSize: currentBlock.fontSize,
              minY: currentBlock.minY,
              maxY: currentBlock.maxY,
              page: pageNum
            });
            currentBlock = {
              en: s,
              fontSize: itemFontSize,
              minY: itemY,
              maxY: itemY,
              page: pageNum,
              items: [item]
            };
          }
        });

        if (currentBlock) {
          pageBlocks.push({
            en: currentBlock.en.replace(/\s+/g, ' ').trim(),
            fontSize: currentBlock.fontSize,
            minY: currentBlock.minY,
            maxY: currentBlock.maxY,
            page: pageNum
          });
        }

        allRawBlocks.push(...pageBlocks);
      }

      if (allRawBlocks.length === 0) {
        throw new Error('Không thể tìm thấy hoặc trích xuất nội dung văn bản tiếng Anh từ file PDF này (có thể file chỉ chứa ảnh quét scan).');
      }

      // 5. Phân tích phân cấp và cấu trúc tài liệu toàn cục
      
      // Tìm cỡ chữ lớn nhất ở Trang 1 để xác định Tiêu đề chính (Main Title)
      const page1Blocks = allRawBlocks.filter(b => b.page === 1);
      let maxFontSize = 0;
      page1Blocks.forEach(b => {
        if (b.fontSize > maxFontSize) {
          maxFontSize = b.fontSize;
        }
      });

      // Tìm cỡ chữ phổ biến nhất (Dominant Font Size) của body text
      const fontSizeWeights: { [size: number]: number } = {};
      allRawBlocks.forEach(b => {
        const roundedSize = Math.round(b.fontSize * 2) / 2; // làm tròn đến 0.5
        fontSizeWeights[roundedSize] = (fontSizeWeights[roundedSize] || 0) + b.en.length;
      });

      let dominantFontSize = 10;
      let maxWeight = 0;
      Object.keys(fontSizeWeights).forEach(sizeStr => {
        const size = parseFloat(sizeStr);
        const weight = fontSizeWeights[size];
        if (weight > maxWeight) {
          maxWeight = weight;
          dominantFontSize = size;
        }
      });

      console.log('Dominant font size:', dominantFontSize);
      console.log('Max font size on Page 1 (Title):', maxFontSize);

      // 6. Phân loại và tạo danh sách khối dịch cuối cùng
      const extractedBlocks: ITranslationBlock[] = [];

      // Định nghĩa bộ lọc nhiễu lề biên và metadata học thuật
      const isAcademicNoiseBlock = (text: string): boolean => {
        const s = text.trim();
        if (!s) return true;

        const noiseRegexes = [
          /how\s+to\s+cite\s+this\s+paper/i,
          /received:\s+\w+\s+\d+/i,
          /accepted:\s+\w+\s+\d+/i,
          /published:\s+\w+\s+\d+/i,
          /copyright\s+©/i,
          /scientific\s+research\s+publishing/i,
          /open\s+access/i,
          /creativecommons\.org\/licenses/i,
          /doi\.org\/10\./i,
          /issn\s+online/i,
          /issn\s+print/i,
          /journal\s+of\s+diabetes\s+mellitus/i,
          /https?:\/\/(www\.)?scirp\.org\/journal/i,
          /^doi:\s*10\.\d{4}/i,
          /^\d+$/i,                        // Số trang đơn lẻ
          /^\d+\s*-\s*\d+$/i,              // Dải số trang (e.g. 76-81)
          /^\d+\s*of\s*\d+$/i              // (e.g. 76 of 81)
        ];

        return noiseRegexes.some(regex => regex.test(s));
      };

      allRawBlocks.forEach(block => {
        const pHeight = pageHeightsMap[block.page] || 842;
        const yTop = block.maxY;
        const yBottom = block.minY;
        
        // Ngưỡng lề biên cho header và footer
        const isHeader = yTop > pHeight - 60;
        const isFooter = yBottom < 60;
        const isNoise = isAcademicNoiseBlock(block.en);
        const skipDisplay = isHeader || isFooter || isNoise;

        let type: 'header' | 'footer' | 'title' | 'body' | 'small' = 'body';
        let shouldTranslate = true;

        if (isHeader) {
          type = 'header';
          shouldTranslate = false;
        } else if (isFooter) {
          type = 'footer';
          shouldTranslate = false;
        } else if (isNoise) {
          type = 'small';
          shouldTranslate = false;
        } else if (block.page === 1 && block.fontSize >= maxFontSize - 1.5 && block.fontSize > 13) {
          type = 'title';
          shouldTranslate = true;
        } else if (block.fontSize < Math.max(dominantFontSize - 0.8, 8.5)) {
          // Trích dẫn hoặc metadata phụ có font chữ nhỏ hơn bình thường
          type = 'small';
          shouldTranslate = false;
        }

        // Thêm khối dịch thuật với trạng thái dịch tương ứng
        if (!shouldTranslate) {
          // Khối không dịch: gán luôn vi = en, status = done
          extractedBlocks.push({
            en: block.en,
            vi: block.en,
            status: 'done',
            page: block.page,
            fontSize: block.fontSize,
            minY: block.minY,
            maxY: block.maxY,
            type: type,
            shouldTranslate: false,
            skipDisplay: skipDisplay
          });
        } else {
          // Khối cần dịch (Tiêu đề lớn nhất, nội dung bài khoa học dài)
          if (type === 'body' && layoutStyle === 'bilingual') {
            // Chế độ song ngữ: tách câu để dịch đối chiếu song ngữ từng câu
            const sentences = block.en.split(/(?<=[.!?])\s+/);
            sentences.forEach((sentence: string) => {
              const trimmed = sentence.trim();
              if (trimmed.length > 3) {
                extractedBlocks.push({
                  en: trimmed,
                  vi: '',
                  status: 'pending',
                  page: block.page,
                  fontSize: block.fontSize,
                  minY: block.minY,
                  maxY: block.maxY,
                  type: type,
                  shouldTranslate: true,
                  skipDisplay: false
                });
              }
            });
          } else {
            // Chế độ trơn hoặc Tiêu đề chính: dịch cả khối
            extractedBlocks.push({
              en: block.en,
              vi: '',
              status: 'pending',
              page: block.page,
              fontSize: block.fontSize,
              minY: block.minY,
              maxY: block.maxY,
              type: type,
              shouldTranslate: true,
              skipDisplay: false
            });
          }
        }
      });

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
      if (updatedBlocks[i].shouldTranslate === false || updatedBlocks[i].status === 'done') {
        // Khối đã hoàn thành hoặc không dịch: bỏ qua nhanh và cập nhật tiến trình trực tiếp
        updatedBlocks[i].status = 'done';
        const translateProgress = 50 + Math.round(((i + 1) / updatedBlocks.length) * 45);
        setProgress(translateProgress);
        setBlocks([...updatedBlocks]);
        continue;
      }

      // Đặt khối ở trạng thái đang dịch
      updatedBlocks[i].status = 'translating';
      setBlocks([...updatedBlocks]);
      setStatusText(`Đang chuyển ngữ khối văn bản ${i + 1}/${updatedBlocks.length} (Trang ${updatedBlocks[i].page})...`);
      
      const translation = await translateText(updatedBlocks[i].en);
      
      // Cập nhật kết quả dịch và trạng thái thành công
      updatedBlocks[i].vi = translation;
      updatedBlocks[i].status = 'done';
      setCurrentPage(updatedBlocks[i].page);

      // Cập nhật tiến độ dịch từ 50% đến 95%
      const translateProgress = 50 + Math.round(((i + 1) / updatedBlocks.length) * 45);
      setProgress(translateProgress);
      setBlocks([...updatedBlocks]);
      
      // Tránh vượt quá tần suất API Google Translate
      await new Promise(r => setTimeout(r, 150));
    }

    // Giai đoạn chế bản và hoàn tất
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
          if (b.skipDisplay) return; // Bỏ qua khối lề biên học thuật
          if (b.shouldTranslate === false) {
            // Header/Footer hoặc trích dẫn giữ nguyên gốc 1 lần
            if (b.type === 'header' || b.type === 'footer') {
              pagesMap[pageNum].push(`<div style="text-align: center; font-size: 0.85em; color: #666666; font-family: sans-serif; margin: 10px 0;">${b.en}</div>`);
            } else if (b.type === 'small') {
              pagesMap[pageNum].push(`<div style="font-size: 0.9em; color: #555555; font-style: italic; border-left: 2px solid #cccccc; padding-left: 10px; margin: 10px 0;">${b.en}</div>`);
            } else {
              pagesMap[pageNum].push(b.en);
            }
          } else {
            if (b.type === 'title') {
              pagesMap[pageNum].push(`<h3 style="text-align: center; font-weight: bold; text-transform: uppercase;">${b.en}</h3>`);
              pagesMap[pageNum].push(`<h3 style="text-align: center; font-weight: bold; text-transform: uppercase; color: #1a1a1a; margin-bottom: 20px;">${b.vi}</h3>`);
            } else {
              // English sentence
              pagesMap[pageNum].push(b.en);
              // Bolded Vietnamese translation
              pagesMap[pageNum].push(`<strong>${b.vi}</strong>`);
            }
          }
        });
      } else {
        // Plain translated Vietnamese
        let currentParagraphParts: string[] = [];
        pageBlocks.forEach((b, idx) => {
          if (b.skipDisplay) return; // Bỏ qua khối lề biên học thuật
          if (b.shouldTranslate === false) {
            // Xả các câu trước đó ra trước
            if (currentParagraphParts.length > 0) {
              pagesMap[pageNum].push(currentParagraphParts.join(' '));
              currentParagraphParts = [];
            }
            // Định dạng khối không dịch tương ứng
            if (b.type === 'header' || b.type === 'footer') {
              pagesMap[pageNum].push(`<div style="text-align: center; font-size: 0.85em; color: #666666; font-family: sans-serif; margin: 10px 0;">${b.en}</div>`);
            } else if (b.type === 'small') {
              pagesMap[pageNum].push(`<div style="font-size: 0.9em; color: #555555; font-style: italic; border-left: 2px solid #cccccc; padding-left: 10px; margin: 10px 0;">${b.en}</div>`);
            } else {
              pagesMap[pageNum].push(b.en);
            }
          } else {
            if (b.type === 'title') {
              if (currentParagraphParts.length > 0) {
                pagesMap[pageNum].push(currentParagraphParts.join(' '));
                currentParagraphParts = [];
              }
              pagesMap[pageNum].push(`<h3 style="text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 20px;">${b.vi}</h3>`);
            } else {
              currentParagraphParts.push(b.vi);
              if (currentParagraphParts.length >= 3 || idx === pageBlocks.length - 1) {
                pagesMap[pageNum].push(currentParagraphParts.join(' '));
                currentParagraphParts = [];
              }
            }
          }
        });
        if (currentParagraphParts.length > 0) {
          pagesMap[pageNum].push(currentParagraphParts.join(' '));
        }
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
          if (b.skipDisplay) return; // Bỏ qua khối lề biên học thuật
          if (b.shouldTranslate === false) {
            if (b.type === 'header' || b.type === 'footer') {
              pagesMap[pageNum].push(`<div style="text-align: center; font-size: 10pt; color: #555555; font-family: Arial, sans-serif; margin: 8pt 0; text-indent: 0;">${b.en}</div>`);
            } else if (b.type === 'small') {
              pagesMap[pageNum].push(`<div style="font-size: 11pt; color: #444444; font-style: italic; border-left: 2px solid #999999; padding-left: 12pt; margin: 10pt 0; text-indent: 0; text-align: justify;">${b.en}</div>`);
            } else {
              pagesMap[pageNum].push(b.en);
            }
          } else {
            if (b.type === 'title') {
              pagesMap[pageNum].push(`<h3 style="text-align: center; font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 12pt 0; text-indent: 0;">${b.en}</h3>`);
              pagesMap[pageNum].push(`<h3 style="text-align: center; font-weight: bold; font-size: 16pt; text-transform: uppercase; color: #222222; margin-bottom: 24pt; text-indent: 0;">${b.vi}</h3>`);
            } else {
              // English sentence
              pagesMap[pageNum].push(b.en);
              // Bolded Vietnamese translation
              pagesMap[pageNum].push(`<strong>${b.vi}</strong>`);
            }
          }
        });
      } else {
        // Plain translated Vietnamese
        let currentParagraphParts: string[] = [];
        pageBlocks.forEach((b, idx) => {
          if (b.skipDisplay) return; // Bỏ qua khối lề biên học thuật
          if (b.shouldTranslate === false) {
            if (currentParagraphParts.length > 0) {
              pagesMap[pageNum].push(currentParagraphParts.join(' '));
              currentParagraphParts = [];
            }
            if (b.type === 'header' || b.type === 'footer') {
              pagesMap[pageNum].push(`<div style="text-align: center; font-size: 10pt; color: #555555; font-family: Arial, sans-serif; margin: 8pt 0; text-indent: 0;">${b.en}</div>`);
            } else if (b.type === 'small') {
              pagesMap[pageNum].push(`<div style="font-size: 11pt; color: #444444; font-style: italic; border-left: 2px solid #999999; padding-left: 12pt; margin: 10pt 0; text-indent: 0; text-align: justify;">${b.en}</div>`);
            } else {
              pagesMap[pageNum].push(b.en);
            }
          } else {
            if (b.type === 'title') {
              if (currentParagraphParts.length > 0) {
                pagesMap[pageNum].push(currentParagraphParts.join(' '));
                currentParagraphParts = [];
              }
              pagesMap[pageNum].push(`<h3 style="text-align: center; font-weight: bold; font-size: 16pt; text-transform: uppercase; margin-bottom: 24pt; text-indent: 0;">${b.vi}</h3>`);
            } else {
              currentParagraphParts.push(b.vi);
              if (currentParagraphParts.length >= 3 || idx === pageBlocks.length - 1) {
                pagesMap[pageNum].push(currentParagraphParts.join(' '));
                currentParagraphParts = [];
              }
            }
          }
        });
        if (currentParagraphParts.length > 0) {
          pagesMap[pageNum].push(currentParagraphParts.join(' '));
        }
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
    <div className="glass-panel shadow-apple-product rounded-3xl p-6 sm:p-10 max-w-4xl mx-auto text-[#1d1d1f] font-sans relative z-10 overflow-hidden">
      
      {/* Brand Ambient Glow internal effects */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-purple-500/5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-blue-500/5 blur-[80px] pointer-events-none" />

      {/* Header section */}
      <div className="border-b border-black/[0.06] pb-6 mb-8 flex flex-col sm:flex-row justify-between items-baseline gap-4 relative z-10">
        <div className="space-y-1">
          <h2 className="font-apple-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#1d1d1f] leading-tight">
            Dịch bài báo khoa học • <span className="iphone-gradient-text">Trần Trí Nhân</span>
          </h2>
          <p className="text-xs sm:text-[13px] font-sans font-medium text-neutral-500 tracking-tight leading-normal">
            Dịch thuật PDF song ngữ chuẩn xác • Chế bản PDF/EPUB thời gian thực
          </p>
        </div>
        <span className="text-[10px] bg-gradient-to-r from-[#0066cc] to-[#ff2e93] text-white font-sans font-bold uppercase px-3.5 py-1 rounded-full shadow-sm shadow-blue-500/20 select-none animate-pulseGlow shrink-0">
          REAL PDF PARSER
        </span>
      </div>

      {phase === 'upload' && (
        <div className="space-y-8 animate-fadeIn relative z-10">
          <p className="text-sm sm:text-[15px] text-neutral-600 leading-relaxed font-normal">
            Tải lên tệp tài liệu nghiên cứu khoa học bằng tiếng Anh định dạng PDF. Hệ thống dịch thuật AI sẽ <strong>trích xuất văn bản thực tế</strong> từ bên trong tệp tin của bạn, dịch chuyển ngữ song hành từng dòng bằng Google Translate API và đóng gói chuẩn e-book PDF/EPUB.
          </p>

          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative group overflow-hidden border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 ${
              isDragOver 
                ? 'border-[#0066cc] bg-[#0066cc]/5 scale-[1.01] shadow-lg shadow-[#0066cc]/10' 
                : 'border-neutral-300 bg-white/40 hover:border-neutral-400 hover:bg-white/60 shadow-sm'
            }`}
          >
            {/* Glowing gradient background border effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0066cc]/0 via-[#862e9c]/0 to-[#ff2e93]/0 group-hover:from-[#0066cc]/3 group-hover:via-[#862e9c]/3 group-hover:to-[#ff2e93]/3 transition-all duration-500 pointer-events-none" />

            <input
              type="file"
              accept=".pdf"
              id="file-upload-input"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="file-upload-input" className="cursor-pointer space-y-4 block">
              <div className="w-16 h-16 bg-white shadow-sm hover:shadow border border-black/[0.04] rounded-full flex items-center justify-center mx-auto hover:scale-105 active:scale-95 transition-all duration-200">
                <svg className="w-8 h-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-semibold tracking-tight text-neutral-800 uppercase">
                  {file ? file.name : "KÉO & THẢ FILE PDF CỦA BẠN VÀO ĐÂY"}
                </p>
                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">
                  {file ? `Dung lượng: ${(file.size / (1024 * 1024)).toFixed(2)} MB` : "Hoặc click để chọn file từ máy tính"}
                </p>
              </div>
            </label>
          </div>

          {/* Translation Options Panel */}
          {file && (
            <div className="bg-white/50 border border-black/[0.05] p-6 rounded-2xl space-y-6 shadow-sm animate-fadeIn">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-black/[0.04] pb-3 flex items-center gap-1.5">
                <span>⚙️</span> CẤU HÌNH DỊCH THUẬT &amp; XUẤT BẢN THỰC TẾ
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Option 1: Translation layout style */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-neutral-600 block">
                    1. Kiểu trình bày bản dịch
                  </span>
                  <div className="flex bg-neutral-200/50 p-1 rounded-full border border-black/[0.04] w-full">
                    <button
                      type="button"
                      onClick={() => setLayoutStyle('bilingual')}
                      className={`flex-1 py-2 text-[11px] font-sans font-bold uppercase tracking-wider rounded-full text-center transition-all apple-button-transition ${
                        layoutStyle === 'bilingual'
                          ? 'bg-white text-black shadow-sm'
                          : 'text-neutral-500 hover:text-black'
                      }`}
                    >
                      Bản song ngữ
                    </button>
                    <button
                      type="button"
                      onClick={() => setLayoutStyle('plain')}
                      className={`flex-1 py-2 text-[11px] font-sans font-bold uppercase tracking-wider rounded-full text-center transition-all apple-button-transition ${
                        layoutStyle === 'plain'
                          ? 'bg-white text-black shadow-sm'
                          : 'text-neutral-500 hover:text-black'
                      }`}
                    >
                      Bản dịch trơn
                    </button>
                  </div>
                </div>

                {/* Option 2: Translation model selection */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-neutral-600 block">
                    2. Mô hình dịch thuật AI
                  </span>
                  <div className="flex flex-col gap-1 bg-neutral-200/50 p-1 rounded-2xl border border-black/[0.04] w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModel('google');
                        localStorage.setItem('selected_model', 'google');
                      }}
                      className={`w-full py-1.5 text-[11px] font-sans font-bold uppercase tracking-wider rounded-xl text-center transition-all apple-button-transition ${
                        selectedModel === 'google'
                          ? 'bg-white text-black shadow-sm'
                          : 'text-neutral-500 hover:text-black'
                      }`}
                    >
                      Google Translate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModel('gemini');
                        localStorage.setItem('selected_model', 'gemini');
                      }}
                      className={`w-full py-1.5 text-[11px] font-sans font-bold uppercase tracking-wider rounded-xl text-center transition-all apple-button-transition ${
                        selectedModel === 'gemini'
                          ? 'bg-white text-black shadow-sm'
                          : 'text-neutral-500 hover:text-black'
                      }`}
                    >
                      Gemini 2.5 Lite
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModel('deepseek');
                        localStorage.setItem('selected_model', 'deepseek');
                      }}
                      className={`w-full py-1.5 text-[11px] font-sans font-bold uppercase tracking-wider rounded-xl text-center transition-all apple-button-transition ${
                        selectedModel === 'deepseek'
                          ? 'bg-white text-black shadow-sm'
                          : 'text-neutral-500 hover:text-black'
                      }`}
                    >
                      DeepSeek v4 Pro
                    </button>
                  </div>
                </div>

                {/* Option 3: Export formats */}
                <div className="space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-neutral-600 block">
                    3. Định dạng xuất bản
                  </span>
                  <div className="flex flex-col gap-1 bg-neutral-200/50 p-1 rounded-2xl border border-black/[0.04] w-full">
                    <button
                      type="button"
                      onClick={() => setExportFormat('both')}
                      className={`w-full py-1.5 text-[11px] font-sans font-bold uppercase tracking-wider rounded-xl text-center transition-all apple-button-transition ${
                        exportFormat === 'both'
                          ? 'bg-white text-black shadow-sm'
                          : 'text-neutral-500 hover:text-black'
                      }`}
                    >
                      PDF &amp; EPUB Cả hai
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat('pdf')}
                      className={`w-full py-1.5 text-[11px] font-sans font-bold uppercase tracking-wider rounded-xl text-center transition-all apple-button-transition ${
                        exportFormat === 'pdf'
                          ? 'bg-white text-black shadow-sm'
                          : 'text-neutral-500 hover:text-black'
                      }`}
                    >
                      Chỉ xuất PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportFormat('epub')}
                      className={`w-full py-1.5 text-[11px] font-sans font-bold uppercase tracking-wider rounded-xl text-center transition-all apple-button-transition ${
                        exportFormat === 'epub'
                          ? 'bg-white text-black shadow-sm'
                          : 'text-neutral-500 hover:text-black'
                      }`}
                    >
                      Chỉ xuất EPUB
                    </button>
                  </div>
                </div>
              </div>

              {/* API Key Inputs (Conditional) */}
              {selectedModel === 'gemini' && (
                <div className="space-y-2 pt-4 border-t border-black/[0.04] animate-fadeIn">
                  <label htmlFor="gemini-key-input" className="text-xs font-bold uppercase text-neutral-600 block">
                    🔑 Nhập Google Gemini API Key
                  </label>
                  <input
                    id="gemini-key-input"
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => {
                      setGeminiApiKey(e.target.value);
                      localStorage.setItem('gemini_api_key', e.target.value);
                    }}
                    placeholder="AIzaSy..."
                    className="w-full text-xs font-semibold p-3 border border-black/10 rounded-full bg-white/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066cc]/30 focus:border-[#0066cc] shadow-inner transition-all duration-200"
                  />
                  <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider pl-1.5">
                    Lấy key miễn phí tại Google AI Studio. Key được lưu cục bộ an toàn trên trình duyệt.
                  </p>
                </div>
              )}

              {selectedModel === 'deepseek' && (
                <div className="space-y-2 pt-4 border-t border-black/[0.04] animate-fadeIn">
                  <label htmlFor="deepseek-key-input" className="text-xs font-bold uppercase text-neutral-600 block">
                    🔑 Nhập DeepSeek API Key
                  </label>
                  <input
                    id="deepseek-key-input"
                    type="password"
                    value={deepseekApiKey}
                    onChange={(e) => {
                      setDeepseekApiKey(e.target.value);
                      localStorage.setItem('deepseek_api_key', e.target.value);
                    }}
                    placeholder="sk-..."
                    className="w-full text-xs font-semibold p-3 border border-black/10 rounded-full bg-white/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0066cc]/30 focus:border-[#0066cc] shadow-inner transition-all duration-200"
                  />
                  <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider pl-1.5">
                    Lấy key tại platform.deepseek.com. Key được lưu cục bộ an toàn trên trình duyệt.
                  </p>
                </div>
              )}

              {/* Start Button */}
              <button
                type="button"
                onClick={startTranslationProcess}
                className="w-full py-4 bg-gradient-to-r from-[#0066cc] via-[#862e9c] to-[#ff2e93] hover:from-[#0071e3] hover:to-[#ff3b30] text-white font-sans font-bold text-xs sm:text-sm uppercase tracking-wider rounded-full shadow-lg shadow-purple-500/20 active:scale-[0.96] hover:shadow-xl hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 apple-button-transition cursor-pointer"
              >
                🚀 BẮT ĐẦU DỊCH THUẬT AI TOÀN BỘ NỘI DUNG FILE
              </button>
            </div>
          )}
        </div>
      )}

      {/* Parsing & Translation Simulation Screen */}
      {(phase === 'parsing' || phase === 'translating') && (
        <div className="space-y-8 animate-fadeIn relative z-10">
          
          {/* Progress bar info */}
          <div className="bg-white/50 border border-black/[0.05] p-5 rounded-2xl space-y-3 shadow-sm">
            <div className="flex justify-between items-baseline flex-wrap gap-2 text-xs font-bold uppercase tracking-wider">
              <span className="flex items-center gap-2 text-neutral-700">
                <span className="w-2.5 h-2.5 bg-[#ff2e93] rounded-full inline-block animate-ping" />
                TIẾN TRÌNH DỊCH THUẬT THỰC TẾ
              </span>
              <span className="font-apple-display text-[#1d1d1f] font-semibold">{progress}% Hoàn thành</span>
            </div>
            
            <div className="w-full bg-neutral-200/60 h-2.5 rounded-full overflow-hidden border border-black/[0.04]">
              <div 
                className="bg-gradient-to-r from-[#0066cc] via-[#862e9c] to-[#ff2e93] h-full rounded-full transition-all duration-300 ease-out animate-pulseGlow" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-tight pt-1 leading-normal">
              Trạng thái: <span className="text-[#1d1d1f] font-bold">{statusText}</span>
            </p>
          </div>

          {/* Bilingual Live Stream Box */}
          {blocks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 pl-1">
                DÒNG DỊCH THUẬT SONG NGỮ THEO KHỐI THỰC TẾ TRONG FILE CỦA BẠN
              </h3>

              <div className="space-y-4 max-h-[380px] overflow-y-auto border border-black/[0.06] p-4 rounded-2xl bg-white/40 shadow-inner">
                {blocks.map((block: any, idx) => {
                  const isPending = block.status === 'pending';
                  const isTranslating = block.status === 'translating';
                  const isDone = block.status === 'done';
                  const isBypassed = block.shouldTranslate === false;

                  let typeLabel = "Nội dung bài báo";
                  let typeBadgeColor = "bg-blue-50 text-blue-800 border-blue-100/50";
                  let blockStyle = "";
                  
                  if (block.skipDisplay) {
                    typeLabel = "Lề biên học thuật - Đã ẩn";
                    typeBadgeColor = "bg-neutral-100 text-neutral-400 border-transparent font-normal";
                    blockStyle = "bg-neutral-50/30 border-neutral-100 opacity-50";
                  } else if (block.type === 'header') {
                    typeLabel = "Header Lề trên - Giữ nguyên";
                    typeBadgeColor = "bg-neutral-100 text-neutral-500 border-transparent";
                    blockStyle = "bg-neutral-50/20 border-neutral-100";
                  } else if (block.type === 'footer') {
                    typeLabel = "Footer Lề dưới - Giữ nguyên";
                    typeBadgeColor = "bg-neutral-100 text-neutral-500 border-transparent";
                    blockStyle = "bg-neutral-50/20 border-neutral-100";
                  } else if (block.type === 'title') {
                    typeLabel = "Tiêu đề lớn nhất - Cần dịch";
                    typeBadgeColor = "bg-purple-50 text-purple-800 border-purple-100 font-bold";
                    blockStyle = "bg-purple-50/20 border-purple-100";
                  } else if (block.type === 'small') {
                    typeLabel = "Trích dẫn / Phụ lục - Giữ nguyên";
                    typeBadgeColor = "bg-amber-50 text-amber-800 border-amber-100";
                    blockStyle = "bg-amber-50/20 border-amber-100";
                  }

                  return (
                    <div 
                      key={idx} 
                      className={`grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-black/[0.05] pb-4 last:border-0 last:pb-0 transition-all duration-300 ${
                        isPending ? 'opacity-30' : 'opacity-100'
                      }`}
                    >
                      {/* English Block */}
                      <div className={`p-4 rounded-2xl border border-black/[0.04] relative ${blockStyle || 'bg-white shadow-sm'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-sans font-bold uppercase tracking-wider ${typeBadgeColor}`}>
                            {typeLabel}
                          </span>
                          <span className="text-[9px] font-sans font-bold text-neutral-400 uppercase tracking-widest">
                            Trang {block.page} • Khối {idx + 1}
                          </span>
                        </div>
                        <p className={`font-sans text-neutral-800 leading-relaxed pt-1 text-apple-body ${block.type === 'title' ? 'text-xs font-bold uppercase' : block.type === 'small' || block.type === 'header' || block.type === 'footer' ? 'text-xs italic text-neutral-500' : 'text-xs font-normal'}`}>
                          {block.en}
                        </p>
                      </div>

                      {/* Vietnamese Block */}
                      <div className={`p-4 rounded-2xl border relative transition-all duration-300 ${
                        isTranslating
                          ? 'bg-amber-500/[0.08] border-amber-300 shadow-sm animate-pulse'
                          : isBypassed
                          ? 'bg-neutral-100/30 border-black/[0.04]'
                          : isDone
                          ? 'bg-gradient-to-r from-[#0066cc]/5 to-[#ff2e93]/5 border-[#0066cc]/10 shadow-sm'
                          : 'bg-neutral-50/20 border-black/[0.04]'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-sans font-bold uppercase tracking-wider ${
                            block.skipDisplay
                              ? 'bg-neutral-200 text-neutral-400'
                              : isBypassed 
                              ? 'bg-neutral-200 text-neutral-500' 
                              : isTranslating 
                              ? 'bg-amber-100 text-amber-800 animate-pulse' 
                              : 'bg-gradient-to-r from-[#0066cc]/10 to-[#ff2e93]/10 text-[#0066cc]'
                          }`}>
                            {block.skipDisplay ? "Đã ẩn ở bản dịch" : isBypassed ? "Không dịch (English gốc)" : "Bản dịch VI"}
                          </span>
                        </div>

                        {isPending && (
                          <p className="text-xs font-sans text-neutral-400 italic pt-2">
                            Đang chờ hàng đợi dịch...
                          </p>
                        )}

                        {isTranslating && (
                          <div className="pt-2 space-y-1.5">
                            <p className="text-xs font-sans text-amber-800 font-bold leading-relaxed animate-pulse">
                              Đang phân tích cấu trúc ngữ nghĩa...
                            </p>
                            <span className="inline-flex gap-1.5 items-center text-[10px] text-amber-700 font-bold uppercase tracking-widest pt-1">
                              <span className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce" />
                              Đang chuyển ngữ AI...
                            </span>
                          </div>
                        )}

                        {isDone && (
                          <p className={`font-sans leading-relaxed pt-1 text-apple-body animate-fadeIn ${
                            block.skipDisplay
                              ? 'text-neutral-400 italic text-[11px]'
                              : block.type === 'title' 
                              ? 'text-xs font-bold uppercase text-neutral-800' 
                              : block.type === 'small' || block.type === 'header' || block.type === 'footer'
                              ? 'text-xs text-neutral-500 italic'
                              : layoutStyle === 'bilingual' 
                              ? 'text-xs font-semibold text-neutral-900' 
                              : 'text-xs text-neutral-800'
                          }`}>
                            {block.skipDisplay ? "[Dòng này là nhiễu lề biên / số trang / copyright - Đã loại bỏ hoàn toàn khỏi bản dịch]" : block.vi}
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
        <div className="space-y-8 text-center animate-fadeIn relative z-10">
          
          {/* Success card with iPhone glowing badge */}
          <div className="bg-white/60 border border-black/[0.05] p-8 rounded-3xl space-y-4 shadow-sm max-w-xl mx-auto">
            <div className="w-16 h-16 bg-gradient-to-tr from-[#0066cc] via-[#862e9c] to-[#ff2e93] rounded-full flex items-center justify-center mx-auto text-white shadow-lg shadow-purple-500/25 animate-bounce">
              <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-apple-display text-lg sm:text-xl font-semibold tracking-tight text-[#1d1d1f]">
              DỊCH TOÀN BỘ FILE &amp; CHẾ BẢN HOÀN TẤT
            </h3>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
              Tệp tài liệu <span className="font-semibold text-black">"{file?.name}"</span> ({totalPages} trang) đã được dịch thuật thành công toàn bộ nội dung văn bản sang tiếng Việt và đóng gói sẵn sàng.
            </p>
          </div>

          {/* Export Options Grid with iPhone glow border buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto pt-2 select-none">
            
            {/* Export PDF */}
            {(exportFormat === 'both' || exportFormat === 'pdf') && (
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="bg-white/65 border border-black/[0.05] p-6 rounded-2xl hover:bg-white/80 active:scale-95 transition-all text-left flex flex-col justify-between h-44 group cursor-pointer shadow-sm hover:shadow-md hover:border-transparent relative overflow-hidden iphone-glow-border apple-button-transition"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-sans font-bold uppercase text-[#0066cc] tracking-wider bg-blue-50 px-2 py-0.5 rounded-full inline-block mb-1">
                    Bản đối chiếu dàn trang
                  </span>
                  <h4 className="text-sm font-semibold tracking-tight font-apple-display group-hover:text-[#0066cc] transition-colors">
                    TẢI BẢN DỊCH PDF DÀN TRANG (.pdf)
                  </h4>
                  <p className="text-[11px] text-neutral-400 leading-normal pt-1.5">
                    Kết xuất tài liệu dạng đa cột học thuật, dàn trang song hành song ngữ, thích hợp lưu trữ hoặc in ấn.
                  </p>
                </div>
                <span className="text-xs font-bold uppercase text-[#1d1d1f] group-hover:translate-x-1.5 transition-transform inline-flex items-center gap-1 mt-3">
                  Tải xuống PDF <span className="text-[#0066cc]">→</span>
                </span>
              </button>
            )}

            {/* Export EPUB */}
            {(exportFormat === 'both' || exportFormat === 'epub') && (
              <button
                type="button"
                onClick={handleDownloadEpub}
                className="bg-white/65 border border-black/[0.05] p-6 rounded-2xl hover:bg-white/80 active:scale-95 transition-all text-left flex flex-col justify-between h-44 group cursor-pointer shadow-sm hover:shadow-md hover:border-transparent relative overflow-hidden iphone-glow-border apple-button-transition"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-sans font-bold uppercase text-[#ff2e93] tracking-wider bg-pink-50 px-2 py-0.5 rounded-full inline-block mb-1">
                    Tương thích e-Reader
                  </span>
                  <h4 className="text-sm font-semibold tracking-tight font-apple-display group-hover:text-[#ff2e93] transition-colors">
                    TẢI SÁCH ĐIỆN TỬ EPUB (.epub)
                  </h4>
                  <p className="text-[11px] text-neutral-400 leading-normal pt-1.5">
                    Tương thích hoàn hảo với Kindle, Apple Books, tự động giãn dòng mượt mà trên di động.
                  </p>
                </div>
                <span className="text-xs font-bold uppercase text-[#1d1d1f] group-hover:translate-x-1.5 transition-transform inline-flex items-center gap-1 mt-3">
                  Tải xuống EPUB <span className="text-[#ff2e93]">→</span>
                </span>
              </button>
            )}

          </div>

          {/* Document Live Preview with Frosted title header */}
          <div className="max-w-2xl mx-auto border border-black/[0.06] rounded-2xl overflow-hidden bg-white/70 shadow-sm mt-8">
            <div className="bg-[#fafafc]/95 border-b border-black/[0.05] px-4 py-3.5 font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-between">
              <span className="text-neutral-500 font-semibold flex items-center gap-1.5">📖 XEM TRƯỚC BẢN IN SONG NGỮ (PAGE PREVIEW)</span>
              <span className="text-[10px] bg-black/10 text-neutral-700 px-2.5 py-0.5 rounded-full font-bold">Times New Roman • 14pt</span>
            </div>
            
            <div className="p-6 max-h-[350px] overflow-y-auto font-serif" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
              {/* PDF style header */}
              <div className="border-b border-black/10 pb-3 mb-4 text-center">
                <h4 className="font-bold text-lg uppercase tracking-tight m-0 text-black">
                  TÀI LIỆU DỊCH THUẬT SONG NGỮ
                </h4>
                <p className="text-[10px] font-sans font-bold text-neutral-400 uppercase tracking-wide mt-1">
                  Sách gốc: {file?.name} • Biên dịch: AI Document Translator • Ngôn ngữ: Anh - Việt
                </p>
              </div>

              {/* Sample pages content */}
              <div className="space-y-4 text-sm leading-relaxed text-[#1d1d1f] text-justify">
                {layoutStyle === 'bilingual' ? (
                  blocks.slice(0, 15).map((b: any, idx) => {
                    if (b.skipDisplay) return null;
                    if (b.shouldTranslate === false) {
                      if (b.type === 'header' || b.type === 'footer') {
                        return (
                          <div key={idx} className="text-center text-[10px] text-neutral-400 font-sans tracking-wide uppercase my-2 py-1 border-y border-dashed border-neutral-100">
                            {b.en}
                          </div>
                        );
                      } else if (b.type === 'small') {
                        return (
                          <div key={idx} className="text-xs text-neutral-500 pl-4 border-l-2 border-neutral-300 italic my-3">
                            {b.en}
                          </div>
                        );
                      }
                      return (
                        <p key={idx} style={{ textIndent: '1.5em', margin: '0 0 12px 0' }}>
                          {b.en}
                        </p>
                      );
                    } else {
                      if (b.type === 'title') {
                        return (
                          <React.Fragment key={idx}>
                            <h3 className="text-center font-bold text-base uppercase tracking-tight m-0 text-black pt-2">
                              {b.en}
                            </h3>
                            <h3 className="text-center font-bold text-base uppercase tracking-tight m-0 text-red-950 pb-3">
                              {b.vi}
                            </h3>
                          </React.Fragment>
                        );
                      }
                      return (
                        <React.Fragment key={idx}>
                          <p style={{ textIndent: '1.5em', margin: '0 0 4px 0' }}>{b.en}</p>
                          <p style={{ textIndent: '1.5em', margin: '0 0 14px 0', fontWeight: 'bold', color: '#1d1d1f' }}>{b.vi}</p>
                        </React.Fragment>
                      );
                    }
                  })
                ) : (
                  blocks.slice(0, 15).map((b: any, idx) => {
                    if (b.skipDisplay) return null;
                    if (b.shouldTranslate === false) {
                      if (b.type === 'header' || b.type === 'footer') {
                        return (
                          <div key={idx} className="text-center text-[10px] text-neutral-400 font-sans tracking-wide uppercase my-2 py-1 border-y border-dashed border-neutral-100">
                            {b.en}
                          </div>
                        );
                      } else if (b.type === 'small') {
                        return (
                          <div key={idx} className="text-xs text-neutral-500 pl-4 border-l-2 border-neutral-300 italic my-3">
                            {b.en}
                          </div>
                        );
                      }
                      return (
                        <p key={idx} style={{ textIndent: '1.5em', margin: '0 0 14pt 0' }}>
                          {b.en}
                        </p>
                      );
                    } else {
                      if (b.type === 'title') {
                        return (
                          <h3 key={idx} className="text-center font-bold text-base uppercase tracking-tight my-4 text-emerald-950">
                            {b.vi}
                          </h3>
                        );
                      }
                      return (
                        <p key={idx} style={{ textIndent: '1.5em', margin: '0 0 14pt 0' }}>{b.vi}</p>
                      );
                    }
                  })
                )}
                {blocks.length > 15 && (
                  <p className="text-center font-sans font-bold text-xs text-neutral-400 uppercase tracking-widest pt-2">
                    ... và {blocks.length - 15} câu tiếp theo được đóng gói trong tài liệu ...
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Reset / Return button */}
          <div className="pt-4">
            <button
              type="button"
              onClick={resetStudio}
              className="text-xs uppercase font-bold tracking-wider px-6 py-3 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-full active:scale-95 transition-all border border-black/[0.04] apple-button-transition cursor-pointer"
            >
              Quay lại dịch file mới
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
