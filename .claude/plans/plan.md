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

Chào bạn, việc ứng dụng Next.js của bạn không hiển thị đầy đủ chữ từ file PDF đính kèm (hoặc từ dữ liệu JSON cấu trúc) thường xuất phát từ một lỗi rất phổ biến trong lập trình giao diện: **Lỗi tràn chữ (Text Overflow) hoặc Xung đột chiều cao cố định (Fixed Height Constraint)** khi chuyển đổi từ layout báo giấy sang CSS Grid.

Khi một bài viết có nội dung dài (hoặc chứa các từ chuyên ngành siêu dài như trên trang 48), nếu container bọc ngoài bị giới hạn thuộc tính CSS, trình duyệt sẽ tự động cắt bỏ phần chữ thừa.

Để khắc phục triệt để vấn đề "không nhận/hiển thị đầy đủ chữ", bạn hãy áp dụng ngay bộ 3 quy tắc sửa lỗi CSS dưới đây vào component Next.js của mình:

---

## 🛠️ CÁC BƯỚC KHẮC PHỤC LỖI HIỂN THỊ CHỮ TRÊN NEXT.JS

### 1. Sửa lỗi ẩn chữ do đặt cố định chiều cao (`h-full` hoặc `h-[fixed]`)

Trong đoạn code mẫu trước đó, thuộc tính `h-full` (height 100%) nằm trong thẻ `<section>` hoặc `<div>` bọc bài viết có thể ép container không được nở dài ra khi chữ quá nhiều.

* **Cách sửa:** Đổi toàn bộ thuộc tính chiều cao của các container chứa chữ thành chiều cao tự động nở (`h-auto` hoặc xóa hẳn thuộc tính chiều cao).

### 2. Thêm quy tắc bẻ hàng đối với từ siêu dài (`Word Break`)

Các thuật ngữ khoa học, link URL hoặc các chuỗi ký tự dài liên tục trong file gốc nếu không được cấu hình bẻ hàng sẽ tự động đâm thủng layout grid và biến mất khỏi khung nhìn.

* **Cách sửa:** Thêm lớp `break-words` hoặc `whitespace-pre-line` vào thẻ hiển thị nội dung bài viết.

---

## 💻 ĐOẠN CODE CẬP NHẬT CHỐNG MẤT CHỮ (TAILWIND CSS)

Hãy kiểm tra và cập nhật lại phần render bài viết của bạn theo form chuẩn dưới đây (chú ý các class được **bôi đậm**):

```tsx
// Component hiển thị từng bài viết lẻ (Article Card)
function ArticleWidget({ article }: { article: IArticleItem }) {
  return (
    <article className="group border-b border-gray-100 pb-4 last:border-0 cursor-pointer h-auto">
      <div className="flex justify-between items-start gap-4">
        
        {/* Thêm break-words để tiêu đề dài tự động xuống hàng, không bị đẩy ra ngoài */}
        <div className="space-y-1 min-w-0 flex-1 break-words">
          {article.badge && (
            <span className="text-xs font-sans font-bold tracking-wider text-red-700 uppercase block">
              {article.badge}
            </span>
          )}
          <h3 className="text-lg font-bold leading-snug text-neutral-900 group-hover:text-blue-900 transition-colors">
            {article.title}
          </h3>
        </div>

        {/* Khóa chiều rộng của số trang để không bị co chữ khi tiêu đề quá dài */}
        {article.pageNumber && (
          <span className="font-sans text-sm font-bold text-neutral-400 group-hover:text-black pt-1 shrink-0">
            {article.pageNumber}
          </span>
        )}
      </div>

      {/* QUY TIẾT CỐT LÕI: 
        - Đổi text-sm thành h-auto để tự động co giãn theo độ dài văn bản dịch.
        - Whitespace-pre-line giúp giữ nguyên các dấu xuống dòng tự nhiên trong đoạn văn gốc.
      */}
      {article.contentSnippet && (
        <p className="text-sm text-neutral-600 font-sans leading-relaxed mt-2 h-auto break-words whitespace-pre-line">
          {article.contentSnippet}
        </p>
      )}
    </article>
  );
}

```

### 3. Kiểm tra lại File Dữ liệu đầu vào (`Data Source`)

Nếu sau khi sửa CSS mà chữ vẫn bị thiếu, lỗi nằm ở **bước trích xuất (parsing) dữ liệu từ PDF sang JSON**:

* Hãy đảm bảo chuỗi ký tự nhập vào trong file dữ liệu của bạn không chứa các ký tự đặc biệt vô tình đóng chuỗi sớm (như dấu ngoặc kép `"` chưa được escape `\"`).
* Hãy dùng thuộc tính **Template Literals** (dấu bọc huyền ` ` thay vì dấu nháy đơn/kép) trong file data của Next.js nếu bạn copy-paste các đoạn văn dài có dấu xuống dòng trực tiếp từ tệp PDF.

