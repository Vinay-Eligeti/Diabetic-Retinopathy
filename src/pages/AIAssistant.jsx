import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';

// Dynamic prompts will be generated based on context

const GROQ_API_KEY = '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';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const CHAT_STORAGE_KEY = 'dr_detect_chat_messages';

const SYSTEM_PROMPT = `You are an AI Clinical Support Assistant for Diabetic Retinopathy Risk Guidance.

Your purpose is to provide supportive, clear, and patient-friendly explanations for questions related to:
- Diabetic Retinopathy (all severity levels, symptoms, progression)
- Eye health screening and monitoring
- Risk factors and risk progression
- Follow-up schedules and urgency
- Preventive care and lifestyle modifications
- Understanding scan results and medical findings
- General diabetic eye health questions

Behavior Rules:

1. ALWAYS answer questions about diabetic retinopathy, eye health, scan results, risk factors, and related topics.
2. You are a clinical decision-support assistant — calm, clear, professional, and reassuring.
3. Provide complete, helpful responses of appropriate length based on the question's complexity. Simple questions may need brief answers; complex questions may need detailed explanations.
4. Use simple, patient-friendly language. Avoid overly technical jargon.
5. Do NOT provide specific medical diagnosis, treatment plans, or medication prescriptions.
6. Do NOT replace a doctor or ophthalmologist. Always encourage professional medical consultation for medical decisions.
7. Focus on:
   - Explaining risk levels and scan results in understandable terms
   - Encouraging appropriate follow-up based on severity
   - Emphasizing prevention, monitoring, and healthy lifestyle
   - Answering patient questions about their specific condition
8. If risk level is high (Grade 3-4), gently but clearly encourage earlier clinical consultation.
9. If risk level is low (Grade 0-1), reassure while emphasizing regular monitoring.
10. ONLY refuse to answer if the question is completely unrelated to:
    - Diabetic retinopathy or eye health
    - Diabetes complications affecting eyes
    - Screening, monitoring, or preventive care
    If refusing, respond EXACTLY with: "I am a clinical support assistant for diabetic retinopathy risk guidance and can only assist with screening results and follow-up information."
11. Always maintain a respectful, supportive, and responsible tone.
12. Add this disclaimer at the end of responses (not every message, but when giving medical information):
    "This is a clinical support tool and not a medical diagnosis."
13. Use the conversation history AND the patient context provided to give personalized, relevant answers. Reference the patient's specific data (scan grade, risk score, HbA1c, screening history, etc.) when answering. Never say you don't have information if the patient context provides it.`;

