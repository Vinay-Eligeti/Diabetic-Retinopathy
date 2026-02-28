import { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function PatientsHistory() {
    const { patients, history, loadPatient, deletePatient, setCurrentSection } = useApp();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPatients = (patients || []).filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.id && p.id.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getLastScan = (pid) => {
        const patientScans = history.filter(h => h.patientId === pid);
        if (patientScans.length === 0) return null;
        return patientScans[0]; // Assuming history is sorted desc
    };

    const handleSelectPatient = (p) => {
        loadPatient(p); // Sets as current patient
        setCurrentSection('dashboard');
    };

    return (
        <div className="section-page">
            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">🗂️ Patient Registry & History</div>
                        <div className="card-subtitle">Manage patient records and view screening history</div>
                    </div>
                </div>

                <div style={{ padding: '0 24px 24px' }}>
                    <div className="search-bar" style={{ marginBottom: 20 }}>
                        <input
                            type="text"
                            placeholder="Search patients by name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ddd' }}
                        />
                    </div>

                    {filteredPatients.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">👥</div>
                            <div className="empty-title">No patients found</div>
                            <div className="empty-desc">Create a new patient profile to see them here.</div>
                            <button className="btn btn-primary" onClick={() => setCurrentSection('patient')}>+ Add New Patient</button>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Patient</th>
                                        <th>Diabetes</th>
                                        <th>HbA1c</th>
                                        <th>Latest Scan</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPatients.map(p => {
                                        const lastScan = getLastScan(p.id);
                                        return (
                                            <tr key={p.id}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div className="patient-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                                                            {p.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                                                            <div style={{ fontSize: 11, color: '#666' }}>{p.age}y • {p.gender}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge" style={{ background: '#f5f5f5', color: '#333' }}>
                                                        {p.diabetesType === 'type1' ? 'Type 1' : p.diabetesType === 'type2' ? 'Type 2' : 'GDM'}
                                                    </span>
                                                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{p.duration} years</div>
                                                </td>
                                                <td>
                                                    {p.hba1c ? (
                                                        <span style={{ fontWeight: 600, color: p.hba1c > 7 ? '#d32f2f' : '#388e3c' }}>
                                                            {p.hba1c}%
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td>
                                                    {lastScan ? (
                                                        <div>
                                                            <div className={`severity-badge grade-${lastScan.grade}`} style={{ display: 'inline-flex', padding: '2px 6px', fontSize: 10 }}>
                                                                Grade {lastScan.grade}
                                                            </div>
                                                            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                                                                {new Date(lastScan.date).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    ) : <span style={{ color: '#999', fontSize: 12 }}>No scans</span>}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => handleSelectPatient(p)}
                                                            title="Set as Active Patient"
                                                        >
                                                            Load
                                                        </button>
                                                        <button
                                                            className="btn btn-sm"
                                                            style={{ color: '#d32f2f', border: '1px solid #ffebee', background: '#fff' }}
                                                            onClick={(e) => { e.stopPropagation(); if (confirm('Delete this patient?')) deletePatient(p.id); }}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
