import { useApp } from '../context/AppContext';

export default function Dashboard() {
    const { scanResult, history, riskScore, setCurrentSection } = useApp();

    const alertType = !scanResult ? 'info' : scanResult.grade >= 3 ? 'danger' : 'success';
    const alertIcon = !scanResult ? '💡' : scanResult.grade >= 3 ? '🚨' : '✅';
    const alertMsg = !scanResult
        ? <><strong>Welcome to DR Detect AI</strong> — Upload a retinal fundus image in Scan Analysis and add patient details to begin.</>
        : scanResult.grade >= 3
            ? <><strong>Attention Required</strong> — Latest scan: {scanResult.name} (Grade {scanResult.grade}). Review your Follow-Up Plan.</>
            : <><strong>Scan Complete</strong> — Latest: {scanResult.name} (Grade {scanResult.grade}). Check Risk Progression and Follow-Up Plan.</>;

    const gradeNames = ['No DR', 'Mild NPDR', 'Moderate NPDR', 'Severe NPDR', 'Proliferative DR'];

    const severityColor = (g) => g >= 3 ? 'var(--severity-4)' : g >= 2 ? 'var(--severity-3)' : 'var(--severity-0)';

    return (
        <div className="section-page">
            <div className={`alert-banner ${alertType}`}>
                <span className="alert-icon">{alertIcon}</span>
                <div>{alertMsg}</div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon teal">🔬</div>
                    <div>
                        <div className="stat-value">{history.length}</div>
                        <div className="stat-label">Total Scans</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange">⚠️</div>
                    <div>
                        <div className="stat-value" style={scanResult ? { color: severityColor(scanResult.grade) } : {}}>
                            {scanResult ? `Grade ${scanResult.grade}` : '—'}
                        </div>
                        <div className="stat-label">Latest DR Grade</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red">📈</div>
                    <div>
                        <div className="stat-value" style={riskScore !== null ? { color: riskScore >= 75 ? 'var(--severity-4)' : riskScore >= 50 ? 'var(--severity-3)' : 'var(--severity-0)' } : {}}>
                            {riskScore !== null ? `${riskScore}/100` : '—'}
                        </div>
                        <div className="stat-label">Risk Score</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green">📅</div>
                    <div>
                        <div className="stat-value">{scanResult ? (scanResult.grade >= 3 ? 'Urgent' : scanResult.grade >= 2 ? '3-6 mo' : '12 mo') : '—'}</div>
                        <div className="stat-label">Next Follow-Up</div>
                    </div>
                </div>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-header"><div>
                        <div className="card-title"><span className="card-icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}>⚡</span> Quick Actions</div>
                        <div className="card-subtitle">Get started with screening</div>
                    </div></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <button className="btn btn-primary btn-lg" onClick={() => setCurrentSection('scan')} style={{ width: '100%' }}>📷 Upload Scan</button>
                        <button className="btn btn-secondary btn-lg" onClick={() => setCurrentSection('patient')} style={{ width: '100%' }}>👤 Add Patient</button>
                        <button className="btn btn-secondary btn-lg" onClick={() => setCurrentSection('risk')} style={{ width: '100%' }}>📊 View Risk</button>
                        <button
                            className={scanResult ? "btn btn-primary btn-lg" : "btn btn-secondary btn-lg"}
                            onClick={() => setCurrentSection('assistant')}
                            style={{
                                width: '100%',
                                ...(scanResult && {
                                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                                    border: 'none'
                                })
                            }}>
                            🤖 Ask AI {scanResult && '✨'}
                        </button>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header"><div>
                        <div className="card-title"><span className="card-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>📋</span> Recent Activity</div>
                        <div className="card-subtitle">Latest screening events</div>
                    </div></div>
                    {history.length === 0 ? (
                        <div className="empty-state"><div className="empty-icon">📭</div><div className="empty-title">No activity yet</div><div className="empty-desc">Upload a retinal scan to start screening.</div></div>
                    ) : (
                        history.slice(0, 4).map(rec => (
                            <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--neutral-100)' }}>
                                <span className={`severity-badge grade-${rec.grade}`} style={{ fontSize: 12, padding: '4px 10px' }}>
                                    <span className={`severity-dot grade-${rec.grade}`}></span> G{rec.grade}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--neutral-700)' }}>{gradeNames[rec.grade]}</div>
                                    <div style={{ fontSize: 11, color: 'var(--neutral-400)' }}>{new Date(rec.date).toLocaleString()}</div>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-600)' }}>{rec.confidence}%</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header"><div>
                    <div className="card-title"><span className="card-icon" style={{ background: 'var(--severity-2-bg)', color: '#ca8a04' }}>📖</span> DR Severity Scale Reference</div>
                    <div className="card-subtitle">International Clinical Diabetic Retinopathy Disease Severity Scale</div>
                </div></div>
                <table className="data-table">
                    <thead><tr><th>Grade</th><th>Severity</th><th>Description</th><th>Follow-Up</th></tr></thead>
                    <tbody>
                        {[
                            [0, 'No DR', 'No abnormalities detected', 'Annual screening'],
                            [1, 'Mild NPDR', 'Microaneurysms only', '9–12 months'],
                            [2, 'Moderate NPDR', 'More than microaneurysms, less than severe', '3–6 months'],
                            [3, 'Severe NPDR', 'Significant hemorrhages, venous beading, IRMA', '2–4 weeks (urgent)'],
                            [4, 'Proliferative DR', 'Neovascularization, vitreous/preretinal hemorrhage', 'Immediate referral'],
                        ].map(([g, name, desc, fu]) => (
                            <tr key={g}>
                                <td><span className={`severity-badge grade-${g}`}><span className={`severity-dot grade-${g}`}></span> {g}</span></td>
                                <td><strong>{name}</strong></td>
                                <td>{desc}</td>
                                <td>{fu}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
