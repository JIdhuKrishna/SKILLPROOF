import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const userRole = user?.role || 'Candidate';
    const navigate = useNavigate();

    const [file, setFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    const [profile, setProfile] = useState(null);
    const [candidates, setCandidates] = useState([]);

    // Fetch Candidate Profile
    useEffect(() => {
        const fetchProfile = async () => {
            if (userRole === 'Candidate') {
                try {
                    const res = await api.get('/api/profile');
                    if (res.data) setProfile(res.data);
                } catch (error) {
                    console.log('No existing profile or error fetching profile:', error.response?.data?.message || error.message);
                }
            }
        };
        fetchProfile();
    }, [userRole]);

    // Fetch Real Candidates for Recruiter View (Replaces Mock Data)
    useEffect(() => {
        const fetchCandidates = async () => {
            if (userRole === 'Recruiter') {
                try {
                    const res = await api.get('/api/profile/all'); // Assuming this endpoint exists for recruiters
                    setCandidates(res.data);
                } catch (error) {
                    console.log('Error fetching candidates:', error);
                }
            }
        };
        fetchCandidates();
    }, [userRole]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setUploadStatus('Please select a file first.');
            return;
        }

        setUploadStatus('Uploading...');

        const formData = new FormData();
        formData.append('resume', file);

        try {
            const response = await api.post('/api/upload/resume', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setUploadStatus('Upload successful! AI (Gemini) processing started... ' + (response.data.message || ''));

            // Re-fetch profile to ensure we have the new profile ID for navigation
            const fetchedProfile = await api.get('/api/profile');
            if (fetchedProfile.data) setProfile(fetchedProfile.data);
            setFile(null);
        } catch (error) {
            setUploadStatus('Upload failed. ' + (error.response?.data?.message || error.message));
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                            Skillproof Dashboard
                        </h1>
                        <p className="text-slate-500 mt-2 text-lg">
                            Welcome, {user?.name}! {userRole === 'Candidate' ? 'Manage your proof-based profile.' : 'Discover pre-verified talent.'}
                        </p>
                    </div>
                    <button
                        onClick={logout}
                        className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
                    >
                        Sign out
                    </button>
                </header>

                {userRole === 'Candidate' ? (
                    <div className="space-y-8">
                        {/* SkillProof Verification Card */}
                        {profile && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow duration-300">
                                <h2 className="text-2xl font-bold text-slate-800 mb-6">SkillProof Verification</h2>

                                {profile.overallScore > 0 ? (
                                    <div className="flex items-center gap-6 bg-emerald-50 border border-emerald-100 p-6 rounded-xl">
                                        <div className="relative w-24 h-24 rounded-full bg-emerald-100 border-4 border-emerald-500 flex items-center justify-center flex-shrink-0 shadow-inner">
                                            <span className="text-2xl font-black text-emerald-700">{profile.overallScore.toFixed(0)}%</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-emerald-700 flex items-center gap-2">
                                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                                                Verified Assessment
                                            </h3>
                                            <p className="text-emerald-600 mt-2 font-medium">Your technical skills have been successfully evaluated and locked to your profile.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            <h3 className="text-xl font-bold text-amber-800">Assessment Pending</h3>
                                        </div>
                                        <p className="text-amber-700 mt-3 font-medium">You have uploaded your resume, but completing the technical assessment is required to verify your skills.</p>
                                        <button
                                            onClick={() => navigate(`/assessment/${profile._id}`)}
                                            className="mt-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-amber-200 transform transition-all hover:-translate-y-0.5 hover:scale-105"
                                        >
                                            Take Assessment Now
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Resume Extraction Terminal (DNA Emoji Removed) */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 hover:shadow-md transition-shadow duration-300">
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-800">Resume Extraction Terminal</h2>
                                <p className="text-slate-600 mt-2">
                                    Upload your PDF resume. Our AI (Gemini) will parse your experience, extract core skills, and generate a customized skill assessment.
                                </p>
                            </div>

                            <form onSubmit={handleUpload} className="space-y-6">
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-indigo-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <svg className="w-12 h-12 mb-4 text-indigo-400 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                                            </svg>
                                            <p className="mb-2 text-base text-slate-600 font-semibold group-hover:text-slate-800">
                                                {file ? file.name : 'Click to upload or drag and drop'}
                                            </p>
                                            <p className="text-sm text-slate-400">PDF ONLY (MAX. 5MB)</p>
                                        </div>
                                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 active:transform active:scale-95 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 ease-in-out shadow-sm shadow-indigo-200"
                                >
                                    Upload & Extract Skills
                                </button>
                            </form>

                            {uploadStatus && (
                                <div className={`mt-6 p-4 rounded-xl text-sm font-medium border ${uploadStatus.includes('successful')
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : uploadStatus.includes('Please')
                                        ? 'bg-rose-50 text-rose-700 border-rose-100'
                                        : 'bg-blue-50 text-blue-700 border-blue-100'
                                    }`}>
                                    {uploadStatus}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Recruiter View (Pre-configured for Phase E) */
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                            <h2 className="text-2xl font-bold text-slate-800">Candidate List</h2>
                            <span className="bg-indigo-50 text-indigo-700 py-1 px-3 rounded-full text-sm font-semibold">
                                {candidates.length} Found
                            </span>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate Profile</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">AI Extracted Skills</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Skillproof Score</th>
                                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {candidates.map((candidate) => (
                                        <tr key={candidate._id || candidate.id} className="hover:bg-slate-50 transition-colors duration-200">
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                                                        {candidate.name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-slate-900">{candidate.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap gap-2">
                                                    {candidate.skills?.map((skill, idx) => (
                                                        <span key={idx} className="bg-blue-50 text-blue-700 border border-blue-100 text-xs px-2.5 py-1 rounded-md font-medium">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <span className={`text-sm font-bold ${(candidate.overallScore || candidate.score) >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {(candidate.overallScore || candidate.score || 0).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-sm font-medium">
                                                <button className="text-indigo-600 hover:text-indigo-900 hover:underline decoration-2 underline-offset-4 transition-all">
                                                    View Proofs
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {candidates.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-slate-500 text-lg">No verified candidates available yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;