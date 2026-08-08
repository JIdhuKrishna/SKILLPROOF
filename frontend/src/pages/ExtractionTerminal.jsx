import React, { useState, useCallback, useContext, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

/* ── DNA Skill Strand Sidebar ─────────────────────────────────── */
const SkillStrand = ({ skills }) => {
    const COLORS = ['#4f8ef7', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {skills.map((skill, i) => {
                const color = COLORS[i % COLORS.length];
                const conf = skill.confidence ?? (70 + (i * 7) % 30);
                return (
                    <motion.div key={skill.name || skill || i}
                        initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                            background: `${color}15`, border: `1px solid ${color}35`, borderRadius: 10
                        }}
                    >
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}80` }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {skill.name || skill}
                            </div>
                            <div className="progress-track" style={{ marginTop: 4 }}>
                                <motion.div className="progress-fill"
                                    initial={{ width: 0 }} animate={{ width: `${conf}%` }}
                                    transition={{ delay: i * 0.06 + 0.3, duration: 0.7 }}
                                    style={{ background: `linear-gradient(90deg, ${color}, ${color}aa)` }}
                                />
                            </div>
                        </div>
                        <span style={{ fontSize: '0.7rem', color, fontWeight: 700 }}>{conf}%</span>
                    </motion.div>
                );
            })}
        </div>
    );
};

/* ── Terminal Log Line ────────────────────────────────────────── */
const LogLine = ({ line }) => (
    <span className={`log-line ${line.type}`} style={{ display: 'block' }}>
        <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>[{new Date().toLocaleTimeString()}]</span>
        {line.text}
    </span>
);

/* ══════════════════════════════════════════════════════════════ */
const ExtractionTerminal = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profile, setProfile] = useState(null);
    const fileInputRef = useRef(null);
    const [logs, setLogs] = useState([
        { text: 'SkillProof Extraction Engine v2.4.1 initialized', type: 'info' },
        { text: 'Gemini AI backend ready — awaiting PDF input...', type: 'success' },
        { text: 'Drop a resume PDF to begin neural extraction.', type: 'muted' },
    ]);

    const addLog = useCallback((text, type = 'info') => {
        setLogs(prev => [...prev, { text, type }]);
    }, []);

    const extractedSkills = useMemo(() => {
        if (!profile?.extractedSkills) return [];
        return profile.extractedSkills.map(s => typeof s === 'string' ? { name: s } : s);
    }, [profile]);

    const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback((e) => { e.preventDefault(); setIsDragging(false); }, []);
    const handleDrop = useCallback((e) => {
        e.preventDefault(); setIsDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped?.type === 'application/pdf') { setFile(dropped); addLog(`📄 File: ${dropped.name}`, 'info'); }
        else addLog('❌ Only PDF files are supported.', 'error');
    }, [addLog]);

    const handleFileChange = useCallback((e) => {
        const sel = e.target.files[0];
        if (sel) { setFile(sel); addLog(`📄 File: ${sel.name} (${(sel.size / 1024).toFixed(1)} KB)`, 'info'); }
    }, [addLog]);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) { addLog('⚠ No file selected.', 'warn'); return; }
        if (file.size > 5 * 1024 * 1024) { addLog('❌ File exceeds 5 MB limit.', 'error'); return; }

        const token = user?.token || JSON.parse(localStorage.getItem('skillproof_user'))?.token;
        if (!token) {
            addLog('❌ Authentication failed: Please log in again', 'error');
            setTimeout(() => navigate('/'), 2000);
            return;
        }

        setUploading(true);
        addLog('🚀 Initiating secure upload...', 'info');
        addLog('📡 Transmitting PDF to SkillProof server...', 'info');
        const formData = new FormData();
        formData.append('resume', file);
        try {
            const response = await fetch('http://localhost:5000/api/upload/resume', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                if (response.status === 401) {
                    addLog('❌ Authentication failed: Please log in again', 'error');
                    setTimeout(() => navigate('/'), 2000);
                    return;
                }
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `Server returned ${response.status}`);
            }

            const data = await response.json();

            addLog('✅ Upload successful!', 'success');
            addLog('🤖 Gemini AI parsing PDF...', 'info');
            addLog('Extracting skills via neural network...', 'info');

            // Also explicitly pass token to profile fetch to ensure it doesn't fail due to global axios interceptor mismatch
            const profileRes = await api.get('/api/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (profileRes.data) {
                setProfile(profileRes.data);
                const skills = profileRes.data.extractedSkills || [];
                addLog(`🎯 Extraction complete! ${skills.length} skills identified.`, 'success');
                addLog(`👤 Profile ID: ${profileRes.data._id}`, 'success');
                if (data.message) addLog(`💬 ${data.message}`, 'muted');
            }
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            addLog(`❌ Error: ${err.message}`, 'error');
        } finally {
            setUploading(false);
        }
    };

    const canStartAssessment = profile && (!profile.overallScore || profile.overallScore === 0);
    const isVerified = profile?.overallScore > 0;

    return (
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', minHeight: 'calc(100vh - 80px)', padding: '32px 24px' }}>
            {/* ── Left Panel ── */}
            <div style={{ flex: 2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                        Resume Extraction Terminal
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                        Upload your PDF — Gemini AI extracts & verifies your skills
                    </p>
                </motion.div>

                <AnimatePresence>
                    {isVerified && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span style={{ fontSize: '1.3rem' }}>✅</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700 }}>Skills Verified — Score: {profile.overallScore?.toFixed?.(0)}%</div>
                                <div style={{ fontSize: '0.82rem', opacity: 0.8 }}>Assessment complete.</div>
                            </div>
                            <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                                onClick={() => navigate('/verification')}>View Badge →</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Drop Zone */}
                <motion.form onSubmit={handleUpload} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <div
                        className={`drop-zone ${isDragging ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        style={{ cursor: uploading ? 'not-allowed' : 'pointer', minHeight: 170 }}
                    >
                        <input ref={fileInputRef} type="file" accept=".pdf" className="sr-only" onChange={handleFileChange} disabled={uploading} />
                        <motion.div animate={uploading ? { rotate: 360 } : {}} transition={uploading ? { repeat: Infinity, duration: 1.2, ease: 'linear' } : {}} style={{ fontSize: '2.2rem' }}>
                            {uploading ? '⚙️' : file ? '📄' : '☁️'}
                        </motion.div>
                        <div style={{ fontWeight: 700, color: file ? 'var(--status-verified)' : 'var(--text-secondary)' }}>
                            {file ? file.name : isDragging ? 'Drop the PDF here!' : uploading ? 'Processing...' : 'Click or drag & drop your resume'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PDF only · Max 5 MB</div>
                        {file && !uploading && <span className="badge badge-green">{(file.size / 1024).toFixed(1)} KB — Ready</span>}
                    </div>
                    <motion.button type="submit" disabled={uploading || !file} className="btn-primary"
                        style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: 14 }}>
                        {uploading ? <><span className="spinner spinner-sm" /> Extracting Skills...</> : '⚡ Upload & Extract Skills'}
                    </motion.button>
                </motion.form>

                {/* Terminal */}
                <motion.div className="terminal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="terminal-header">
                        <div className="terminal-dot" style={{ background: '#ef4444' }} />
                        <div className="terminal-dot" style={{ background: '#f59e0b' }} />
                        <div className="terminal-dot" style={{ background: '#10b981' }} />
                        <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            extraction_engine.py — SkillProof AI
                        </span>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="status-dot online" />
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>LIVE</span>
                        </div>
                    </div>
                    <div className="terminal-body" style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {logs.map((line, idx) => <LogLine key={idx} line={line} />)}
                        {uploading && (
                            <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 0.9 }}
                                className="log-line info" style={{ display: 'block' }}>▌ Processing...</motion.span>
                        )}
                    </div>
                </motion.div>

                {/* Assessment CTA */}
                <AnimatePresence>
                    {canStartAssessment && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="glass-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, marginBottom: 2 }}>⏳ Assessment Pending</div>
                                <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>
                                    Resume extracted. Take your AI-generated technical assessment to verify your skills.
                                </p>
                            </div>
                            <button className="btn-primary" style={{ flexShrink: 0 }} onClick={() => navigate(`/assessment/${profile._id}`)}>
                                Start →
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── DNA Sidebar ── */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
                className="glass-card"
                style={{ width: 290, flexShrink: 0, padding: '22px 18px', maxHeight: 'calc(100vh - 110px)', overflowY: 'auto', position: 'sticky', top: 90 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, var(--ai-pulse), var(--accent-violet))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem'
                    }}></div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>DNA Skill Strand</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {extractedSkills.length > 0 ? `${extractedSkills.length} skills mapped` : 'Awaiting extraction'}
                        </div>
                    </div>
                </div>
                <div className="divider" style={{ margin: '0 0 14px' }} />
                {extractedSkills.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)' }}>
                        <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} style={{ fontSize: '2rem', marginBottom: 10 }}>🔬</motion.div>
                        <div style={{ fontSize: '0.8rem' }}>Upload a PDF to populate<br />your skill DNA strand</div>
                    </div>
                ) : (
                    <>
                        <SkillStrand skills={extractedSkills} />
                        {profile?.experienceSummary && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                                style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--glass-border)' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                                    Experience
                                </div>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                                    {profile.experienceSummary.slice(0, 200)}{profile.experienceSummary.length > 200 ? '...' : ''}
                                </p>
                            </motion.div>
                        )}
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default ExtractionTerminal;