export default function AIAssistant() {
    const { scanResult, riskScore, patient, history } = useApp();
    const [messages, setMessages] = useState(() => {
        // Load conversation history from sessionStorage on mount
        try {
            const saved = sessionStorage.getItem(CHAT_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [streamingText, setStreamingText] = useState(''); // For progressive reveal
    const [isStreaming, setIsStreaming] = useState(false); // Whether currently animating text
    const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
    const msgsEnd = useRef(null);
    const inputRef = useRef(null);
    const streamIntervalRef = useRef(null);
    const lastScanRef = useRef(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => { msgsEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing, streamingText]);

    // Persist conversation history to sessionStorage
    useEffect(() => {
        try {
            sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
        } catch (err) {
            console.error('Failed to save chat history:', err);
        }
    }, [messages]);

    // Clean up streaming interval on unmount
    useEffect(() => {
        return () => {
            if (streamIntervalRef.current) {
                clearInterval(streamIntervalRef.current);
            }
        };
    }, []);

    // Check for new scan results and show welcome banner
    useEffect(() => {
        if (scanResult && scanResult.timestamp) {
            const scanId = scanResult.timestamp;
            if (lastScanRef.current !== scanId && messages.length === 0) {
                setShowWelcomeBanner(true);
                lastScanRef.current = scanId;
            }
        }
    }, [scanResult, messages.length]);

    const gradeNames = ['No DR (Grade 0)', 'Mild NPDR (Grade 1)', 'Moderate NPDR (Grade 2)', 'Severe NPDR (Grade 3)', 'Proliferative DR (Grade 4)'];

    // Generate context-aware suggested questions
    const generateSuggestedQuestions = useCallback(() => {
        const questions = [];

        if (scanResult) {
            // Grade-specific questions
            if (scanResult.grade >= 3) {
                questions.push('Why is my follow-up urgent?');
                questions.push('What treatments are available for my condition?');
                questions.push(`Explain my Grade ${scanResult.grade} diagnosis simply`);
            } else if (scanResult.grade >= 1) {
                questions.push(`Explain my Grade ${scanResult.grade} diagnosis`);
                questions.push('How can I slow DR progression?');
                questions.push('What lifestyle changes should I make?');
            } else {
                questions.push('How do I maintain healthy eyes?');
                questions.push('When should I get my next screening?');
            }

            questions.push('What do my scan findings mean?');
        } else {
            questions.push('What is diabetic retinopathy?');
            questions.push('What are early warning signs of DR?');
        }

        if (riskScore !== null) {
            const riskLevel = riskScore >= 75 ? 'high' : riskScore >= 50 ? 'moderate' : 'low';
            questions.push(`Why is my risk score ${riskLevel}?`);
            if (riskScore >= 50) {
                questions.push('How can I improve my risk score?');
            }
        }

        if (patient?.hba1c && patient.hba1c >= 7) {
            questions.push('How does my HbA1c affect my eyes?');
        }

        if (!scanResult && !riskScore) {
            questions.push('What tests do I need?');
            questions.push('How often should I get screened?');
        }

        return questions.slice(0, 6);
    }, [scanResult, riskScore, patient]);

    const suggestedQuestions = generateSuggestedQuestions();

    const buildContext = useCallback(() => {
        let ctx = '=== PATIENT RECORD ===\n';

        // Patient profile
        if (patient) {
            ctx += `\nPatient Profile:\n`;
            ctx += `- Name: ${patient.name}\n`;
            ctx += `- Age: ${patient.age} years\n`;
            ctx += `- Gender: ${patient.gender || 'Not specified'}\n`;
            ctx += `- Diabetes Type: ${patient.diabetesType === 'type1' ? 'Type 1' : patient.diabetesType === 'type2' ? 'Type 2' : 'Gestational'}\n`;
            ctx += `- Diabetes Duration: ${patient.duration} years\n`;
            if (patient.hba1c) ctx += `- HbA1c: ${patient.hba1c}% ${patient.hba1c < 7 ? '(Well controlled)' : patient.hba1c < 8 ? '(Needs improvement)' : '(Poor control)'}\n`;
            if (patient.bp) ctx += `- Blood Pressure: ${patient.bp}\n`;
            if (patient.smoking) ctx += `- Smoking Status: ${patient.smoking}\n`;
            if (patient.notes) ctx += `- Medical Notes: ${patient.notes}\n`;
        } else {
            ctx += '\nPatient Profile: Not entered yet.\n';
        }

        // Current/latest scan result
        if (scanResult) {
            ctx += `\nLatest Scan Result:\n`;
            ctx += `- Diagnosis: ${gradeNames[scanResult.grade]}\n`;
            ctx += `- Confidence: ${scanResult.confidence}%\n`;
            ctx += `- Key Findings: ${scanResult.findings.map(f => f.text).join('; ')}\n`;
        } else {
            ctx += '\nLatest Scan: No retinal scan analyzed yet.\n';
        }

        // Risk score
        if (riskScore !== null) {
            const riskLabel = riskScore >= 75 ? 'Very High' : riskScore >= 50 ? 'High' : riskScore >= 25 ? 'Moderate' : 'Low';
            ctx += `\nRisk Assessment:\n`;
            ctx += `- Overall Risk Score: ${riskScore}/100 (${riskLabel})\n`;
        } else {
            ctx += '\nRisk Assessment: Not calculated yet.\n';
        }

        // Full screening history
        if (history && history.length > 0) {
            ctx += `\nComplete Screening History (${history.length} scans):\n`;
            history.forEach((rec, i) => {
                ctx += `  ${i + 1}. ${new Date(rec.date).toLocaleDateString()} — ${gradeNames[rec.grade]}, Confidence: ${rec.confidence}%\n`;
            });
        } else {
            ctx += '\nScreening History: No previous screenings recorded.\n';
        }

        ctx += '\n=== END PATIENT RECORD ===';
        return ctx;
    }, [patient, scanResult, riskScore, history, gradeNames]);

    const callGroq = useCallback(async (userMessage, conversationHistory) => {
        // Build OpenAI-compatible messages: system + history + new message
        const apiMessages = [
            { role: 'system', content: SYSTEM_PROMPT + '\n\n' + buildContext() }
        ];

        // Add full conversation history for memory
        for (const msg of conversationHistory) {
            apiMessages.push({
                role: msg.role === 'user' ? 'user' : 'assistant',
                content: msg.text
            });
        }

        // Add current user message
        apiMessages.push({ role: 'user', content: userMessage });

        try {
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    model: GROQ_MODEL,
                    messages: apiMessages,
                    temperature: 0.7,
                    max_tokens: 400,
                    top_p: 0.9,
                })
            });

            if (res.status === 429) {
                console.warn('Groq rate limited, retrying in 3s...');
                await new Promise(r => setTimeout(r, 3000));
                const retry = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: GROQ_MODEL,
                        messages: apiMessages,
                        temperature: 0.7,
                        max_tokens: 400,
                        top_p: 0.9,
                    })
                });
                if (!retry.ok) return null;
                const rd = await retry.json();
                return rd.choices?.[0]?.message?.content || null;
            }

            if (!res.ok) {
                const errBody = await res.text();
                console.error('Groq API error:', res.status, errBody);
                return null;
            }

            const d = await res.json();
            return d.choices?.[0]?.message?.content || null;
        } catch (err) {
            console.error('Groq API call failed:', err);
            return null;
        }
    }, [buildContext]);

    const send = useCallback(async (overrideText) => {
        const txt = (overrideText || input).trim();
        if (!txt || typing) return;

        // Clear input immediately
        setInput('');

        const userMsg = { role: 'user', text: txt };
        setMessages(prev => [...prev, userMsg]);
        setTyping(true);

        // Track response time
        const startTime = Date.now();

        // Pass entire conversation history for memory
        const currentHistory = [...messages];
        let reply = await callGroq(txt, currentHistory);

        // Calculate response time
        const responseTime = Date.now() - startTime;

        if (!reply) {
            reply = 'I am currently unable to connect to the AI service. Please try again in a moment.\n\nThis is a clinical support tool and not a medical diagnosis.';
        } else if (!reply.includes('clinical support tool')) {
            reply += '\n\nThis is a clinical support tool and not a medical diagnosis.';
        }

        setTyping(false);

        // Start progressive text reveal (ChatGPT-style)
        setIsStreaming(true);
        setStreamingText('');

        let charIndex = 0;
        const typingSpeed = 15; // milliseconds per character

        streamIntervalRef.current = setInterval(() => {
            if (charIndex < reply.length) {
                setStreamingText(reply.substring(0, charIndex + 1));
                charIndex++;
            } else {
                // Finished streaming, add to messages
                clearInterval(streamIntervalRef.current);
                setIsStreaming(false);
                setStreamingText('');
                setMessages(prev => [...prev, { role: 'ai', text: reply, responseTime }]);
            }
        }, typingSpeed);
    }, [input, typing, messages, callGroq]);

    const handleQuickPrompt = useCallback((prompt) => {
        if (typing) return;
        // Directly send without putting text in input box
        send(prompt);
    }, [typing, send]);

    const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

    const formatText = (text) =>
        text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');

    return (
        <div className="section-page">
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--neutral-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div className="card-title"><span className="card-icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}>🤖</span> Clinical Support Assistant</div>
                        <div className="card-subtitle">Ask about your DR screening results, risk level, and follow-up guidance</div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--severity-0)', fontWeight: 600, background: 'var(--severity-0-bg)', padding: '4px 10px', borderRadius: 6 }}>● Connected</span>
                </div>

                <div style={{ padding: '0 24px' }}>
                    {showWelcomeBanner && scanResult && (
                        <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', borderRadius: '12px', marginTop: '16px', marginBottom: '16px', color: 'white' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '24px' }}>📋</span>
                                <div style={{ fontWeight: 700, fontSize: '15px' }}>Scan Results Loaded</div>
                            </div>
                            <div style={{ fontSize: '13px', lineHeight: '1.5', opacity: 0.95 }}>
                                Your recent scan shows <strong>Grade {scanResult.grade} - {scanResult.name}</strong>.
                                {scanResult.grade >= 3 ? ' Immediate attention recommended.' : ' Ask me anything about your results!'}
                            </div>
                            <button
                                onClick={() => setShowWelcomeBanner(false)}
                                style={{ marginTop: '10px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>
                                Got it ✓
                            </button>
                        </div>
                    )}
                    <div style={{ padding: '16px 0' }}>
                        <div className="quick-prompts">
                            {suggestedQuestions.map((p, i) => (
                                <button key={i} className="quick-prompt-btn" onClick={() => handleQuickPrompt(p)}>{p}</button>
                            ))}
                        </div>
                    </div>

                    <div className="chat-container">
                        <div className="chat-messages">
                            {messages.length === 0 && !typing && (
                                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--neutral-400)' }}>
                                    <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>🩺</div>
                                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--neutral-600)', marginBottom: 8 }}>Clinical Support Assistant</div>
                                    <div style={{ fontSize: 13, maxWidth: 360, margin: '0 auto', lineHeight: 1.6 }}>
                                        Ask me about your diabetic retinopathy screening results, risk level, or follow-up guidance. Use a quick prompt above or type your question below.
                                    </div>
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`chat-message ${msg.role}`}>
                                    <div className="chat-avatar">{msg.role === 'ai' ? '🤖' : '👤'}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div className="chat-bubble" dangerouslySetInnerHTML={{ __html: formatText(msg.text) }} />
                                        {msg.role === 'ai' && msg.responseTime && (
                                            <div style={{ fontSize: '11px', color: 'var(--neutral-400)', marginLeft: '12px' }}>
                                                ⚡ Generated in {(msg.responseTime / 1000).toFixed(2)}s
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isStreaming && (
                                <div className="chat-message ai">
                                    <div className="chat-avatar">🤖</div>
                                    <div className="chat-bubble">
                                        <span dangerouslySetInnerHTML={{ __html: formatText(streamingText) }} />
                                        <span className="typing-cursor">▊</span>
                                    </div>
                                </div>
                            )}
                            {typing && !isStreaming && (
                                <div className="chat-message ai">
                                    <div className="chat-avatar">🤖</div>
                                    <div className="chat-bubble">
                                        <div className="typing-indicator"><span></span><span></span><span></span></div>
                                    </div>
                                </div>
                            )}
                            <div ref={msgsEnd} />
                        </div>

                        <div className="chat-input-container">
                            <div className="chat-input-wrapper">
                                <textarea className="chat-input" ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                                    placeholder="Ask about your screening results, risk, or follow-up..." rows={1}
                                    style={{ height: 'auto', maxHeight: 160 }}
                                    onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
                                />
                                <button className="chat-send-btn" onClick={() => send()}>
                                    <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
