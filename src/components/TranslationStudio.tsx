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

        // 2. Thuật toán phân luồng Cột (Column-Aware Coordinate Sorting)
        const mid = pageWidth / 2;
        const leftBound = mid - 15;
        const rightBound = mid + 15;

        // Phân loại các khối chữ theo vị trí địa lý trên trang
        const leftHalfItems = validItems.filter((item: any) => item.transform[4] + (item.width || 0) < mid);
        const rightHalfItems = validItems.filter((item: any) => item.transform[4] > mid);

        // Ngưỡng phát hiện trang song cột: cột bên phải phải có số lượng khối chữ đáng kể
        const isTwoColumn = rightHalfItems.length > 3 && (rightHalfItems.length / validItems.length) > 0.08;

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
          // Trang song cột: Áp dụng thuật toán phân luồng đọc cột học thuật
          const leftColItems: any[] = [];
          const rightColItems: any[] = [];
          const fullWidthItems: any[] = [];

          validItems.forEach((item: any) => {
            const x = item.transform[4];
            const w = item.width || 0;
            if (x < leftBound && (x + w) > rightBound) {
              fullWidthItems.push(item);
            } else if (x + w < rightBound) {
              leftColItems.push(item);
            } else {
              rightColItems.push(item);
            }
          });

          // Xác định vùng hai cột để phân chia luồng đọc
          let highestTwoColY = 0;
          let lowestTwoColY = pageHeight;

          leftColItems.concat(rightColItems).forEach((item: any) => {
            const y = item.transform[5];
            if (y > highestTwoColY) highestTwoColY = y;
            if (y < lowestTwoColY) lowestTwoColY = y;
          });

          // Tách các khối chữ thành 3 vùng đứng: Trên hai cột, Giữa hai cột, Dưới hai cột
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
              // Vùng ở giữa
              if (x < leftBound && (x + w) > rightBound) {
                midFullItems.push(item);
              } else if (x + w < rightBound) {
                leftColumn.push(item);
              } else {
                rightColumn.push(item);
              }
            }
          });

          // Định nghĩa bộ so sánh sắp xếp (y giảm dần, x tăng dần)
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

          // Sắp xếp từng phân vùng
          topFullItems.sort(coordinateComparator);
          leftColumn.sort(coordinateComparator);
          rightColumn.sort(coordinateComparator);
          midFullItems.sort(coordinateComparator);
          bottomFullItems.sort(coordinateComparator);

          // Lắp ghép tuần tự luồng đọc học thuật
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

      allRawBlocks.forEach(block => {
        const pHeight = pageHeightsMap[block.page] || 842;
        const yTop = block.maxY;
        const yBottom = block.minY;
        
        // Ngưỡng lề biên cho header và footer
        const isHeader = yTop > pHeight - 60;
        const isFooter = yBottom < 60;

        let type: 'header' | 'footer' | 'title' | 'body' | 'small' = 'body';
        let shouldTranslate = true;

        if (isHeader) {
          type = 'header';
          shouldTranslate = false;
        } else if (isFooter) {
          type = 'footer';
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
            shouldTranslate: false
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
                  shouldTranslate: true
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
              shouldTranslate: true
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
                {blocks.map((block: any, idx) => {
                  const isPending = block.status === 'pending';
                  const isTranslating = block.status === 'translating';
                  const isDone = block.status === 'done';
                  const isBypassed = block.shouldTranslate === false;

                  let typeLabel = "Nội dung bài báo";
                  let typeBadgeColor = "bg-emerald-100 text-emerald-850 border-emerald-200";
                  let blockStyle = "";
                  
                  if (block.type === 'header') {
                    typeLabel = "Header Lề trên - Giữ nguyên";
                    typeBadgeColor = "bg-neutral-200 text-neutral-700 border-neutral-350";
                    blockStyle = "bg-neutral-50/50 border-neutral-200";
                  } else if (block.type === 'footer') {
                    typeLabel = "Footer Lề dưới - Giữ nguyên";
                    typeBadgeColor = "bg-neutral-200 text-neutral-700 border-neutral-350";
                    blockStyle = "bg-neutral-50/50 border-neutral-200";
                  } else if (block.type === 'title') {
                    typeLabel = "Tiêu đề lớn nhất - Cần dịch";
                    typeBadgeColor = "bg-rose-100 text-rose-800 border-rose-300 font-extrabold";
                    blockStyle = "bg-rose-50/30 border-rose-200";
                  } else if (block.type === 'small') {
                    typeLabel = "Trích dẫn / Phụ lục - Giữ nguyên";
                    typeBadgeColor = "bg-blue-100 text-blue-800 border-blue-200";
                    blockStyle = "bg-blue-50/30 border-blue-200";
                  }

                  return (
                    <div 
                      key={idx} 
                      className={`grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-neutral-200 pb-4 last:border-0 last:pb-0 transition-all duration-300 ${
                        isPending ? 'opacity-30' : 'opacity-100'
                      }`}
                    >
                      {/* English Block */}
                      <div className={`p-3 rounded border relative ${blockStyle || 'bg-neutral-50 border-neutral-200'}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-black uppercase tracking-wider ${typeBadgeColor}`}>
                            {typeLabel}
                          </span>
                          <span className="text-[9px] font-sans font-black text-neutral-400 uppercase tracking-widest">
                            Trang {block.page} • Khối {idx + 1}
                          </span>
                        </div>
                        <p className={`font-sans text-neutral-850 leading-relaxed pt-1 ${block.type === 'title' ? 'text-xs font-black uppercase' : block.type === 'small' || block.type === 'header' || block.type === 'footer' ? 'text-xs italic text-neutral-600' : 'text-xs font-semibold text-neutral-800'}`}>
                          {block.en}
                        </p>
                      </div>

                      {/* Vietnamese Block */}
                      <div className={`p-3 rounded border relative transition-all duration-300 ${
                        isTranslating
                          ? 'bg-amber-50/50 border-amber-400 shadow-sm shadow-amber-100'
                          : isBypassed
                          ? 'bg-neutral-100/50 border-neutral-300'
                          : isDone
                          ? 'bg-emerald-50/30 border-emerald-400'
                          : 'bg-neutral-50/30 border-neutral-200'
                      }`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-black uppercase tracking-wider ${
                            isBypassed 
                              ? 'bg-neutral-200 text-neutral-600' 
                              : isTranslating 
                              ? 'bg-amber-100 text-amber-800 animate-pulse' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isBypassed ? "Không dịch (English gốc)" : "Bản dịch VI"}
                          </span>
                        </div>

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
                          <p className={`font-sans leading-relaxed pt-1 animate-fadeIn ${
                            block.type === 'title' 
                              ? 'text-xs font-black uppercase text-rose-950' 
                              : block.type === 'small' || block.type === 'header' || block.type === 'footer'
                              ? 'text-xs text-neutral-600 italic'
                              : layoutStyle === 'bilingual' 
                              ? 'text-xs font-extrabold text-neutral-900' 
                              : 'text-xs text-emerald-950 font-semibold'
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
                  blocks.slice(0, 15).map((b: any, idx) => {
                    if (b.shouldTranslate === false) {
                      if (b.type === 'header' || b.type === 'footer') {
                        return (
                          <div key={idx} className="text-center text-[10px] text-neutral-500 font-sans tracking-wide uppercase my-2 py-1 border-y border-dashed border-neutral-200">
                            {b.en}
                          </div>
                        );
                      } else if (b.type === 'small') {
                        return (
                          <div key={idx} className="text-xs text-neutral-600 pl-4 border-l-2 border-neutral-300 italic my-3">
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
                          <p style={{ textIndent: '1.5em', margin: '0 0 14px 0', fontWeight: 'bold', color: '#111111' }}>{b.vi}</p>
                        </React.Fragment>
                      );
                    }
                  })
                ) : (
                  blocks.slice(0, 15).map((b: any, idx) => {
                    if (b.shouldTranslate === false) {
                      if (b.type === 'header' || b.type === 'footer') {
                        return (
                          <div key={idx} className="text-center text-[10px] text-neutral-500 font-sans tracking-wide uppercase my-2 py-1 border-y border-dashed border-neutral-200">
                            {b.en}
                          </div>
                        );
                      } else if (b.type === 'small') {
                        return (
                          <div key={idx} className="text-xs text-neutral-600 pl-4 border-l-2 border-neutral-300 italic my-3">
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
