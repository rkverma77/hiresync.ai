import React, { useState, useRef, useEffect } from 'react'
import "../style/home.scss"
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate } from 'react-router'
import { useAuth } from '../../auth/hooks/useAuth.js'
import ProgressBar from '../../../components/ProgressBar.jsx'
import { useFakeProgress } from '../../../hooks/useFakeProgress.js'
import { analyzeResumeFile, getAnalysisHistory } from '../services/interview.api.js'

const GENERATE_MESSAGES = [
    "Reading your resume...",
    "Comparing your profile to the job description...",
    "Crafting tailored interview questions...",
    "Building your preparation roadmap...",
    "Checking AI availability...",
    "AI is busy — waiting for a slot...",
    "Still generating your plan...",
    "Almost there, please hang tight...",
    "Finalizing your interview plan...",
]

const RESUME_QUICK_TIPS = [
    { label: 'Use action verbs', desc: 'Start bullets with Led, Built, Reduced, Grew…', icon: '⚡' },
    { label: 'Quantify impact', desc: 'Add numbers: "Reduced load time by 40%"', icon: '📊' },
    { label: 'Tailor per role', desc: 'Mirror keywords from the job description', icon: '🎯' },
    { label: 'Keep it concise', desc: '1 page for <10 yrs exp, 2 max for senior roles', icon: '✂️' },
]

const ATSMeter = ({ score, label }) => {
    const color = score >= 75 ? '#3fb950' : score >= 50 ? '#f5a623' : '#ff4d4d'
    return (
        <div className='ats-meter'>
            <div className='ats-meter__header'>
                <span className='ats-meter__label'>{label}</span>
                <span className='ats-meter__score' style={{ color }}>{score}%</span>
            </div>
            <div className='ats-meter__bar'>
                <div className='ats-meter__fill' style={{ width: `${score}%`, background: color }} />
            </div>
        </div>
    )
}

