import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [verifying, setVerifying] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const onDrop = useCallback(acceptedFiles => {
    setUploadedFiles(prev => [...prev, ...acceptedFiles]);
    setResults([]);
    setErrorMsg('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: true
  });

  const handleVerify = async () => {
    if (uploadedFiles.length === 0) return;

    setVerifying(true);
    setResults([]);
    setErrorMsg('');

    const newResults = [];

    for (const file of uploadedFiles) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/verify/document`, {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Verification request failed for ${file.name}`);
        }

        const data = await response.json();
        newResults.push({ fileName: file.name, ...data });
      } catch (err) {
        newResults.push({ fileName: file.name, status: "ERROR", message: err.message });
      }
    }

    setResults(newResults);
    setVerifying(false);
  };

  const removeFile = (fileName) => {
    setUploadedFiles(uploadedFiles.filter(f => f.name !== fileName));
  };

  const reset = () => {
    setUploadedFiles([]);
    setResults([]);
    setErrorMsg('');
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '50px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Navbar equivalent */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <Link to="/login" style={{ padding: '10px 20px', backgroundColor: '#343a40', color: 'white', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
            Login / Admin Portal
          </Link>
      </div>

      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>TrueDocs Verifier</h1>
        <p style={{ color: '#6c757d', fontSize: '1.2rem', marginBottom: '40px' }}>Drag and drop documents below to cryptographically verify their authenticity against the SQL Blockchain.</p>

        {results.length === 0 ? (
            <>
            <div 
                {...getRootProps()} 
                style={{
                border: isDragActive ? '2px dashed #28a745' : '2px dashed #007bff',
                backgroundColor: isDragActive ? '#e9fce9' : '#f8f9fa',
                padding: '60px 20px',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
                }}
            >
                <input {...getInputProps()} />
                {isDragActive ? (
                <p style={{ color: '#28a745', fontWeight: 'bold', fontSize: '1.2rem' }}>Drop the documents right here!</p>
                ) : (
                <p style={{ fontSize: '1.2rem' }}>Drag 'n' drop documents here, or <b>click to browse</b></p>
                )}
            </div>

            {uploadedFiles.length > 0 && (
                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ marginBottom: '15px', textAlign: 'left' }}>Selected Files ({uploadedFiles.length}):</h4>
                  <ul style={{ listStyleType: 'none', padding: 0, textAlign: 'left', marginBottom: '20px' }}>
                    {uploadedFiles.map((file, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#fff', marginBottom: '5px', borderRadius: '4px', border: '1px solid #ddd' }}>
                        <span>📄 {file.name}</span>
                        <button 
                          onClick={() => removeFile(file.name)}
                          style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                        >X</button>
                      </li>
                    ))}
                  </ul>
                  
                  <button 
                      onClick={handleVerify}
                      disabled={verifying}
                      style={{ width: '100%', padding: '15px', cursor: verifying ? 'not-allowed' : 'pointer', backgroundColor: verifying ? '#6c757d' : '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                      {verifying ? 'Verifying on Blockchain...' : `Verify ${uploadedFiles.length} Document(s)`}
                  </button>
                </div>
            )}
            {errorMsg && <p style={{ color: 'red', marginTop: '15px' }}>{errorMsg}</p>}
            </>
        ) : (
            <div>
              <h2 style={{ marginBottom: '20px' }}>Verification Results</h2>
              
              {results.map((res, idx) => (
                <div key={idx} style={{ marginTop: '20px', padding: '30px', borderRadius: '8px', border: '1px solid #dee2e6', textAlign: 'left', backgroundColor: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
                      <h3 style={{ margin: 0, color: '#333' }}>📄 {res.fileName}</h3>
                      <span style={{ 
                          padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', color: '#fff',
                          backgroundColor: res.status === 'VALID' ? '#28a745' : res.status === 'REVOKED' ? '#dc3545' : '#856404'
                      }}>
                          {res.status}
                      </span>
                    </div>
                    
                    <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>{res.message}</p>

                    {res.hash && (
                      <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', marginBottom: '20px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          <strong>Document Hash:</strong><br/>{res.hash}
                      </div>
                    )}

                    {res.details && (
                        <div style={{ padding: '20px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                            <h4 style={{ marginTop: 0 }}>Blockchain Record Details:</h4>
                            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, lineHeight: '1.8' }}>
                                <li><strong>Post Batch Title:</strong> {res.details.post_title}</li>
                                <li><strong>Original Filename:</strong> {res.details.title}</li>
                                <li><strong>Description / Holder:</strong> {res.details.holder_name}</li>
                                <li><strong>Validity Ends:</strong> {res.details.validity}</li>
                                <li><strong>Issuing Org ID:</strong> {res.details.issuer_org_id}</li>
                                <li><strong>Timestamp:</strong> {new Date(res.details.issued_at).toLocaleString()}</li>
                            </ul>
                        </div>
                    )}
                </div>
              ))}

              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                  <button onClick={reset} style={{ padding: '12px 30px', fontSize: '1.1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                      Verify More Documents
                  </button>
              </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;