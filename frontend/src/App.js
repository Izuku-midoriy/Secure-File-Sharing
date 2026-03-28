// Terminal-style App component for secure file sharing
import React, { useState, useEffect, useRef, useCallback } from 'react';
import LoadingScreen from './LoadingScreen';
import Auth from './Auth';
import Upload from './Upload';
import Download from './Download';
import Share from './Share';
import SharedFiles from './SharedFiles';
import { useAuth } from './context/AuthContext';
import './App.css';

function App() {
    const [files, setFiles] = useState([]);
    const [command, setCommand] = useState('');
    const [terminalOutput, setTerminalOutput] = useState([]);
    const [currentView, setCurrentView] = useState('terminal');
    const [loadingComplete, setLoadingComplete] = useState(false);
    
    const { user, isAuthenticated, login, logout, authLoading, apiFetch } = useAuth();
    const terminalRef = useRef(null);

    // Add console log to see initial state
    console.log('App component mounted, loadingComplete:', loadingComplete);

    const addTerminalLine = useCallback((text, type = 'success') => {
        setTerminalOutput(prev => [...prev, { text, type, timestamp: new Date().toLocaleTimeString() }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchFiles = useCallback(async (silent = false) => {
        try {
            const response = await apiFetch(`/files/list?t=${new Date().getTime()}`, {
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch files');
            }
            const data = await response.json();
            const validData = Array.isArray(data) ? data : [];
            setFiles(validData);

            if (!user || silent === true) return; // Skip terminal output if silent polling

            const myFiles = validData.filter(f => String(f.uploadedBy?._id || f.uploadedBy) === String(user.id));
            const sharedWithMe = validData.filter(f => String(f.uploadedBy?._id || f.uploadedBy) !== String(user.id));

            addTerminalLine(`Found ${myFiles.length} owned files and ${sharedWithMe.length} shared files`, 'info');

            // Mobile-friendly output: one property per line per file
            if (myFiles.length > 0) {
                addTerminalLine('--- YOUR FILES ---', 'info');
                myFiles.forEach(f => {
                    const sizeKB = (f.size / 1024).toFixed(1) + 'KB';
                    const date = new Date(f.uploadedAt).toLocaleString();
                    addTerminalLine(`  ${f.originalName}`, 'success');
                    addTerminalLine(`  Size: ${sizeKB}  |  Uploaded: ${date}`, 'info');
                });
            }

            if (sharedWithMe.length > 0) {
                addTerminalLine('--- SHARED WITH YOU ---', 'info');
                sharedWithMe.forEach(f => {
                    const sizeKB = (f.size / 1024).toFixed(1) + 'KB';
                    const owner = f.uploadedBy?.username || 'unknown';
                    const date = new Date(f.uploadedAt).toLocaleString();
                    addTerminalLine(`  ${f.originalName}`, 'warning');
                    addTerminalLine(`  Size: ${sizeKB}  |  Owner: ${owner}  |  Uploaded: ${date}`, 'info');
                });
            }
            if (validData.length > 0) {
                addTerminalLine('----------------------', 'info');
            }
        } catch (error) {
            console.error('Error fetching files:', error);
            addTerminalLine(`Error: ${error.message}`, 'error');
            setFiles([]);
        }
    }, [addTerminalLine, user, apiFetch]);

    // Welcome message and polling setup
    useEffect(() => {
        if (!loadingComplete || !isAuthenticated) return;

        addTerminalLine('Secure File Share Terminal v1.0.0', 'info');
        addTerminalLine(`Welcome, ${user.username}!`, 'success');
        addTerminalLine('Type "help" for available commands', 'info');
        
        // Initial manual fetch (prints to terminal)
        fetchFiles(false);

        // Auto-refresh silent polling every 10 seconds
        const pollInterval = setInterval(() => {
            fetchFiles(true); // Silent true
        }, 10000);

        return () => clearInterval(pollInterval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingComplete, isAuthenticated]); // Intentionally omitting functions to prevent re-triggering welcome message

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [terminalOutput]);

    const handleLogout = () => {
        logout();
        setFiles([]);
        setTerminalOutput([]);
        setCurrentView('terminal');
    };

    const handleUploadSuccess = (fileName) => {
        addTerminalLine(`File uploaded successfully: ${fileName}`, 'success');
        fetchFiles();
        setCurrentView('download');
    };

    const handleFileAction = (action, fileName) => {
        addTerminalLine(`File ${action}: ${fileName}`, 'info');
    };

    const handleShareComplete = () => {
        addTerminalLine('Sharing operation completed', 'success');
        fetchFiles();
        // Don't navigate away - keep user on share page to see the link
    };

    const handleCommand = async (e) => {
        e.preventDefault();
        if (!command.trim()) return;

        addTerminalLine(`$ ${command}`, 'info');

        const cmd = command.toLowerCase().trim();

        switch (cmd) {
            case 'help':
                addTerminalLine('Available commands:', 'info');
                addTerminalLine('  upload     - Open file upload interface', 'info');
                addTerminalLine('  list       - List all files', 'info');
                addTerminalLine('  download   - Show your files', 'info');
                addTerminalLine('  shared     - Show shared files', 'info');
                addTerminalLine('  share      - Open file sharing interface', 'info');
                addTerminalLine('  clear      - Clear terminal', 'info');
                addTerminalLine('  status     - Show system status', 'info');
                addTerminalLine('  logout     - Logout from system', 'info');
                break;

            case 'upload':
                setCurrentView('upload');
                addTerminalLine('Opening upload interface...', 'success');
                break;

            case 'list':
            case 'ls':
                addTerminalLine('Fetching file list...', 'info');
                fetchFiles();
                break;

            case 'download':
                setCurrentView('download');
                addTerminalLine('Opening your files interface...', 'success');
                break;

            case 'shared':
                setCurrentView('shared');
                addTerminalLine('Opening shared files interface...', 'success');
                break;

            case 'share':
                setCurrentView('share');
                addTerminalLine('Opening sharing interface...', 'success');
                break;

            case 'clear':
            case 'cls':
                setTerminalOutput([]);
                addTerminalLine('Terminal cleared', 'info');
                break;

            case 'status':
                addTerminalLine('System Status:', 'info');
                addTerminalLine(`  User: ${user?.username || 'Unknown'}`, 'success');
                addTerminalLine(`  Backend: ${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}`, 'success');
                addTerminalLine(`  Files stored: ${files.length}`, 'success');
                addTerminalLine(`  Encryption: AES-256-CBC`, 'success');
                addTerminalLine(`  Storage: MongoDB`, 'success');
                break;

            case 'logout':
                addTerminalLine('Logging out...', 'info');
                handleLogout();
                break;

            default:
                addTerminalLine(`Command not found: ${cmd}`, 'error');
                addTerminalLine('Type "help" for available commands', 'warning');
        }

        setCommand('');
    };

    if (!loadingComplete || authLoading) {
        console.log('Showing loading screen - loadingComplete:', loadingComplete);
        return <LoadingScreen onAnimationComplete={() => setLoadingComplete(true)} />;
    }

    if (!isAuthenticated) {
        console.log('Showing auth screen - isAuthenticated:', isAuthenticated);
        return <Auth onLogin={(userData, token) => login(userData, token)} />;
    }

    console.log('Showing main app');

    return (
        <div className="App">
            <header className="App-header">
                <h1>$ecure File Share</h1>
                <p>Terminal Interface v1.0.0 | AES-256 Encryption | MongoDB Storage | User: {user.username}</p>
                <button onClick={handleLogout} className="logout-button">LOGOUT</button>
            </header>

            <main>
                <div className="terminal-window">
                    <div className="terminal-header">
                        <span className="terminal-title">secure-file-share:~$</span>
                        <span className="terminal-status">ONLINE | {user.username}</span>
                    </div>

                    {/* Terminal Output */}
                    <div className="terminal-output" ref={terminalRef}>
                        {terminalOutput.map((line, index) => (
                            <div key={index} className={`terminal-line ${line.type}`}>
                                <span style={{ color: '#666', marginRight: '10px' }}>
                                    [{line.timestamp}]
                                </span>
                                {line.text}
                            </div>
                        ))}
                    </div>

                    {/* Command Input */}
                    <div className="command-input-container">
                        <form onSubmit={handleCommand}>
                            <span className="command-prompt">$</span>
                            <input
                                type="text"
                                className="command-input"
                                value={command}
                                onChange={(e) => setCommand(e.target.value)}
                                placeholder="Enter command..."
                                autoFocus
                            />
                        </form>
                    </div>

                    {/* Dynamic Content Area */}
                    {currentView === 'upload' && (
                        <Upload onUploadSuccess={handleUploadSuccess} />
                    )}

                    {currentView === 'download' && (
                        <Download
                            files={files.filter(f => String(f.uploadedBy?._id || f.uploadedBy) === String(user.id))}
                            onFileChange={fetchFiles}
                            onFileAction={handleFileAction}
                        />
                    )}

                    {currentView === 'shared' && (
                        <SharedFiles
                            files={files.filter(f => String(f.uploadedBy?._id || f.uploadedBy) !== String(user.id))}
                            onFileChange={fetchFiles}
                            onFileAction={handleFileAction}
                        />
                    )}

                    {currentView === 'share' && (
                        <Share
                            files={files}
                            user={user}
                            onShareComplete={handleShareComplete}
                        />
                    )}

                    {/* Help Text */}
                    <div className="help-text">
                        <span className="command-suggestion">Quick commands:</span> upload | list | download | shared | share | clear | status | logout
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
