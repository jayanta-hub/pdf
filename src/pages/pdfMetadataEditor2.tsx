// PdfMetadataEditor2.jsx
import { PDFDocument } from 'pdf-lib';
import { useState } from 'react';

const PdfMetadataEditor2 = () => {
    const [file, setFile] = useState(null);
    const [metadata, setMetadata] = useState({
        title: '',
        author: '',
        subject: '',
        keywords: [].join(', '),
        creator: '',
        producer: '',
    });
    const [outputUrl, setOutputUrl] = useState(null);

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);

        if (selectedFile) {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);

            setMetadata({
                title: pdfDoc.getTitle() || '',
                author: pdfDoc.getAuthor() || '',
                subject: pdfDoc.getSubject() || '',
                keywords: (pdfDoc.getKeywords() || []).join(', '), // ✅ Array → comma string
                creator: pdfDoc.getCreator() || '',
                producer: pdfDoc.getProducer() || '',
                version: 1.4,
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

        // Split keywords string by comma (or space) into array
        const keywordsArray = metadata.keywords
            ? metadata.keywords.split(',').map(k => k.trim()).filter(k => k)
            : pdfDoc.getKeywords() || [];

        // Set metadata
        pdfDoc.setTitle(metadata.title || pdfDoc.getTitle() || '');
        pdfDoc.setAuthor(metadata.author || pdfDoc.getAuthor() || '');
        pdfDoc.setSubject(metadata.subject || pdfDoc.getSubject() || '');
        pdfDoc.setKeywords(keywordsArray); // ✅ Now it's an array!
        pdfDoc.setCreator(metadata.creator || pdfDoc.getCreator() || 'React PDF Editor');
        pdfDoc.setProducer(metadata.producer || pdfDoc.getProducer() || 'pdf-lib');

        const pdfBytes = await pdfDoc.save({
            version: '1.4', // ✅ String version — requires v1.17+
            useObjectStreams: false, // 👈 Required for versions < 1.5
            addDefaultPage: false,
        });
        // Create downloadable link
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h2>PDF Metadata Editor</h2>

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
                    </label>
                    <label>Creator: <input name="creator" value={metadata.creator} onChange={handleMetadataChange} /></label><br /><br />
                    <label>Producer: <input name="producer" value={metadata.producer} onChange={handleMetadataChange} /></label><br /><br />

                    <button onClick={savePdfWithMetadata}>Save PDF with New Metadata</button>
                </>
            )}

            {outputUrl && (
                <div>
                    <h3>✅ Done! Download your PDF:</h3>
                    <a href={outputUrl} download="edited.pdf">
                        Download Edited PDF
                    </a>
                </div>
            )}
            {/* <PdfVersionChanger /> */}
        </div>
    );
};

export default PdfMetadataEditor2;