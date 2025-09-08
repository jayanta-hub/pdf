import React, { useState } from 'react';
import { PDFDocument, PDFString } from 'pdf-lib';
import PdfToJsonExtractor from './pages/PdfToJsonExtractor';
const updateXmpMetadata = (pdfDoc, createdDate, modifiedDate) => {
  try {
    const catalog = pdfDoc.catalog;
    if (!catalog.has('Metadata')) {
      console.log('ℹ️ No XMP metadata found — skipping');
      return;
    }

    const metadataRef = catalog.get('Metadata');
    const metadataStream = pdfDoc.context.lookup(metadataRef);
    if (!metadataStream || !metadataStream.contents) return;

    let xmpString = metadataStream.contents.decodeText();

    // Format dates for XMP
    const formatDateForXmp = (date) => {
      return date.toISOString().replace(/\.\d+Z$/, 'Z'); // "2025-09-07T19:58:10Z"
    };

    const newCreateDate = formatDateForXmp(createdDate);
    const newModifyDate = formatDateForXmp(modifiedDate);

    // Replace in XML
    xmpString = xmpString
      .replace(/<xmp:CreateDate>.*?<\/xmp:CreateDate>/, `<xmp:CreateDate>${newCreateDate}</xmp:CreateDate>`)
      .replace(/<xmp:ModifyDate>.*?<\/xmp:ModifyDate>/, `<xmp:ModifyDate>${newModifyDate}</xmp:ModifyDate>`)
      .replace(/rdf:about=".*?"/g, 'rdf:about=""'); // Avoid conflicts

    // Create new stream
    const updatedStream = pdfDoc.context.stream(xmpString, {
      Type: 'Metadata',
      Subtype: 'XML',
    });

    // Replace in catalog
    catalog.set('Metadata', updatedStream);

    console.log('✅ XMP Metadata Updated');
  } catch (error) {
    console.warn('⚠️ Failed to update XMP meta', error);
  }
};
const PdfMetadataEditor = () => {
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState({
    title: '',
    author: '',
    subject: '',
    keywords: '',
    creator: '',
    producer: '',
    version: '1.4',
    createdDate: '', // ✅ Add this
    modifiedDate: '', // ✅ Add this
  });
  const [outputUrl, setOutputUrl] = useState(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // ✅ Ensure docInfo exists before reading
      if (!pdfDoc.docInfo) {
        pdfDoc.docInfo = pdfDoc.context.obj({});
      }

      const docInfo = pdfDoc.docInfo;

      // Helper to parse PDF date string → JS Date
      const parsePdfDate = (pdfDateStr) => {
        if (!pdfDateStr || !pdfDateStr.startsWith('D:')) return null;
        const clean = pdfDateStr.substring(2).replace(/'/g, '');
        const match = clean.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})([+-])(\d{2})(\d{2})$/);
        if (!match) return null;

        const [, year, month, day, hour, minute, second, tzSign, tzHour, tzMinute] = match;
        const offset = (tzSign === '+' ? 1 : -1) * (parseInt(tzHour) * 60 + parseInt(tzMinute));
        const utcDate = new Date(Date.UTC(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        ));
        return new Date(utcDate.getTime() + offset * 60000);
      };

      const creationDate = docInfo.get('CreationDate')?.toString();
      console.log("creationDate ? parsePdfDate(creationDate)?.toISOString().slice(0, 16) : '',", creationDate ? parsePdfDate(creationDate)?.toISOString().slice(0, 16) : '',)
      setMetadata({
        title: pdfDoc.getTitle() || '',
        author: pdfDoc.getAuthor() || '',
        subject: pdfDoc.getSubject() || '',
        keywords: (pdfDoc.getKeywords() || []).join(', '),
        creator: pdfDoc.getCreator() || '',
        producer: pdfDoc.getProducer() || '',
        version: '1.4',
        createdDate: creationDate ? parsePdfDate(creationDate)?.toISOString().slice(0, 16) : '',
        modifiedDate: creationDate ? parsePdfDate(creationDate)?.toISOString().slice(0, 16) : '',
      });
    }
  };

  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    setMetadata((prev) => ({ ...prev, [name]: value }));
  };
  const toPdfDateString = (date) => {
    const pad = (n) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    // Get timezone offset
    const tzOffset = -date.getTimezoneOffset(); // in minutes
    const tzHours = pad(Math.floor(Math.abs(tzOffset) / 60));
    const tzMinutes = pad(Math.abs(tzOffset) % 60);
    const tzSign = tzOffset >= 0 ? '+' : '-';

    return `D:${year}${month}${day}${hours}${minutes}${seconds}${tzSign}${tzHours}'${tzMinutes}'`;
  };
  const savePdfWithMetadata = async () => {
  if (!file) return;
try {
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  // ✅ Try to delete /Perms, /AcroForm, /SigFlags — may help
  const catalog = pdfDoc.catalog;
  if (catalog.has('Perms')) catalog.delete('Perms');
  if (catalog.has('AcroForm')) catalog.delete('AcroForm');

  // ✅ Delete /ID
  const trailer = pdfDoc.context.trailer;
  if (trailer && trailer.get && trailer.get('ID')) {
    trailer.delete('ID');
  }

  // ✅ Delete XMP
  if (catalog.has('Metadata')) {
    catalog.delete('Metadata');
  }

  // ✅ Now set your dates
  if (!pdfDoc.docInfo) {
    pdfDoc.docInfo = pdfDoc.context.obj({});
  }
  const docInfo = pdfDoc.docInfo;

  const createdDate = metadata.createdDate ? new Date(metadata.createdDate) : new Date();
  const modifiedDate = metadata.modifiedDate ? new Date(metadata.modifiedDate) : createdDate;

  docInfo.set('CreationDate', toPdfDateString(createdDate));
  docInfo.set('ModDate', toPdfDateString(modifiedDate));

    console.log('✅ /Info dates updated');

  // ✅ UPDATE CATALOG
  catalog.set(
    PDFString.of('CreationDate'),
    PDFString.of(toPdfDateString(createdDate))
  );
  catalog.set(
    PDFString.of('ModDate'),
    PDFString.of(toPdfDateString(modifiedDate))
  );
  console.log('✅ Catalog dates updated');

  // ✅ UPDATE XMP
  updateXmpMetadata(pdfDoc, createdDate, modifiedDate);

  // Handle keywords
  const keywordsArray = metadata.keywords
    ? metadata.keywords.split(/[\s,]+/).map(k => k.trim()).filter(k => k)
    : pdfDoc.getKeywords() || [];

  // Set other metadata
  pdfDoc.setTitle(metadata.title || pdfDoc.getTitle() || '');
  pdfDoc.setAuthor(metadata.author || pdfDoc.getAuthor() || '');
  pdfDoc.setSubject(metadata.subject || pdfDoc.getSubject() || '');
  pdfDoc.setKeywords(keywordsArray);
  pdfDoc.setCreator(metadata.creator || pdfDoc.getCreator() || 'React PDF Editor');
  pdfDoc.setProducer(metadata.producer || pdfDoc.getProducer() || 'pdf-lib');

  // Save PDF
  let pdfBytes = await pdfDoc.save({
    useObjectStreams: parseFloat(metadata.version) < 1.5 ? false : undefined,
  });

  // Force version in header
  const targetVersion = metadata.version || '1.4';
  const versionString = `%PDF-${targetVersion}\n`;
  const encoder = new TextEncoder();
  const versionBytes = encoder.encode(versionString);
  const patchedBytes = new Uint8Array(pdfBytes.length);
  patchedBytes.set(pdfBytes);
  for (let i = 0; i < versionBytes.length && i < patchedBytes.length; i++) {
    patchedBytes[i] = versionBytes[i];
  }
  pdfBytes = patchedBytes;

  // Create downloadable link
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  setOutputUrl(url);

  console.log('🎉 PDF Saved — Dates Updated Everywhere!');

} catch (error) {
  console.error('❌ PDF may be locked or signed:', error.message);
  alert('This PDF may be locked by Adobe. Try using Ghostscript or ExifTool.');
}
  // const arrayBuffer = await file.arrayBuffer();
  // const pdfDoc = await PDFDocument.load(arrayBuffer);

  // // ✅ DELETE /ID
  // const trailer = pdfDoc.context.trailer;
  // if (trailer && trailer.get && trailer.get('ID')) {
  //   trailer.delete('ID');
  //   console.log('✅ /ID deleted');
  // }

  // // ✅ Ensure docInfo exists
  // if (!pdfDoc.docInfo) {
  //   pdfDoc.docInfo = pdfDoc.context.obj({});
  // }

  // const docInfo = pdfDoc.docInfo;
  // const catalog = pdfDoc.catalog;

  // // Use user-provided dates
  // const createdDate = metadata.createdDate
  //   ? new Date(metadata.createdDate)
  //   : new Date();

  // const modifiedDate = metadata.modifiedDate
  //   ? new Date(metadata.modifiedDate)
  //   : createdDate;

  // // ✅ UPDATE /INFO
  // docInfo.set('CreationDate', toPdfDateString(createdDate));
  // docInfo.set('ModDate', toPdfDateString(modifiedDate));
  // console.log('✅ /Info dates updated');

  // // ✅ UPDATE CATALOG
  // catalog.set(
  //   PDFString.of('CreationDate'),
  //   PDFString.of(toPdfDateString(createdDate))
  // );
  // catalog.set(
  //   PDFString.of('ModDate'),
  //   PDFString.of(toPdfDateString(modifiedDate))
  // );
  // console.log('✅ Catalog dates updated');

  // // ✅ UPDATE XMP
  // updateXmpMetadata(pdfDoc, createdDate, modifiedDate);

  // // Handle keywords
  // const keywordsArray = metadata.keywords
  //   ? metadata.keywords.split(/[\s,]+/).map(k => k.trim()).filter(k => k)
  //   : pdfDoc.getKeywords() || [];

  // // Set other metadata
  // pdfDoc.setTitle(metadata.title || pdfDoc.getTitle() || '');
  // pdfDoc.setAuthor(metadata.author || pdfDoc.getAuthor() || '');
  // pdfDoc.setSubject(metadata.subject || pdfDoc.getSubject() || '');
  // pdfDoc.setKeywords(keywordsArray);
  // pdfDoc.setCreator(metadata.creator || pdfDoc.getCreator() || 'React PDF Editor');
  // pdfDoc.setProducer(metadata.producer || pdfDoc.getProducer() || 'pdf-lib');

  // // Save PDF
  // let pdfBytes = await pdfDoc.save({
  //   useObjectStreams: parseFloat(metadata.version) < 1.5 ? false : undefined,
  // });

  // // Force version in header
  // const targetVersion = metadata.version || '1.4';
  // const versionString = `%PDF-${targetVersion}\n`;
  // const encoder = new TextEncoder();
  // const versionBytes = encoder.encode(versionString);
  // const patchedBytes = new Uint8Array(pdfBytes.length);
  // patchedBytes.set(pdfBytes);
  // for (let i = 0; i < versionBytes.length && i < patchedBytes.length; i++) {
  //   patchedBytes[i] = versionBytes[i];
  // }
  // pdfBytes = patchedBytes;

  // // Create downloadable link
  // const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  // const url = URL.createObjectURL(blob);
  // setOutputUrl(url);

  // console.log('🎉 PDF Saved — Dates Updated Everywhere!');
};

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h2>PDF Metadata + Version Editor</h2>

      <input type="file" accept=".pdf" onChange={handleFileChange} />
      <br /><br />

      {file && (
        <>
          <h3>Edit Metadata</h3>
          <label>Title: <input name="title" value={metadata.title} onChange={handleMetadataChange} /></label><br /><br />
          <label>Author: <input name="author" value={metadata.author} onChange={handleMetadataChange} /></label><br /><br />
          <label>Subject: <input name="subject" value={metadata.subject} onChange={handleMetadataChange} /></label><br /><br />
          <label>
            Keywords (comma-separated):
            <input
              name="keywords"
              value={metadata.keywords}
              onChange={handleMetadataChange}
              placeholder="e.g. react, pdf, editor"
            />
          </label><br /><br />
          <label>Creator: <input name="creator" value={metadata.creator} onChange={handleMetadataChange} /></label><br /><br />
          <label>Producer: <input name="producer" value={metadata.producer} onChange={handleMetadataChange} /></label><br /><br />
          <label>
            PDF Version:
            <select name="version" value={metadata.version} onChange={handleMetadataChange}>
              <option value="1.3">PDF 1.3</option>
              <option value="1.4">PDF 1.4</option>
              <option value="1.5">PDF 1.5</option>
              <option value="1.6">PDF 1.6</option>
              <option value="1.7">PDF 1.7</option>
            </select>
          </label>
          <label>
            Created Date:
            <input
              type="datetime-local"
              name="createdDate"
              value={metadata.createdDate || ''}
              onChange={handleMetadataChange}
            />
          </label>
          <br /><br />

          <label>
            Modified Date:
            <input
              type="datetime-local"
              name="modifiedDate"
              value={metadata.modifiedDate || ''}
              onChange={handleMetadataChange}
            />
          </label>
          <br /><br />

          <button onClick={savePdfWithMetadata}>Save PDF with New Metadata & Version</button>
        </>
      )}

      {outputUrl && (
        <div>
          <h3>✅ Done! Download your PDF:</h3>
          <a href={outputUrl} download="edited.pdf">
            Download Edited PDF
          </a>
          <p>ℹ️ Open in text editor to verify first line: %PDF-{metadata.version}</p>
        </div>
      )}
      <PdfToJsonExtractor/>
    </div>
  );
};

export default PdfMetadataEditor;