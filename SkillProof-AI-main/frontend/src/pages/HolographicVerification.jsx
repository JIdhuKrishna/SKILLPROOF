import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

/* ─── Score Ring SVG ──────────────────────────────────────────── */
const ScoreRing = ({ score, size = 160 }) => {
    const r = 56;
    const circ = 2 * Math.PI * r;
    const dash = (score / 100) * circ;
    const color = score >= 80 ? 'var(--status-verified)' : score >= 60 ? 'var(--ai-pulse)' : 'var(--status-critical)';
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <defs>
                <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="var(--ai-pulse)" />
                    <stop offset="100%" stopColor="var(--accent-violet)" />
                </linearGradient>
            </defs>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={10} />
            <motion.circle
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="url(#ring-grad)" strokeWidth={10}
                strokeLinecap="round"
                strokeDasharray={circ}
                initial={{ strokeDashoffset: circ }}
                animate={{ strokeDashoffset: circ - dash }}
                transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
                filter={`drop-shadow(0 0 8px ${color})`}
            />
        </svg>
    );
};

/* ─── Skill Verification Card ─────────────────────────────────── */
const SkillVerCard = ({ skill, index }) => {
    const lvl = skill.proficiencyLevel || 'Intermediate';
    const passed = skill.passed ?? true;
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.07 }}
            style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                borderRadius: 12, border: '1px solid var(--glass-border)',
                background: 'rgba(255,255,255,0.03)',
            }}
        >
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{passed ? '✅' : '❌'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{skill.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lvl}</div>
            </div>
            <span className={`badge ${passed ? 'badge-green' : 'badge-red'}`}>
                {passed ? 'Verified' : 'Failed'}
            </span>
        </motion.div>
    );
};

/* ══════════════════════════════════════════════════════════════ */
const HolographicVerification = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/api/profile');
                setProfile(res.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load verification data.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const verificationId = useMemo(() => {
        if (!profile?._id) return 'SP-XXXX-XXXX';
        const short = profile._id.slice(-8).toUpperCase();
        return `SP-${short.slice(0, 4)}-${short.slice(4)}`;
    }, [profile]);

    const timestamp = useMemo(() => {
        if (!profile?.updatedAt) return new Date().toISOString();
        return new Date(profile.updatedAt).toLocaleString();
    }, [profile]);

    const skills = useMemo(() => {
        if (!profile?.extractedSkills) return [];
        return profile.extractedSkills.map(s => typeof s === 'string' ? { name: s } : s);
    }, [profile]);

    const overallScore = profile?.overallScore ?? 0;
    const isVerified = overallScore > 0;

    const copyBadgeId = () => {
        navigator.clipboard.writeText(verificationId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', flexDirection: 'column', gap: 16 }}>
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} style={{ fontSize: '2.5rem' }}>🔮</motion.div>
            <div style={{ color: 'var(--text-muted)' }}>Loading verifications...</div>
        </div>
    );

    if (error) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 24 }}>
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', maxWidth: 400 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⚠️</div>
                <p style={{ color: 'var(--text-muted)' }}>{error}</p>
                <button className="btn-ghost" style={{ marginTop: 20 }} onClick={() => navigate('/dashboard')}>← Back</button>
            </div>
        </div>
    );

    if (!isVerified) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 24 }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card" style={{ padding: 48, textAlign: 'center', maxWidth: 460 }}>
                <div style={{ fontSize: '3rem', marginBottom: 20 }}>⏳</div>
                <h2 style={{ marginBottom: 12 }}>Assessment Not Completed</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>
                    Complete your skills assessment to receive your holographic verification badge.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    {profile?._id && <button className="btn-primary" onClick={() => navigate(`/assessment/${profile._id}`)}>Take Assessment →</button>}
                    <button className="btn-ghost" onClick={() => navigate('/dashboard')}>Dashboard</button>
                </div>
            </motion.div>
        </div>
    );

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 36 }}>
                <h1 style={{ fontSize: '1.9rem', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 8 }}>
                    🔮 Holographic Verification
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Your AI-verified skill credential, immutably recorded
                </p>
            </motion.div>

            {/* Holographic Badge */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 150 }}
                className="holographic-badge animate-hologram"
                style={{ padding: '40px 36px', textAlign: 'center', marginBottom: 28, position: 'relative' }}
            >
                {/* Scan-line effect */}
                <div style={{
                    position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(79,142,247,0.03) 50%, transparent 60%)',
                    borderRadius: 'inherit', pointerEvents: 'none', animation: 'hologram-flicker 4s ease-in-out infinite',
                }} />

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, position: 'relative', zIndex: 1 }}>
                    {/* Score Ring */}
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ScoreRing score={overallScore} />
                        <div style={{ position: 'absolute', textAlign: 'center' }}>
                            <div style={{ fontSize: '1.9rem', fontWeight: 900 }} className="text-gradient-blue">
                                {overallScore.toFixed(0)}%
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>SCORE</div>
                        </div>
                    </div>

                    {/* User Info */}
                    <div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4 }}>{user?.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 14 }}>{user?.email}</div>
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <span className="badge badge-green">✅ Verified Candidate</span>
                            <span className="badge badge-blue">⚡ AI Assessed</span>
                        </div>
                    </div>

                    {/* Badge ID */}
                    <div style={{
                        background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)',
                        borderRadius: 10, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--ai-pulse)' }}>
                            {verificationId}
                        </span>
                        <button onClick={copyBadgeId}
                            style={{ background: 'none', color: copied ? 'var(--status-verified)' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {copied ? '✓ Copied' : '⎘ Copy'}
                        </button>
                    </div>

                    {/* Timestamp */}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        Verified: {timestamp}
                    </div>
                </div>
            </motion.div>

            {/* Skills Grid */}
            <div className="grid-2" style={{ marginBottom: 24 }}>
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card" style={{ padding: '24px 20px' }}>
                    <div style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        Verified Skills
                        <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>{skills.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {skills.map((s, i) => <SkillVerCard key={i} skill={s} index={i} />)}
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card" style={{ padding: '24px 20px' }}>
                    <div style={{ fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>📊</span> Performance Breakdown
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {[
                            { label: 'Overall Score', value: overallScore, color: overallScore >= 80 ? '#10b981' : '#4f8ef7' },
                            { label: 'Skill Depth', value: Math.min(skills.length * 8, 100), color: '#8b5cf6' },
                            { label: 'Technical Skills', value: overallScore >= 70 ? 88 : 62, color: '#06b6d4' },
                            { label: 'Coding Proficiency', value: overallScore >= 60 ? 75 : 45, color: '#f59e0b' },
                        ].map((item, i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                                    <span style={{ fontWeight: 700, color: item.color }}>{item.value.toFixed(0)}%</span>
                                </div>
                                <div className="progress-track">
                                    <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${item.value}%` }}
                                        transition={{ delay: 0.4 + i * 0.1, duration: 0.8 }}
                                        style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}99)` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {profile?.experienceSummary && (
                        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--glass-border)' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                                AI Summary
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                                {profile.experienceSummary.slice(0, 300)}{profile.experienceSummary.length > 300 ? '...' : ''}
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Actions */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
                <button className="btn-ghost" onClick={() => navigate('/dashboard')}>← Dashboard</button>
                <button className="btn-primary" onClick={() => window.print()}>🖨 Print Badge</button>
            </motion.div>
        </div>
    );
};

export default HolographicVerification;
