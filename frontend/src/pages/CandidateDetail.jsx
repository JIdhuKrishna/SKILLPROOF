import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Radar, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer
} from 'recharts';
import api from '../api/axios';

const CandidateDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/api/recruiter/candidate/${id}`);
                setData(res.data);
            } catch (err) {
                console.error('Error fetching candidate:', err);
                setError('Failed to fetch candidate details.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} style={{ fontSize: '3rem' }}>
                    ⚙️
                </motion.div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: 100 }}>
                <h2>Candidate Not Found</h2>
                <p>{error}</p>
                <button className="btn-ghost" onClick={() => navigate('/recruiter')}>← Back to Hub</button>
            </div>
        );
    }

    const { user, profile, assessment } = data;

    const trustScore = profile?.trustScore ?? 100;
    const aiRiskIndex = profile?.aiDependencyIndex ?? 0;
    const isHighlyTrusted = trustScore > 90;

    // Mapping industry context
    const detectedIndustry = assessment?.industry || profile?.detectedIndustry || 'General';
    const isTech = /software|programming|developer|engineering/i.test(detectedIndustry);

    // Prepare data for the Radar Chart using the new 3 pillars
    const skillsData = [
        { subject: 'Technical', A: assessment?.technicalScore || 0, fullMark: 100 },
        { subject: 'Logical', A: assessment?.logicalScore || 0, fullMark: 100 },
        { subject: 'Critical Thinking', A: assessment?.criticalScore || 0, fullMark: 100 }
    ];

    return (
        <div style={{ minHeight: '100vh', paddingBottom: 60 }}>
            {/* Navbar Simple */}
            <nav className="navbar">
                <div className="navbar-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/recruiter')}>
                    ← Back to Hub
                </div>
            </nav>

            <div className="page-container-wide">

                {/* Holographic Header */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="glass-card"
                    style={{ padding: '30px', marginBottom: '30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{
                            width: 70, height: 70, borderRadius: 16, flexShrink: 0,
                            background: 'linear-gradient(135deg, var(--ai-pulse), var(--accent-violet))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '1.8rem', color: '#fff',
                            boxShadow: isHighlyTrusted ? '0 0 20px var(--ai-pulse-glow)' : 'default'
                        }}>
                            {user.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'C'}
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900 }}>{user.name}</h1>
                            <div style={{ color: 'var(--text-muted)' }}>{user.email} | {user.role}</div>
                            <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', padding: '4px 12px', borderRadius: 99, fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                                <span>🏢</span> Industry: {detectedIndustry}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="badge badge-amber" style={{ padding: '10px 16px', fontSize: '1rem' }}>
                            🤖 AI Risk: {aiRiskIndex.toFixed(1)}
                        </div>
                        <motion.div
                            animate={isHighlyTrusted ? { scale: [1, 1.05, 1], boxShadow: ['0 0 0px var(--status-verified)', '0 0 15px var(--status-verified)', '0 0 0px var(--status-verified)'] } : {}}
                            transition={isHighlyTrusted ? { repeat: Infinity, duration: 2 } : {}}
                            className="badge"
                            style={{ padding: '10px 16px', fontSize: '1rem', background: 'rgba(0,0,0,0.3)', border: `1px solid ${isHighlyTrusted ? 'var(--status-verified)' : 'var(--status-warning)'}`, color: isHighlyTrusted ? 'var(--status-verified)' : 'var(--status-warning)' }}
                        >
                            🛡️ {isHighlyTrusted ? 'Highly Trusted' : 'Warning'} (Trust: {trustScore}%)
                        </motion.div>
                        <div className="badge badge-blue" style={{ padding: '10px 16px', fontSize: '1rem' }}>
                            Score: {profile?.overallScore?.toFixed(0) || 0}%
                        </div>
                    </div>
                </motion.div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'start' }}>

                    {/* Skill Radar Chart */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="glass-card" style={{ padding: '24px' }}
                    >
                        <h3 style={{ margin: '0 0 20px 0' }}>🎯 Competency Profile</h3>
                        <div style={{ height: 300, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillsData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.2)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'transparent' }} />
                                    <Radar name="Competencies" dataKey="A" stroke="var(--ai-pulse)" fill="url(#colorUv)" fillOpacity={0.6} />
                                    <defs>
                                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--ai-pulse)" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="var(--accent-violet)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Behavioral Integrity Scorecard */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="glass-card" style={{ padding: '24px' }}
                    >
                        <h3 style={{ margin: '0 0 20px 0' }}>⏳ Behavioral Integrity Scorecard</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {assessment ? (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--status-verified)' }} />
                                        <div>
                                            <div style={{ fontWeight: 600 }}>Assessment Started</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(assessment.startTime).toLocaleString()}</div>
                                        </div>
                                    </div>

                                    {/* Breaches Timeline */}
                                    <div style={{ display: 'flex', gap: 12, marginLeft: 4, paddingLeft: 18, borderLeft: (assessment.tabSwitchCount > 0 || assessment.copyPasteCount > 0) ? '2px dashed var(--status-warning)' : '2px dashed var(--status-verified)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 0', width: '100%' }}>
                                            {assessment.tabSwitchCount > 0 ? (
                                                <div style={{ background: 'rgba(255, 171, 0, 0.1)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--status-warning)', color: 'var(--status-warning)', fontSize: '0.9rem' }}>
                                                    ⚠️ {assessment.tabSwitchCount} Tab-Switch Event(s) Detected
                                                </div>
                                            ) : (
                                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--status-verified)', color: 'var(--status-verified)', fontSize: '0.9rem' }}>
                                                    ✅ 0 Tab-Switches (Focused Session)
                                                </div>
                                            )}
                                            {assessment.copyPasteCount > 0 ? (
                                                <div style={{ background: 'rgba(255, 171, 0, 0.1)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--status-warning)', color: 'var(--status-warning)', fontSize: '0.9rem' }}>
                                                    ⚠️ {assessment.copyPasteCount} Copy-Paste Event(s) Detected
                                                </div>
                                            ) : (
                                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--status-verified)', color: 'var(--status-verified)', fontSize: '0.9rem' }}>
                                                    ✅ 0 Copy-Paste Events (High Organic Input)
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: assessment.status === 'Completed' ? 'var(--status-verified)' : 'var(--text-muted)' }} />
                                        <div>
                                            <div style={{ fontWeight: 600 }}>Assessment {assessment.status || 'Pending'}</div>
                                            {assessment.endTime && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(assessment.endTime).toLocaleString()}</div>
                                            )}
                                        </div>
                                    </div>

                                    {assessment.startTime && assessment.endTime && (
                                        <div style={{ marginTop: 10, padding: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8, fontSize: '0.9rem' }}>
                                            <strong>Total Duration: </strong>
                                            {Math.round((new Date(assessment.endTime) - new Date(assessment.startTime)) / 60000)} minutes
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ color: 'var(--text-muted)' }}>No assessment data available for this candidate.</div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Proof of Work Panel */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="glass-card" style={{ padding: '30px', marginTop: '30px' }}
                >
                    <h3 style={{ margin: '0 0 20px 0' }}>📝 Proof of Work / Response Analysis</h3>
                    {!assessment || !assessment.questions || assessment.questions.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)' }}>No answers submitted yet.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {assessment.questions.map((q, index) => {
                                const isCorrect = q.type !== 'coding' && q.category !== 'critical' ? (String(q.correctAnswer).trim().toLowerCase() === String(q.userAnswer || '').trim().toLowerCase()) : null;
                                const isTechBlock = isTech && q.type === 'coding';
                                const isTextBlock = !isTechBlock && (q.category === 'logical' || q.category === 'critical' || q.type === 'analytical');

                                return (
                                    <div key={index} style={{ background: 'rgba(255,255,255,0.02)', padding: 24, borderRadius: 12, border: '1px solid var(--glass-border)' }}>
                                        <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center' }}>
                                            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--ai-pulse)' }}>Q{index + 1}</span>
                                            <span className={`badge ${q.category === 'technical' ? 'badge-blue' : q.category === 'logical' ? 'badge-violet' : 'badge-amber'}`}>
                                                {q.category ? q.category.toUpperCase() : 'GENERAL'}
                                            </span>
                                            {isCorrect !== null && (
                                                <span className={`badge ${isCorrect ? 'badge-green' : 'badge-red'}`}>
                                                    {isCorrect ? 'Correct Phase' : 'Incorrect Phase'}
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ fontWeight: 600, marginBottom: 16, fontSize: '1.05rem', lineHeight: 1.5 }}>
                                            {q.type === 'coding' && !isTechBlock ? q.problemStatement : q.questionText}
                                        </div>

                                        {q.type === 'coding' && isTechBlock && (
                                            <div style={{ marginBottom: 16 }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>Problem Statement</div>
                                                <div style={{ background: 'rgba(0,0,0,0.5)', padding: 16, borderRadius: 8, fontSize: '0.9rem', whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    {q.problemStatement}
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: (isTechBlock || isTextBlock) ? '1fr' : '1fr 1fr', gap: 20 }}>
                                            <div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                                                    Candidate's {isTechBlock ? 'Submitted Code' : 'Answer'}
                                                </div>
                                                <div className={isTechBlock ? "terminal" : ""} style={{
                                                    background: isTechBlock ? '#0d1117' : 'rgba(0,0,0,0.4)',
                                                    padding: 16,
                                                    borderRadius: 8,
                                                    minHeight: 50,
                                                    fontFamily: isTechBlock ? 'var(--font-mono)' : 'inherit',
                                                    whiteSpace: 'pre-wrap',
                                                    color: q.userAnswer ? (isTechBlock ? '#d4d4d4' : '#fff') : 'var(--text-muted)',
                                                    border: isTechBlock ? '1px solid rgba(79,142,247,0.2)' : '1px solid rgba(255,255,255,0.05)',
                                                    lineHeight: 1.6
                                                }}>
                                                    {isTechBlock ? (q.userAnswer || '# No code submitted') : (q.userAnswer || 'No textual answer provided')}
                                                </div>
                                            </div>

                                            {!isTechBlock && !isTextBlock && q.type !== 'coding' && (
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>Expected Answer</div>
                                                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: 16, borderRadius: 8, minHeight: 50, border: '1px dashed var(--status-verified)' }}>
                                                        {q.correctAnswer || 'Not explicitly defined'}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </motion.div>

            </div>
        </div>
    );
};

export default CandidateDetail;
