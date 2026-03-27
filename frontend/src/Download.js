// Terminal-style Download component with token-based downloads
import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';

const Download = ({ files, onFileChange, onFileAction }) => {
    const { apiFetch } = useAuth();
    const [downloading, setDownloading] = useState(null);
    const [message, setMessage] = useState('');
    const [downloadTokens, setDownloadTokens] = useState({});

    const generateDownloadToken = async (fileId, fileName) => {
        try {
            onFileAction('generating token', fileName);
            const response = await apiFetch(`/files/${fileId}/token`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                setDownloadTokens(prev => ({
                    ...prev,
                    [fileId]: {
                        token: data.downloadToken,
                        expiresAt: data.expiresAt,
                        downloadUrl: data.downloadUrl
                    }
                }));
                setMessage(`SUCCESS: Download token generated for ${fileName} (expires: ${new Date(data.expiresAt).toLocaleTimeString()})`);
                onFileAction('token generated', fileName);
            } else {
                const errorData = await response.json();
                setMessage(`ERROR: Token generation failed - ${errorData.error}`);
            }
        } catch (error) {
            setMessage(`ERROR: Network failure - ${error.message}`);
        }
    };

    const handleDownload = async (fileId, fileName) => {
        const tokenData = downloadTokens[fileId];

        if (!tokenData) {
            // Generate token first
            await generateDownloadToken(fileId, fileName);
            return;
        }

        // Check if token is expired
        if (new Date() > new Date(tokenData.expiresAt)) {
            setMessage(`ERROR: Download token expired for ${fileName}. Generating new token...`);
            await generateDownloadToken(fileId, fileName);
            return;
        }

        setDownloading(fileId);
        setMessage('');
        onFileAction('download started', fileName);

        try {
            const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
            const serverUrl = baseUrl.replace('/api', '');
            const response = await fetch(`${serverUrl}${tokenData.downloadUrl}`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                setMessage(`SUCCESS: File decrypted and downloaded: ${fileName}`);
                onFileAction('download completed', fileName);

                // Remove used token
                setDownloadTokens(prev => {
                    const newTokens = { ...prev };
                    delete newTokens[fileId];
                    return newTokens;
                });
            } else {
                const errorData = await response.json();
                setMessage(`ERROR: Download failed - ${errorData.error}`);
            }
        } catch (error) {
            setMessage(`ERROR: Network failure - ${error.message}`);
        } finally {
            setDownloading(null);
        }
    };

    const handleDelete = async (fileId, fileName) => {
        if (!window.confirm(`Delete file: ${fileName}?`)) {
            return;
        }

        console.log('Attempting to delete file:', { fileId, fileName });

        try {
            const response = await apiFetch(`/files/${fileId}`, {
                method: 'DELETE'
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                setMessage(`SUCCESS: File deleted: ${fileName}`);
                onFileAction('deleted', fileName);
                onFileChange();

                // Remove token for deleted file
                setDownloadTokens(prev => {
                    const newTokens = { ...prev };
                    delete newTokens[fileId];
                    return newTokens;
                });
            } else {
                const errorData = await response.json();
                setMessage(`ERROR: Delete failed - ${errorData.error}`);
            }
        } catch (error) {
            setMessage(`ERROR: Network failure - ${error.message}`);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const getTokenStatus = (fileId) => {
        const tokenData = downloadTokens[fileId];
        if (!tokenData) return 'NO_TOKEN';
        if (new Date() > new Date(tokenData.expiresAt)) return 'EXPIRED';
        return 'VALID';
    };

    const getTokenExpiryTime = (fileId) => {
        const tokenData = downloadTokens[fileId];
        if (!tokenData) return null;
        return new Date(tokenData.expiresAt).toLocaleTimeString();
    };

    return (
        <div className="download-container">
            <div className="file-list-terminal">
                {!Array.isArray(files) || files.length === 0 ? (
                    <div className="terminal-line warning">
                        $ No files found in storage. Use 'upload' command to add files.
                    </div>
                ) : (
                    <>
                        <div className="terminal-line info">
                            $ Found {files.length} encrypted files in storage:
                        </div>
                        {files.map((file) => {
                            const tokenStatus = getTokenStatus(file._id);
                            return (
                                <div key={file._id} className="file-item-terminal">
                                    <div className="file-info-terminal">
                                        <div className="file-name-terminal">
                                            {file.originalName}
                                        </div>
                                        <div className="file-details-terminal">
                                            Size: {formatFileSize(file.size)} | 
                                            Uploaded: {formatDate(file.uploadedAt)} | 
                                            Type: {file.mimeType || 'Unknown'}
                                        </div>
                                        <div className="file-details-terminal">
                                            Token Status:
                                            <span className={`terminal-line ${tokenStatus === 'VALID' ? 'success' : tokenStatus === 'EXPIRED' ? 'error' : 'warning'}`}>
                                                {tokenStatus.replace('_', ' ')}
                                            </span>
                                            {tokenStatus === 'VALID' && (
                                                <span style={{ marginLeft: '10px', color: '#00cc00' }}>
                                                    Expires: {getTokenExpiryTime(file._id)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="file-actions-terminal">
                                        <button
                                            onClick={() => handleDownload(file._id, file.originalName)}
                                            disabled={downloading === file._id}
                                            className="terminal-button"
                                        >
                                            {downloading === file._id ? 'DECRYPTING...' :
                                                tokenStatus === 'VALID' ? 'DOWNLOAD' : 'GET TOKEN'}
                                        </button>
                                        <button
                                            onClick={() => generateDownloadToken(file._id, file.originalName)}
                                            disabled={downloading === file._id}
                                            className="terminal-button"
                                        >
                                            {tokenStatus === 'VALID' ? 'REFRESH' : 'NEW TOKEN'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(file._id, file.originalName)}
                                            className="terminal-button danger"
                                        >
                                            DELETE
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            {message && (
                <div className={`terminal-line ${message.includes('ERROR') ? 'error' : 'success'}`}
                    style={{ marginTop: '20px' }}>
                    $ {message}
                </div>
            )}

            <div className="help-text">
                <span className="command-suggestion">Token-based Security:</span>
                Downloads require secure tokens that expire after 1 hour. Each token is single-use.
            </div>
        </div>
    );
};

export default Download;
