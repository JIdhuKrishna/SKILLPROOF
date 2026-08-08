import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

/* ─── Candidate Card ──────────────────────────────────────────── */
const CandidateCard = ({ candidate, index }) => {
    const score = candidate.profile?.overallScore ?? candidate.overallScore ?? 0;
    const skills = candidate.profile?.extractedSkills ?? candidate.skills ?? [];
    const name = candidate.name || 'Unknown Candidate';
    const email = candidate.email || '';
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#4f8ef7' : '#f59e0b';

    // Integrity Metrics
    const trustScore = candidate.profile?.trustScore ?? 100;
    const aiRisk = candidate.profile?.aiDependencyIndex ?? 0;
    const navigate = useNavigate();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="glass-card"
            style={{ padding: '22px 24px' }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
        >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                {/* Avatar */}
                <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: 'linear-gradient(135deg, var(--ai-pulse), var(--accent-violet))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '1rem', color: '#fff',
                    boxShadow: '0 4px 12px var(--ai-pulse-glow)',
                }}>
                    {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>{name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</div>
                </div>
                {/* Score badge */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: '1.3rem', color: scoreColor, lineHeight: 1 }}>{score.toFixed(0)}%</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>SCORE</div>
                </div>
            </div>

            {/* Score bar */}
            <div className="progress-track" style={{ marginBottom: 14 }}>
                <motion.div className="progress-fill"
                    initial={{ width: 0 }} animate={{ width: `${score}%` }}
                    transition={{ delay: index * 0.06 + 0.3, duration: 0.8 }}
                    style={{ background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}aa)` }} />
            </div>

            {/* Skills */}
            {skills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {skills.slice(0, 5).map((s, i) => (
                        <span key={i} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>
                            {typeof s === 'string' ? s : s.name}
                        </span>
                    ))}
                    {skills.length > 5 && (
                        <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.7rem', border: '1px solid var(--glass-border)' }}>
                            +{skills.length - 5} more
                        </span>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-green" style={{ flex: 1, justifyContent: 'center', minWidth: '80px' }}>✅ Verified</span>
                <span className="badge" style={{ flex: 1, justifyContent: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--status-verified)', color: 'var(--status-verified)', minWidth: '80px' }}>🛡️ Trust: {trustScore}%</span>
                <span className="badge" style={{ flex: 1, justifyContent: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--status-warning)', color: 'var(--status-warning)', minWidth: '80px' }}>🤖 AI Risk: {aiRisk.toFixed(1)}</span>
                <button className="btn-ghost" onClick={() => navigate(`/recruiter/candidate/${candidate._id}`)} style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem', minWidth: '80px' }}>
                    View Proof →
                </button>
            </div>
        </motion.div>
    );
};

/* ── Search & Filter ─────────────────────────────────────────── */
const SORT_OPTIONS = [
    { value: 'score_desc', label: 'Score: High → Low' },
    { value: 'score_asc', label: 'Score: Low → High' },
    { value: 'name_asc', label: 'Name: A → Z' },
    { value: 'skills_desc', label: 'Most Skills' },
    { value: 'trust_desc', label: 'Trust Score: High → Low' },
    { value: 'ai_asc', label: 'AI Dependency: Low → High' },
];

/* ══════════════════════════════════════════════════════════════ */
const RecruiterHub = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [minScore, setMinScore] = useState(0);
    const [sortBy, setSortBy] = useState('score_desc');
    const [skillFilter, setSkillFilter] = useState('');
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    /* Fetch stats */
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/api/recruiter/stats');
                setStats(res.data);
            } catch (err) {
                console.error("Failed to load recruiter stats", err);
            } finally {
                setStatsLoading(false);
            }
        };
        fetchStats();
    }, []);

    /* Fetch verified candidates from backend */
    useEffect(() => {
        const fetchCandidates = async () => {
            try {
                const res = await api.get('/api/recruiter/candidates');
                setCandidates(res.data || []);
            } catch (err) {
                /* Fallback: try fetching all users with completed profiles */
                try {
                    const res2 = await api.get('/api/users/verified');
                    setCandidates(res2.data || []);
                } catch {
                    setError(err.response?.data?.message || 'Failed to load candidates.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchCandidates();
    }, []);

    /* All unique skills across candidates */
    const allSkills = useMemo(() => {
        const set = new Set();
        candidates.forEach(c => {
            const skills = c.profile?.extractedSkills ?? c.skills ?? [];
            skills.forEach(s => set.add(typeof s === 'string' ? s : s.name));
        });
        return Array.from(set).sort();
    }, [candidates]);

    /* Apply search + filter + sort */
    const filteredCandidates = useMemo(() => {
        let list = [...candidates];

        /* Basic search: name or email */
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(c =>
                c.name?.toLowerCase().includes(q) ||
                c.email?.toLowerCase().includes(q)
            );
        }

        /* Score filter */
        if (minScore > 0) {
            list = list.filter(c => {
                const s = c.profile?.overallScore ?? c.overallScore ?? 0;
                return s >= minScore;
            });
        }

        /* Skill filter */
        if (skillFilter) {
            list = list.filter(c => {
                const skills = c.profile?.extractedSkills ?? c.skills ?? [];
                return skills.some(s => (typeof s === 'string' ? s : s.name).toLowerCase() === skillFilter.toLowerCase());
            });
        }

        /* Sort */
        list.sort((a, b) => {
            const sa = a.profile?.overallScore ?? a.overallScore ?? 0;
            const sb = b.profile?.overallScore ?? b.overallScore ?? 0;
            if (sortBy === 'score_desc') return sb - sa;
            if (sortBy === 'score_asc') return sa - sb;
            if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
            if (sortBy === 'skills_desc') {
                const la = (a.profile?.extractedSkills ?? a.skills ?? []).length;
                const lb = (b.profile?.extractedSkills ?? b.skills ?? []).length;
                return lb - la;
            }
            if (sortBy === 'trust_desc') {
                const ta = a.profile?.trustScore ?? 100;
                const tb = b.profile?.trustScore ?? 100;
                return tb - ta;
            }
            if (sortBy === 'ai_asc') {
                const aia = a.profile?.aiDependencyIndex ?? 0;
                const aib = b.profile?.aiDependencyIndex ?? 0;
                return aia - aib;
            }
            return 0;
        });

        return list;
    }, [candidates, search, minScore, sortBy, skillFilter]);

    const clearFilters = useCallback(() => {
        setSearch(''); setMinScore(0); setSortBy('score_desc'); setSkillFilter('');
    }, []);

    return (
        <div style={{ minHeight: '100vh' }}>
            {/* Navbar */}
            <nav className="navbar">
                <div className="navbar-brand">
                    <div className="logo-icon" style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, var(--ai-pulse), var(--accent-violet))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                    }}>⚡</div>
                    <span>Skill<span className="text-gradient-blue">Proof</span> Recruiter Hub</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                        👋 {user?.name}
                    </span>
                    <button className="btn-ghost" style={{ padding: '8px 16px', fontSize: '0.83rem' }} onClick={logout}>
                        Sign Out
                    </button>
                </div>
            </nav>

            <div className="page-container-wide">
                {/* Page Header */}
                <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                        <div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                                🔍 Verified Talent Pool
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '4px 0 0' }}>
                                Browse AI-verified candidates with proof-based skill scores
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <span className="badge badge-green">{filteredCandidates.length} Candidates</span>
                            <span className="badge badge-blue">{allSkills.length} Unique Skills</span>
                        </div>
                    </div>
                </motion.div>

                {/* Analytics Header */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: 20,
                        marginBottom: 28
                    }}
                >
                    {/* Total Talent Card */}
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1.2rem' }}>👥</span> Total Talent
                        </div>
                        {statsLoading ? (
                            <div style={{ height: 32, width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} className="animate-pulse" />
                        ) : (
                            <div style={{ fontSize: '1.8rem', fontWeight: 900 }}>{stats?.totalCandidates || 0}</div>
                        )}
                    </div>

                    {/* Quality Index Card */}
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1.2rem', color: 'var(--accent-violet)' }}>⚡</span> Quality Index
                        </div>
                        {statsLoading ? (
                            <div style={{ height: 32, width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} className="animate-pulse" />
                        ) : (
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--accent-violet)' }}>
                                {stats?.averageSkillScore?.toFixed(1) || 0}%
                            </div>
                        )}
                    </div>

                    {/* System Integrity Card */}
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1.2rem', color: 'var(--status-verified)' }}>🛡️</span> System Integrity
                        </div>
                        {statsLoading ? (
                            <div style={{ height: 32, width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} className="animate-pulse" />
                        ) : (
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--status-verified)' }}>
                                {stats?.globalIntegrityRate?.toFixed(1) || 0}%
                            </div>
                        )}
                    </div>

                    {/* AI Risk Card */}
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1.2rem', color: 'var(--status-warning)' }}>🤖</span> AI Risk
                        </div>
                        {statsLoading ? (
                            <div style={{ height: 32, width: '60%', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} className="animate-pulse" />
                        ) : (
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--status-warning)' }}>
                                {stats?.averageAiDependency?.toFixed(2) || '0.00'}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Filters Panel */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="glass-card" style={{ padding: '20px 24px', marginBottom: 28 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, alignItems: 'end' }}>
                        {/* Search */}
                        <div>
                            <label className="input-label">Search</label>
                            <input className="input-glass" placeholder="Name or email..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>

                        {/* Skill filter */}
                        <div>
                            <label className="input-label">Filter by Skill</label>
                            <select className="input-glass" value={skillFilter} onChange={e => setSkillFilter(e.target.value)}>
                                <option value="">All Skills</option>
                                {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Min score */}
                        <div>
                            <label className="input-label">Min Score: {minScore}%</label>
                            <input type="range" min={0} max={100} step={5} value={minScore} onChange={e => setMinScore(Number(e.target.value))}
                                style={{ width: '100%', accentColor: 'var(--ai-pulse)', cursor: 'pointer', marginTop: 6 }} />
                        </div>

                        {/* Sort */}
                        <div>
                            <label className="input-label">Sort By</label>
                            <select className="input-glass" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        {/* Clear */}
                        <button className="btn-ghost" style={{ padding: '12px', alignSelf: 'flex-end' }} onClick={clearFilters}>
                            ✕ Clear
                        </button>
                    </div>
                </motion.div>

                {/* Candidate Grid */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', gap: 16, flexDirection: 'column' }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} style={{ fontSize: '2.5rem' }}>⚙️</motion.div>
                        <div style={{ color: 'var(--text-muted)' }}>Loading verified candidates...</div>
                    </div>
                ) : error ? (
                    <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>
                ) : filteredCandidates.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔍</div>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>No candidates found</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Try adjusting your filters.</div>
                        <button className="btn-ghost" style={{ marginTop: 20 }} onClick={clearFilters}>Clear Filters</button>
                    </motion.div>
                ) : (
                    <div className="grid-auto">
                        {filteredCandidates.map((c, i) => (
                            <CandidateCard key={c._id || i} candidate={c} index={i} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecruiterHub;
