// // PdfMetadataEditor.jsx
// import React, { useState } from 'react';
// import { PDFDocument } from 'pdf-lib';
// import PdfVersionChanger from './pages/PdfVersion';

// const PdfMetadataEditor = () => {
//   const [file, setFile] = useState(null);
//   const [metadata, setMetadata] = useState({
//     title: '',
//     author: '',
//     subject: '',
//     keywords: [].join(', '),
//     creator: '',
//     producer: '',
//   });
//   const [outputUrl, setOutputUrl] = useState(null);

//   const handleFileChange = async (e) => {
//     const selectedFile = e.target.files[0];
//     setFile(selectedFile);

//     if (selectedFile) {
//       const arrayBuffer = await selectedFile.arrayBuffer();
//       const pdfDoc = await PDFDocument.load(arrayBuffer);

//       setMetadata({
//         title: pdfDoc.getTitle() || '',
//         author: pdfDoc.getAuthor() || '',
//         subject: pdfDoc.getSubject() || '',
//         keywords: (pdfDoc.getKeywords() || []).join(', '), // ✅ Array → comma string
//         creator: pdfDoc.getCreator() || '',
//         producer: pdfDoc.getProducer() || '',
//         version: 1.4,
//       });
//     }
//   };

//   const handleMetadataChange = (e) => {
//     const { name, value } = e.target;
//     setMetadata((prev) => ({ ...prev, [name]: value }));
//   };

//   const savePdfWithMetadata = async () => {
//     if (!file) return;

//     const arrayBuffer = await file.arrayBuffer();
//     const pdfDoc = await PDFDocument.load(arrayBuffer);

//     // Split keywords string by comma (or space) into array
//     const keywordsArray = metadata.keywords
//       ? metadata.keywords.split(',').map(k => k.trim()).filter(k => k)
//       : pdfDoc.getKeywords() || [];

//     // Set metadata
//     pdfDoc.setTitle(metadata.title || pdfDoc.getTitle() || '');
//     pdfDoc.setAuthor(metadata.author || pdfDoc.getAuthor() || '');
//     pdfDoc.setSubject(metadata.subject || pdfDoc.getSubject() || '');
//     pdfDoc.setKeywords(keywordsArray); // ✅ Now it's an array!
//     pdfDoc.setCreator(metadata.creator || pdfDoc.getCreator() || 'React PDF Editor');
//     pdfDoc.setProducer(metadata.producer || pdfDoc.getProducer() || 'pdf-lib');

//     const pdfBytes = await pdfDoc.save({
//       version: '1.4', // ✅ String version — requires v1.17+
//       useObjectStreams: false, // 👈 Required for versions < 1.5
//       addDefaultPage: false,
//     });
//     // Create downloadable link
//     const blob = new Blob([pdfBytes], { type: 'application/pdf' });
//     const url = URL.createObjectURL(blob);
//     setOutputUrl(url);
//   };

//   return (
//     <div style={{ padding: '20px', fontFamily: 'Arial' }}>
//       <h2>PDF Metadata Editor</h2>

//       <input type="file" accept=".pdf" onChange={handleFileChange} />
//       <br /><br />

//       {file && (
//         <>
//           <h3>Edit Metadata</h3>
//           <label>Title: <input name="title" value={metadata.title} onChange={handleMetadataChange} /></label><br /><br />
//           <label>Author: <input name="author" value={metadata.author} onChange={handleMetadataChange} /></label><br /><br />
//           <label>Subject: <input name="subject" value={metadata.subject} onChange={handleMetadataChange} /></label><br /><br />
//           <label>
//             Keywords (comma-separated):
//             <input
//               name="keywords"
//               value={metadata.keywords}
//               onChange={handleMetadataChange}
//               placeholder="e.g. react, pdf, editor"
//             />
//           </label>
//           <label>Creator: <input name="creator" value={metadata.creator} onChange={handleMetadataChange} /></label><br /><br />
//           <label>Producer: <input name="producer" value={metadata.producer} onChange={handleMetadataChange} /></label><br /><br />

//           <button onClick={savePdfWithMetadata}>Save PDF with New Metadata</button>
//         </>
//       )}

//       {outputUrl && (
//         <div>
//           <h3>✅ Done! Download your PDF:</h3>
//           <a href={outputUrl} download="edited.pdf">
//             Download Edited PDF
//           </a>
//         </div>
//       )}
//       {/* <PdfVersionChanger /> */}
//     </div>
//   );
// };

// export default PdfMetadataEditor;



import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';

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
  });
  const [outputUrl, setOutputUrl] = useState(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // Detect version
      const decoder = new TextDecoder();
      const header = decoder.decode(new Uint8Array(arrayBuffer).slice(0, 16));
      const versionMatch = header.match(/%PDF-(\d\.\d)/);
      const detectedVersion = versionMatch ? versionMatch[1] : '1.4';

      setMetadata({
        title: pdfDoc.getTitle() || '',
        author: pdfDoc.getAuthor() || '',
        subject: pdfDoc.getSubject() || '',
        keywords: (pdfDoc.getKeywords() || []).join(', '),
        creator: pdfDoc.getCreator() || '',
        producer: pdfDoc.getProducer() || '',
        version: detectedVersion,
      });
    }
  };

  const handleMetadataChange = (e) => {
    const { name, value } = e.target;
    setMetadata((prev) => ({ ...prev, [name]: value }));
  };

  const savePdfWithMetadata = async () => {
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    const keywordsArray = metadata.keywords
      ? metadata.keywords.split(/[\s,]+/).map(k => k.trim()).filter(k => k)
      : pdfDoc.getKeywords() || [];

    pdfDoc.setTitle(metadata.title || pdfDoc.getTitle() || '');
    pdfDoc.setAuthor(metadata.author || pdfDoc.getAuthor() || '');
    pdfDoc.setSubject(metadata.subject || pdfDoc.getSubject() || '');
    pdfDoc.setKeywords(keywordsArray);
    pdfDoc.setCreator(metadata.creator || pdfDoc.getCreator() || 'React PDF Editor');
    pdfDoc.setProducer(metadata.producer || pdfDoc.getProducer() || 'pdf-lib');

    let pdfBytes = await pdfDoc.save({
      useObjectStreams: parseFloat(metadata.version) < 1.5 ? false : undefined,
    });

    // ✅ FORCE SET VERSION IN HEADER
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

    // ✅ Verify
    const decoder = new TextDecoder();
    console.log('✅ Output PDF Header:', decoder.decode(pdfBytes.slice(0, 20)));

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setOutputUrl(url);
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
    </div>
  );
};

export default PdfMetadataEditor;