const Home = () => {
    const { loading, generating, generateReport, reports, generateError, setGenerateError } = useInterview()
    const { handleLogout } = useAuth()
    const [jobDescription, setJobDescription] = useState("")
    const [selfDescription, setSelfDescription] = useState("")
    const [resumeFile, setResumeFile] = useState(null)
    const [activeTab, setActiveTab] = useState('generate')
    const [jobDescCount, setJobDescCount] = useState(0)
    const resumeInputRef = useRef()
    const analyzeInputRef = useRef()
    const formRef = useRef()
    const formRef2 = useRef()
    const [analyzeFile, setAnalyzeFile] = useState(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [analyzeResult, setAnalyzeResult] = useState(null)
    const [analyzeError, setAnalyzeError] = useState(null)
    const [analyzeHistory, setAnalyzeHistory] = useState([])
    const [selectedAnalysis, setSelectedAnalysis] = useState(null)

    const navigate = useNavigate()

    useEffect(() => {
        const syncHeight = () => {
            const activeRef = activeTab === 'generate' ? formRef.current : formRef2.current
            if (activeRef) {
                document.documentElement.style.setProperty('--history-height', activeRef.offsetHeight + 'px')
            }
        }
        // Small timeout to let the DOM render the newly active tab
        const id = setTimeout(syncHeight, 0)
        window.addEventListener('resize', syncHeight)
        return () => {
            clearTimeout(id)
            window.removeEventListener('resize', syncHeight)
        }
    }, [activeTab])

    React.useEffect(() => {
        getAnalysisHistory()
            .then(data => setAnalyzeHistory(data.analyses || []))
            .catch(() => {})
    }, [])

    const { progress: dashboardProgress, message: dashboardMessage } = useFakeProgress(loading, {
        duration: 6000,
        messages: ["Loading your dashboard..."],
    })

    const { progress: generateProgress, message: generateMessage } = useFakeProgress(generating, {
        duration: 120000,
        messages: GENERATE_MESSAGES,
    })

    const { progress: analyzeProgress, message: analyzeMessage } = useFakeProgress(analyzing, {
        duration: 120000,
        messages: [
            "Extracting resume content...",
            "Scanning ATS compatibility...",
            "Scoring impact language...",
            "Evaluating structure & keywords...",
            "Checking AI availability...",
            "AI is busy — waiting for a slot...",
            "Still waiting for AI response...",
            "Almost there, please hang tight...",
            "Finalizing your analysis...",
        ],
    })

    const handleResumeChange = (e) => {
        const file = e.target.files[0]
        setResumeFile(file || null)
    }

    const handleRemoveResume = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setResumeFile(null)
        if (resumeInputRef.current) resumeInputRef.current.value = ""
    }

    const handleGenerateReport = async () => {
        if (!jobDescription || !jobDescription.trim()) {
            setGenerateError("Please paste a job description before generating.")
            return
        }
        if (!resumeFile && (!selfDescription || !selfDescription.trim())) {
            setGenerateError("Please upload a resume or add a self description.")
            return
        }
        const data = await generateReport({ jobDescription, selfDescription, resumeFile })
        if (data && data._id) {
            navigate(`/interview/${data._id}`)
        }
    }

    const handleLogoutClick = async () => {
        await handleLogout()
        navigate('/login')
    }

    const handleAnalyzeResume = async () => {
        if (!analyzeFile) return
        setAnalyzing(true)
        setAnalyzeResult(null)
        setAnalyzeError(null)
        try {
            const data = await analyzeResumeFile(analyzeFile)
            setAnalyzeResult(data.analysis)
            getAnalysisHistory()
                .then(h => setAnalyzeHistory(h.analyses || []))
                .catch(() => {})
        } catch (err) {
            console.error('Analysis error:', err)
            const msg = err?.response?.data?.message || 'Failed to analyze resume. Please try again.'
            setAnalyzeError(msg)
        } finally {
            setAnalyzing(false)
        }
    }

    if (loading || (dashboardProgress > 0 && dashboardProgress < 100)) {
        return (
            <main className='loading-screen'>
                <ProgressBar progress={dashboardProgress} message={dashboardMessage} />
            </main>
        )
    }

    if (generating || (generateProgress > 0 && generateProgress < 100)) {
        return (
            <main className='loading-screen'>
                <ProgressBar progress={generateProgress} message={generateMessage} hint="This usually takes under a minute — hang tight." />
            </main>
        )
    }

    if (analyzing || (analyzeProgress > 0 && analyzeProgress < 100)) {
        return (
            <main className='loading-screen'>
                <ProgressBar progress={analyzeProgress} message={analyzeMessage} hint="Analyzing your resume with AI…" />
            </main>
        )
    }

    return (
        <div className='home-page'>

            {/* Page Header */}
            <header className='page-header'>
                <button className='logout-btn' onClick={handleLogoutClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    Logout
                </button>
                <h1>Your AI-Powered <span className='highlight'>Career Hub</span></h1>
                <p>Generate interview strategies, analyze your resume, and chart your career path — all in one place.</p>
            </header>

            {/* Tab Switcher */}
            <div className='tab-switcher'>
                <button className={`tab-btn ${activeTab === 'generate' ? 'tab-btn--active' : ''}`} onClick={() => setActiveTab('generate')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
                    Interview Strategy
                </button>
                <button className={`tab-btn ${activeTab === 'analyze' ? 'tab-btn--active' : ''}`} onClick={() => setActiveTab('analyze')}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                    Resume Analyzer
                </button>
            </div>

            {/* ── Tab: Generate Interview Strategy ── */}
            {activeTab === 'generate' && (
                <div className='workspace-layout'>

                    {/* LEFT — Original card design untouched */}
                    <div className='workspace-layout__form' ref={formRef}>
                        <div className='interview-card'>
                            <div className='interview-card__body'>

                                {/* Left Panel - Job Description */}
                                <div className='panel panel--left'>
                                    <div className='panel__header'>
                                        <span className='panel__icon'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                                        </span>
                                        <h2>Target Job Description</h2>
                                        <span className='badge badge--required'>Required</span>
                                    </div>
                                    <textarea
                                        onChange={(e) => { setJobDescription(e.target.value); setJobDescCount(e.target.value.length) }}
                                        className='panel__textarea'
                                        placeholder={`Paste the full job description here...\ne.g. 'Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design...'`}
                                        maxLength={5000}
                                    />
                                    <div className='char-counter'>{jobDescCount} / 5000 chars</div>
                                </div>

                                {/* Vertical Divider */}
                                <div className='panel-divider' />

                                {/* Right Panel - Profile */}
                                <div className='panel panel--right'>
                                    <div className='panel__header'>
                                        <span className='panel__icon'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                        </span>
                                        <h2>Your Profile</h2>
                                    </div>

                                    {/* Upload Resume */}
                                    <div className='upload-section'>
                                        <label className='section-label'>
                                            Upload Resume
                                            <span className='badge badge--best'>Best Results</span>
                                        </label>
                                        <label className={`dropzone ${resumeFile ? 'dropzone--has-file' : ''}`} htmlFor='resume'>
                                            {resumeFile ? (
                                                <>
                                                    <span className='dropzone__icon dropzone__icon--success'>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><polyline points="9 15 11 17 15 13" /></svg>
                                                    </span>
                                                    <p className='dropzone__title'>{resumeFile.name}</p>
                                                    <p className='dropzone__subtitle'>{(resumeFile.size / 1024).toFixed(0)} KB &bull; Click to change</p>
                                                    <button type='button' className='dropzone__remove' onClick={handleRemoveResume}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                        Remove
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className='dropzone__icon'>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                                                    </span>
                                                    <p className='dropzone__title'>Click to upload or drag &amp; drop</p>
                                                    <p className='dropzone__subtitle'>PDF or DOCX (Max 5MB)</p>
                                                </>
                                            )}
                                            <input ref={resumeInputRef} onChange={handleResumeChange} hidden type='file' id='resume' name='resume' accept='.pdf,.docx' />
                                        </label>
                                    </div>

                                    {/* OR Divider */}
                                    <div className='or-divider'><span>OR</span></div>

                                    {/* Quick Self-Description */}
                                    <div className='self-description'>
                                        <label className='section-label' htmlFor='selfDescription'>Quick Self-Description</label>
                                        <textarea
                                            onChange={(e) => { setSelfDescription(e.target.value) }}
                                            id='selfDescription'
                                            name='selfDescription'
                                            className='panel__textarea panel__textarea--short'
                                            placeholder="Briefly describe your experience, key skills, and years of experience if you don't have a resume handy..."
                                        />
                                    </div>

                                    {/* Info Box */}
                                    <div className='info-box'>
                                        <span className='info-box__icon'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" stroke="#1a1f27" strokeWidth="2" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="#1a1f27" strokeWidth="2" /></svg>
                                        </span>
                                        <p>Either a <strong>Resume</strong> or a <strong>Self Description</strong> is required to generate a personalized plan.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Generation Error Banner */}
                            {generateError && (
                                <div className='generate-error-banner' role='alert'>
                                    <span className='generate-error-banner__icon'>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                    </span>
                                    <p>{generateError}</p>
                                    <button type='button' className='generate-error-banner__dismiss' onClick={() => setGenerateError(null)} aria-label='Dismiss'>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    </button>
                                </div>
                            )}

                            {/* Card Footer */}
                            <div className='interview-card__footer'>
                                <span className='footer-info'>AI-Powered Strategy Generation &bull; Approx 30s</span>
                                <button onClick={handleGenerateReport} className='generate-btn' disabled={!jobDescription.trim() || (!resumeFile && !selfDescription.trim())}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
                                    Generate My Interview Strategy
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT — History sidebar */}
                    <div className='workspace-layout__history'>
                        <div className='history-panel'>
                            <div className='history-panel__header'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <h2>Recent Interview Plans</h2>
                                {reports.length > 0 && <span className='history-panel__count'>{reports.length}</span>}
                            </div>

                            {reports.length === 0 ? (
                                <div className='history-panel__empty'>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                    <p>No plans yet. Generate your first interview strategy!</p>
                                </div>
                            ) : (
                                <ul className='history-list'>
                                    {reports.map(report => (
                                        <li key={report._id} className='history-item' onClick={() => navigate(`/interview/${report._id}`)}>
                                            <div className='history-item__main'>
                                                <h3 className='history-item__title'>{report.title || 'Untitled Position'}</h3>
                                                <div className='history-item__meta'>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                                    {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </div>
                                            <div className='history-item__score'>
                                                <span className={`score-badge ${report.matchScore >= 80 ? 'score-badge--high' : report.matchScore >= 60 ? 'score-badge--mid' : 'score-badge--low'}`}>
                                                    {report.matchScore}%
                                                </span>
                                                <span className='history-item__score-label'>match</span>
                                            </div>
                                            <svg className='history-item__arrow' xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tab: Resume Analyzer ── */}
            {activeTab === 'analyze' && (
                <div className='workspace-layout'>

                    {/* LEFT — Analyzer form (original design) */}
                    <div className='workspace-layout__form' ref={formRef2}>
                        {!analyzeResult ? (
                            <div className='resume-analyzer'>
                                <div className='resume-analyzer__upload-panel'>
                                    <div className='resume-analyzer__upload-area'>
                                        <h2>Instant Resume Analysis</h2>
                                        <p>Upload your resume and get a detailed breakdown of ATS compatibility, impact language, clarity, and keyword density — in seconds.</p>

                                        <label className={`dropzone dropzone--large ${analyzeFile ? 'dropzone--has-file' : ''}`} htmlFor='analyze-resume'>
                                            {analyzeFile ? (
                                                <>
                                                    <span className='dropzone__icon dropzone__icon--success'>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><polyline points="9 15 11 17 15 13" /></svg>
                                                    </span>
                                                    <p className='dropzone__title'>{analyzeFile.name}</p>
                                                    <p className='dropzone__subtitle'>{(analyzeFile.size / 1024).toFixed(0)} KB &bull; Click to change</p>
                                                    <button type='button' className='dropzone__remove' onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAnalyzeFile(null); if (analyzeInputRef.current) analyzeInputRef.current.value = '' }}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                        Remove
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <span className='dropzone__icon'>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                                                    </span>
                                                    <p className='dropzone__title'>Drop your resume here</p>
                                                    <p className='dropzone__subtitle'>PDF or DOCX &bull; Max 5MB</p>
                                                </>
                                            )}
                                            <input ref={analyzeInputRef} onChange={e => setAnalyzeFile(e.target.files[0] || null)} hidden type='file' id='analyze-resume' accept='.pdf,.docx' />
                                        </label>

                                        <button className='generate-btn generate-btn--full' disabled={!analyzeFile} onClick={handleAnalyzeResume}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                            Analyze My Resume
                                        </button>

                                        {analyzeError && (
                                            <div className='generate-error-banner' role='alert'>
                                                <span className='generate-error-banner__icon'>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                                </span>
                                                <p>{analyzeError}</p>
                                                <button type='button' className='generate-error-banner__dismiss' onClick={() => setAnalyzeError(null)}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Quick Tips */}
                                    <div className='resume-tips-panel'>
                                        <h3>Resume Quick Tips</h3>
                                        <div className='resume-tips-grid'>
                                            {RESUME_QUICK_TIPS.map((tip, i) => (
                                                <div key={i} className='quick-tip-card'>
                                                    <span className='quick-tip-card__icon'>{tip.icon}</span>
                                                    <div>
                                                        <p className='quick-tip-card__label'>{tip.label}</p>
                                                        <p className='quick-tip-card__desc'>{tip.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className='analyze-result'>
                                <div className='analyze-result__header'>
                                    <div>
                                        <h2>Resume Analysis Complete</h2>
                                        <p className='analyze-result__filename'>{analyzeFile?.name}</p>
                                        {analyzeResult.one_line_verdict && (
                                            <p className='analyze-result__verdict'>"{analyzeResult.one_line_verdict}"</p>
                                        )}
                                    </div>
                                    <button className='analyze-result__reset' onClick={() => { setAnalyzeResult(null); setAnalyzeFile(null); setAnalyzeError(null) }}>
                                        Analyze another
                                    </button>
                                </div>

                                <div className='analyze-profile-row'>
                                    {analyzeResult.seniority_level && <span className='profile-tag profile-tag--level'>{analyzeResult.seniority_level}</span>}
                                    {analyzeResult.estimated_yoe != null && <span className='profile-tag profile-tag--yoe'>{analyzeResult.estimated_yoe} yrs exp</span>}
                                    {(analyzeResult.industry_fit || []).map((ind, i) => <span key={i} className='profile-tag profile-tag--industry'>{ind}</span>)}
                                    {(analyzeResult.top_skills || []).map((sk, i) => <span key={i} className='profile-tag profile-tag--skill'>{sk}</span>)}
                                </div>

                                <div className='analyze-scores'>
                                    <div className='overall-score-ring'>
                                        <svg viewBox="0 0 100 100" width="120" height="120">
                                            <circle cx="50" cy="50" r="42" fill="none" stroke="#2a3348" strokeWidth="10" />
                                            <circle cx="50" cy="50" r="42" fill="none"
                                                stroke={analyzeResult.overall >= 75 ? '#3fb950' : analyzeResult.overall >= 50 ? '#f5a623' : '#ff4d4d'}
                                                strokeWidth="10"
                                                strokeDasharray={`${2 * Math.PI * 42 * analyzeResult.overall / 100} ${2 * Math.PI * 42}`}
                                                strokeDashoffset={2 * Math.PI * 42 * 0.25}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className='overall-score-ring__value'>
                                            <span>{analyzeResult.overall}</span>
                                            <small>/ 100</small>
                                        </div>
                                        <p className='overall-score-ring__label'>Overall Score</p>
                                    </div>
                                    <div className='analyze-sub-scores'>
                                        <ATSMeter score={analyzeResult.ats} label="ATS Compatibility" />
                                        <ATSMeter score={analyzeResult.impact} label="Impact Language" />
                                        <ATSMeter score={analyzeResult.clarity} label="Clarity & Structure" />
                                        <ATSMeter score={analyzeResult.keywords} label="Keyword Density" />
                                        <ATSMeter score={analyzeResult.completeness} label="Section Completeness" />
                                        <ATSMeter score={analyzeResult.formatting} label="Formatting Quality" />
                                        <ATSMeter score={analyzeResult.seniority_alignment} label="Seniority Alignment" />
                                    </div>
                                </div>

                                <div className='analyze-feedback'>
                                    <div className='analyze-feedback__col'>
                                        <h3 className='analyze-feedback__title analyze-feedback__title--good'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            Strengths
                                        </h3>
                                        {(analyzeResult.strengths || []).map((s, i) => <div key={i} className='feedback-item feedback-item--good'>{s}</div>)}
                                    </div>
                                    <div className='analyze-feedback__col'>
                                        <h3 className='analyze-feedback__title analyze-feedback__title--warn'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                            Improvements
                                        </h3>
                                        {(analyzeResult.improvements || []).map((s, i) => <div key={i} className='feedback-item feedback-item--warn'>{s}</div>)}
                                    </div>
                                </div>

                                {((analyzeResult.missing_sections || []).length > 0 || (analyzeResult.red_flags || []).length > 0) && (
                                    <div className='analyze-extras'>
                                        {(analyzeResult.missing_sections || []).length > 0 && (
                                            <div className='analyze-extras__block'>
                                                <h3 className='analyze-extras__label'>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7d8590" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
                                                    Missing Sections
                                                </h3>
                                                <div className='analyze-extras__chips'>
                                                    {analyzeResult.missing_sections.map((s, i) => <span key={i} className='missing-chip'>{s}</span>)}
                                                </div>
                                            </div>
                                        )}
                                        {(analyzeResult.red_flags || []).length > 0 && (
                                            <div className='analyze-extras__block'>
                                                <h3 className='analyze-extras__label analyze-extras__label--red'>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
                                                    Red Flags
                                                </h3>
                                                <div className='analyze-extras__chips'>
                                                    {analyzeResult.red_flags.map((s, i) => <span key={i} className='redflag-chip'>{s}</span>)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className='analyze-result__cta'>
                                    <p>Ready to prepare for interviews with this resume?</p>
                                    <button className='generate-btn' onClick={() => setActiveTab('generate')}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
                                        Generate Interview Strategy
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT — Analysis History sidebar */}
                    <div className='workspace-layout__history'>
                        {selectedAnalysis ? (
                            <div className='history-panel'>
                                <div className='history-panel__header'>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                    <h2>Analysis Detail</h2>
                                    <button className='history-panel__back' onClick={() => setSelectedAnalysis(null)}>← Back</button>
                                </div>
                                <div className='history-detail'>
                                    <p className='history-detail__filename'>{selectedAnalysis.fileName}</p>
                                    {selectedAnalysis.one_line_verdict && <p className='analyze-result__verdict'>"{selectedAnalysis.one_line_verdict}"</p>}
                                    <div className='analyze-profile-row' style={{ marginTop: '0.5rem' }}>
                                        {selectedAnalysis.seniority_level && <span className='profile-tag profile-tag--level'>{selectedAnalysis.seniority_level}</span>}
                                        {selectedAnalysis.estimated_yoe != null && <span className='profile-tag profile-tag--yoe'>{selectedAnalysis.estimated_yoe} yrs exp</span>}
                                        {(selectedAnalysis.industry_fit || []).map((ind, i) => <span key={i} className='profile-tag profile-tag--industry'>{ind}</span>)}
                                        {(selectedAnalysis.top_skills || []).map((sk, i) => <span key={i} className='profile-tag profile-tag--skill'>{sk}</span>)}
                                    </div>
                                    <div className='history-detail__scores'>
                                        {[
                                            ['ATS Compatibility', selectedAnalysis.ats],
                                            ['Impact Language', selectedAnalysis.impact],
                                            ['Clarity & Structure', selectedAnalysis.clarity],
                                            ['Keyword Density', selectedAnalysis.keywords],
                                            ['Section Completeness', selectedAnalysis.completeness],
                                            ['Formatting Quality', selectedAnalysis.formatting],
                                            ['Seniority Alignment', selectedAnalysis.seniority_alignment],
                                        ].map(([label, score]) => (
                                            <ATSMeter key={label} score={score} label={label} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className='history-panel'>
                                <div className='history-panel__header'>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    <h2>Recent Analyses</h2>
                                    {analyzeHistory.length > 0 && <span className='history-panel__count'>{analyzeHistory.length}</span>}
                                </div>
                                {analyzeHistory.length === 0 ? (
                                    <div className='history-panel__empty'>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                        <p>No analyses yet. Upload a resume to get started!</p>
                                    </div>
                                ) : (
                                    <ul className='history-list'>
                                        {analyzeHistory.map((item, i) => (
                                            <li key={item._id || i} className='history-item' onClick={() => navigate('/resume-analysis', { state: { analysis: item } })}>
                                                <div className='history-item__main'>
                                                    <h3 className='history-item__title'>{item.fileName}</h3>
                                                    <div className='history-item__meta'>
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                                        {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                    {item.seniority_level && <div className='history-item__tag'>{item.seniority_level}</div>}
                                                </div>
                                                <div className='history-item__score'>
                                                    <span className={`score-badge ${item.overall >= 80 ? 'score-badge--high' : item.overall >= 60 ? 'score-badge--mid' : 'score-badge--low'}`}>
                                                        {item.overall}%
                                                    </span>
                                                    <span className='history-item__score-label'>score</span>
                                                </div>
                                                <svg className='history-item__arrow' xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Page Footer */}
            <footer className='page-footer'>
                <a href='#'>Privacy Policy</a>
                <a href='#'>Terms of Service</a>
                <a href='#'>Help Center</a>
            </footer>
        </div>
    )
}

export default Home