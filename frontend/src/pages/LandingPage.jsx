import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const onDrop = useCallback(acceptedFiles => {
    const file = acceptedFiles[0];
    setUploadedFile(file);
    setResult(null);
    setErrorMsg('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: false
  });

  const handleVerify = async () => {
    if (!uploadedFile) return;

    setVerifying(true);
    setResult(null);
    setErrorMsg('');

    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/verify/document`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("Verification request failed.");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const reset = () => {
    setUploadedFile(null);
    setResult(null);
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
        <p style={{ color: '#6c757d', fontSize: '1.2rem', marginBottom: '40px' }}>Drag and drop any document below to cryptographically verify its authenticity against the SQL Blockchain.</p>

        {!result ? (
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
                <p style={{ color: '#28a745', fontWeight: 'bold', fontSize: '1.2rem' }}>Drop the document right here!</p>
                ) : (
                <p style={{ fontSize: '1.2rem' }}>Drag 'n' drop a document here, or <b>click to browse</b></p>
                )}
            </div>

            {uploadedFile && (
                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#e9ecef', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: '1.1rem', marginBottom: '15px' }}><strong>Selected File:</strong> {uploadedFile.name}</p>
                <button 
                    onClick={handleVerify}
                    disabled={verifying}
                    style={{ padding: '12px 30px', cursor: verifying ? 'not-allowed' : 'pointer', backgroundColor: verifying ? '#6c757d' : '#007bff', color: 'white', border: 'none', borderRadius: '5px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                    {verifying ? 'Verifying on Blockchain...' : 'Verify Document Authenticity'}
                </button>
                </div>
            )}
            {errorMsg && <p style={{ color: 'red', marginTop: '15px' }}>{errorMsg}</p>}
            </>
        ) : (
            <div style={{ marginTop: '20px', padding: '30px', borderRadius: '8px', border: '1px solid #dee2e6', textAlign: 'left', backgroundColor: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                
                <h2 style={{ 
                    color: result.status === 'VALID' ? '#28a745' : result.status === 'REVOKED' ? '#dc3545' : '#856404', 
                    borderBottom: '2px solid #eee', 
                    paddingBottom: '15px', 
                    marginBottom: '20px' 
                }}>
                    Verification Result: {result.status}
                </h2>
                
                <p style={{ fontSize: '1.1rem', marginBottom: '20px' }}>{result.message}</p>

                <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', marginBottom: '20px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    <strong>Document Hash:</strong><br/>{result.hash}
                </div>

                {result.details && (
                    <div style={{ padding: '20px', backgroundColor: '#e9ecef', borderRadius: '5px' }}>
                        <h4 style={{ marginTop: 0 }}>Blockchain Record Details:</h4>
                        <ul style={{ listStyleType: 'none', padding: 0, margin: 0, lineHeight: '1.8' }}>
                            <li><strong>Post Batch Title:</strong> {result.details.post_title}</li>
                            <li><strong>Original Filename:</strong> {result.details.title}</li>
                            <li><strong>Description / Holder:</strong> {result.details.holder_name}</li>
                            <li><strong>Validity Ends:</strong> {result.details.validity}</li>
                            <li><strong>Issuing Org ID:</strong> {result.details.issuer_org_id}</li>
                            <li><strong>Timestamp:</strong> {new Date(result.details.issued_at).toLocaleString()}</li>
                        </ul>
                    </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                    <button onClick={reset} style={{ padding: '10px 20px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Verify Another Document
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;