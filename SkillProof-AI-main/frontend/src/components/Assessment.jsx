import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Assessment = () => {
    const { profileId } = useParams();
    const navigate = useNavigate();

    const [questions, setQuestions] = useState([]);
    const [status, setStatus] = useState('Pending');
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minute countdown
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [hasWarned, setHasWarned] = useState(false);

    // Code Execution States
    const [isExecuting, setIsExecuting] = useState({});
    const [executionResults, setExecutionResults] = useState({});


    useEffect(() => {
        const fetchAssessment = async () => {
            try {
                const res = await api.get(`/api/assessment/${profileId}`);
                const qs = res.data.questions;
                setQuestions(qs);
                setStatus(res.data.status);

                // Pre-populate coding answers with initial boilerplate
                const initialAnswers = {};
                qs.forEach((q, index) => {
                    if (q.type === 'coding') {
                        initialAnswers[index] = q.initialCode || '';
                    }
                });
                setAnswers(initialAnswers);

                setLoading(false);

                if (res.data.status === 'Completed') {
                    setResult({ message: 'You have already completed this assessment.' });
                }
            } catch (err) {
                console.error(err);
                setError(err.response?.data?.message || 'Failed to load assessment.');
                setLoading(false);
            }
        };
        fetchAssessment();
    }, [profileId]);

    const handleOptionChange = (questionIndex, option) => {
        setAnswers({
            ...answers,
            [questionIndex]: option
        });
    };

    const handleCodeChange = (questionIndex, code) => {
        setAnswers({
            ...answers,
            [questionIndex]: code
        });
    };

    const handleKeyDown = (e, questionIndex) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = e.target;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            // Set textarea value to: text before caret + 4 spaces + text after caret
            const newCode = textarea.value.substring(0, start) + '    ' + textarea.value.substring(end);

            // Update the state
            handleCodeChange(questionIndex, newCode);

            // Move caret to after the 4 spaces. Requires a micro-delay for React state to flush
            requestAnimationFrame(() => {
                textarea.selectionStart = start + 4;
                textarea.selectionEnd = start + 4;
            });
        }
    };

    const handleRunCode = async (questionIndex) => {
        const code = answers[questionIndex] || '';
        if (!code.trim()) return;

        setIsExecuting(prev => ({ ...prev, [questionIndex]: true }));
        try {
            // Simple heuristic to detect language
            let languageId = 71; // Python default
            if (/function|const |let |console\.log/.test(code)) languageId = 63; // Javascript
            else if (/#include|<iostream>|std::/.test(code)) languageId = 54; // C++
            else if (/public class|System\.out\.print/.test(code)) languageId = 62; // Java

            // Public Judge0 Execution API
            const res = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_code: code,
                    language_id: languageId,
                })
            });

            const data = await res.json();

            const outputText = data.stdout || data.stderr || data.compile_output || data.message || 'Execution finished with no output.';
            const isError = data.stderr || data.compile_output || !!(data.status && data.status.id > 3);

            setExecutionResults(prev => ({
                ...prev,
                [questionIndex]: { output: outputText, isError }
            }));
        } catch (err) {
            console.error('Code execution failed:', err);
            setExecutionResults(prev => ({
                ...prev,
                [questionIndex]: { output: 'Error connecting to execution environment.', isError: true }
            }));
        } finally {
            setIsExecuting(prev => ({ ...prev, [questionIndex]: false }));
        }
    };

    // Anti-Plagiarism: Prevent copy, cut, paste and context menu
    const preventMalpractice = async (e) => {
        e.preventDefault();
        try {
            await api.patch(`/api/assessment/integrity/${profileId}`, { type: 'copy_paste' });
        } catch (err) {
            console.error('Failed to log copy/paste:', err);
        }
    };

    // Tab-Switch Detection: Ruthless Escalation
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && status === 'Pending' && !result && !submitting) {
                // We use sendBeacon for almost guaranteed delivery when an app is closing/hiding.
                // It does not wait for a response and executes reliably in the background natively.
                try {
                    const token = localStorage.getItem('token');
                    const headers = new Headers({
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    });

                    fetch(`http://localhost:5000/api/assessment/integrity/${profileId}`, {
                        method: 'PATCH',
                        headers: headers,
                        body: JSON.stringify({ type: 'tab_switch' }),
                        keepalive: true
                    }).catch(err => console.error('Fetch keepalive failed:', err));

                } catch (err) {
                    console.error('Failed to log tab switch:', err);
                }

                // Immediate submission on tab leave
                handleSubmit('Assessment Terminated: Malpractice/Tab-switching detected.');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [status, result, submitting, profileId]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async (reason = null) => {
        if (submitting || status === 'Completed') return;

        setSubmitting(true);
        setError('');
        setIsTimerActive(false); // Stop timer immediately

        try {
            const formattedAnswers = Object.keys(answers).map(index => ({
                questionIndex: parseInt(index),
                selectedOption: answers[index]
            }));

            const res = await api.post('/api/assessment/submit', {
                profileId,
                answers: formattedAnswers,
                submissionContext: reason || 'Normal Submission'
            });

            const finalResult = res.data;
            if (reason) {
                finalResult.terminationReason = reason;
            }

            setResult(finalResult);
            setStatus('Completed');

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to submit assessment.');
        } finally {
            setSubmitting(false);
        }
    };

    // Timer Logic
    useEffect(() => {
        if (status === 'Pending' && !loading && !result) {
            setIsTimerActive(true);
        } else {
            setIsTimerActive(false);
        }
    }, [status, loading, result]);

    useEffect(() => {
        let timer;
        if (isTimerActive && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && isTimerActive) {
            handleSubmit('Time Expired');
        }
        return () => clearInterval(timer);
    }, [timeLeft, isTimerActive]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="text-xl font-semibold text-blue-600 animate-pulse">Loading Evaluation Engine...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50 p-6">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-lg w-full border border-red-200">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
                    <p className="text-gray-700">{error}</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition-all duration-200 ease-in-out shadow"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (result || status === 'Completed') {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full text-center transform transition-all hover:scale-105 duration-300">
                    <h2 className="text-3xl font-extrabold text-gray-800 mb-4">Assessment Complete</h2>
                    {result && result.score !== undefined ? (
                        <div className="space-y-4">
                            {result.terminationReason && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-semibold mb-4 animate-bounce">
                                    {result.terminationReason}
                                </div>
                            )}
                            <p className="text-lg text-gray-600">Your final score is:</p>
                            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                {result.score.toFixed(0)}%
                            </div>
                            <p className="text-md text-gray-500 font-medium">
                                You got {result.correctCount} out of {result.total} questions correct.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {result?.terminationReason && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-semibold mb-4 text-center">
                                    {result.terminationReason}
                                </div>
                            )}
                            <p className="text-gray-600">{result?.message || 'This assessment has already been submitted.'}</p>
                        </div>
                    )}
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-200 ease-in-out shadow-lg transform hover:-translate-y-1"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 relative">
                        {/* Custom Pulse Animation */}
                        <style>{`
                            @keyframes custom-pulse {
                                0% { transform: scale(1); }
                                50% { transform: scale(1.05); }
                                100% { transform: scale(1); }
                            }
                            .animate-custom-pulse {
                                animation: custom-pulse 1s infinite ease-in-out;
                            }
                        `}</style>

                        {/* Countdown Timer */}
                        <div
                            className={`absolute top-4 right-6 px-4 py-2 rounded-full font-mono font-bold text-lg shadow-inner bg-white/10 backdrop-blur-md border border-white/20 transition-all duration-500 z-10 ${timeLeft <= 60
                                ? 'text-white bg-red-600 border-red-400 animate-custom-pulse shadow-red-500/50'
                                : 'text-blue-100'
                                }`}
                        >
                            {formatTime(timeLeft)}
                        </div>

                        {/* Non-blocking Warning */}
                        {timeLeft <= 60 && status === 'Pending' && (
                            <div className="absolute top-16 right-6 bg-red-600 text-white text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded animate-bounce shadow-lg">
                                Time is running out!
                            </div>
                        )}

                        <h1 className="text-3xl font-extrabold text-white text-center">Technical Assessment</h1>
                        <p className="text-blue-100 text-center mt-2 font-medium">Answer the following questions to prove your skills.</p>
                    </div>

                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
                        onCopy={preventMalpractice}
                        onCut={preventMalpractice}
                        onPaste={preventMalpractice}
                        onContextMenu={preventMalpractice}
                        className="p-8 space-y-8 select-none"
                    >
                        {questions.length === 0 ? (
                            <p className="text-center text-gray-500 text-lg">No questions available for this assessment.</p>
                        ) : (
                            questions.map((q, qIndex) => (
                                <div key={q._id || qIndex} className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                                    <div className="flex items-center mb-4">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold mr-3 text-sm">
                                            {qIndex + 1}
                                        </span>
                                        <h3 className="text-xl font-semibold text-gray-800">
                                            {q.type === 'coding' ? 'Practical Challenge' : q.questionText}
                                        </h3>
                                        <span className={`ml-auto px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${q.type === 'coding' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {q.type === 'coding' ? 'Coding' : 'MCQ'}
                                        </span>
                                    </div>

                                    {q.type === 'coding' ? (
                                        <div className="space-y-4">
                                            <div className="bg-white p-4 rounded-lg border border-gray-200">
                                                <p className="text-gray-700 leading-relaxed font-medium">
                                                    {q.problemStatement}
                                                </p>
                                                {q.expectedOutputDescription && (
                                                    <p className="mt-2 text-sm text-gray-500 italic">
                                                        <span className="font-semibold text-gray-600">Expected:</span> {q.expectedOutputDescription}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="relative group">
                                                <div className="absolute top-3 right-4 z-10 text-[10px] font-mono text-gray-500 opacity-50 uppercase tracking-tighter">
                                                    source_code.py
                                                </div>
                                                <textarea
                                                    value={answers[qIndex] || ''}
                                                    onChange={(e) => handleCodeChange(qIndex, e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, qIndex)}
                                                    className="w-full h-64 p-6 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm rounded-xl border-2 border-transparent focus:border-blue-500 focus:outline-none shadow-2xl resize-none transition-all duration-300 scrollbar-thin scrollbar-thumb-gray-700 whitespace-pre"
                                                    spellCheck={false}
                                                    placeholder="// Write your code here..."
                                                />
                                                <div className="absolute bottom-4 right-4 flex space-x-2">
                                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                </div>
                                            </div>

                                            {/* Action Bar & Console */}
                                            <div className="mt-4 flex flex-col space-y-4">
                                                <div className="flex justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRunCode(qIndex)}
                                                        disabled={isExecuting[qIndex]}
                                                        className={`flex items-center px-6 py-2 rounded-lg font-bold text-sm text-white shadow-md transition-all duration-300 ${isExecuting[qIndex]
                                                            ? 'bg-gray-500 cursor-not-allowed'
                                                            : 'bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5'
                                                            }`}
                                                    >
                                                        {isExecuting[qIndex] ? (
                                                            <>
                                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                Running...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                                Run Code
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                                {/* Console Output */}
                                                {executionResults[qIndex] && (
                                                    <div className="bg-[#0D1117] border border-gray-700 rounded-lg p-4 font-mono text-sm overflow-x-auto shadow-inner mt-2">
                                                        <div className="text-gray-400 text-[10px] uppercase tracking-wider mb-2 font-bold border-b border-gray-700 pb-1">Console Output</div>
                                                        <pre className={`whitespace-pre-wrap ${executionResults[qIndex].isError ? 'text-red-400' : 'text-emerald-400'}`}>
                                                            {executionResults[qIndex].output}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 pl-6">
                                            {q.options && q.options.map((option, oIndex) => (
                                                <label
                                                    key={oIndex}
                                                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors duration-200 ${answers[qIndex] === option ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`question-${qIndex}`}
                                                        value={option}
                                                        checked={answers[qIndex] === option}
                                                        onChange={() => handleOptionChange(qIndex, option)}
                                                        className="w-5 h-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                        required
                                                    />
                                                    <span className="ml-3 text-gray-700 text-lg">{option}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}

                        <div className="pt-6 border-t border-gray-200">
                            <button
                                type="submit"
                                disabled={submitting || questions.length === 0}
                                className={`w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white transition-all duration-300 ${submitting || questions.length === 0
                                    ? 'bg-indigo-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-1'
                                    }`}
                            >
                                {submitting ? 'Evaluating Answers...' : 'Submit Assessment'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Assessment;