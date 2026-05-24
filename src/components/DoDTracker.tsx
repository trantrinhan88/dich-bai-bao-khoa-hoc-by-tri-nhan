'use strict';
'use client';

import React, { useState } from 'react';

interface IDodItem {
  id: string;
  title: string;
  sub: string;
  detail: string;
  checked: boolean;
}

const INITIAL_DOD: IDodItem[] = [
  {
    id: 'order',
    title: "TÍNH TUẦN TỰ (ORDER PRINCIPLE)",
    sub: "Đảm bảo tính nhất quán trên thiết bị di động",
    detail: "Khi hiển thị trên thiết bị di động (1 cột duy nhất), luồng đọc của người dùng phải chạy mượt mà từ toàn bộ các bài viết thuộc Cột Trái -> chuyển sang Cột Giữa -> kết thúc ở Cột Phải. Không bị đảo lộn trật tự logic thông tin.",
    checked: true
  },
  {
    id: 'typography',
    title: "TRẢI NGHIỆM ĐỌC (MAGAZINE TYPOGRAPHY)",
    sub: "Thiết kế font chữ và màu sắc tối ưu thị giác",
    detail: "Sử dụng màu nền ngả giấy (#fcfbf7 hoặc #faf9f6) kết hợp màu chữ đen xám tự nhiên để tránh mỏi mắt cho người đọc bài viết dài. Tiêu đề nội dung bắt buộc sử dụng font có chân (font-serif) tạo cảm giác báo giấy truyền thống, các thông số phụ (Số trang, nhãn phân loại, ngày tháng) dùng font không chân (font-sans) để tăng độ sắc nét trực quan.",
    checked: true
  },
  {
    id: 'performance',
    title: "TỐI ƯU SEO & TẢI TRANG",
    sub: "Kỹ thuật kết xuất tĩnh cho tốc độ vượt trội",
    detail: "Sử dụng cơ chế Static Site Generation (SSG) hoặc Incremental Static Regeneration (ISR) của Next.js để sinh ra mã HTML tĩnh, tối ưu hóa tối đa thời gian phản hồi trang đầu tiên (FCP) phục vụ mục đích đọc báo tốc độ cao.",
    checked: true
  }
];

export default function DoDTracker() {
  const [items, setItems] = useState<IDodItem[]>(INITIAL_DOD);

  const toggleItem = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const checkedCount = items.filter(i => i.checked).length;
  const progressPercent = Math.round((checkedCount / items.length) * 100);

  return (
    <div className="bg-[#fcfbf7] border-2 border-black rounded-lg p-5 shadow-sm space-y-4 text-[#111111] font-sans">
      
      {/* Header bar */}
      <div className="border-b-2 border-black pb-2.5 flex justify-between items-baseline flex-wrap gap-2">
        <h4 className="font-sans font-black uppercase tracking-wider text-sm flex items-center gap-1.5">
          🎯 SECTION 3: TIÊU CHÍ HOÀN THÀNH (DEFINITION OF DONE)
        </h4>
        <span className="text-xs bg-red-700 text-white px-2 py-0.5 font-bold uppercase rounded-sm">
          Tiêu chuẩn
        </span>
      </div>

      <p className="text-xs text-neutral-600 leading-relaxed font-medium">
        Đánh giá các chỉ số chất lượng của ứng dụng để đảm bảo sản phẩm đạt tiêu chuẩn phát hành cao cấp. Nhấp vào mỗi tiêu chí để bật/tắt theo dõi tiến độ.
      </p>

      {/* Progress bar */}
      <div className="space-y-1.5 bg-[#f5f2eb] p-3 rounded-md border border-neutral-300">
        <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider">
          <span>Tiến độ hoàn thiện:</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full bg-neutral-300 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-black h-full transition-all duration-500 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-4 pt-1">
        {items.map((item) => (
          <label 
            key={item.id} 
            className={`group block p-3 rounded border border-neutral-300 bg-white hover:border-black cursor-pointer transition-all duration-200 select-none ${
              item.checked ? 'shadow-sm' : 'opacity-60 bg-neutral-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="relative flex items-center h-5 pt-0.5">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleItem(item.id)}
                  className="sr-only"
                />
                <div className={`w-4.5 h-4.5 border-2 border-black rounded-sm flex items-center justify-center transition-colors ${
                  item.checked ? 'bg-black text-[#fcfbf7]' : 'bg-white text-transparent group-hover:bg-neutral-100'
                }`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <div className="space-y-1 flex-grow">
                <span className={`text-xs font-extrabold tracking-tight uppercase block ${
                  item.checked ? 'text-black' : 'text-neutral-500 line-through'
                }`}>
                  {item.title}
                </span>
                <span className="text-[11px] font-bold text-neutral-500 block uppercase tracking-wide">
                  {item.sub}
                </span>
                <p className="text-xs text-neutral-600 leading-relaxed font-sans font-medium pt-1">
                  {item.detail}
                </p>
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Verification success badge */}
      {progressPercent === 100 && (
        <div className="bg-emerald-50 border border-emerald-500 p-3 rounded text-center animate-fadeIn">
          <p className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center justify-center gap-1.5">
            🛡️ 100% SẴN SÀNG BÀN GIAO (DOD PASSED)
          </p>
          <p className="text-[11px] text-emerald-700 leading-relaxed pt-1">
            Mã nguồn đã tối ưu SEO tĩnh, bố cục tuân thủ tuần tự di động và Typography cổ điển hoàn thiện.
          </p>
        </div>
      )}

    </div>
  );
}
