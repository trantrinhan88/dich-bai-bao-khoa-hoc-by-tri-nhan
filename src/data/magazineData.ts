import { IMagazineData } from '../types/magazine';

export const magazineData: IMagazineData = {
  volumeInfo: "QUY TẮC CHUNG v1.0",
  publishDate: "24 Tháng 05, 2026",
  layoutColumns: [
    {
      columnId: 'left',
      columnHeader: "TIÊU ĐIỂM & ĐIỂM NHẤN TRANG BÌA (ON THE COVER)",
      articles: [
        {
          id: 'cover-standard',
          title: "TIÊU CHUẨN NỘI DUNG TIÊU ĐIỂM CỘT 1",
          subtitle: "Tập trung vào các đề tài cốt lõi mang tầm nhìn bao quát",
          badge: "ON THE COVER",
          pageNumber: 1,
          contentSnippet: "Tập trung vào các bài viết mang tính chuyên sâu, bài nghiên cứu trang bìa hoặc tiêu đề lớn có tính thu hút cao."
        },
        {
          id: 'cover-style',
          title: "VĂN PHONG DỊCH THUẬT CUỐN HÚT VÀ CHUẨN MỰC",
          subtitle: "Cân bằng giữa giật tít truyền thông và học thuật",
          badge: "VĂN PHONG DỊCH",
          pageNumber: 2,
          contentSnippet: "Cuốn hút, mang tính giật tít nhưng đảm bảo học thuật, sử dụng các thuật ngữ chuyên ngành chính xác để tối ưu SEO Landing Page."
        },
        {
          id: 'cover-ui',
          title: "THÀNH PHẦN HIỂN THỊ ĐẶC TRƯNG",
          subtitle: "Sử dụng hình ảnh lớn và trích đoạn nổi bật",
          badge: "YÊU CẦU UI",
          pageNumber: 3,
          contentSnippet: "Thường đi kèm đoạn trích dẫn ngắn (Snippet) hoặc ảnh minh họa nổi bật để khơi dậy trí tò mò từ cái nhìn đầu tiên."
        }
      ]
    },
    {
      columnId: 'center',
      columnHeader: "TIN TỨC CHÍNH & LUẬN ĐIỂM KHOA HỌC (NEWS & VIEWS)",
      articles: [
        {
          id: 'news-standard',
          title: "TIÊU CHUẨN TIN TỨC CẬP NHẬT CỘT 2",
          subtitle: "Ghi chép các sự kiện và phát minh mang tính thời sự",
          badge: "NEWS & VIEWS",
          pageNumber: 4,
          contentSnippet: "Chứa các bản tin cập nhật, diễn biến xã hội, báo cáo thống kê hoặc các góc nhìn/bình luận mang tính thời sự toàn cầu."
        },
        {
          id: 'news-style',
          title: "VĂN PHONG KHÁCH QUAN, KHOA HỌC SÚC TÍCH",
          subtitle: "Chuẩn xác tuyệt đối trong việc chuyển ngữ thuật ngữ kỹ thuật",
          badge: "VĂN PHONG DỊCH",
          pageNumber: 5,
          contentSnippet: "Khách quan, ngắn gọn, súc tích. Chú ý dịch chuẩn xác số liệu, biểu đồ, tên tác giả, tên cơ quan nghiên cứu và các hằng số/hàm số khoa học đi kèm."
        }
      ]
    },
    {
      columnId: 'right',
      columnHeader: "CHUYÊN MỤC HẬU TRƯỜNG & TƯƠNG TÁC (THE BACK PAGES)",
      articles: [
        {
          id: 'back-standard',
          title: "TIÊU CHUẨN NỘI DUNG GIẢI TRÍ VÀ PHẢN HỒI CỘT 3",
          subtitle: "Không gian kết nối đời sống và nâng cao trải nghiệm độc giả",
          badge: "THE BACK PAGES",
          pageNumber: 6,
          contentSnippet: "Các nội dung mang tính giải trí nhẹ nhàng, chuyên mục tư vấn đời sống, câu đố ô chữ, truyện tranh biếm họa hoặc thư phản hồi từ độc giả."
        },
        {
          id: 'back-style',
          title: "VĂN PHONG GẦN GŨI, THÂN THIỆN DÍ DỎM",
          subtitle: "Ngôn từ mộc mạc mang tính đời thường và chia sẻ",
          badge: "VĂN PHONG DỊCH",
          pageNumber: 7,
          contentSnippet: "Gần gũi, đời thường, dí dỏm. Tạo nhịp thở thư giãn cho độc giả sau các trang tin học thuật căng thẳng."
        },
        {
          id: 'back-tech',
          title: "YÊU CẦU KỸ THUẬT CLIENT COMPONENT",
          subtitle: "Xây dựng các yếu tố trò chơi và ô chữ tương tác",
          badge: "LẬP TRÌNH LOGIC",
          pageNumber: 8,
          contentSnippet: "Cần xác định rõ các thành phần có tính chất tương tác (nhập liệu, bấm chọn) như các trò chơi trí tuệ, câu đố để lập trình viên xử lý Logic Client Component."
        }
      ]
    }
  ]
};
