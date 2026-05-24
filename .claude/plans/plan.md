Dưới đây là file Markdown được thiết kế lại theo dạng **Hệ thống Quy tắc chung (Rule/Framework)** dành cho dự án dịch thuật và lập trình của bạn.

Bằng cách loại bỏ hoàn toàn tên bài viết cụ thể của tệp đính kèm trước, file này trở thành một bộ khuôn tiêu chuẩn để bạn tái sử dụng cho bất kỳ số báo, tài liệu tạp chí đa cột nào muốn chuyển đổi sang Next.js.

```markdown
# QUY TẮC CHUNG: DỊCH THUẬT & PHÁT TRIỂN ỨNG DỤNG E-MAGAZINE (NEXT.JS)

Tài liệu này quy định cấu trúc kỹ thuật và quy trình xử lý nội dung khi chuyển đổi một tạp chí in dạng đa cột (Multi-column layout) sang giao diện ứng dụng web hiện đại sử dụng **Next.js (App Router)** và **Tailwind CSS**.

---

## 🏛️ SECTION 1: QUY TẮC PHÂN LUỒNG & DỊCH THUẬT NỘI DUNG
Khi xử lý tài liệu gốc, biên dịch viên và kỹ sư dữ liệu phải bóc tách nội dung theo nguyên tắc **Từ trái qua phải - Từ trên xuống dưới** để ánh xạ chính xác vào hệ thống Grid.

### ⬅️ CỘT 1: TIÊU ĐIỂM & ĐIỂM NHẤN TRANG BÌA (ON THE COVER)
* **Tiêu chuẩn nội dung:** Tập trung vào các bài viết mang tính chuyên sâu, bài nghiên cứu trang bìa hoặc tiêu đề lớn có tính thu hút cao.
* **Văn phong dịch thuật:** Cuốn hút, mang tính giật tít nhưng đảm bảo học thuật, sử dụng các thuật ngữ chuyên ngành chính xác để tối ưu SEO Landing Page.
* **Thành phần hiển thị:** Thường đi kèm đoạn trích dẫn ngắn (Snippet) hoặc ảnh minh họa nổi bật.

### 📰 CỘT 2: TIN TỨC CHÍNH & LUẬN ĐIỂM KHOA HỌC (NEWS & VIEWS)
* **Tiêu chuẩn nội dung:** Chứa các bản tin cập nhật, diễn biến xã hội, báo cáo thống kê hoặc các góc nhìn/bình luận mang tính thời sự.
* **Văn phong dịch thuật:** Khách quan, ngắn gọn, súc tích. Chú ý dịch chuẩn xác số liệu, biểu đồ, tên tác giả, tên cơ quan nghiên cứu và các hằng số/hàm số khoa học đi kèm.

### ☕ CỘT 3: CHUYÊN MỤC HẬU TRƯỜNG & TƯƠNG TÁC (THE BACK PAGES)
* **Tiêu chuẩn nội dung:** Các nội dung mang tính giải trí nhẹ nhàng, chuyên mục tư vấn đời sống, câu đố ô chữ, truyện tranh biếm họa hoặc thư phản hồi từ độc giả.
* **Văn phong dịch thuật:** Gần gũi, đời thường, dí dỏm.
* **Yêu cầu kỹ thuật:** Cần xác định rõ các thành phần có tính chất tương tác (nhập liệu, bấm chọn) như các trò chơi trí tuệ, câu đố để lập trình viên xử lý Logic Client Component.

---

## 🛠️ SECTION 2: CHUẨN KIẾN TRÚC MÃ NGUỒN NEXT.JS

### 1. Mô hình hóa Dữ liệu động (`Static/Dynamic Type`)
Toàn bộ dữ liệu từ file tạp chí sau khi dịch sẽ được cấu trúc hóa dưới dạng JSON theo Interface chuẩn dưới đây để đảm bảo tính tuần tự từ trái qua phải:

```typescript
// types/magazine.ts

export interface IArticleItem {
  id: string;
  title: string;
  subtitle?: string;
  contentSnippet?: string;
  pageNumber?: number;
  badge?: string; // Dùng cho các thẻ phân loại như "Physics", "Health", "Tech"
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
}

```

### 2. Thành phần Giao diện Layout Đa Cột (`Responsive Grid`)

Sử dụng Tailwind CSS để cấu hình giao diện responsive. Ưu tiên hàng đầu là **giữ nguyên thứ tự cột từ trái qua phải trên Desktop**, nhưng phải tự động xếp chồng (stacking) tối ưu trên **Mobile**.

```tsx
// app/magazine-portal/page.tsx
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
            className={`flex flex-col h-full space-y-6 pb-6 ${
              // Tạo vách ngăn giữa các cột trên màn hình Desktop lớn
              index !== magazineData.layoutColumns.length - 1 ? 'lg:border-r lg:border-gray-200 lg:pr-6' : ''
            }`}
          >
            {/* Tiêu đề của từng cột */}
            <h2 className="text-lg font-sans font-black border-b-2 border-black pb-1 uppercase tracking-tight text-neutral-800">
              {column.columnHeader}
            </h2>

            {/* Danh sách bài viết bên trong cột */}
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
}

```

---

## 🎯 SECTION 3: TIÊU CHÍ HOÀN THÀNH CHUẨN (DEFINITION OF DONE)

1. **Tính tuần tự (Order Principle):** Khi hiển thị trên thiết bị di động (1 cột duy nhất), luồng đọc của người dùng phải chạy mượt mà từ toàn bộ các bài viết thuộc Cột Trái -> chuyển sang Cột Giữa -> kết thúc ở Cột Phải. Không bị đảo lộn trật tự logic thông tin.
2. **Trải nghiệm đọc (Magazine Typography):**
* Sử dụng màu nền ngả giấy (`#fcfbf7` hoặc `#faf9f6`) kết hợp màu chữ đen xám tự nhiên để tránh mỏi mắt cho người đọc bài viết dài.
* Tiêu đề nội dung bắt buộc sử dụng font có chân (`font-serif`) tạo cảm giác báo giấy truyền thống, các thông số phụ (Số trang, nhãn phân loại, ngày tháng) dùng font không chân (`font-sans`) để tăng độ sắc nét trực quan.


3. **Tối ưu SEO & Tải trang:**
* Sử dụng cơ chế **Static Site Generation (SSG)** hoặc **Incremental Static Regeneration (ISR)** của Next.js để sinh ra mã HTML tĩnh, tối ưu hóa tối đa thời gian phản hồi trang đầu tiên (FCP) phục vụ mục đích đọc báo tốc độ cao.



```

```