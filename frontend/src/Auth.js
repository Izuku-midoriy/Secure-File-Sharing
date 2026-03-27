import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import './Auth.css';

const Auth = ({ onLogin }) => {
    const { apiFetch } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: ''
    });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const endpoint = isLogin ? 'login' : 'register';

        try {
            const response = await apiFetch(`/users/${endpoint}`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(`SUCCESS: ${data.message}`);
                // Instead of manually saving to localStorage, trigger parent onLogin callback 
                // which calls context.login()
                onLogin(data.user, data.token);
            } else {
                setMessage(`ERROR: ${data.error}`);
            }
        } catch (error) {
            setMessage(`ERROR: Network failure - ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setFormData({ username: '', email: '', password: '' });
        setMessage('');
    };

    return (
        <div className="auth-container">
            <div className="auth-window">
                <div className="auth-header">
                    <h2>{isLogin ? 'LOGIN' : 'REGISTER'}</h2>
                    <div className="auth-subtitle">
                        IZUKU SECURE FILE SHARE
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="auth-input"
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Username</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="auth-input"
                            placeholder="Enter your username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="auth-input"
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading ? 'PROCESSING...' : (isLogin ? 'LOGIN' : 'REGISTER')}
                    </button>
                </form>

                {message && (
                    <div className={`auth-message ${message.includes('SUCCESS') ? 'success' : 'error'}`}>
                        $ {message}
                    </div>
                )}

                <div className="auth-toggle">
                    <span className="toggle-text">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                    </span>
                    <button
                        type="button"
                        onClick={toggleMode}
                        className="toggle-button"
                    >
                        {isLogin ? 'REGISTER' : 'LOGIN'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
