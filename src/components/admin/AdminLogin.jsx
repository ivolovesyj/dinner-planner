import React, { useState } from 'react';
import { login as loginApi, signup as signupApi } from '../../api/adminApi';

const AdminLogin = () => {
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            if (mode === 'signup') {
                await signupApi({
                    username,
                    password,
                    companyName,
                    phone
                });
                alert('광고주 계정이 생성되었습니다. 로그인해주세요.');
                setMode('login');
                setPassword('');
                return;
            }

            const { token, name, role, pointsBalance } = await loginApi(username, password);
            localStorage.setItem('adminToken', token);
            localStorage.setItem('admin_token', token);
            localStorage.setItem('adminName', name || username || 'Admin');
            localStorage.setItem('adminRole', role || 'admin');
            localStorage.setItem('adminPointsBalance', String(pointsBalance || 0));

            window.location.href = '/admin/dashboard';
        } catch (err) {
            setError(err.response?.data?.error || (mode === 'login' ? 'Login Failed. Check credentials.' : '회원가입 실패'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100vh', background: '#f5f5f7'
        }}>
            <form onSubmit={handleSubmit} style={{
                background: 'white', padding: '40px', borderRadius: '20px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '300px'
            }}>
                <h2 style={{ marginBottom: '8px', textAlign: 'center' }}>
                    {mode === 'login' ? 'Partner Login 💼' : 'Advertiser Signup ✍️'}
                </h2>
                <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                    {mode === 'login' ? '광고주/관리자 공용 로그인' : '광고주 계정을 먼저 생성하세요'}
                </p>

                <input
                    type="text"
                    placeholder="사용자명"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                        width: '100%', padding: '12px', marginBottom: '12px',
                        borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box'
                    }}
                />

                <input
                    type="password"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                        width: '100%', padding: '12px', marginBottom: '12px',
                        borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box'
                    }}
                />

                {mode === 'signup' && (
                    <>
                        <input
                            type="text"
                            placeholder="회사명"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', marginBottom: '12px',
                                borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box'
                            }}
                        />
                        <input
                            type="text"
                            placeholder="연락처 (필수)"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', marginBottom: '12px',
                                borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box'
                            }}
                        />
                    </>
                )}
                {error && <p style={{ color: 'red', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}
                <button type="submit" style={{
                    width: '100%', padding: '12px', borderRadius: '8px',
                    border: 'none', background: '#007AFF', color: 'white', fontWeight: 'bold', cursor: 'pointer'
                }}>
                    {loading ? '처리 중...' : (mode === 'login' ? 'Login' : '회원가입')}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setMode(prev => prev === 'login' ? 'signup' : 'login');
                        setError(null);
                    }}
                    style={{
                        width: '100%', marginTop: '10px', padding: '10px', borderRadius: '8px',
                        border: '1px solid #ddd', background: 'white', color: '#333', cursor: 'pointer'
                    }}
                >
                    {mode === 'login' ? '광고주 회원가입' : '로그인으로 돌아가기'}
                </button>
            </form>
        </div>
    );
};

export default AdminLogin;
