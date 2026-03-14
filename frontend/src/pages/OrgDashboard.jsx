import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

const OrgDashboard = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [validity, setValidity] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (role !== "organisation") {
      window.location.href = "/login";
    }
  }, []);

  const onDrop = useCallback(acceptedFiles => {
    setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const removeFile = (fileToRemoveName) => {
    setFiles(files.filter(file => file.name !== fileToRemoveName));
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      alert("Please add at least one file to upload.");
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append("post_title", title);
    formData.append("holder_name", description); // Using description field as holder_name per requirements
    formData.append("validity", validity);
    
    files.forEach(file => {
        formData.append("files", file);
    });

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/document/upload`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      console.log("Upload Success:", data);
      alert(`Successfully uploaded ${files.length} document(s)! Check console for Hashes and CIDs.`);
      
      setTitle('');
      setDescription('');
      setValidity('');
      setFiles([]);
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Organization Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          Logout
        </button>
      </div>
      <p style={{ color: '#555', marginBottom: '30px' }}>Upload official documents to IPFS and the SQL Blockchain.</p>

      <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <form onSubmit={handleUpload}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Document Batch Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 2026 Graduating Class Certificates" 
              required
              style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Holder Name(s) / Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Name of the person holding these documents..." 
              required
              rows="2"
              style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px', resize: 'vertical' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Validity Date</label>
            <input 
              type="date"
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
            />
          </div>

          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Files</label>
          <div 
            {...getRootProps()} 
            style={{
              border: isDragActive ? '2px dashed #007bff' : '2px dashed #ccc',
              backgroundColor: isDragActive ? '#e9f2fc' : '#fafafa',
              padding: '40px 20px',
              borderRadius: '8px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '20px',
              transition: 'all 0.2s ease'
            }}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p style={{ color: '#007bff', margin: 0 }}>Drop the files here!</p>
            ) : (
              <p style={{ color: '#666', margin: 0 }}>Drag 'n' drop multiple files here, or click to select files</p>
            )}
          </div>

          {files.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '10px' }}>Files to Upload:</h4>
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {files.map((file, index) => (
                  <li key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#f4f7f6', marginBottom: '5px', borderRadius: '4px' }}>
                    <span>📄 {file.name}</span>
                    <button 
                      type="button" 
                      onClick={() => removeFile(file.name)}
                      style={{ color: '#dc3545', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      X
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button 
            type="submit" 
            disabled={uploading}
            style={{ width: '100%', padding: '15px', backgroundColor: uploading ? '#6c757d' : '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '18px', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            {uploading ? 'Uploading...' : 'Sign & Upload to IPFS'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OrgDashboard;