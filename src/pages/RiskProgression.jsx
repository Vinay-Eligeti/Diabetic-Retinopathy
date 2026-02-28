import { useEffect, useRef, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useApp } from '../context/AppContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function RiskProgression() {
    const { scanResult, riskScore, patient } = useApp();

    const { chartData, chartOptions } = useMemo(() => {
        const months = [0, 6, 12, 18, 24, 36, 48, 60];
        const labels = months.map(m => m === 0 ? 'Now' : `${m}mo`);
        const baseRisk = (riskScore || 0) / 100;
        const prog = months.map(m => Math.min(95, Math.round(baseRisk * (1 - Math.exp(-2.5 * (m / 60))) * 1000) / 10));
        const treat = prog.map(p => Math.max(0, Math.round(p * 0.6 * 10) / 10));

        return {
            chartData: {
                labels,
                datasets: [
                    { label: 'Without Intervention', data: prog, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 2.5, fill: true, tension: 0.4, pointBackgroundColor: '#ef4444', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5 },
                    { label: 'With Treatment', data: treat, borderColor: '#00cbae', backgroundColor: 'rgba(0,203,174,0.08)', borderWidth: 2.5, fill: true, tension: 0.4, pointBackgroundColor: '#00cbae', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5 },
                ]
            },
            chartOptions: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, padding: 20, font: { family: 'Inter', size: 13, weight: '600' } } },
                    tooltip: { backgroundColor: 'rgba(13,17,23,0.9)', padding: 12, cornerRadius: 8, titleFont: { family: 'Inter' }, bodyFont: { family: 'Inter' }, callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}%` } }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 12 }, color: '#9ba5b0' } },
                    y: { min: 0, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Inter', size: 12 }, color: '#9ba5b0', callback: v => v + '%' }, title: { display: true, text: 'Progression Probability', font: { family: 'Inter', size: 12, weight: '600' }, color: '#6b7785' } }
                }
            }
        };
    }, [riskScore]);

    const ringOffset = riskScore !== null ? 377 - (riskScore / 100) * 377 : 377;
    const ringColor = riskScore >= 75 ? 'var(--severity-4)' : riskScore >= 50 ? 'var(--severity-3)' : riskScore >= 25 ? 'var(--severity-2)' : 'var(--severity-0)';
    const riskLabel = riskScore >= 75 ? '🔴 Very High Risk' : riskScore >= 50 ? '🟠 High Risk' : riskScore >= 25 ? '🟡 Moderate Risk' : '🟢 Low Risk';

    const gradeNames = ['None', 'Mild', 'Moderate', 'Severe', 'Critical'];
    const rfClass = (val, threshHigh, threshMed) => val >= threshHigh ? 'high' : val >= threshMed ? 'medium' : 'low';

    const alertType = riskScore >= 75 ? 'danger' : riskScore >= 50 ? 'warning' : 'success';
    const alertIcon = riskScore >= 75 ? '🚨' : riskScore >= 50 ? '⚠️' : '✅';



    return (
        <div className="section-page">
            {riskScore !== null && (
                <div className={`alert-banner ${alertType}`}>
                    <span className="alert-icon">{alertIcon}</span>
                    <div><strong>{riskScore >= 75 ? 'Very High Risk Alert' : riskScore >= 50 ? 'Elevated Risk Detected' : `Risk Level: ${riskScore >= 25 ? 'Moderate' : 'Low'}`}</strong> — Your risk score is {riskScore}/100. {riskScore >= 50 ? 'Please follow recommended follow-up schedule.' : 'Continue regular monitoring.'}</div>
                </div>
            )}

            <div className="grid-2-1">
                <div className="card">
                    <div className="card-header"><div>
                        <div className="card-title"><span className="card-icon" style={{ background: 'var(--severity-4-bg)', color: 'var(--severity-4)' }}>📈</span> Risk Progression Forecast</div>
                        <div className="card-subtitle">Predicted DR progression probability over time</div>
                    </div></div>
                    <div className="chart-container">
                        <Line data={chartData} options={chartOptions} />
                    </div>
                </div>



                <div>
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-header"><div>
                            <div className="card-title"><span className="card-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>🎯</span> Overall Risk Score</div>
                        </div></div>
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="140" height="140">
                                    <circle cx="70" cy="70" r="60" stroke="var(--neutral-200)" strokeWidth="10" fill="none" />
                                    <circle cx="70" cy="70" r="60"
                                        stroke={riskScore !== null ? ringColor : 'var(--neutral-200)'}
                                        strokeWidth="10" fill="none"
                                        strokeDasharray="377" strokeDashoffset={ringOffset}
                                        strokeLinecap="round"
                                        transform="rotate(-90 70 70)"
                                        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1), stroke 0.5s' }}
                                    />
                                </svg>
                                <span style={{ position: 'absolute', fontSize: 22, fontWeight: 800, color: 'var(--neutral-800)' }}>{riskScore !== null ? riskScore : '—'}</span>
                            </div>
                            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--neutral-400)' }}>{riskScore !== null ? riskLabel : 'Complete a scan to calculate'}</div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header"><div>
                            <div className="card-title"><span className="card-icon" style={{ background: 'var(--severity-2-bg)', color: '#ca8a04' }}>⚖️</span> Risk Factors</div>
                        </div></div>
                        <div>
                            <div className="risk-factor-item">
                                <span className="risk-factor-label"><span className="risk-factor-dot" style={{ background: 'var(--primary-500)' }}></span> DR Severity</span>
                                <span className={`risk-factor-value ${scanResult ? rfClass(scanResult.grade, 3, 2) : 'low'}`}>{scanResult ? gradeNames[scanResult.grade] : '—'}</span>
                            </div>
                            <div className="risk-factor-item">
                                <span className="risk-factor-label"><span className="risk-factor-dot" style={{ background: 'var(--severity-3)' }}></span> Age Factor</span>
                                <span className={`risk-factor-value ${patient ? rfClass(patient.age, 55, 40) : 'low'}`}>{patient?.age ? `${patient.age} yrs` : '—'}</span>
                            </div>
                            <div className="risk-factor-item">
                                <span className="risk-factor-label"><span className="risk-factor-dot" style={{ background: 'var(--severity-4)' }}></span> HbA1c Level</span>
                                <span className={`risk-factor-value ${patient?.hba1c ? rfClass(patient.hba1c, 8, 7) : 'low'}`}>{patient?.hba1c ? `${patient.hba1c}%` : '—'}</span>
                            </div>
                            <div className="risk-factor-item">
                                <span className="risk-factor-label"><span className="risk-factor-dot" style={{ background: 'var(--severity-2)' }}></span> Diabetes Duration</span>
                                <span className={`risk-factor-value ${patient?.duration ? rfClass(patient.duration, 15, 8) : 'low'}`}>{patient?.duration ? `${patient.duration} yrs` : '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
