// utils/pdfGenerator.ts

// Helper to dynamically load html2pdf.js from CDN
const loadHtml2Pdf = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).html2pdf) {
      resolve((window as any).html2pdf);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = () => {
      resolve((window as any).html2pdf);
    };
    script.onerror = () => reject(new Error('Không thể tải thư viện html2pdf.js từ CDN!'));
    document.head.appendChild(script);
  });
};

// Generates a beautiful PDF and downloads it directly (no print prompt, Times New Roman, Size 14pt)
export async function downloadPdf(
  title: string,
  author: string,
  sections: { title: string; content: string[] }[]
) {
  try {
    const html2pdf = await loadHtml2Pdf();

    // Create a temporary off-screen container element
    const element = document.createElement('div');
    element.style.fontFamily = "'Times New Roman', Times, 'TimesNewRoman', serif";
    element.style.color = '#111111';
    element.style.padding = '35px';
    element.style.backgroundColor = '#ffffff';

    // Construct beautifully styled chapter segments
    const chaptersHtml = sections.map((sec, idx) => {
      const paragraphsHtml = sec.content
        .map(p => `        <p style="text-indent: 1.5em; margin: 0 0 14pt 0; text-align: justify; line-height: 1.6; font-size: 14pt; font-weight: normal; font-family: 'Times New Roman', Times, serif;">${p}</p>`)
        .join('\n');

      return `
        <div style="margin-bottom: 35px; page-break-inside: avoid; font-family: 'Times New Roman', Times, serif;">
          <h2 style="font-family: 'Times New Roman', Times, serif; font-weight: bold; font-size: 16pt; border-bottom: 2px solid #111111; padding-bottom: 4px; margin: 0 0 16px 0; color: #111111;">
            Mục 0${idx + 1}: ${sec.title}
          </h2>
          <div>
            ${paragraphsHtml}
          </div>
        </div>
      `;
    }).join('\n');

    // Assemble the complete printable HTML template
    element.innerHTML = `
      <div style="border-bottom: 3.5px double #000000; padding-bottom: 12px; margin-bottom: 30px; text-align: center; font-family: 'Times New Roman', Times, serif;">
        <h1 style="font-family: 'Times New Roman', Times, serif; font-weight: bold; font-size: 22pt; margin: 0 0 8px 0; color: #000000;">
          TÀI LIỆU DỊCH THUẬT SONG NGỮ
        </h1>
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; font-weight: bold; color: #555555; display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
          <span>Sách gốc: ${title}</span>
          <span>•</span>
          <span>Biên dịch: ${author}</span>
          <span>•</span>
          <span>Ngôn ngữ: Anh - Việt</span>
        </div>
      </div>
      
      <main style="margin-top: 10px; font-family: 'Times New Roman', Times, serif;">
        ${chaptersHtml}
      </main>
    `;

    // Append to body temporarily for rendering
    document.body.appendChild(element);

    // html2pdf options
    const opt = {
      margin:       [15, 15, 15, 15], // A4 printing standard margins (top, left, bottom, right)
      filename:     `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2.2, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Render & Trigger direct browser download
    await html2pdf().from(element).set(opt).save();

    // Clean up temporary DOM element
    document.body.removeChild(element);

  } catch (err: any) {
    console.error('Lỗi xuất PDF trực tiếp: ', err);
    alert(err.message || 'Không thể tạo bản tải xuống PDF trực tiếp. Vui lòng kiểm tra lại!');
  }
}
