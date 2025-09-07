import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib'; // ✅ No PDFVersion needed

const PdfVersionChanger = () => {
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState<string>('1.4');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);

  const handleChangeVersion = async () => {
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);

    // ✅ Save with version as STRING
    const pdfBytes = await pdfDoc.save({
      version: version as any, // or just `version` if TS allows
      useObjectStreams: parseFloat(version) < 1.5 ? false : undefined,
    });

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    setOutputUrl(url);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h2>PDF Version Changer</h2>
      <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <br /><br />

      <label>
        Target PDF Version:
        <select value={version} onChange={(e) => setVersion(e.target.value)}>
          <option value="1.0">PDF 1.0</option>
          <option value="1.1">PDF 1.1</option>
          <option value="1.2">PDF 1.2</option>
          <option value="1.3">PDF 1.3</option>
          <option value="1.4">PDF 1.4</option>
          <option value="1.5">PDF 1.5</option>
          <option value="1.6">PDF 1.6</option>
          <option value="1.7">PDF 1.7</option>
        </select>
      </label>
      <br /><br />

      <button onClick={handleChangeVersion} disabled={!file}>
        Change PDF Version → {version}
      </button>

      {outputUrl && (
        <div style={{ marginTop: '20px' }}>
          <h3>✅ Done! Download your PDF:</h3>
          <a href={outputUrl} download={`version-${version}.pdf`}>
            Download PDF (v{version})
          </a>
        </div>
      )}
    </div>
  );
};

export default PdfVersionChanger;