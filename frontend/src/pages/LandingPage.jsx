import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

const LandingPage = () => {
  const [uploadedFile, setUploadedFile] = useState(null);

  // This function runs the moment a file is dropped into the zone
  const onDrop = useCallback(acceptedFiles => {
    const file = acceptedFiles[0]; // Grab the first file dropped
    setUploadedFile(file);
    console.log("File ready for verification:", file.name);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {'application/pdf': ['.pdf']} // Restricting to PDFs for now
  });

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '50px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1>TrueDocs Verification Portal</h1>
      <p>Drag and drop a document below to verify its authenticity and issuer.</p>

      {/* The Drag and Drop Zone */}
      <div 
        {...getRootProps()} 
        style={{
          border: isDragActive ? '2px dashed #28a745' : '2px dashed #007bff',
          backgroundColor: isDragActive ? '#e9fce9' : '#f8f9fa',
          padding: '60px 20px',
          borderRadius: '10px',
          cursor: 'pointer',
          marginTop: '30px',
          transition: 'all 0.3s ease'
        }}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p style={{ color: '#28a745', fontWeight: 'bold' }}>Drop the document right here!</p>
        ) : (
          <p>Drag 'n' drop a PDF here, or <b>click to browse</b> your files</p>
        )}
      </div>

      {/* Show the selected file name */}
      {uploadedFile && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#e2e3e5', borderRadius: '5px' }}>
          <p><strong>Selected File:</strong> {uploadedFile.name}</p>
          <button style={{ padding: '10px 20px', marginTop: '10px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
            Verify Document
          </button>
        </div>
      )}
    </div>
  );
};

export default LandingPage;