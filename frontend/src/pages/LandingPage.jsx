import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Link } from 'react-router-dom';
import { ethers } from 'ethers';
import TrueDocsRegistryABI from '../contracts/TrueDocsRegistryABI.json';

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const RPC_URL = "http://localhost:8545"; // Local Hardhat node

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

  const hashFile = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleVerify = async () => {
    if (uploadedFiles.length === 0) return;

    setVerifying(true);
    setResults([]);
    setErrorMsg('');

    const newResults = [];

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, TrueDocsRegistryABI, provider);

      for (const file of uploadedFiles) {
        try {
          // 1. Calculate Hash locally
          const docHash = await hashFile(file);
          
          // 2. Query Blockchain
          console.log(`Verifying on-chain for hash: ${docHash}`);
          const [isValid, isOnChainRevoked, isExpired] = await contract.verifyDocument(docHash);
          
          // 3. Query Backend for metadata (Optional but nice for UX)
          let status = "UNVERIFIED";
          let message = "This document was not found in our records.";
          let details = null;

          const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/verify/document/hash?doc_hash=${docHash}`);
          if (response.ok) {
            const data = await response.json();
            details = data.details;
          }

          // Combine on-chain status with backend presence
          if (isValid) {
            status = "VALID";
            message = "Document is authentic and currently valid.";
          } else if (isExpired) {
            status = "EXPIRED";
            message = "This document has reached its expiration date and is no longer valid.";
          } else if (isOnChainRevoked) {
            status = "REVOKED";
            message = "This document has been explicitly revoked by the issuing organization.";
          } else if (details) {
              // Document exists in DB but not on blockchain? 
              // Maybe it was issued before blockchain migration or there's a sync issue.
              // For strictness, if it's not on blockchain, we treat as unverified if we moved fully to blockchain.
              status = "UNVERIFIED (Off-Chain)";
              message = "Record found in database but not yet confirmed on the Ethereum blockchain.";
          }

          newResults.push({ 
            fileName: file.name, 
            status, 
            message, 
            hash: docHash,
            details 
          });
        } catch (err) {
          console.error(err);
          newResults.push({ fileName: file.name, status: "ERROR", message: "Error during cryptographic verification." });
        }
      }
    } catch (err) {
        console.error(err);
        setErrorMsg("Failed to connect to the Ethereum verification network. Please ensure the node is running.");
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

  const exportToCSV = () => {
    if (results.length === 0) return;

    const escapeCSV = (field) => {
      if (field === undefined || field === null) return '""';
      const stringField = String(field);
      // If the field contains quotes, commas, or newlines, wrap it in quotes and double the internal quotes
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\\n') || stringField.includes('\\r')) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };

    // Calculate Summary Stats
    const total = results.length;
    const valid = results.filter(r => r.status === 'VALID').length;
    const revoked = results.filter(r => r.status === 'REVOKED').length;
    const expired = results.filter(r => r.status === 'EXPIRED').length;
    const unverified = results.filter(r => r.status.includes('UNVERIFIED') || r.status === 'ERROR').length;

    // Use \\r\\n (CRLF) for best compatibility with Excel and other spreadsheet software
    const CRLF = '\\r\\n';
    
    let csvContent = "";
    csvContent += `TrueDocs Verification Report${CRLF}`;
    csvContent += `Generated On:,${escapeCSV(new Date().toLocaleString())}${CRLF}${CRLF}`;
    
    csvContent += `--- SUMMARY ---${CRLF}`;
    csvContent += `Total Documents Checked,${total}${CRLF}`;
    csvContent += `Valid Authenticated,${valid}${CRLF}`;
    csvContent += `Revoked (Action Required),${revoked}${CRLF}`;
    csvContent += `Expired,${expired}${CRLF}`;
    csvContent += `Unverified / Error,${unverified}${CRLF}${CRLF}`;

    csvContent += `--- DETAILED RESULTS ---${CRLF}`;
    const headers = ['File Name', 'Verification Status', 'System Message', 'Cryptographic Hash (SHA-256)', 'Batch / Post Title', 'Holder Name', 'Validity Expiration', 'Original Issue Date'];
    csvContent += headers.join(',') + CRLF;
    
    const rows = results.map(res => {
        return [
            escapeCSV(res.fileName),
            escapeCSV(res.status),
            escapeCSV(res.message),
            escapeCSV(res.hash),
            escapeCSV(res?.details?.post_title || 'N/A'),
            escapeCSV(res?.details?.holder_name || 'N/A'),
            escapeCSV(res?.details?.validity || 'N/A'),
            escapeCSV(res?.details?.issued_at ? new Date(res.details.issued_at).toLocaleString() : 'N/A')
        ].join(',');
    });

    csvContent += rows.join(CRLF);

    // Add BOM for UTF-8 to ensure Excel reads special characters correctly
    const blob = new Blob(["\\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TrueDocs_Verification_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      {/* Navbar equivalent */}
      <div className="max-w-7xl mx-auto flex justify-end mb-12">
        <Link to="/login" className="px-6 py-2.5 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-lg text-white font-medium transition-all duration-300 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.1)]">
          Login / Admin Portal
        </Link>
      </div>

      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 text-white drop-shadow-lg">
            TrueDocs <span className="gradient-text">Verifier</span>
          </h1>
          <p className="text-xl text-slate-400 font-light">
            Drag and drop documents below to cryptographically verify their authenticity against the SQL Blockchain.
          </p>
        </div>

        {results.length === 0 ? (
          <div className="space-y-8 animate-in fade-in zoom-in duration-500">
            <div 
              {...getRootProps()} 
              className={`
                glass-panel p-16 rounded-2xl cursor-pointer transition-all duration-500
                ${isDragActive ? 'border-emerald-500/50 bg-emerald-500/10 scale-[1.02] shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'hover:border-blue-500/50 hover:bg-white/10'}
              `}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p className="text-2xl text-emerald-400 font-medium">Drop the documents right here!</p>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-xl text-slate-300">Drag 'n' drop documents here, or <span className="text-blue-400 font-semibold">click to browse</span></p>
                </div>
              )}
            </div>

            {uploadedFiles.length > 0 && (
              <div className="glass-panel p-8 rounded-2xl text-left animate-in slide-in-from-bottom flex flex-col items-center">
                <div className="w-full mb-6">
                  <h4 className="text-lg font-medium text-slate-300 mb-4 flex items-center">
                    <span className="bg-slate-800 text-slate-300 px-3 py-1 rounded-full text-sm mr-3 font-semibold">{uploadedFiles.length}</span>
                    Selected Files
                  </h4>
                  <ul className="space-y-3">
                    {uploadedFiles.map((file, idx) => (
                      <li key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 group hover:bg-white/10 transition-colors">
                        <div className="flex items-center text-slate-200">
                          <svg className="w-5 h-5 mr-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                          <span className="font-medium">{file.name}</span>
                        </div>
                        <button 
                          onClick={() => removeFile(file.name)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-2 rounded-lg hover:bg-rose-500/10 opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <button 
                  onClick={handleVerify}
                  disabled={verifying}
                  className={`
                    w-full relative group overflow-hidden rounded-xl font-semibold text-lg tracking-wide py-4 transition-all duration-300
                    ${verifying 
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-none' 
                      : 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:scale-[1.01] border-none'
                    }
                  `}
                >
                  {verifying && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                  <span className={verifying ? 'opacity-0' : 'opacity-100'}>
                    {verifying ? 'Verifying on Blockchain...' : `Verify ${uploadedFiles.length} Document(s)`}
                  </span>
                </button>
              </div>
            )}
            {errorMsg && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl animate-in fade-in font-medium">
                {errorMsg}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center mb-4 flex-col md:flex-row gap-4">
              <h2 className="text-3xl font-bold text-white">Verification Results</h2>
              <div className="flex gap-4 w-full md:w-auto">
                <button onClick={exportToCSV} className="flex-1 md:flex-none px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-white font-medium shadow-lg hover:shadow-emerald-500/25 transition-all flex justify-center items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Export CSV Report
                </button>
                <button onClick={reset} className="flex-1 md:flex-none px-6 py-2.5 glass-panel-hover rounded-xl text-slate-300 hover:text-white font-medium border border-white/10 transition-colors">
                  Verify More
                </button>
              </div>
            </div>
            
            {results.map((res, idx) => (
              <div key={idx} className="glass-panel p-8 rounded-2xl text-left flex flex-col md:flex-row gap-8 relative overflow-hidden group">
                {/* Colored Status Edge */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  res.status === 'VALID' ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.7)]' : 
                  res.status === 'REVOKED' ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.7)]' : 
                  res.status === 'EXPIRED' ? 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.7)]' : 'bg-slate-500'
                }`} />

                <div className="flex-1 ml-3">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-white/5 pb-6">
                    <h3 className="text-2xl font-bold text-white flex items-center">
                      <svg className="w-6 h-6 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                      {res.fileName}
                    </h3>
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-widest uppercase shadow-lg border ${
                        res.status === 'VALID' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                        res.status === 'REVOKED' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 
                        res.status === 'EXPIRED' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
                        'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                        {res.status}
                    </span>
                  </div>
                  
                  <p className="text-slate-300 text-lg mb-8 leading-relaxed font-medium">
                    {res.message}
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {res.hash && (
                      <div className="bg-black/30 p-5 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors h-full">
                        <div className="text-slate-500 mb-2 text-xs uppercase tracking-widest font-bold flex items-center">
                           <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                           Cryptographic Hash (SHA-256)
                        </div>
                        <div className="text-slate-300 select-all font-mono text-sm break-all">{res.hash}</div>
                      </div>
                    )}

                    {res.details && (
                      <div className="bg-black/30 p-5 rounded-xl border border-white/5 group-hover:border-white/10 transition-colors h-full">
                        <div className="text-slate-500 mb-3 text-xs uppercase tracking-widest font-bold flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                          Decoded Metadata
                        </div>
                        <ul className="space-y-2 text-sm text-slate-300">
                            <li className="flex gap-2">
                                <span className="text-slate-500 w-24 flex-shrink-0">Title:</span> 
                                <span className="font-medium text-white">{res.details.title}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-slate-500 w-24 flex-shrink-0">Holder:</span> 
                                <span>{res.details.holder_name}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-slate-500 w-24 flex-shrink-0">Batch:</span> 
                                <span>{res.details.post_title}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-slate-500 w-24 flex-shrink-0">Expires:</span> 
                                <span>{res.details.validity}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-slate-500 w-24 flex-shrink-0">Timestamp:</span> 
                                <span>{new Date(res.details.issued_at).toLocaleString()}</span>
                            </li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;