// utils/epubGenerator.ts

// Helper to compute CRC32 checksum for ZIP headers
function computeCRC32(data: Uint8Array): number {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Client-side uncompressed ZIP compiler (Method 0 - Store)
class MiniZip {
  private files: { name: string; data: Uint8Array; crc: number }[] = [];

  public addFile(name: string, content: string | Uint8Array) {
    const data = typeof content === 'string' ? new TextEncoder().encode(content) : content;
    const crc = computeCRC32(data);
    this.files.push({ name, data, crc });
  }

  public generate(): Uint8Array {
    const buffers: Uint8Array[] = [];
    const localHeadersOffset: number[] = [];
    let currentOffset = 0;

    // 1. Write Local File Headers & Data
    this.files.forEach((file) => {
      localHeadersOffset.push(currentOffset);
      const nameBytes = new TextEncoder().encode(file.name);
      const header = new Uint8Array(30 + nameBytes.length);
      const view = new DataView(header.buffer);

      view.setUint32(0, 0x04034b50, true); // Local file header signature
      view.setUint16(4, 10, true);         // Version needed to extract (1.0)
      view.setUint16(6, 0, true);          // General purpose bit flag
      view.setUint16(8, 0, true);          // Compression method (0 - Store)
      view.setUint16(10, 0x3E00, true);    // Last mod file time (approx)
      view.setUint16(12, 0x5821, true);    // Last mod file date (approx)
      view.setUint32(14, file.crc, true);   // CRC-32
      view.setUint32(18, file.data.length, true); // Compressed size
      view.setUint32(22, file.data.length, true); // Uncompressed size
      view.setUint16(26, nameBytes.length, true); // File name length
      view.setUint16(28, 0, true);         // Extra field length
      header.set(nameBytes, 30);

      buffers.push(header);
      buffers.push(file.data);
      currentOffset += header.length + file.data.length;
    });

    const centralDirectoryStart = currentOffset;
    let centralDirectorySize = 0;

    // 2. Write Central Directory Headers
    this.files.forEach((file, idx) => {
      const nameBytes = new TextEncoder().encode(file.name);
      const header = new Uint8Array(46 + nameBytes.length);
      const view = new DataView(header.buffer);

      view.setUint32(0, 0x02014b50, true); // Central directory file header signature
      view.setUint16(4, 20, true);         // Version made by
      view.setUint16(6, 10, true);         // Version needed to extract
      view.setUint16(8, 0, true);          // General purpose bit flag
      view.setUint16(10, 0, true);         // Compression method (Store)
      view.setUint16(12, 0x3E00, true);    // Last mod file time
      view.setUint16(14, 0x5821, true);    // Last mod file date
      view.setUint32(16, file.crc, true);   // CRC-32
      view.setUint32(20, file.data.length, true); // Compressed size
      view.setUint32(24, file.data.length, true); // Uncompressed size
      view.setUint16(28, nameBytes.length, true); // File name length
      view.setUint16(30, 0, true);         // Extra field length
      view.setUint16(32, 0, true);         // File comment length
      view.setUint16(34, 0, true);         // Disk number start
      view.setUint16(36, 0, true);         // Internal file attributes
      view.setUint32(38, 0, true);         // External file attributes
      view.setUint32(42, localHeadersOffset[idx], true); // Relative offset of local header
      header.set(nameBytes, 46);

      buffers.push(header);
      centralDirectorySize += header.length;
    });

    // 3. Write End of Central Directory Record (EOCD)
    const eocd = new Uint8Array(22);
    const view = new DataView(eocd.buffer);
    view.setUint32(0, 0x06054b50, true);   // End of central dir signature
    view.setUint16(4, 0, true);            // Number of this disk
    view.setUint16(6, 0, true);            // Disk where central directory starts
    view.setUint16(8, this.files.length, true);  // Number of central directory records on this disk
    view.setUint16(10, this.files.length, true); // Total number of central directory records
    view.setUint32(12, centralDirectorySize, true); // Size of central directory
    view.setUint32(16, centralDirectoryStart, true); // Offset of start of central directory, relative to start of archive
    view.setUint16(20, 0, true);           // Comment length

    buffers.push(eocd);

    // Combine all buffers into single Uint8Array
    const totalLength = buffers.reduce((acc, buf) => acc + buf.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    buffers.forEach((buf) => {
      result.set(buf, offset);
      offset += buf.length;
    });

    return result;
  }
}

// Generate EPUB package and trigger browser download
export function downloadEpub(
  title: string,
  author: string,
  sections: { title: string; content: string[] }[]
) {
  const zip = new MiniZip();
  const uuid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

  // 1. mimetype (Must be first and MUST NOT be compressed, Store method fits perfectly!)
  zip.addFile('mimetype', 'application/epub+zip');

  // 2. META-INF/container.xml
  zip.addFile('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // 3. Generate chapters manifest & spine XML
  let manifestItems = '';
  let spineItems = '';
  
  sections.forEach((_, idx) => {
    manifestItems += `    <item id="chapter${idx + 1}" href="chapter${idx + 1}.html" media-type="application/xhtml+xml"/>\n`;
    spineItems += `    <itemref idref="chapter${idx + 1}"/>\n`;
  });

  // 4. OEBPS/content.opf
  zip.addFile('OEBPS/content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${title}</dc:title>
    <dc:creator opf:role="aut">${author}</dc:creator>
    <dc:language>vi</dc:language>
    <dc:identifier id="BookID">urn:uuid:${uuid}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestItems}  </manifest>
  <spine toc="ncx">
${spineItems}  </spine>
</package>`);

  // 5. OEBPS/toc.ncx
  let ncxNavPoints = '';
  sections.forEach((sec, idx) => {
    ncxNavPoints += `    <navPoint id="navpoint-${idx + 1}" playOrder="${idx + 1}">
      <navLabel><text>${sec.title}</text></navLabel>
      <content src="chapter${idx + 1}.html"/>
    </navPoint>\n`;
  });

  zip.addFile('OEBPS/toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD NCX 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${title}</text></docTitle>
  <navMap>
${ncxNavPoints}  </navMap>
</ncx>`);

  // 6. Generate OEBPS/chapterX.html files
  sections.forEach((sec, idx) => {
    const paragraphsHtml = sec.content
      .map(p => {
        const trimmed = p.trim();
        if (trimmed.startsWith('<div') || trimmed.startsWith('<h3') || trimmed.startsWith('<h2') || trimmed.startsWith('<h1') || trimmed.startsWith('<p')) {
          return trimmed;
        }
        return `      <p style="text-indent: 1.5em; margin: 0 0 1em 0; line-height: 1.6; text-align: justify;">${p}</p>`;
      })
      .join('\n');

    zip.addFile(`OEBPS/chapter${idx + 1}.html`, `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>${sec.title}</title>
    <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8"/>
  </head>
  <body style="font-family: serif; padding: 5%; color: #111111;">
    <h2 style="text-align: center; border-bottom: 1px solid #000; padding-bottom: 10px; margin-bottom: 20px; font-weight: bold; text-transform: uppercase;">
      ${sec.title}
    </h2>
    <div style="font-size: 1em;">
${paragraphsHtml}
    </div>
  </body>
</html>`);
  });

  // 7. Compile ZIP and trigger browser download
  const blob = new Blob([zip.generate() as any], { type: 'application/epub+zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.epub`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
