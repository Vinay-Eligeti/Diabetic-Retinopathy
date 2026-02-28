import { useMemo } from 'react';
import { useApp } from '../context/AppContext';

const PLANS = {
    0: {
        urgency: 'routine', freq: '12 months', items: [
            { off: 12, title: 'Annual Eye Exam', desc: 'Comprehensive dilated eye exam.', urg: 'routine', tests: ['Dilated fundus exam', 'Visual acuity test'] },
            { off: 24, title: 'Follow-Up Screening', desc: 'Continue annual screening.', urg: 'routine', tests: ['Retinal photography', 'Visual acuity'] },
            { off: 36, title: 'Comprehensive Review', desc: 'Full review of diabetes management and eye health.', urg: 'routine', tests: ['OCT scan', 'Dilated eye exam', 'HbA1c blood test'] },
        ]
    },
    1: {
        urgency: 'moderate', freq: '9-12 months', items: [
            { off: 3, title: 'Blood Sugar Review', desc: 'Review HbA1c and adjust management.', urg: 'routine', tests: ['HbA1c blood test', 'Blood pressure check'] },
            { off: 9, title: 'Eye Screening Follow-Up', desc: 'Repeat retinal screening to monitor progression.', urg: 'moderate', tests: ['Retinal photography', 'Dilated eye exam'] },
            { off: 18, title: 'Comprehensive Assessment', desc: 'Full ophthalmic assessment with OCT.', urg: 'moderate', tests: ['OCT macula scan', 'Dilated fundus exam', 'Visual acuity'] },
        ]
    },
    2: {
        urgency: 'high', freq: '3-6 months', items: [
            { off: 1, title: 'Ophthalmologist Consultation', desc: 'Schedule consultation to discuss treatment options.', urg: 'high', tests: ['Comprehensive eye exam', 'OCT scan'] },
            { off: 3, title: 'Follow-Up Imaging', desc: 'Repeat retinal imaging. Fluorescein angiography may be needed.', urg: 'high', tests: ['Retinal photography', 'OCT', 'Possible fluorescein angiography'] },
            { off: 6, title: 'Re-Assessment', desc: 'Full re-assessment. Treatment initiation if progression detected.', urg: 'high', tests: ['Dilated exam', 'OCT', 'Visual acuity', 'Blood tests'] },
            { off: 12, title: 'Annual Review', desc: 'Comprehensive review of findings and treatment response.', urg: 'moderate', tests: ['Full ophthalmic exam', 'HbA1c', 'Kidney function'] },
        ]
    },
    3: {
        urgency: 'critical', freq: '2-4 weeks', items: [
            { off: 0.5, title: '⚠️ URGENT: Ophthalmology Referral', desc: 'Immediate referral to retinal specialist. Severe NPDR has high risk of progressing.', urg: 'critical', tests: ['Urgent dilated exam', 'OCT', 'Fluorescein angiography'] },
            { off: 1, title: 'Treatment Decision', desc: 'Discuss laser photocoagulation or anti-VEGF injection therapy.', urg: 'critical', tests: ['Treatment planning', 'Pre-treatment assessment'] },
            { off: 2, title: 'Post-Treatment Follow-Up', desc: 'Assess treatment response and monitor progression.', urg: 'high', tests: ['OCT', 'Retinal photography', 'Visual acuity'] },
            { off: 4, title: 'Monitoring Visit', desc: 'Ongoing monitoring of retinal status.', urg: 'high', tests: ['OCT', 'Dilated exam'] },
            { off: 8, title: 'Comprehensive Review', desc: 'Full review of disease, treatment, and systemic management.', urg: 'high', tests: ['Full ophthalmic exam', 'HbA1c', 'Blood pressure', 'Kidney function'] },
        ]
    },
    4: {
        urgency: 'critical', freq: 'Immediate', items: [
            { off: 0, title: '🚨 IMMEDIATE: Emergency Referral', desc: 'Proliferative DR requires immediate intervention. Contact ophthalmologist TODAY.', urg: 'critical', tests: ['Emergency dilated exam', 'Fluorescein angiography', 'OCT'] },
            { off: 0.25, title: 'Treatment Initiation', desc: 'Begin anti-VEGF or panretinal photocoagulation laser treatment.', urg: 'critical', tests: ['Treatment procedure', 'Pre-op assessment'] },
            { off: 1, title: 'Post-Treatment Check', desc: 'Assess response. Additional sessions may be required.', urg: 'critical', tests: ['OCT', 'Retinal photography', 'Visual acuity'] },
            { off: 2, title: 'Continued Treatment', desc: 'Continue treatment series. Monitor for vitreous hemorrhage.', urg: 'critical', tests: ['OCT', 'Dilated exam', 'B-scan ultrasound if needed'] },
            { off: 4, title: 'Re-Assessment', desc: 'Full reassessment of proliferative activity.', urg: 'high', tests: ['Comprehensive exam', 'OCT', 'Angiography'] },
            { off: 8, title: 'Long-Term Follow-Up', desc: 'Continued monitoring every 2-3 months.', urg: 'high', tests: ['Full ophthalmic exam', 'All systemic tests'] },
        ]
    },
};

