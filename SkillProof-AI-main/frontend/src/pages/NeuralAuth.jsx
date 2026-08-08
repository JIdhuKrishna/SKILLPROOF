import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';

/* ── Particle Background ──────────────────────────────────────── */
const ParticleBg = () => (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
                key={i}
                style={{
                    position: 'absolute',
                    width: Math.random() * 3 + 1,
                    height: Math.random() * 3 + 1,
                    borderRadius: '50%',
                    background: i % 3 === 0 ? 'var(--ai-pulse)' : i % 3 === 1 ? 'var(--accent-violet)' : 'var(--accent-cyan)',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    opacity: Math.random() * 0.5 + 0.1,
                }}
                animate={{ y: [0, -30, 0], opacity: [0.2, 0.6, 0.2] }}
                transition={{ duration: Math.random() * 4 + 4, repeat: Infinity, delay: Math.random() * 3 }}
            />
        ))}
    </div>
);

/* ── Input Field ─────────────────────────────────────────────── */
const Field = ({ label, type = 'text', value, onChange, placeholder, required }) => (
    <div style={{ marginBottom: 20 }}>
        <label className="input-label">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className="input-glass"
        />
    </div>
);

/* ══════════════════════════════════════════════════════════════ */
const NeuralAuth = () => {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Candidate');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, register, user } = useContext(AuthContext);
    const navigate = useNavigate();

    /* If already logged in, redirect to correct dashboard */
    useEffect(() => {
        if (user) {
            if (user.role === 'Recruiter') navigate('/recruiter');
            else navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        let result;
        if (mode === 'login') {
            result = await login(email, password);
        } else {
            result = await register(name, email, password, role);
        }

        setLoading(false);

        if (result.success) {
            /* Role-based redirection */
            const resolvedRole = result.role || role;
            if (resolvedRole === 'Recruiter') navigate('/recruiter');
            else navigate('/dashboard');
        } else {
            setError(result.message);
        }
    };

    const switchMode = () => {
        setMode(m => m === 'login' ? 'register' : 'login');
        setError('');
        setName(''); setEmail(''); setPassword(''); setRole('Candidate');
    };

    const panelVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.97 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: 'easeOut' } },
        exit: { opacity: 0, y: -20, scale: 0.97, transition: { duration: 0.25 } },
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <ParticleBg />

            {/* Glow orbs */}
            <div style={{
                position: 'fixed', top: '15%', left: '10%', width: 400, height: 400,
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,142,247,0.08) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'fixed', bottom: '15%', right: '10%', width: 350, height: 350,
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div className="page-container-sm" style={{ position: 'relative', zIndex: 1 }}>
                {/* Brand Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ textAlign: 'center', marginBottom: 36 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                        <div className="logo-icon" style={{
                            width: 48, height: 48, borderRadius: 14,
                            background: 'linear-gradient(135deg, var(--ai-pulse), var(--accent-violet))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 22, fontWeight: 900, boxShadow: '0 0 30px var(--ai-pulse-glow)',
                        }}>
                            ⚡
                        </div>
                        <span style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em' }}>
                            Skill<span className="text-gradient-blue">Proof</span>
                        </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                        AI-Powered Skill Verification Platform
                    </p>
                </motion.div>

                {/* Auth Card */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        variants={panelVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="glass-card"
                        style={{ padding: '36px 42px' }}
                    >
                        {/* Mode Toggle Tabs */}
                        <div style={{
                            display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 12,
                            padding: 4, marginBottom: 32, border: '1px solid var(--glass-border)',
                        }}>
                            {['login', 'register'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => { setMode(m); setError(''); }}
                                    style={{
                                        flex: 1, padding: '9px 0', borderRadius: 9, fontWeight: 600,
                                        fontSize: '0.85rem', letterSpacing: '0.03em', textTransform: 'capitalize',
                                        transition: 'all 0.25s ease',
                                        background: mode === m ? 'linear-gradient(135deg, var(--ai-pulse), var(--accent-violet))' : 'transparent',
                                        color: mode === m ? '#fff' : 'var(--text-muted)',
                                        boxShadow: mode === m ? '0 4px 16px var(--ai-pulse-glow)' : 'none',
                                    }}
                                >
                                    {m === 'login' ? '🔐 Sign In' : '🚀 Register'}
                                </button>
                            ))}
                        </div>

                        {/* Error Alert */}
                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="alert alert-error"
                                    style={{ marginBottom: 20 }}
                                >
                                    <span style={{ flexShrink: 0 }}>⚠</span>
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <form onSubmit={handleSubmit}>
                            {/* Register: extra fields */}
                            {mode === 'register' && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Field label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required />
                                </motion.div>
                            )}

                            <Field
                                label="Email Address"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                            <Field
                                label="Password"
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder={mode === 'login' ? '••••••••' : 'Min. 8 characters'}
                                required
                            />

                            {mode === 'register' && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: 0.05 }}
                                    style={{ marginBottom: 20 }}
                                >
                                    <label className="input-label">Role</label>
                                    <select
                                        value={role}
                                        onChange={e => setRole(e.target.value)}
                                        className="input-glass"
                                    >
                                        <option value="Candidate">🧑‍💻 Candidate — Get Verified</option>
                                        <option value="Recruiter">🔍 Recruiter — Find Talent</option>
                                    </select>
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary"
                                style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: 8 }}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner spinner-sm" />
                                        {mode === 'login' ? 'Authenticating...' : 'Creating Account...'}
                                    </>
                                ) : (
                                    mode === 'login' ? '🔓 Sign In' : '⚡ Create Account'
                                )}
                            </button>
                        </form>

                        {/* Footer link */}
                        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                            <button
                                onClick={switchMode}
                                style={{ background: 'none', color: 'var(--ai-pulse)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                                {mode === 'login' ? 'Register here' : 'Sign in'}
                            </button>
                        </p>
                    </motion.div>
                </AnimatePresence>


            </div>
        </div>
    );
};

export default NeuralAuth;
