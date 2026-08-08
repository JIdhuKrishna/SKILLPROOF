import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';

/* ─── Integrity Toast ─────────────────────────────────────────── */
const IntegrityToast = ({ message, onDismiss }) => (
    <div className="integrity-toast" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>🚨</span>
        <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#fca5a5', marginBottom: 4, fontSize: '0.92rem' }}>
                Integrity Violation Detected
            </div>
            <div style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.7)' }}>{message}</div>
        </div>
        <button onClick={onDismiss} style={{ background: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem', flexShrink: 0 }}>✕</button>
    </div>
);

/* ─── Timer Display ───────────────────────────────────────────── */
const TimerDisplay = ({ timeLeft }) => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const isUrgent = timeLeft <= 60;
    return (
        <motion.div
            animate={isUrgent ? { scale: [1, 1.04, 1] } : {}}
            transition={isUrgent ? { repeat: Infinity, duration: 0.9 } : {}}
            style={{
                padding: '8px 18px', borderRadius: 99, fontFamily: 'var(--font-mono)',
                fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em',
                background: isUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: isUrgent ? '#fca5a5' : 'var(--text-primary)',
                backdropFilter: 'blur(12px)',
            }}
        >
            ⏱ {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </motion.div>
    );
};

/* ─── MCQ Option ──────────────────────────────────────────────── */
const MCQOption = ({ option, qIndex, selected, onChange }) => (
    <label style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
        background: selected === option ? 'rgba(79,142,247,0.12)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${selected === option ? 'rgba(79,142,247,0.4)' : 'rgba(255,255,255,0.07)'}`,
        userSelect: 'none',
    }}>
        <input type="radio" name={`q-${qIndex}`} value={option} checked={selected === option}
            onChange={() => onChange(qIndex, option)} style={{ display: 'none' }} />
        <div style={{
            width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
            border: `2px solid ${selected === option ? 'var(--ai-pulse)' : 'rgba(255,255,255,0.2)'}`,
            background: selected === option ? 'var(--ai-pulse)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            {selected === option && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
        </div>
        <span style={{ fontSize: '0.9rem', color: selected === option ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {option}
        </span>
    </label>
);

/* ══════════════════════════════════════════════════════════════ */
const AssessmentEngine = () => {
    const { profileId } = useParams();
    const navigate = useNavigate();

    const [questions, setQuestions] = useState([]);
    const [status, setStatus] = useState('Pending');
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [timeLeft, setTimeLeft] = useState(300);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [toast, setToast] = useState(null);
    const [isExecuting, setIsExecuting] = useState({});
    const [executionResults, setExecutionResults] = useState({});

    // Pace Alert
    const [questionStartTimes, setQuestionStartTimes] = useState({});
    const [paceViolations, setPaceViolations] = useState(0);

    const submittingRef = useRef(false);

    /* ── Fetch Assessment from Backend ─────────────────────── */
    useEffect(() => {
        const fetchAssessment = async () => {
            try {
                const res = await api.get(`/api/assessment/${profileId}`);
                const qs = res.data.questions || [];
                setQuestions(qs);
                setStatus(res.data.status);
                const initial = {};
                qs.forEach((q, i) => { if (q.type === 'coding') initial[i] = q.initialCode || ''; });
                setAnswers(initial);
                setLoading(false);
                if (res.data.status === 'Completed') setResult({ message: 'You have already completed this assessment.' });
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load assessment.');
                setLoading(false);
            }
        };
        fetchAssessment();
    }, [profileId]);

    /* ── Timer Logic ────────────────────────────────────────── */
    useEffect(() => {
        setIsTimerActive(status === 'Pending' && !loading && !result);
    }, [status, loading, result]);

    useEffect(() => {
        if (!isTimerActive) return;
        if (timeLeft === 0) { handleSubmit('Time Expired'); return; }
        const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
        return () => clearInterval(t);
    }, [timeLeft, isTimerActive]);

    /* ── Tab-Switch Detection ───────────────────────────────── */
    useEffect(() => {
        const handle = () => {
            if (document.visibilityState === 'hidden' && status === 'Pending' && !result && !submittingRef.current) {
                showToast('Tab switching detected! Your assessment has been submitted.');
                setTimeout(() => handleSubmit('Assessment Terminated: Tab-switching detected.'), 1500);
            }
        };
        document.addEventListener('visibilitychange', handle);
        return () => document.removeEventListener('visibilitychange', handle);
    }, [status, result]);

    /* ── Malpractice Prevention ─────────────────────────────── */
    const preventMalpractice = useCallback((e) => {
        e.preventDefault();
        showToast('Copy/paste is disabled during the assessment.');
    }, []);

    const showToast = useCallback((msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 6000);
    }, []);

    /* ── Answer Handlers ────────────────────────────────────── */

    // Helper to log start times for pacing
    const markQuestionStart = useCallback((qIndex) => {
        setQuestionStartTimes(prev => {
            if (!prev[qIndex]) {
                return { ...prev, [qIndex]: Date.now() };
            }
            return prev;
        });
    }, []);

    const checkPaceViolation = useCallback((qIndex, category) => {
        if (!questionStartTimes[qIndex]) return;
        const duration = (Date.now() - questionStartTimes[qIndex]) / 1000;

        // Flag answers completed under 5 seconds for Logical/Critical
        if (duration < 5 && (category === 'critical' || category === 'logical')) {
            setPaceViolations(prev => prev + 1);
        }
    }, [questionStartTimes]);

    const handleOptionChange = useCallback((qIndex, option, category) => {
        markQuestionStart(qIndex);
        setAnswers(prev => ({ ...prev, [qIndex]: option }));
        checkPaceViolation(qIndex, category);
    }, [markQuestionStart, checkPaceViolation]);

    const handleTextChange = useCallback((qIndex, text, category) => {
        markQuestionStart(qIndex);
        setAnswers(prev => ({ ...prev, [qIndex]: text }));
        // Don't check violation until they submit or switch focus, but for simplified scope, check on change is fine
    }, [markQuestionStart]);

    const handleCodeChange = useCallback((qIndex, code) => {
        markQuestionStart(qIndex);
        setAnswers(prev => ({ ...prev, [qIndex]: code }));
    }, [markQuestionStart]);

    const handleKeyDown = (e, qIndex) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const ta = e.target;
            const start = ta.selectionStart;
            const newCode = ta.value.substring(0, start) + '    ' + ta.value.substring(ta.selectionEnd);
            handleCodeChange(qIndex, newCode);
            requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 4; });
        }
    };

    /* ── Code Execution (Judge0) ────────────────────────────── */
    const handleRunCode = async (qIndex) => {
        const code = answers[qIndex] || '';
        if (!code.trim()) return;
        setIsExecuting(prev => ({ ...prev, [qIndex]: true }));
        try {
            let langId = 71; // Python
            if (/function|const |let |console\.log/.test(code)) langId = 63;
            else if (/#include|std::/.test(code)) langId = 54;
            else if (/public class|System\.out/.test(code)) langId = 62;
            const res = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source_code: code, language_id: langId }),
            });
            const data = await res.json();
            const output = data.stdout || data.stderr || data.compile_output || data.message || 'No output.';
            const isError = !!(data.stderr || data.compile_output || (data.status && data.status.id > 3));
            setExecutionResults(prev => ({ ...prev, [qIndex]: { output, isError } }));
        } catch {
            setExecutionResults(prev => ({ ...prev, [qIndex]: { output: 'Error connecting to execution environment.', isError: true } }));
        } finally {
            setIsExecuting(prev => ({ ...prev, [qIndex]: false }));
        }
    };

    /* ── Submit ─────────────────────────────────────────────── */
    const handleSubmit = useCallback(async (reason = null) => {
        if (submittingRef.current || status === 'Completed') return;
        submittingRef.current = true;
        setSubmitting(true);
        setIsTimerActive(false);
        try {
            const formattedAnswers = Object.keys(answers).map(i => ({
                questionIndex: parseInt(i),
                selectedOption: answers[i],
            }));
            const res = await api.post('/api/assessment/submit', {
                profileId,
                answers: formattedAnswers,
                submissionContext: reason || 'Normal Submission',
                paceViolations
            });
            const finalResult = res.data;
            if (reason) finalResult.terminationReason = reason;
            setResult(finalResult);
            setStatus('Completed');
        } catch (err) {
            setError(err.response?.data?.message || 'Submission failed.');
        } finally {
            setSubmitting(false);
            submittingRef.current = false;
        }
    }, [answers, profileId, status]);

    /* ─── Render ─────────────────────────────────────────────── */
    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 20 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} style={{ fontSize: '2.5rem' }}>⚙️</motion.div>
            <div style={{ color: 'var(--ai-pulse)', fontWeight: 600 }}>Loading Evaluation Engine...</div>
        </div>
    );

    if (error) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 24 }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card" style={{ padding: 40, maxWidth: 440, textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⚠️</div>
                <h2 style={{ color: 'var(--status-critical)', marginBottom: 12 }}>Assessment Error</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{error}</p>
                <button className="btn-ghost" onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
            </motion.div>
        </div>
    );

    if (result || status === 'Completed') return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 24 }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 200 } }}
                className="glass-card" style={{ padding: 48, maxWidth: 480, textAlign: 'center' }}>
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5, delay: 0.3 }} style={{ fontSize: '3rem', marginBottom: 20 }}>
                    {result?.terminationReason ? '❌' : '🏆'}
                </motion.div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 16 }}>Assessment Complete</h2>
                {result?.terminationReason && (
                    <div className="alert alert-error" style={{ marginBottom: 20, textAlign: 'left' }}>
                        {result.terminationReason}
                    </div>
                )}
                {result?.score !== undefined ? (
                    <div style={{ marginBottom: 28 }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>Your Final Score</div>
                        <motion.div
                            initial={{ fontSize: '2rem' }} animate={{ fontSize: '4.5rem' }}
                            className="text-gradient-blue"
                            style={{ fontWeight: 900, lineHeight: 1, display: 'block', marginBottom: 8 }}>
                            {result.score.toFixed(0)}%
                        </motion.div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {result.correctCount} / {result.total} questions correct
                        </div>
                        <div className="progress-track" style={{ marginTop: 16 }}>
                            <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${result.score}%` }} transition={{ delay: 0.5, duration: 1 }}
                                style={{ background: result.score >= 70 ? 'linear-gradient(90deg, var(--status-verified), var(--accent-cyan))' : 'linear-gradient(90deg, var(--status-critical), #f97316)' }} />
                        </div>
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{result?.message || 'Assessment has been submitted.'}</p>
                )}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="btn-primary" onClick={() => navigate('/verification')}>View Verification Badge →</button>
                    <button className="btn-ghost" onClick={() => navigate('/dashboard')}>Dashboard</button>
                </div>
            </motion.div>
        </div>
    );

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '28px 20px' }}>
            {/* Integrity Toast */}
            <AnimatePresence>
                {toast && <IntegrityToast message={toast} onDismiss={() => setToast(null)} />}
            </AnimatePresence>

            {/* Header Bar */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>⚡ Technical Assessment</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', margin: '4px 0 0' }}>
                        {questions.length} questions · Answer carefully · Monitored
                    </p>
                </div>
                <TimerDisplay timeLeft={timeLeft} />
            </motion.div>

            {/* Integrity Warning Banner */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                className="alert alert-warning" style={{ marginBottom: 20, fontSize: '0.82rem' }}>
                🛡 Integrity monitoring active. Tab switching and copy/paste are detected and logged.
            </motion.div>

            {/* Competency Tracker */}
            {questions.length > 0 && (
                <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 12, overflowX: 'auto', flexWrap: 'nowrap' }}>
                    {Array.from(new Set(questions.map(q => q.category || 'legacy'))).map((cat, i) => {
                        const catConfig = {
                            'technical': { icon: '💻', color: 'var(--accent-cyan)' },
                            'logical': { icon: '🧠', color: 'var(--accent-violet)' },
                            'critical': { icon: '⚖️', color: '#ec4899' },
                            'legacy': { icon: '📋', color: 'var(--text-muted)' }
                        };
                        const config = catConfig[cat] || catConfig['legacy'];
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 99, border: `1px solid ${config.color}40`, flexShrink: 0 }}>
                                <span>{config.icon}</span>
                                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: config.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {cat === 'legacy' ? 'General' : cat}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Questions */}
            <form
                onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
                onCopy={preventMalpractice} onCut={preventMalpractice}
                onPaste={preventMalpractice} onContextMenu={preventMalpractice}
                className="select-none"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {questions.length === 0 ? (
                        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No questions available for this assessment.
                        </div>
                    ) : (
                        questions.map((q, qIndex) => (
                            <motion.div key={q._id || qIndex}
                                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: qIndex * 0.05 }}
                                className="glass-card" style={{ padding: '24px 28px' }}>
                                {/* Question Header */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
                                    <div style={{
                                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                        background: 'linear-gradient(135deg, var(--ai-pulse), var(--accent-violet))',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 800, fontSize: '0.82rem', color: '#fff',
                                    }}>{qIndex + 1}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                            <span className={`badge ${q.type === 'coding' ? 'badge-violet' : q.category === 'critical' ? 'badge-amber' : 'badge-blue'}`}>
                                                {q.type === 'coding' ? '💻 Coding' : q.category === 'critical' ? '⚖️ Textual Analysis' : '❓ MCQ'}
                                            </span>
                                            {q.category && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{q.category}</span>}
                                        </div>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                                            {q.type === 'coding' ? 'Practical Challenge' : q.questionText}
                                        </h3>
                                    </div>
                                </div>

                                {/* Answers Input Based on Type/Category */}
                                {q.type !== 'coding' && q.category !== 'critical' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }} onClick={() => markQuestionStart(qIndex)}>
                                        {(q.options || []).map((opt, oi) => (
                                            <MCQOption key={oi} option={opt} qIndex={qIndex} selected={answers[qIndex]} onChange={(i, o) => handleOptionChange(i, o, q.category)} />
                                        ))}
                                    </div>
                                )}

                                {q.category === 'critical' && (
                                    <div style={{ position: 'relative' }}>
                                        <textarea
                                            className="input-glass"
                                            value={answers[qIndex] || ''}
                                            onChange={(e) => handleTextChange(qIndex, e.target.value, q.category)}
                                            onBlur={() => checkPaceViolation(qIndex, q.category)}
                                            style={{ minHeight: 140, resize: 'vertical' }}
                                            placeholder="Explain your reasoning..."
                                        />
                                    </div>
                                )}

                                {/* Coding Challenge */}
                                {q.type === 'coding' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        <div className="glass" style={{ padding: '14px 18px', borderRadius: 10 }}>
                                            <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>{q.problemStatement}</p>
                                            {q.expectedOutputDescription && (
                                                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                    Expected: {q.expectedOutputDescription}
                                                </p>
                                            )}
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ position: 'absolute', top: 12, right: 14, fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)', zIndex: 1 }}>
                                                solution.py
                                            </div>
                                            <textarea
                                                className="code-editor"
                                                value={answers[qIndex] || ''}
                                                onChange={(e) => handleCodeChange(qIndex, e.target.value)}
                                                onKeyDown={(e) => handleKeyDown(e, qIndex)}
                                                style={{ height: 220, display: 'block' }}
                                                spellCheck={false}
                                                placeholder="# Write your code here..."
                                            />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <button type="button" onClick={() => handleRunCode(qIndex)} disabled={isExecuting[qIndex]}
                                                className={isExecuting[qIndex] ? 'btn-ghost' : 'btn-primary'}
                                                style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                                                {isExecuting[qIndex] ? <><span className="spinner spinner-sm" /> Running...</> : '▶ Run Code'}
                                            </button>
                                        </div>
                                        {executionResults[qIndex] && (
                                            <div className="terminal" style={{ marginTop: 0 }}>
                                                <div className="terminal-header">
                                                    <div className="terminal-dot" style={{ background: '#ef4444' }} />
                                                    <div className="terminal-dot" style={{ background: '#f59e0b' }} />
                                                    <div className="terminal-dot" style={{ background: '#10b981' }} />
                                                    <span style={{ marginLeft: 8, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Console Output</span>
                                                </div>
                                                <div className="terminal-body">
                                                    <pre style={{ margin: 0, color: executionResults[qIndex].isError ? '#f87171' : '#34d399', whiteSpace: 'pre-wrap' }}>
                                                        {executionResults[qIndex].output}
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </div>

                {/* Submit */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                    style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--glass-border)' }}>
                    <button type="submit" disabled={submitting || questions.length === 0} className="btn-primary"
                        style={{ width: '100%', padding: '15px', fontSize: '1.05rem' }}>
                        {submitting ? <><span className="spinner spinner-sm" /> Evaluating Answers...</> : '🎯 Submit Assessment'}
                    </button>
                    <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 12 }}>
                        Ensure all questions are answered before submitting. This action cannot be undone.
                    </p>
                </motion.div>
            </form>
        </div>
    );
};

export default AssessmentEngine;