export default function FollowUp() {
    const { scanResult, patient } = useApp();
    const grade = scanResult?.grade;

    const schedule = useMemo(() => {
        if (grade === undefined || grade === null) return null;
        const plan = PLANS[grade];
        const now = new Date();
        return {
            ...plan, grade,
            items: plan.items.map(it => {
                const d = new Date(now);
                d.setDate(d.getDate() + Math.round(it.off * 30));
                return { ...it, dateFmt: it.off === 0 ? 'TODAY' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) };
            })
        };
    }, [grade]);

    const alerts = useMemo(() => {
        if (!schedule) return [];
        const a = [];
        if (grade >= 4) a.push({ t: 'danger', i: '🚨', m: 'CRITICAL: Immediate ophthalmology referral required' });
        else if (grade >= 3) a.push({ t: 'danger', i: '⚠️', m: 'URGENT: Schedule ophthalmology appointment within 2 weeks' });
        if (grade >= 2) a.push({ t: 'warning', i: '💊', m: 'Discuss treatment options with your specialist' });
        if (patient?.hba1c >= 8) a.push({ t: 'warning', i: '🩸', m: `HbA1c is ${patient.hba1c}% — improve glycemic control` });
        if (patient?.smoking === 'current') a.push({ t: 'warning', i: '🚭', m: 'Smoking cessation recommended' });
        a.push({ t: 'info', i: '💡', m: 'Regular exams, blood sugar, and BP management are key' });
        return a;
    }, [schedule, grade, patient]);

    const tests = useMemo(() => {
        if (!schedule) return [];
        const s = new Set();
        schedule.items.slice(0, 2).forEach(it => it.tests.forEach(t => s.add(t)));
        return Array.from(s);
    }, [schedule]);

    return (
        <div className="section-page">
            {schedule && (
                <div className={`alert-banner ${grade >= 3 ? 'danger' : grade >= 2 ? 'warning' : 'info'}`}>
                    <span className="alert-icon">{grade >= 3 ? '🚨' : grade >= 2 ? '📅' : 'ℹ️'}</span>
                    <div><strong>{grade >= 3 ? 'Urgent Follow-Up Required' : grade >= 2 ? 'Follow-Up Recommended' : 'Regular Monitoring'}</strong> — {grade >= 3 ? 'Immediate medical attention recommended.' : grade >= 2 ? `Next appointment within ${schedule.freq}.` : 'Continue annual screenings.'}</div>
                </div>
            )}

            <div className="grid-2-1">
                <div className="card">
                    <div className="card-header"><div>
                        <div className="card-title"><span className="card-icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}>📅</span> Personalized Follow-Up Schedule</div>
                        <div className="card-subtitle">AI-recommended timeline based on your risk profile</div>
                    </div></div>

                    {!schedule ? (
                        <div className="empty-state"><div className="empty-icon">📅</div><div className="empty-title">No follow-up plan</div><div className="empty-desc">Complete a scan and add patient details first.</div></div>
                    ) : (
                        <>
                            <div style={{ marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <div style={{ background: 'var(--neutral-50)', padding: '10px 16px', borderRadius: 'var(--border-radius-md)' }}>
                                    <span style={{ fontSize: 11, color: 'var(--neutral-400)', fontWeight: 600 }}>FREQUENCY</span>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--neutral-700)', marginTop: 2 }}>{schedule.freq}</div>
                                </div>
                                <div style={{ background: 'var(--neutral-50)', padding: '10px 16px', borderRadius: 'var(--border-radius-md)' }}>
                                    <span style={{ fontSize: 11, color: 'var(--neutral-400)', fontWeight: 600 }}>URGENCY</span>
                                    <div style={{ marginTop: 4 }}><span className={`urgency-tag ${schedule.urgency}`}>{schedule.urgency.toUpperCase()}</span></div>
                                </div>
                            </div>
                            <div className="timeline">
                                {schedule.items.map((it, i) => (
                                    <div className="timeline-item" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
                                        <div className={`timeline-dot ${it.urg === 'critical' ? 'urgent' : it.urg === 'high' ? 'warning' : 'normal'}`}></div>
                                        <div className="timeline-content">
                                            <div className="timeline-date">{it.dateFmt}</div>
                                            <div className="timeline-title">{it.title}</div>
                                            <div className="timeline-desc">{it.desc}</div>
                                            <span className={`urgency-tag ${it.urg}`}>{it.urg}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div>
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header"><div>
                            <div className="card-title"><span className="card-icon" style={{ background: 'var(--severity-4-bg)', color: 'var(--severity-4)' }}>🔔</span> Alerts</div>
                        </div></div>
                        {alerts.length === 0 ? (
                            <div className="empty-state" style={{ padding: 24 }}><div className="empty-icon" style={{ fontSize: 32 }}>🔕</div><div className="empty-title" style={{ fontSize: 15 }}>No alerts</div></div>
                        ) : (
                            alerts.map((a, i) => (
                                <div key={i} className={`alert-banner ${a.t}`} style={{ marginBottom: 8, padding: '12px 16px' }}>
                                    <span className="alert-icon">{a.i}</span>
                                    <span style={{ fontSize: 13 }}>{a.m}</span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="card">
                        <div className="card-header"><div>
                            <div className="card-title"><span className="card-icon" style={{ background: 'var(--severity-0-bg)', color: 'var(--severity-0)' }}>✅</span> Recommended Tests</div>
                        </div></div>
                        {tests.length === 0 ? (
                            <div className="empty-state" style={{ padding: 24 }}><div className="empty-icon" style={{ fontSize: 32 }}>🧪</div><div className="empty-title" style={{ fontSize: 15 }}>No recommendations</div></div>
                        ) : (
                            tests.map((t, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--neutral-100)', fontSize: 13 }}>
                                    <span style={{ color: 'var(--primary-500)' }}>✓</span>
                                    <span style={{ color: 'var(--neutral-600)' }}>{t}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
