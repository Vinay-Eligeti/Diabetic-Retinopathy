import { useState, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export default function ScanAnalysis() {
    const { setScanResult, scanResult, setCurrentSection, analyzeScan, showToast, patient, riskScore } = useApp();
    const [imageUrl, setImageUrl] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [backendStatus, setBackendStatus] = useState(null); // null = unknown, true = online, false = offline
    const fileInputRef = useRef(null);

    const handleFile = useCallback((file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) return;
        if (file.size > 10 * 1024 * 1024) return;
        setImageFile(file); // Keep the raw file for upload
        const reader = new FileReader();
        reader.onload = (e) => setImageUrl(e.target.result);
        reader.readAsDataURL(file);
    }, []);

    const handleDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };

    const doAnalyze = async () => {
        if (!imageFile && !imageUrl) return;
        setAnalyzing(true);

        try {
            // Try the real backend first
            const formData = new FormData();
            formData.append('file', imageFile);

            const res = await fetch(`${BACKEND_URL}/predict`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error(`Backend error: ${res.status}`);

            const data = await res.json();

            // Map backend response to app format
            const findingTypeMap = {
                normal: 'ok',
                mild: 'warning',
                moderate: 'warning',
                severe: 'danger',
                critical: 'danger',
            };

            const result = {
                grade: data.grade,
                confidence: data.confidence,
                name: data.name,
                description: getGradeDescription(data.grade),
                findings: data.findings.map(f => ({
                    type: findingTypeMap[f.severity] || 'info',
                    text: f.text,
                })),
                timestamp: new Date().toISOString(),
            };

            setScanResult(result);
            setBackendStatus(true);

        } catch (err) {
            console.error('Backend prediction failed, using fallback:', err);
            setBackendStatus(false);
            showToast('Backend not available — using simulated analysis', 'warning');
            // Fall back to random analysis
            await new Promise(r => setTimeout(r, 1500));
            await analyzeScan();
        }

        setAnalyzing(false);
    };

    const removeImage = () => {
        setImageUrl(null);
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const generatePDF = () => {
        if (!scanResult) return;
        if (!patient || !patient.name) {
            showToast('Please save patient details in Profile first!', 'warning');
            setCurrentSection('patient');
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // --- Header ---
        doc.setFillColor(63, 81, 181); // Primary color
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("Diabetic Retinopathy Screening Report", 14, 16);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 16, { align: 'right' });

        let yPos = 35;

        // --- Patient Details ---
        doc.setFillColor(245, 245, 245);
        doc.rect(14, yPos, pageWidth - 28, 45, 'F');

        doc.setTextColor(63, 81, 181);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Patient Profile", 18, yPos + 8);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);

        const p = patient;
        const col1 = 18;
        const col2 = 80;
        const col3 = 140;
        const row1 = yPos + 16;
        const row2 = yPos + 24;
        const row3 = yPos + 32;

        doc.setFont('helvetica', 'bold'); doc.text("Name:", col1, row1);
        doc.setFont('helvetica', 'normal'); doc.text(p.name, col1 + 15, row1);

        doc.setFont('helvetica', 'bold'); doc.text("Age/Sex:", col2, row1);
        doc.setFont('helvetica', 'normal'); doc.text(`${p.age} / ${p.gender || '-'}`, col2 + 18, row1);

        doc.setFont('helvetica', 'bold'); doc.text("Patient ID:", col3, row1);
        doc.setFont('helvetica', 'normal'); doc.text(`P-${Math.floor(Math.random() * 10000)}`, col3 + 22, row1);

        doc.setFont('helvetica', 'bold'); doc.text("Diabetes:", col1, row2);
        doc.setFont('helvetica', 'normal'); doc.text(`${p.diabetesType} (${p.duration} yrs)`, col1 + 20, row2);

        doc.setFont('helvetica', 'bold'); doc.text("HbA1c:", col2, row2);
        doc.setFont('helvetica', 'normal'); doc.text(p.hba1c ? `${p.hba1c}%` : 'N/A', col2 + 15, row2);

        doc.setFont('helvetica', 'bold'); doc.text("BP:", col3, row2);
        doc.setFont('helvetica', 'normal'); doc.text(p.bp || 'N/A', col3 + 10, row2);

        // Medical Notes
        if (p.notes) {
            doc.setFont('helvetica', 'bold'); doc.text("Notes:", col1, row3 + 2);
            doc.setFont('helvetica', 'normal'); doc.text(p.notes.substring(0, 80) + (p.notes.length > 80 ? '...' : ''), col1 + 15, row3 + 2);
        }

        yPos += 55;

        // --- Retinal Scan Image ---
        doc.setTextColor(63, 81, 181);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Retinal Scan Analysis", 14, yPos);
        yPos += 8;

        if (imageUrl) {
            const imgProps = doc.getImageProperties(imageUrl);
            const imgWidth = 80;
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

            if (yPos + imgHeight > 270) { doc.addPage(); yPos = 20; }

            doc.addImage(imageUrl, 'JPEG', 14, yPos, imgWidth, imgHeight);

            // Results Box
            const boxX = 100;
            const boxY = yPos;

            doc.setFontSize(11);
            doc.setTextColor(100);
            doc.setFont('helvetica', 'bold');
            doc.text("AI PREDICTION", boxX, boxY + 5);

            doc.setFontSize(16);
            // Color mapping
            const g = scanResult.grade;
            if (g >= 3) doc.setTextColor(220, 53, 69); // Red
            else if (g >= 2) doc.setTextColor(255, 193, 7); // Orange
            else doc.setTextColor(40, 167, 69); // Green

            doc.text(`Grade ${g}: ${scanResult.name}`, boxX, boxY + 14);

            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(`Confidence Score: ${scanResult.confidence}%`, boxX, boxY + 22);

            // Risk Score from context
            if (riskScore !== null && riskScore !== undefined) {
                const rLevel = riskScore < 30 ? 'Low' : riskScore < 60 ? 'Moderate' : 'High';
                doc.text(`Overall Risk Level: ${rLevel} (${riskScore}/100)`, boxX, boxY + 30);
            }

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const desc = doc.splitTextToSize(scanResult.description, 80);
            doc.text(desc, boxX, boxY + 38);

            yPos += Math.max(imgHeight, 50) + 15;
        } else {
            yPos += 15;
        }

        // --- Findings Table ---
        if (yPos > 240) { doc.addPage(); yPos = 20; }

        doc.setTextColor(63, 81, 181);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Detailed Findings", 14, yPos);
        yPos += 5;

        const findingsData = scanResult.findings.map(f => [f.text, f.type === 'ok' ? 'Normal' : f.type === 'info' ? 'Note' : 'Abnormal']);

        autoTable(doc, {
            startY: yPos,
            head: [['Observation', 'Status']],
            body: findingsData,
            theme: 'grid',
            headStyles: { fillColor: [63, 81, 181] },
            columnStyles: { 1: { width: 30, fontStyle: 'italic' } },
        });

        yPos = doc.lastAutoTable.finalY + 15;

        // --- Follow-Up Plan ---
        if (yPos > 240) { doc.addPage(); yPos = 20; }

        doc.setTextColor(63, 81, 181);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("Follow-Up Plan & Recommendations", 14, yPos);
        yPos += 8;

        doc.setTextColor(0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');

        const g = scanResult.grade;
        let urgency = "Routine";
        let freq = "12 months";
        let action = "Continue annual screening.";

        if (g === 1) { urgency = "Moderate"; freq = "9-12 months"; action = "Monitor for progression."; }
        else if (g === 2) { urgency = "High"; freq = "3-6 months"; action = "Refer to ophthalmologist for assessment."; }
        else if (g === 3) { urgency = "Urgent"; freq = "2-4 weeks"; action = "Urgent referral required. Tight glycemic control needed."; }
        else if (g === 4) { urgency = "Emergency"; freq = "Immediate"; action = "Emergency specialized care required to prevent vision loss."; }

        doc.text(`• Recommended Follow-Up: ${freq}`, 14, yPos); yPos += 6;
        doc.text(`• Urgency Level: ${urgency}`, 14, yPos); yPos += 6;
        doc.text(`• Action Required: ${action}`, 14, yPos); yPos += 10;

        doc.setFont('helvetica', 'normal');
        const lifestyle = "Management: Improve HbA1c control, manage blood pressure, and maintain lipid levels. Smoking cessation is highly recommended to reduce progression risk.";
        const splitLife = doc.splitTextToSize(lifestyle, pageWidth - 28);
        doc.text(splitLife, 14, yPos);

        // --- Footer ---
        const footerY = doc.internal.pageSize.height - 15;
        doc.setLineWidth(0.5);
        doc.setDrawColor(200);
        doc.line(14, footerY, pageWidth - 14, footerY);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text("This report is an AI-assisted screening tool and does not replace a clinical diagnosis. Please consult a specialist.", 14, footerY + 5);

        doc.save(`DR_Report_${p.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('Comprehensive Report downloaded', 'success');
    };

    const findingIcon = (type) => type === 'ok' ? '✓' : type === 'warning' ? '!' : type === 'danger' ? '✕' : 'i';
    const sevColors = ['var(--severity-0)', 'var(--severity-1)', 'var(--severity-2)', 'var(--severity-3)', 'var(--severity-4)'];

    return (
        <div className="section-page">
            <div className="grid-2-1">
                <div>
                    <div className="card">
                        <div className="card-header"><div>
                            <div className="card-title"><span className="card-icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}>📷</span> Retinal Fundus Image</div>
                            <div className="card-subtitle">Upload a high-quality retinal fundus photograph</div>
                        </div></div>

                        {!imageUrl && !analyzing && (
                            <div className={`upload-zone${dragOver ? ' dragover' : ''}`}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                            >
                                <div className="upload-icon">👁</div>
                                <div className="upload-title">Drop retinal image here</div>
                                <div className="upload-desc">or click to browse your files</div>
                                <button className="upload-btn" type="button">Choose Image</button>
                                <div className="upload-formats">Supports JPEG, PNG, TIFF up to 10MB</div>
                                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                                    onChange={(e) => handleFile(e.target.files?.[0])} />
                            </div>
                        )}

                        {imageUrl && !analyzing && (
                            <div className="image-preview-container">
                                <img src={imageUrl} alt="Retinal scan preview" />
                                <div className="image-preview-actions">
                                    <button className="preview-action-btn analyze" onClick={doAnalyze}>🔍 Analyze Scan</button>
                                    <button className="preview-action-btn remove" onClick={removeImage}>✕ Remove</button>
                                </div>
                            </div>
                        )}

                        {analyzing && (
                            <div className="analysis-processing">
                                <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 20px' }}>
                                    <div className="processing-ring"></div>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 24 }}>🧠</div>
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--neutral-700)', marginBottom: 6 }}>Analyzing retinal image...</div>
                                <div style={{ fontSize: 13, color: 'var(--neutral-400)' }}>AI model is classifying the fundus for DR severity</div>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <div className="card">
                        <div className="card-header"><div>
                            <div className="card-title"><span className="card-icon" style={{ background: 'var(--severity-3-bg)', color: 'var(--severity-3)' }}>📊</span> Analysis Results</div>
                            <div className="card-subtitle">AI-detected findings and severity</div>
                        </div></div>

                        {!scanResult ? (
                            <div className="empty-state">
                                <div className="empty-icon">🔬</div>
                                <div className="empty-title">No scan analyzed yet</div>
                                {(!patient || !patient.name) && (
                                    <div style={{ marginBottom: 12, padding: '8px', background: '#fff3e0', color: '#e65100', borderRadius: 4, fontSize: 13 }}>
                                        ⚠️ Please <strong>fill in Patient Profile</strong> first to get a complete report.
                                        <button className="btn btn-secondary btn-sm" style={{ display: 'block', width: '100%', marginTop: 6 }} onClick={() => setCurrentSection('patient')}>Go to Profile</button>
                                    </div>
                                )}
                                <div className="empty-desc">Upload a retinal fundus image and click "Analyze Scan" to get results.</div>
                            </div>
                        ) : (
                            <div style={{ animation: 'fadeSlideIn 0.5s ease-out' }}>
                                {backendStatus === true && (
                                    <div style={{ marginBottom: 12, padding: '6px 12px', background: '#e8f5e9', borderRadius: 8, fontSize: 12, color: '#2e7d32', fontWeight: 600 }}>
                                        🧠 Predicted by trained DR model (EfficientNet + Transformer)
                                    </div>
                                )}
                                {backendStatus === false && (
                                    <div style={{ marginBottom: 12, padding: '6px 12px', background: '#fff3e0', borderRadius: 8, fontSize: 12, color: '#e65100', fontWeight: 600 }}>
                                        ⚠️ Simulated result — backend model not running
                                    </div>
                                )}

                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ fontSize: 13, color: 'var(--neutral-400)', fontWeight: 600, marginBottom: 6 }}>DETECTED SEVERITY</div>
                                    <span className={`severity-badge grade-${scanResult.grade}`}>
                                        <span className={`severity-dot grade-${scanResult.grade}`}></span>
                                        Grade {scanResult.grade} — {scanResult.name}
                                    </span>
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 13, color: 'var(--neutral-400)', fontWeight: 600 }}>CONFIDENCE</span>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-600)' }}>{scanResult.confidence}%</span>
                                    </div>
                                    <div className="confidence-bar">
                                        <div className="confidence-fill" style={{ width: `${scanResult.confidence}%` }}></div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 13, color: 'var(--neutral-400)', fontWeight: 600, marginBottom: 8 }}>SEVERITY SCALE</div>
                                    <div className="severity-meter">
                                        {[0, 1, 2, 3, 4].map(i => (
                                            <div key={i} className="meter-seg" style={{ background: i <= scanResult.grade ? sevColors[i] : 'var(--neutral-200)' }}></div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--neutral-400)', marginTop: 4 }}>
                                        <span>No DR</span><span>Proliferative</span>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: 13, color: 'var(--neutral-400)', fontWeight: 600, marginBottom: 4 }}>KEY FINDINGS</div>
                                    <ul className="findings-list">
                                        {scanResult.findings.map((f, i) => (
                                            <li key={i}>
                                                <span className={`finding-icon ${f.type}`}>{findingIcon(f.type)}</span>
                                                <span>{f.text}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => setCurrentSection('assistant')}
                                        style={{ flex: 1, whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)' }}>
                                        🤖 Ask AI Assistant
                                    </button>
                                    <button className="btn btn-primary btn-sm" onClick={() => setCurrentSection('risk')} style={{ flex: 1, whiteSpace: 'nowrap' }}>📈 View Risk</button>
                                    <button className="btn btn-secondary btn-sm" onClick={() => setCurrentSection('followup')} style={{ flex: 1, whiteSpace: 'nowrap' }}>📅 Follow-Up Plan</button>
                                    <button className="btn btn-secondary btn-sm" onClick={generatePDF} style={{ flex: 1, whiteSpace: 'nowrap', background: '#fff', border: '1px solid #ddd', color: '#333' }}>📄 Download Report</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function getGradeDescription(grade) {
    const descriptions = [
        'No visible abnormalities detected in the retinal fundus image.',
        'Mild Non-Proliferative Diabetic Retinopathy — early microvascular changes.',
        'Moderate NPDR — progressive microvascular damage.',
        'Severe NPDR — high risk of progression to PDR.',
        'Proliferative DR — critical stage requiring immediate attention.',
    ];
    return descriptions[grade] || '';
}
