import React, { useState } from 'react';
import axios from 'axios';

// FORCE Fly.io API for now (or use rel path if proxy set)
const API_BASE = 'https://gooddinner.fly.dev/api';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Send username checks to new endpoint logic
            // (If username is empty, backend defaults to 'admin' for legacy password-only, 
            // but let's encourage explicit login)
            const res = await axios.post(`${API_BASE}/admin/login`, { username, password });

            const { token, name, role } = res.data;
            localStorage.setItem('adminToken', token);
            localStorage.setItem('adminName', name || username || 'Admin');
            localStorage.setItem('adminRole', role || 'admin');

            window.location.href = '/admin/dashboard';
        } catch (err) {
            setError('Login Failed. Check credentials.');
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100vh', background: '#f5f5f7'
        }}>
            <form onSubmit={handleLogin} style={{
                background: 'white', padding: '40px', borderRadius: '20px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '300px'
            }}>
                <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Partner Login 💼</h2>

                <input
                    type="text"
                    placeholder="Username (e.g. admin)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                        width: '100%', padding: '12px', marginBottom: '12px',
                        borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box'
                    }}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                        width: '100%', padding: '12px', marginBottom: '12px',
                        borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box'
                    }}
                />
                {error && <p style={{ color: 'red', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}
                <button type="submit" style={{
                    width: '100%', padding: '12px', borderRadius: '8px',
                    border: 'none', background: '#007AFF', color: 'white', fontWeight: 'bold', cursor: 'pointer'
                }}>
                    Login
                </button>
            </form>
        </div>
    );
};

export default AdminLogin;
