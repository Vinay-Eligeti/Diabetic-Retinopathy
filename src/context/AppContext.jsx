import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AppContext = createContext(null);

const STORAGE_KEYS = {
    PATIENT: 'dr_detect_patient',
    HISTORY: 'dr_detect_history',
    API_KEY: 'dr_detect_api_key',
};

const GRADES = [
    { name: 'No DR', grade: 0, desc: 'No visible abnormalities detected in the retinal fundus image.', findings: [{ type: 'ok', text: 'No microaneurysms detected' }, { type: 'ok', text: 'No hemorrhages observed' }, { type: 'ok', text: 'Retinal vasculature appears normal' }, { type: 'info', text: 'Optic disc margins are well-defined' }] },
    { name: 'Mild NPDR', grade: 1, desc: 'Mild Non-Proliferative Diabetic Retinopathy — early microvascular changes.', findings: [{ type: 'warning', text: 'Scattered microaneurysms detected' }, { type: 'info', text: 'Minimal retinal changes observed' }, { type: 'ok', text: 'No significant hemorrhages' }, { type: 'info', text: 'Macular region appears intact' }] },
    { name: 'Moderate NPDR', grade: 2, desc: 'Moderate NPDR — progressive microvascular damage.', findings: [{ type: 'warning', text: 'Multiple microaneurysms present' }, { type: 'warning', text: 'Dot and blot hemorrhages detected' }, { type: 'warning', text: 'Hard exudates near macula' }, { type: 'info', text: 'Cotton wool spots may be present' }] },
    { name: 'Severe NPDR', grade: 3, desc: 'Severe NPDR — high risk of progression to PDR.', findings: [{ type: 'danger', text: 'Extensive hemorrhages in all 4 quadrants' }, { type: 'danger', text: 'Venous beading in 2+ quadrants' }, { type: 'warning', text: 'Intraretinal microvascular abnormalities (IRMA)' }, { type: 'danger', text: 'Significant macular edema risk' }] },
    { name: 'Proliferative DR', grade: 4, desc: 'Proliferative DR — critical stage requiring immediate attention.', findings: [{ type: 'danger', text: 'Neovascularization detected (new abnormal blood vessels)' }, { type: 'danger', text: 'Vitreous or preretinal hemorrhage present' }, { type: 'danger', text: 'Retinal detachment risk is elevated' }, { type: 'danger', text: 'Immediate ophthalmologic referral recommended' }] },
];

function loadJSON(key, fallback = null) {
    try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; } catch { return fallback; }
}

function calculateRiskScore(grade, patient) {
    let score = [0, 10, 20, 32, 40][grade] || 0;
    if (patient) {
        const age = patient.age || 50;
        score += age >= 65 ? 15 : age >= 55 ? 12 : age >= 45 ? 8 : age >= 35 ? 4 : 2;
        const hba1c = patient.hba1c;
        if (hba1c) { score += hba1c >= 10 ? 25 : hba1c >= 9 ? 20 : hba1c >= 8 ? 15 : hba1c >= 7 ? 8 : 3; } else { score += 10; }
        const dur = patient.duration || 5;
        score += dur >= 20 ? 15 : dur >= 15 ? 12 : dur >= 10 ? 9 : dur >= 5 ? 5 : 2;
        if (patient.smoking === 'current') score += 5;
        else if (patient.smoking === 'former') score += 2;
    } else { score += 27; }
    return Math.min(100, Math.max(0, score));
}

