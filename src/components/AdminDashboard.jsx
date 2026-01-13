import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = 'https://gooddinner.fly.dev/api';

const AdminDashboard = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminName, setAdminName] = useState('');
    const [role, setRole] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        const name = localStorage.getItem('adminName');
        const userRole = localStorage.getItem('adminRole');

        if (!token) {
            window.location.href = '/admin/login';
            return;
        }

        setAdminName(name || 'Partner');
        setRole(userRole || 'advertiser');

        const fetchStats = async () => {
            try {
                const res = await axios.get(`${API_BASE}/admin/campaigns`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setCampaigns(res.data);
            } catch (err) {
                if (err.response && err.response.status === 401) {
                    window.location.href = '/admin/login';
                }
                alert('데이터 로드 실패');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const logout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminName');
        localStorage.removeItem('adminRole');
        window.location.href = '/admin/login';
    };

    if (loading) return <div style={{ padding: '20px' }}>Loading Stats...</div>;

    return (
        <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ marginBottom: '5px' }}>📊 Advertising Dashboard</h1>
                    <span style={{ color: '#666', fontSize: '14px' }}>
                        Welcome, <strong>{adminName}</strong> ({role === 'admin' ? 'Super Admin' : 'Partner'})
                    </span>
                </div>
                <button onClick={logout} style={{
                    padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd',
                    background: 'white', cursor: 'pointer'
                }}>Logout</button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
                <div style={cardStyle}>
                    <h3>Active Campaigns</h3>
                    <p style={bigNumberStyle}>{campaigns.filter(c => c.active).length}</p>
                </div>
                <div style={cardStyle}>
                    <h3>Total Impressions</h3>
                    <p style={bigNumberStyle}>{campaigns.reduce((a, b) => a + (b.impressions || 0), 0).toLocaleString()}</p>
                </div>
                <div style={cardStyle}>
                    <h3>Total Clicks</h3>
                    <p style={bigNumberStyle}>{campaigns.reduce((a, b) => a + (b.clicks || 0), 0).toLocaleString()}</p>
                </div>
            </div>

            {/* Table */}
            <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f5f5f7', borderBottom: '1px solid #eee' }}>
                        <tr>
                            <th style={thStyle}>Advertiser</th>
                            <th style={thStyle}>Target Station</th>
                            <th style={thStyle}>Impressions</th>
                            <th style={thStyle}>Clicks</th>
                            <th style={thStyle}>CTR (%)</th>
                            <th style={thStyle}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.map(ad => (
                            <tr key={ad._id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                <td style={tdStyle}>
                                    <div><strong>{ad.sponsorName}</strong></div>
                                    <div style={{ fontSize: '12px', color: '#888' }}>{ad.title}</div>
                                </td>
                                <td style={tdStyle}>
                                    {ad.targetStations.map(s => (
                                        <span key={s} style={tagStyle}>{s}</span>
                                    ))}
                                </td>
                                <td style={tdStyle}>{ad.impressions?.toLocaleString()}</td>
                                <td style={tdStyle}>{ad.clicks?.toLocaleString()}</td>
                                <td style={{ ...tdStyle, color: ad.ctr > 1.0 ? 'green' : 'black', fontWeight: 'bold' }}>
                                    {ad.ctr}%
                                </td>
                                <td style={tdStyle}>
                                    <span style={{
                                        ...statusStyle,
                                        background: ad.active ? '#e8f5e9' : '#ffebee',
                                        color: ad.active ? '#2e7d32' : '#c62828'
                                    }}>
                                        {ad.active ? 'Active' : 'Paused'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const cardStyle = {
    flex: 1, background: 'white', padding: '24px', borderRadius: '16px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)', textAlign: 'center'
};
const bigNumberStyle = { fontSize: '32px', fontWeight: '800', margin: '10px 0 0 0', color: '#007AFF' };
const thStyle = { padding: '16px', fontSize: '13px', color: '#666', fontWeight: '600' };
const tdStyle = { padding: '16px', fontSize: '14px' };
const tagStyle = {
    background: '#eee', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', marginRight: '4px'
};
const statusStyle = {
    padding: '4px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: '600'
};

export default AdminDashboard;
