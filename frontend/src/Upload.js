// Terminal-style Upload component for file upload functionality
import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';

const Upload = ({ onUploadSuccess }) => {
    const { apiFetch } = useAuth();
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');
    const [dragOver, setDragOver] = useState(false);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        setSelectedFile(file);
        setMessage('');
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        setSelectedFile(file);
        setMessage('');
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        
        if (!selectedFile) {
            setMessage('ERROR: No file selected');
            return;
        }

        setUploading(true);
        setMessage('');

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const response = await apiFetch('/files/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`SUCCESS: File encrypted and stored: ${selectedFile.name}`);
                setSelectedFile(null);
                onUploadSuccess(selectedFile.name);
            } else {
                setMessage(`ERROR: Upload failed - ${data.error}`);
            }
        } catch (error) {
            setMessage(`ERROR: Network failure - ${error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="upload-container">
            <div className="upload-area-terminal" 
                 onDragOver={handleDragOver}
                 onDragLeave={handleDragLeave}
                 onDrop={handleDrop}>
                <input 
                    type="file" 
                    className="file-input-terminal"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    id="file-upload"
                />
                <label htmlFor="file-upload" className="upload-label-terminal">
                    {dragOver ? 'DROP FILE HERE' : 'CLICK OR DRAG FILE TO UPLOAD'}
                </label>
            </div>
            
            {selectedFile && (
                <div className="file-info-terminal">
                    <div className="terminal-line info">
                        $ File selected: {selectedFile.name}
                    </div>
                    <div className="terminal-line info">
                        $ Size: {formatFileSize(selectedFile.size)}
                    </div>
                    <div className="terminal-line info">
                        $ Type: {selectedFile.type || 'Unknown'}
                    </div>
                </div>
            )}

            {uploading && (
                <div className="progress-terminal">
                    <div className="progress-bar-terminal" style={{ width: '60%' }}></div>
                </div>
            )}

            <div style={{ marginTop: '20px' }}>
                <button 
                    onClick={handleUpload}
                    disabled={uploading || !selectedFile}
                    className="terminal-button"
                >
                    {uploading ? 'ENCRYPTING...' : 'UPLOAD & ENCRYPT'}
                </button>
            </div>

            {message && (
                <div className={`terminal-line ${message.includes('ERROR') ? 'error' : 'success'}`}
                     style={{ marginTop: '15px' }}>
                    $ {message}
                </div>
            )}
        </div>
    );
};

export default Upload;
