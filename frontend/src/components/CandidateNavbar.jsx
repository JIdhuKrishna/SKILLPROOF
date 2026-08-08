import React, { useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';

const CandidateNavbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const navLinks = [
        { to: '/dashboard', label: 'Extract', title: 'Extraction Terminal' },
        { to: '/verification', label: '🔮 Verify', title: 'Holographic Badge' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'inherit', textDecoration: 'none' }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, var(--ai-pulse), var(--accent-violet))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem', fontWeight: 900, boxShadow: '0 0 20px var(--ai-pulse-glow)',
                    }}>⚡</div>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                        Skill<span className="text-gradient-blue">Proof</span>
                    </span>
                </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {navLinks.map(link => (
                    <Link key={link.to} to={link.to}
                        style={{
                            padding: '7px 14px', borderRadius: 9, fontSize: '0.83rem', fontWeight: 600,
                            color: location.pathname === link.to ? 'var(--text-primary)' : 'var(--text-muted)',
                            background: location.pathname === link.to ? 'rgba(79,142,247,0.12)' : 'transparent',
                            border: `1px solid ${location.pathname === link.to ? 'rgba(79,142,247,0.25)' : 'transparent'}`,
                            transition: 'all 0.2s',
                            textDecoration: 'none',
                        }}>
                        {link.label}
                    </Link>
                ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, var(--ai-pulse), var(--accent-violet))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.78rem',
                    }}>
                        {user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{user?.name}</span>
                </div>
                <button className="btn-ghost" style={{ padding: '7px 14px', fontSize: '0.82rem' }} onClick={handleLogout}>
                    Sign Out
                </button>
            </div>
        </nav>
    );
};

export default CandidateNavbar;