export function AppProvider({ children }) {
    const [currentSection, setCurrentSection] = useState('dashboard');
    const [patient, setPatientState] = useState(() => loadJSON(STORAGE_KEYS.PATIENT));
    const [patients, setPatientsState] = useState(() => loadJSON('dr_detect_patients', []));
    const [history, setHistoryState] = useState(() => loadJSON(STORAGE_KEYS.HISTORY, []));
    const [scanResult, setScanResultState] = useState(null);
    const [riskScore, setRiskScore] = useState(null);
    const [toasts, setToasts] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [apiModalOpen, setApiModalOpen] = useState(false);

    const showToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200);
    }, []);

    const savePatient = useCallback((data) => {
        const id = data.id || `P${Date.now()}`;
        const d = { ...data, id, savedAt: new Date().toISOString() };

        // Update current patient
        localStorage.setItem(STORAGE_KEYS.PATIENT, JSON.stringify(d));
        setPatientState(d);

        // Update registry
        setPatientsState(prev => {
            const existing = prev.findIndex(p => p.id === id);
            const newList = existing >= 0
                ? prev.map((p, i) => i === existing ? d : p)
                : [...prev, d];
            localStorage.setItem('dr_detect_patients', JSON.stringify(newList));
            return newList;
        });

        showToast('Patient profile saved to registry!', 'success');
    }, [showToast]);

    const loadPatient = useCallback((data) => {
        localStorage.setItem(STORAGE_KEYS.PATIENT, JSON.stringify(data));
        setPatientState(data);
        setScanResultState(null); // Clear previous scan result
        showToast(`Loaded patient: ${data.name}`, 'info');
    }, [showToast]);

    const deletePatient = useCallback((id) => {
        setPatientsState(prev => {
            const newList = prev.filter(p => p.id !== id);
            localStorage.setItem('dr_detect_patients', JSON.stringify(newList));
            return newList;
        });
        if (patient && patient.id === id) {
            setPatientState(null);
            localStorage.removeItem(STORAGE_KEYS.PATIENT);
        }
        showToast('Patient deleted.', 'info');
    }, [patient, showToast]);

    const clearPatient = useCallback(() => {
        localStorage.removeItem(STORAGE_KEYS.PATIENT);
        setPatientState(null);
        showToast('Current patient cleared.', 'info');
    }, [showToast]);

    const addScreeningRecord = useCallback((record) => {
        setHistoryState(prev => {
            const pid = patient ? patient.id : 'anon';
            const updated = [{ ...record, patientId: pid, date: new Date().toISOString(), id: Date.now() }, ...prev].slice(0, 50);
            localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
            return updated;
        });
    }, [patient]);

    const setScanResult = useCallback((result) => {
        setScanResultState(result);
        if (result) {
            addScreeningRecord({ grade: result.grade, confidence: result.confidence, name: result.name });
            showToast(`Analysis complete — ${result.name} detected`, result.grade >= 3 ? 'warning' : 'success');
        }
    }, [addScreeningRecord, showToast]);

    // Legacy random analyzer (fallback if backend is down)
    const analyzeScan = useCallback(async () => {
        const rand = Math.random();
        const grade = rand < 0.2 ? 0 : rand < 0.4 ? 1 : rand < 0.65 ? 2 : rand < 0.85 ? 3 : 4;
        const confidence = Math.floor(78 + Math.random() * 20);
        const info = GRADES[grade];
        const result = { grade, confidence, name: info.name, description: info.desc, findings: info.findings, timestamp: new Date().toISOString() };
        setScanResult(result);
        return result;
    }, [setScanResult]);

    // Recalc risk when scan or patient changes
    useEffect(() => {
        if (scanResult) {
            setRiskScore(calculateRiskScore(scanResult.grade, patient));
        }
    }, [scanResult, patient]);

    const getAPIKey = useCallback(() => localStorage.getItem(STORAGE_KEYS.API_KEY) || '', []);
    const setAPIKey = useCallback((key) => {
        if (key) localStorage.setItem(STORAGE_KEYS.API_KEY, key);
        else localStorage.removeItem(STORAGE_KEYS.API_KEY);
    }, []);

    const value = {
        currentSection, setCurrentSection,
        patient, patients, savePatient, loadPatient, deletePatient, clearPatient,
        history, addScreeningRecord,
        scanResult, setScanResult, analyzeScan,
        riskScore,
        toasts, showToast,
        sidebarOpen, setSidebarOpen,
        apiModalOpen, setApiModalOpen,
        getAPIKey, setAPIKey,
        GRADES,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}

export { calculateRiskScore };
