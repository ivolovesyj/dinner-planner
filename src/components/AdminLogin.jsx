import React, { useState } from 'react';
import axios from 'axios';

// FORCE Fly.io API for now (or use rel path if proxy set)
const API_BASE = 'https://gooddinner.fly.dev/api';

const AdminLogin = () => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_BASE}/admin/login`, { password });
            const token = res.data.token;
            localStorage.setItem('adminToken', token);
            window.location.href = '/admin/dashboard';
        } catch (err) {
            setError('비밀번호가 틀렸습니다.');
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
                <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Admin Login 🔒</h2>
                <input
                    type="password"
                    placeholder="Master Password"
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
