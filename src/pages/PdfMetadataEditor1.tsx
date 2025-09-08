import { PDFDocument } from 'pdf-lib';
import { useState } from 'react';

// Helper: Convert JS Date to PDF Date String
// Format JS Date → PDF Date String (for /Info)
const toPdfDateString = (date) => {
    const pad = (n) => n.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    const tzOffset = -date.getTimezoneOffset();
    const tzHours = pad(Math.floor(Math.abs(tzOffset) / 60));
    const tzMinutes = pad(Math.abs(tzOffset) % 60);
    const tzSign = tzOffset >= 0 ? '+' : '-';

    return `D:${year}${month}${day}${hours}${minutes}${seconds}${tzSign}${tzHours}'${tzMinutes}'`;
};

// Format JS Date → XMP Date String (ISO 8601)
const toXmpDateString = (date) => {
    return date.toISOString().replace(/\.\d+Z$/, 'Z'); // "2025-09-07T19:58:10Z"
};

const PdfMetadataEditor1 = () => {
    const [file, setFile] = useState(null);
    const [metadata, setMetadata] = useState({
        title: '',
        author: '',
        subject: '',
        keywords: '',
        creator: '',
        producer: '',
        version: '1.4',
        createdDate: '', // User can edit or leave blank
        modifiedDate: '', // User can edit or leave blank
    });
    const [outputUrl, setOutputUrl] = useState(null);

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);

        if (selectedFile) {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);

            if (!pdfDoc.docInfo) {
                pdfDoc.docInfo = pdfDoc.context.obj({});
            }

            const docInfo = pdfDoc.docInfo;

            // Helper to parse PDF date
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
            const modDate = docInfo.get('ModDate')?.toString();

            setMetadata({
                title: pdfDoc.getTitle() || '',
                author: pdfDoc.getAuthor() || '',
                subject: pdfDoc.getSubject() || '',
                keywords: (pdfDoc.getKeywords() || []).join(', '),
                creator: pdfDoc.getCreator() || '',
                producer: pdfDoc.getProducer() || '',
                version: '1.4',
                createdDate: creationDate ? parsePdfDate(creationDate)?.toISOString().slice(0, 16) : '',
                modifiedDate: modDate ? parsePdfDate(modDate)?.toISOString().slice(0, 16) : '',
            });
        }
    };

    const handleMetadataChange = (e) => {
        const { name, value } = e.target;
        setMetadata((prev) => ({ ...prev, [name]: value }));
    };
    const updateXmpMetadata = (pdfDoc, createdDate, modifiedDate) => {
        try {
            const catalog = pdfDoc.catalog;

            // ✅ FIX: Use .has() + .get() instead of .getMaybe()
            if (!catalog.has('Metadata')) {
                console.log('ℹ️ No XMP metadata found — skipping');
                return;
            }

            const metadataRef = catalog.get('Metadata');
            if (!metadataRef) {
                console.log('⚠️ Metadata reference is null');
                return;
            }

            const metadataStream = pdfDoc.context.lookup(metadataRef);
            if (!metadataStream || !metadataStream.contents) {
                console.log('⚠️ Metadata stream is invalid');
                return;
            }

            let xmpString = metadataStream.contents.decodeText();

            // Format dates for XMP
            const newCreateDate = toXmpDateString(createdDate);
            const newModifyDate = toXmpDateString(modifiedDate);

            // Update XML content
            xmpString = xmpString
                .replace(/<xmp:CreateDate>.*?<\/xmp:CreateDate>/, `<xmp:CreateDate>${newCreateDate}</xmp:CreateDate>`)
                .replace(/<xmp:ModifyDate>.*?<\/xmp:ModifyDate>/, `<xmp:ModifyDate>${newModifyDate}</xmp:ModifyDate>`)
                .replace(/<pdf:Producer>.*?<\/pdf:Producer>/, `<pdf:Producer>React PDF Editor</pdf:Producer>`)
                .replace(/rdf:about=".*?"/g, 'rdf:about=""'); // Avoid ID conflicts

            // Create new stream
            const updatedStream = pdfDoc.context.stream(xmpString, {
                Type: 'Metadata',
                Subtype: 'XML',
            });

            // Replace in catalog
            catalog.set('Metadata', updatedStream);

            console.log('✅ XMP Metadata Updated Successfully');
        } catch (error) {
            console.warn('⚠️ Failed to update XMP metadata:', error.message);
        }
    };

    const savePdfWithMetadata = async () => {
        if (!file) return;

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);

        // ✅ Ensure /Info exists
        if (!pdfDoc.docInfo) {
            pdfDoc.docInfo = pdfDoc.context.obj({});
        }

        const docInfo = pdfDoc.docInfo;

        // Get dates (use user input or fallback to now)
        const createdDate = metadata.createdDate
            ? new Date(metadata.createdDate)
            : new Date();

        const modifiedDate = metadata.modifiedDate
            ? new Date(metadata.modifiedDate)
            : new Date();

        // ✅ 1. Update /Info dictionary (basic metadata)
        docInfo.set('CreationDate', toPdfDateString(createdDate));
        docInfo.set('ModDate', toPdfDateString(modifiedDate));

        // ✅ 2. Update XMP metadata (for Adobe Acrobat)
        updateXmpMetadata(pdfDoc, createdDate, modifiedDate);

        // ✅ Optional: Also update other metadata
        const keywordsArray = metadata.keywords
            ? metadata.keywords.split(/[\s,]+/).map(k => k.trim()).filter(k => k)
            : pdfDoc.getKeywords() || [];

        // pdfDoc.setTitle(metadata.title || '');
        pdfDoc.setAuthor(metadata.author || '');
        pdfDoc.setSubject(metadata.subject || '');
        pdfDoc.setKeywords(keywordsArray);
        pdfDoc.setCreator(metadata.creator || 'React PDF Editor');
        pdfDoc.setProducer(metadata.producer || 'pdf-lib');

        // Save PDF
        let pdfBytes = await pdfDoc.save({
            useObjectStreams: parseFloat(metadata.version) < 1.5 ? false : undefined,
        });

        // ✅ Optional: Force PDF version in header
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

        // ✅ Verify output
        const decoder = new TextDecoder();
        console.log('📄 PDF Header:', decoder.decode(pdfBytes.slice(0, 30)));

        // Create download
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setOutputUrl(url);

        console.log('🎉 PDF Saved with Updated Dates!');
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial' }}>
            <h2>PDF Metadata + Version Editor</h2>

            <input type="file" accept=".pdf" onChange={handleFileChange} />
            <br /><br />

            {file && (
                <>
                    <h3>Edit Metadata</h3>
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

export default PdfMetadataEditor1;