Bạn hãy thử rà soát lại thuộc tính chiều cao `h-full` ở các tầng component bọc ngoài nhé, 90% lỗi biến mất chữ trên giao diện dạng cột của Next.js là do class này ép khung!

---

## 🏛️ SECTION 4: TIÊU CHUẨN XỬ LÝ PDF KHOA HỌC & CHỐNG MẤT CHỮ

Khi xử lý các tài liệu tạp chí, báo cáo nghiên cứu khoa học bằng tiếng Anh định dạng PDF, kỹ sư phát triển bắt buộc phải tuân thủ bộ quy tắc kỹ thuật dưới đây để ngăn ngừa triệt để hiện tượng mất chữ, xáo trộn dòng và lỗi dịch thuật.

### 1. Thuật toán Sắp xếp Nhận diện Cột (Column-Aware Coordinate Sorting)
Các tài liệu khoa học thường được chia thành 2 cột. Nếu trích xuất văn bản dòng ngang tuần tự sẽ gây xáo trộn câu chữ nghiêm trọng (trộn lẫn cột trái và cột phải).
* **Quy chuẩn:** Phải xác định trục giữa trang dựa trên chiều rộng viewport của PDF page (`viewport.width`).
* **Quy trình phân loại vị trí khối chữ (`transform[4]` là tọa độ x, `transform[5]` là tọa độ y):**
  - **Khối xuyên cột (Full-width / Span):** Nếu khối văn bản trải dài cắt ngang trục giữa trang (như tiêu đề chính, Abstract, bảng biểu lớn), khối này được xếp vào dòng đọc toàn trang.
  - **Cột trái (Left Column):** Tọa độ `x` nằm hoàn toàn bên trái trục giữa (`x < width / 2`).
  - **Cột phải (Right Column):** Tọa độ `x` nằm hoàn toàn bên phải trục giữa (`x >= width / 2`).
* **Sắp xếp thứ tự đọc:** Phải gom nhóm các khối chữ và sắp xếp theo chiều đọc học thuật: Các khối Full-width hàng đầu -> Toàn bộ các khối Cột trái (sắp xếp theo `y` giảm dần, `x` tăng dần) -> Toàn bộ các khối Cột phải (sắp xếp theo `y` giảm dần, `x` tăng dần) -> Khối Full-width hàng cuối.

### 2. Bộ xử lý Từ nối Gạch ngang (Hyphenation Reassembly)
Văn bản PDF nén chặt thường ngắt dòng bằng dấu gạch nối (ví dụ: `electro-\nmagnetic` hoặc `semi-\nconductor`).
* **Quy chuẩn:** Sử dụng bộ lọc Regex để phát hiện và nối lại các từ bị gạch nối ở cuối dòng trước khi đưa vào dịch AI.
* **Biểu thức chính quy đề xuất:** `(\w+)-\s+(\w+)` được thay thế bằng `$1$2` (ví dụ: `electro- magnetic` -> `electromagnetic`) để AI dịch đúng nghĩa từ đơn hoàn chỉnh, tránh tách cụm từ gây dịch sai lệch/mất ngữ nghĩa.

### 3. Bộ lọc Nhiễu lề Trang (Academic Margin Filtering)
Các thông tin lề trang (Headers, Footers, DOIs, số trang) nếu lọt vào giữa đoạn văn sẽ cắt vụn câu chữ làm câu dịch bị gián đoạn.
* **Quy chuẩn:** 
  - Loại bỏ các khối có tọa độ `y` quá sát lề trên hoặc lề dưới của trang PDF (ví dụ: `y < 40` hoặc `y > viewport.height - 40` đơn vị điểm ảnh).
  - Sử dụng biểu thức chính quy loại bỏ số trang đơn lẻ (`/^\d+$/`) và chuỗi liên kết DOI (`/https:\/\/doi\.org/` hoặc `10\.\d{4}/`).

### 4. Thiết kế Layout Kết xuất PDF Không Giới hạn Chiều cao
Khi dùng `html2pdf.js` xuất bản tài liệu song ngữ dạng báo in, nếu container bị giới hạn CSS, chữ sẽ bị cắt cụt ở lề trang.
* **Quy chuẩn CSS:**
  - Tuyệt đối không dùng `h-full` hay `h-[cố định]` cho các thẻ chứa đoạn văn dài. Thay thế bằng `h-auto` hoặc loại bỏ thuộc tính chiều cao.
  - Áp dụng thuộc tính bẻ dòng linh hoạt: `break-words` kết hợp `whitespace-pre-line` để giữ lại cấu trúc đoạn văn tự nhiên của bản dịch.
  - Cấu hình tùy chọn `pagebreak` cho `html2pdf.js` với chế độ tự động ngắt dòng thông minh: `{ mode: ['avoid-all', 'css', 'legacy'] }` giúp chia trang tự nhiên tại các ranh giới thẻ `<p>` hoặc `<section>`, tránh cắt ngang giữa dòng chữ.