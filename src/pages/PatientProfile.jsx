import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function PatientProfile() {
    const { patient, savePatient, clearPatient, history, scanResult, riskScore } = useApp();

    const [form, setForm] = useState({
        name: '', age: '', gender: '', diabetesType: 'type2', duration: '',
        hba1c: '', bp: '', smoking: 'never', notes: ''
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (patient) {
            setForm({
                name: patient.name || '', age: patient.age || '', gender: patient.gender || '',
                diabetesType: patient.diabetesType || 'type2', duration: patient.duration || '',
                hba1c: patient.hba1c || '', bp: patient.bp || '', smoking: patient.smoking || 'never',
                notes: patient.notes || ''
            });
        }
    }, [patient]);

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        // Clear error when user types
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    };

    const validate = () => {
        const newErrors = {};
        if (!form.name || form.name.length < 2) newErrors.name = 'Valid full name is required';
        if (!form.age || form.age < 1 || form.age > 120) newErrors.age = 'Enter valid age (1-120)';
        if (!form.gender) newErrors.gender = 'Select gender';
        if (!form.diabetesType) newErrors.diabetesType = 'Select type';
        if (form.duration === '' || form.duration < 0) newErrors.duration = 'Enter valid duration';
        if (Number(form.duration) > Number(form.age)) newErrors.duration = 'Duration cannot exceed age';
        if (form.hba1c && (form.hba1c < 3 || form.hba1c > 20)) newErrors.hba1c = 'Enter valid HbA1c (3-20)';
        if (form.bp && !/^\d{2,3}\/\d{2,3}$/.test(form.bp)) newErrors.bp = 'Format: 120/80';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validate()) return;

        savePatient({
            ...form,
            age: Number(form.age),
            duration: Number(form.duration),
            hba1c: form.hba1c ? Number(form.hba1c) : null,
        });
    };

    const handleClear = () => {
        clearPatient();
        setForm({ name: '', age: '', gender: '', diabetesType: 'type2', duration: '', hba1c: '', bp: '', smoking: 'never', notes: '' });
        setErrors({});
    };

    const initials = patient?.name
        ? patient.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    const gradeNames = ['No DR', 'Mild NPDR', 'Moderate NPDR', 'Severe NPDR', 'Proliferative DR'];
    const hba1cStatus = (v) => !v ? '—' : v < 7 ? '🟢 Well Controlled' : v < 8 ? '🟡 Needs Improvement' : '🔴 Poor Control';

    return (
        <div className="section-page">
            <div className="grid-2">
                <div className="card">
                    <div className="card-header"><div>
                        <div className="card-title"><span className="card-icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}>👤</span> Patient Information</div>
                        <div className="card-subtitle">Enter or update patient metadata</div>
                    </div></div>

                    <form onSubmit={handleSubmit} noValidate>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Full Name *</label>
                                <input className={`form-input${errors.name ? ' error' : ''}`} value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="e.g. John Doe" />
                                {errors.name && <div className="input-error">{errors.name}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Age *</label>
                                <input className={`form-input${errors.age ? ' error' : ''}`} type="number" value={form.age} onChange={e => handleChange('age', e.target.value)} placeholder="e.g. 55" />
                                {errors.age && <div className="input-error">{errors.age}</div>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Gender *</label>
                                <select className={`form-select${errors.gender ? ' error' : ''}`} value={form.gender} onChange={e => handleChange('gender', e.target.value)}>
                                    <option value="">Select...</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                                {errors.gender && <div className="input-error">{errors.gender}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Diabetes Type *</label>
                                <select className="form-select" value={form.diabetesType} onChange={e => handleChange('diabetesType', e.target.value)}>
                                    <option value="type1">Type 1</option>
                                    <option value="type2">Type 2</option>
                                    <option value="gestational">Gestational</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Diabetes Duration (years) *</label>
                                <input className={`form-input${errors.duration ? ' error' : ''}`} type="number" value={form.duration} onChange={e => handleChange('duration', e.target.value)} placeholder="e.g. 10" />
                                {errors.duration && <div className="input-error">{errors.duration}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">HbA1c (%)</label>
                                <input className={`form-input${errors.hba1c ? ' error' : ''}`} type="number" step="0.1" value={form.hba1c} onChange={e => handleChange('hba1c', e.target.value)} placeholder="e.g. 7.5" />
                                {errors.hba1c && <div className="input-error">{errors.hba1c}</div>}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Blood Pressure</label>
                                <input className={`form-input${errors.bp ? ' error' : ''}`} value={form.bp} onChange={e => handleChange('bp', e.target.value)} placeholder="e.g. 130/85" />
                                {errors.bp && <div className="input-error">{errors.bp}</div>}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Smoking Status</label>
                                <select className="form-select" value={form.smoking} onChange={e => handleChange('smoking', e.target.value)}>
                                    <option value="never">Never</option>
                                    <option value="former">Former</option>
                                    <option value="current">Current</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Medical History / Notes</label>
                            <textarea className="form-textarea" value={form.notes} onChange={e => handleChange('notes', e.target.value)} placeholder="Additional notes..." rows={3} />
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                            <button className="btn btn-primary" type="submit">💾 Save Patient</button>
                            <button className="btn btn-secondary" type="button" onClick={handleClear}>🗑 Clear</button>
                        </div>
                    </form>
                </div>

                <div>


                    <div className="card">
                        <div className="card-header"><div>
                            <div className="card-title"><span className="card-icon" style={{ background: 'var(--severity-0-bg)', color: 'var(--severity-0)' }}>📜</span> Screening History</div>
                        </div></div>
                        {history.length === 0 ? (
                            <div className="empty-state" style={{ padding: 24 }}><div className="empty-icon" style={{ fontSize: 32 }}>📭</div><div className="empty-title" style={{ fontSize: 15 }}>No screenings yet</div></div>
                        ) : (
                            history.slice(0, 6).map(rec => (
                                <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--neutral-100)' }}>
                                    <span className={`severity-badge grade-${rec.grade}`} style={{ fontSize: 11, padding: '3px 8px' }}>G{rec.grade}</span>
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
            </div>
        </div>
    );
}
