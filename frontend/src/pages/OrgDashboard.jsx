import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const OrgDashboard = () => {
  // State for the form data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]); // This is an array because we allow multiple files

  // Handle files being dropped into the zone
  const onDrop = useCallback(acceptedFiles => {
    // Add the newly dropped files to the existing files array
    setFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    // We can add accept: {'application/pdf': ['.pdf']} here later if you strictly want PDFs only
  });

  // Handle removing a file from the list before uploading
  const removeFile = (fileToRemoveName) => {
    setFiles(files.filter(file => file.name !== fileToRemoveName));
  };

  // Handle the final submission to IPFS
  const handleUpload = (e) => {
    e.preventDefault();
    if (files.length === 0) {
      alert("Please add at least one file to upload.");
      return;
    }
    
    // Here is where your Node.js backend takes over to push to IPFS and Database
    console.log("Ready to push to IPFS:", { title, description, files });
    alert(`Uploading ${files.length} file(s) to IPFS! Check console for details.`);
    
    // Clear form after fake "upload"
    setTitle('');
    setDescription('');
    setFiles([]);
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Organization Dashboard</h1>
      <p style={{ color: '#555', marginBottom: '30px' }}>Upload official documents to IPFS. They will be cryptographically signed with your organization's private key.</p>

      <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
        <form onSubmit={handleUpload}>
          
          {/* Title Input */}
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

          {/* Description Input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any search keywords or details about these documents..." 
              required
              rows="4"
              style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px', resize: 'vertical' }}
            />
          </div>

          {/* Multi-File Drag & Drop Zone */}
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

          {/* Display the list of selected files */}
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

          {/* Submit Button */}
          <button 
            type="submit" 
            style={{ width: '100%', padding: '15px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Sign & Upload to IPFS
          </button>

        </form>
      </div>
    </div>
  );
};

export default OrgDashboard;