import * as pdfjsLib from 'pdfjs-dist/webpack'; // Use the webpack build
import { useState } from 'react';

// Set worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const PdfToJsonExtractor = () => {
  const [file, setFile] = useState(null);
  const [jsonData, setJsonData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const extractTextToJson = async (file) => {
    setIsExtracting(true);
    const arrayBuffer = await file.arrayBuffer();

    try {
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      const totalPages = pdf.numPages;
      const pagesData = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');

        pagesData.push({
          pageNumber: pageNum,
          text: pageText.trim(),
        });
      }

      // Convert to JSON
      const result = {
        fileName: file.name,
        totalPages: totalPages,
        pages: pagesData,
        extractedAt: new Date().toISOString(),
      };

      setJsonData(result);
      return result;

    } catch (error) {
      console.error("Error extracting PDF:", error);
      alert("Failed to extract PDF content.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      extractTextToJson(selectedFile);
    } else {
      alert('Please select a valid PDF file.');
    }
  };

  const downloadJson = () => {
    if (!jsonData) return;
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace('.pdf', '')}-extracted.json`;
    a.click();
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h2>PDF to JSON Extractor</h2>
      <input type="file" accept=".pdf" onChange={handleFileChange} />
      <br /><br />

      {isExtracting && <p>Extracting... please wait.</p>}

      {jsonData && (
        <>
          <h3>✅ Extracted Data (JSON)</h3>
          <pre style={{ maxHeight: '400px', overflowY: 'auto', background: '#f5f5f5', padding: '10px' }}>
            {JSON.stringify(jsonData, null, 2)}
          </pre>
          <br />
          <button onClick={downloadJson}>⬇️ Download JSON</button>
        </>
      )}
    </div>
  );
};

export default PdfToJsonExtractor;