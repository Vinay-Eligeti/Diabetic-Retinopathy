import { useApp } from '../context/AppContext';
import './Sidebar.css';

const NAV_ITEMS = [
    { section: 'dashboard', label: 'Dashboard', icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg> },
    { section: 'scan', label: 'Scan Analysis', icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><line x1="12" y1="3" x2="12" y2="1" /><line x1="12" y1="23" x2="12" y2="21" /></svg> },
    { section: 'risk', label: 'Risk Progression', icon: <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg> },
    { section: 'followup', label: 'Follow-Up Plan', icon: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>, badgeKey: 'followup' },
];

const NAV_ITEMS2 = [
    { section: 'assistant', label: 'AI Assistant', icon: <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
    { section: 'history', label: 'Patient Registry', icon: <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg> },
    { section: 'patient', label: 'Patient Profile', icon: <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
];

export default function Sidebar() {
    const { currentSection, setCurrentSection, patient, scanResult, setSidebarOpen, sidebarOpen } = useApp();

    const initials = patient?.name
        ? patient.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : 'P';

    const alertCount = scanResult && scanResult.grade >= 2 ? (scanResult.grade >= 3 ? 3 : 2) : 0;

    const navigate = (section) => {
        setCurrentSection(section);
        setSidebarOpen(false);
    };

    return (
        <>
            <div className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`} onClick={() => setSidebarOpen(false)} />
            <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo" onClick={() => navigate('dashboard')}>
                        <div className="logo-icon">👁</div>
                        <div className="logo-text">
                            <span className="logo-name">DR Detect AI</span>
                            <span className="logo-sub">Retinopathy Assistant</span>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section-label">Main</div>
                    {NAV_ITEMS.map(item => (
                        <div key={item.section}
                            className={`nav-item${currentSection === item.section ? ' active' : ''}`}
                            onClick={() => navigate(item.section)}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                            {item.badgeKey === 'followup' && alertCount > 0 && (
                                <span className="nav-badge">{alertCount}</span>
                            )}
                        </div>
                    ))}

                    <div className="nav-section-label">Intelligence</div>
                    {NAV_ITEMS2.map(item => (
                        <div key={item.section}
                            className={`nav-item${currentSection === item.section ? ' active' : ''}`}
                            onClick={() => navigate(item.section)}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </div>
                    ))}
                </nav>


            </aside>
        </>
    );
}
