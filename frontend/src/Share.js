// Terminal-style Share component for file sharing
import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import './Share.css';

const Share = ({ files, user, onShareComplete }) => {
    const { apiFetch } = useAuth();
    const [selectedFile, setSelectedFile] = useState('');
    const [shareType, setShareType] = useState('user'); // 'user' or 'link'
    const [targetUser, setTargetUser] = useState('');
    const [linkSettings, setLinkSettings] = useState({
        expiresInHours: 24,
        maxDownloads: 1,
        password: ''
    });
    const [message, setMessage] = useState('');
    const [linkInfo, setLinkInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    // Filter files to only those owned by the current user
    const ownedFiles = files.filter(file => {
        if (!user) return false;
        // The backend populates uploadedBy either as an object with {username, email, _id} or just the ID string
        const uploaderId = file.uploadedBy?._id || file.uploadedBy;
        return String(uploaderId) === String(user.id);
    });

    // Reset form when component mounts
    useEffect(() => {
        console.log('Share component mounted, resetting form');
        setSelectedFile('');
        setTargetUser('');
        setLinkSettings({
            expiresInHours: 24,
            maxDownloads: 1,
            password: ''
        });
        setMessage('');
        setLinkInfo(null);
    }, []);

    const handleShareWithUser = async () => {
        console.log('handleShareWithUser called');
        console.log('Current state:', { selectedFile, targetUser, shareType });

        if (!selectedFile || !targetUser) {
            setMessage('ERROR: Please select file and enter username');
            return;
        }

        setLoading(true);
        setMessage('');

        console.log('Sharing file with user:', { selectedFile, targetUser });

        try {
            const response = await apiFetch(`/files/${selectedFile}/share`, {
                method: 'POST',
                body: JSON.stringify({
                    userId: targetUser,
                    expiresInHours: 24
                })
            });

            console.log('Response status:', response.status);

            const responseText = await response.text();
            console.log('Response text:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Parsed response data:', data);
            } catch (parseError) {
                console.error('Failed to parse JSON:', parseError);
                setMessage('ERROR: Invalid response from server');
                setLoading(false);
                return;
            }

            if (response.ok) {
                setMessage(`SUCCESS: File shared with ${data.sharedWith}`);
                console.log('Before clearing state - targetUser:', targetUser);
                setTargetUser('');
                console.log('After clearing targetUser');
                setSelectedFile('');
                console.log('After clearing selectedFile');
                onShareComplete();
                console.log('Called onShareComplete');
            } else {
                setMessage(`ERROR: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error sharing file:', error);
            setMessage(`ERROR: Network failure - ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLink = async () => {
        if (!selectedFile) {
            setMessage('ERROR: Please select a file');
            return;
        }

        setLoading(true);
        setMessage('');
        setLinkInfo(null);

        console.log('Creating temporary link for file:', selectedFile);
        console.log('Link settings:', linkSettings);

        try {
            const response = await apiFetch(`/files/${selectedFile}/temporary-link`, {
                method: 'POST',
                body: JSON.stringify(linkSettings)
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            const responseText = await response.text();
            console.log('Response text:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Parsed response data:', data);
            } catch (parseError) {
                console.error('Failed to parse JSON:', parseError);
                setMessage('ERROR: Invalid response from server');
                setLoading(false);
                return;
            }

            if (response.ok) {
                setMessage(`SUCCESS: Temporary link created!`);
                setLinkInfo({
                    url: data.shareUrl,
                    expiresAt: data.expiresAt,
                    maxDownloads: data.maxDownloads,
                    hasPassword: data.hasPassword
                });
                setSelectedFile('');
                onShareComplete();
            } else {
                setMessage(`ERROR: ${data.error || 'Unknown error'}`);
                setLinkInfo(null);
            }
        } catch (error) {
            console.error('Error creating link:', error);
            setMessage(`ERROR: Network failure - ${error.message}`);
            setLinkInfo(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="share-container">
            <div className="share-terminal">
                <div className="terminal-line info">
                    $ File Sharing Interface
                </div>

                <div className="share-type-selector">
                    <div className="terminal-line info">
                        $ Share Type:
                    </div>
                    <div className="share-options">
                        <button
                            className={`terminal-button ${shareType === 'user' ? 'active' : ''}`}
                            onClick={() => setShareType('user')}
                        >
                            Share with User
                        </button>
                        <button
                            className={`terminal-button ${shareType === 'link' ? 'active' : ''}`}
                            onClick={() => setShareType('link')}
                        >
                            Create Temporary Link
                        </button>
                    </div>
                </div>

                <div className="file-selector">
                    <div className="terminal-line info">
                        $ Select File:
                    </div>
                    <select
                        className="terminal-select"
                        value={selectedFile}
                        onChange={(e) => setSelectedFile(e.target.value)}
                    >
                        <option value="">Choose a file...</option>
                        {ownedFiles.map((file) => (
                            <option key={file._id} value={file._id}>
                                {file.originalName}
                            </option>
                        ))}
                    </select>
                </div>

                {shareType === 'user' ? (
                    <div className="user-share">
                        <div className="terminal-line info">
                            $ Username to share with:
                        </div>
                        <input
                            type="text"
                            className="terminal-input"
                            value={targetUser}
                            onChange={(e) => setTargetUser(e.target.value)}
                            placeholder="Enter username"
                        />
                        <button
                            className="terminal-button"
                            onClick={handleShareWithUser}
                            disabled={loading}
                        >
                            {loading ? 'SHARING...' : 'SHARE WITH USER'}
                        </button>
                    </div>
                ) : (
                    <div className="link-share">
                        <div className="terminal-line info">
                            $ Link Settings:
                        </div>

                        <div className="link-settings">
                            <div className="setting-item">
                                <label>Expires in (hours):</label>
                                <input
                                    type="number"
                                    className="terminal-input"
                                    value={linkSettings.expiresInHours}
                                    onChange={(e) => setLinkSettings({
                                        ...linkSettings,
                                        expiresInHours: parseInt(e.target.value)
                                    })}
                                    min="1"
                                    max="168"
                                />
                            </div>

                            <div className="setting-item">
                                <label>Max Downloads:</label>
                                <input
                                    type="number"
                                    className="terminal-input"
                                    value={linkSettings.maxDownloads}
                                    onChange={(e) => setLinkSettings({
                                        ...linkSettings,
                                        maxDownloads: parseInt(e.target.value)
                                    })}
                                    min="1"
                                    max="10"
                                />
                            </div>

                            <div className="setting-item">
                                <label>Password (optional):</label>
                                <input
                                    type="password"
                                    className="terminal-input"
                                    value={linkSettings.password}
                                    onChange={(e) => setLinkSettings({
                                        ...linkSettings,
                                        password: e.target.value
                                    })}
                                    placeholder="Leave empty for no password"
                                />
                            </div>
                        </div>

                        <button
                            className="terminal-button"
                            onClick={handleCreateLink}
                            disabled={loading}
                        >
                            {loading ? 'CREATING...' : 'CREATE TEMPORARY LINK'}
                        </button>
                    </div>
                )}

                {message && (
                    <div className={`terminal-line ${message.includes('SUCCESS') ? 'success' : 'error'}`}
                        style={{ marginTop: '20px' }}>
                        $ {message}
                    </div>
                )}

                {linkInfo && (
                    <div className="link-result" style={{ marginTop: '20px' }}>
                        <div className="terminal-line success">
                            $ Temporary Link Generated Successfully
                        </div>
                        <div className="link-details">
                            <div className="terminal-line info">
                                $ Link URL:
                            </div>
                            <div className="link-url">
                                <input
                                    type="text"
                                    readOnly
                                    value={linkInfo.url}
                                    className="terminal-input"
                                    style={{
                                        background: 'rgba(0, 255, 0, 0.1)',
                                        border: '1px solid #00ff00',
                                        padding: '8px',
                                        margin: '10px 0',
                                        fontSize: '0.9rem',
                                        wordBreak: 'break-all'
                                    }}
                                />
                                <button
                                    className="terminal-button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(linkInfo.url);
                                        setMessage('Link copied to clipboard!');
                                        setTimeout(() => setMessage(''), 2000);
                                    }}
                                    style={{ marginLeft: '10px' }}
                                >
                                    COPY
                                </button>
                            </div>

                            <div className="terminal-line info">
                                $ Expires: {new Date(linkInfo.expiresAt).toLocaleString()}
                            </div>

                            <div className="terminal-line info">
                                $ Max Downloads: {linkInfo.maxDownloads}
                            </div>

                            <div className="terminal-line info">
                                $ Password Protected: {linkInfo.hasPassword ? 'Yes' : 'No'}
                            </div>
                        </div>
                    </div>
                )}

                <div className="help-text">
                    <span className="command-suggestion">Sharing Options:</span>
                    <div>• User Sharing: Grant specific users access to your files</div>
                    <div>• Temporary Links: Create shareable URLs with expiration</div>
                    <div>• All sharing is encrypted and secure</div>
                </div>
            </div>
        </div>
    );
};

export default Share;
