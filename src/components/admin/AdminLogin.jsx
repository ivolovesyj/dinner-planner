import React, { useState } from 'react';
import { login as loginApi, signup as signupApi } from '../../api/adminApi';

const AdminLogin = () => {
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
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
                if (password !== passwordConfirm) {
                    setError('비밀번호가 서로 일치하지 않습니다.');
                    setLoading(false);
                    return;
                }
                await signupApi({
                    username,
                    password,
                    companyName,
                    phone
                });
                alert('광고주 계정이 생성되었습니다. 로그인해주세요.');
                setMode('login');
                setPassword('');
                setPasswordConfirm('');
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
            justifyContent: 'center', minHeight: '100vh', background: 'var(--ios-bg)',
            padding: '20px'
        }}>
            <form onSubmit={handleSubmit} style={{
                background: 'var(--ios-card-bg)',
                padding: '28px 22px',
                borderRadius: '20px',
                boxShadow: 'var(--shadow-ios)',
                border: '1px solid rgba(0,0,0,0.05)',
                width: '100%',
                maxWidth: '360px'
            }}>
                <h2 style={{ marginBottom: '8px', textAlign: 'center', fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
                    {mode === 'login' ? 'Partner Login 💼' : 'Advertiser Signup ✍️'}
                </h2>
                <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--ios-gray-text)', textAlign: 'center', lineHeight: 1.4 }}>
                    {mode === 'login' ? '광고주/관리자 공용 로그인' : '광고주 계정을 먼저 생성하세요'}
                </p>

                <input
                    type="text"
                    placeholder={mode === 'signup' ? '로그인 아이디' : '사용자명'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                        width: '100%', padding: '12px', marginBottom: '12px',
                        borderRadius: '12px', border: '1px solid var(--ios-border)', boxSizing: 'border-box',
                        background: '#fff'
                    }}
                />

                <input
                    type="password"
                    placeholder={mode === 'signup' ? '로그인 비밀번호' : '비밀번호'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                        width: '100%', padding: '12px', marginBottom: '12px',
                        borderRadius: '12px', border: '1px solid var(--ios-border)', boxSizing: 'border-box',
                        background: '#fff'
                    }}
                />

                {mode === 'signup' && (
                    <>
                        <input
                            type="password"
                            placeholder="로그인 비밀번호 확인"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', marginBottom: '12px',
                                borderRadius: '12px', border: '1px solid var(--ios-border)', boxSizing: 'border-box',
                                background: '#fff'
                            }}
                        />
                        <input
                            type="text"
                            placeholder="회사명(식당명)"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', marginBottom: '12px',
                                borderRadius: '12px', border: '1px solid var(--ios-border)', boxSizing: 'border-box',
                                background: '#fff'
                            }}
                        />
                        <input
                            type="text"
                            placeholder="연락처 (필수)"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', marginBottom: '12px',
                                borderRadius: '12px', border: '1px solid var(--ios-border)', boxSizing: 'border-box',
                                background: '#fff'
                            }}
                        />
                    </>
                )}
                {error && <p style={{ color: 'var(--ios-red)', fontSize: '13px', marginBottom: '12px', lineHeight: 1.35 }}>{error}</p>}
                <button type="submit" style={{
                    width: '100%', padding: '12px', borderRadius: '14px',
                    border: 'none', background: 'var(--ios-blue)', color: 'white', fontWeight: '700', cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(0, 122, 255, 0.22)'
                }}>
                    {loading ? '처리 중...' : (mode === 'login' ? 'Login' : '회원가입')}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setMode(prev => prev === 'login' ? 'signup' : 'login');
                        setError(null);
                        setPasswordConfirm('');
                    }}
                    style={{
                        width: '100%', marginTop: '10px', padding: '10px', borderRadius: '14px',
                        border: '1px solid rgba(0,0,0,0.07)', background: '#fff', color: '#1f2937', cursor: 'pointer',
                        fontWeight: 600
                    }}
                >
                    {mode === 'login' ? '광고주 회원가입' : '로그인으로 돌아가기'}
                </button>
            </form>
        </div>
    );
};

export default AdminLogin;
