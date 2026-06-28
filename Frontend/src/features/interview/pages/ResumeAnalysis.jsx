import React from 'react'
import { useLocation, useNavigate } from 'react-router'
import '../style/ResumeAnalysis.scss'
import { useAuth } from '../../auth/hooks/useAuth.js'
import ThemeToggle from '../../theme/ThemeToggle.jsx'

const ATSMeter = ({ score, label }) => {
    const color = score >= 75 ? '#3fb950' : score >= 50 ? '#f5a623' : '#ff4d4d'
    return (
        <div className='ra-meter'>
            <div className='ra-meter__row'>
                <span className='ra-meter__label'>{label}</span>
                <span className='ra-meter__score' style={{ color }}>{score}%</span>
            </div>
            <div className='ra-meter__track'>
                <div className='ra-meter__fill' style={{ width: `${score}%`, background: color }} />
            </div>
        </div>
    )
}

// ── Detects section headers from resume text ──────────────────────────────────
const SECTION_HEADER_RE = /^(EDUCATION|EXPERIENCE|WORK EXPERIENCE|SKILLS|TECHNICAL SKILLS|PROJECTS|SUMMARY|OBJECTIVE|CERTIFICATIONS|AWARDS|PUBLICATIONS|LANGUAGES|CONTACT|PROFILE|ACHIEVEMENTS|EXTRACURRICULAR|INTERNSHIP|INTERNSHIPS|ACTIVITIES|HONORS|REFERENCES|COURSEWORK|TRAINING|VOLUNTEER)S?$/i

function parseResumeIntoSections(text) {
    const lines = text.split('\n')
    const sections = []
    let current = { label: null, lines: [], bullets: [] }

    const flushCurrent = () => {
        if (current.lines.length || current.bullets.length || current.label) {
            sections.push({ ...current })
        }
    }

    lines.forEach(raw => {
        const line = raw.trim()
        if (!line) return

        const bulletMatch = line.match(/^[-•*▸]\s+(.+)/) || line.match(/^\d+\.\s+(.+)/)
        if (bulletMatch) {
            current.bullets.push(bulletMatch[1])
            return
        }

        // Flush bullet buffer to current section before anything else
        const isHeader =
            (line === line.toUpperCase() && line.length > 2 && line.length < 60 && /[A-Z]/.test(line) && SECTION_HEADER_RE.test(line.replace(/:$/, ''))) ||
            (line.endsWith(':') && line.length < 60 && SECTION_HEADER_RE.test(line.replace(/:$/, '')))

        if (isHeader) {
            flushCurrent()
            current = { label: line.replace(/:$/, ''), lines: [], bullets: [] }
        } else {
            if (current.bullets.length) {
                current.lines.push({ type: 'bullets', items: [...current.bullets] })
                current.bullets = []
            }
            current.lines.push({ type: 'text', value: line })
        }
    })

    // flush remaining bullets
    if (current.bullets.length) {
        current.lines.push({ type: 'bullets', items: [...current.bullets] })
        current.bullets = []
    }
    flushCurrent()
    return sections
}

const ResumeTextPanel = ({ resumeText, onGenerate }) => {
    if (!resumeText) return (
        <div className='ra-resume-panel ra-resume-panel--empty'>
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p>Resume text not available</p>
        </div>
    )

    const sections = parseResumeIntoSections(resumeText)

    // First section with no label = contact/name block
    const contactBlock = sections[0]?.label === null ? sections[0] : null
    const mainSections = contactBlock ? sections.slice(1) : sections

    return (
        <div className='ra-resume-panel'>
            {/* Header */}
            <div className='ra-resume-panel__header'>
                <div className='ra-resume-panel__header-left'>
                    <div className='ra-resume-panel__header-icon'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </div>
                    <div>
                        <p className='ra-resume-panel__header-title'>Resume Text</p>
                        <p className='ra-resume-panel__header-sub'>Parsed from your PDF</p>
                    </div>
                </div>
                <button className='ra-resume-panel__cta' onClick={onGenerate}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
                    Interview Strategy
                </button>
            </div>

            {/* Body */}
            <div className='ra-resume-panel__body'>

                {/* Contact block */}
                {contactBlock && (
                    <div className='ra-resume-panel__section'>
                        {contactBlock.lines.map((item, i) => {
                            if (item.type === 'text') {
                                const isName = i === 0
                                return isName
                                    ? <p key={i} className='ra-resume-panel__name'>{item.value}</p>
                                    : <p key={i} className='ra-resume-panel__contact'>{item.value}</p>
                            }
                            return (
                                <ul key={i} className='ra-resume-panel__bullets'>
                                    {item.items.map((b, j) => <li key={j}>{b}</li>)}
                                </ul>
                            )
                        })}
                    </div>
                )}

                {/* Named sections */}
                {mainSections.map((section, si) => (
                    <div key={si} className='ra-resume-panel__section'>
                        {section.label && (
                            <p className='ra-resume-panel__section-label'>{section.label}</p>
                        )}
                        {section.lines.map((item, i) => {
                            if (item.type === 'text') {
                                return <p key={i} className='ra-resume-panel__line'>{item.value}</p>
                            }
                            return (
                                <ul key={i} className='ra-resume-panel__bullets'>
                                    {item.items.map((b, j) => <li key={j}>{b}</li>)}
                                </ul>
                            )
                        })}
                    </div>
                ))}

            </div>
        </div>
    )
}

const ResumeAnalysis = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { handleLogout } = useAuth()
    const analysis = location.state?.analysis

    const handleLogoutClick = async () => {
        await handleLogout()
        navigate('/login')
    }

    if (!analysis) {
        return (
            <div className='ra-empty'>
                <p>No analysis data found.</p>
                <button className='ra-btn ra-btn--primary' onClick={() => navigate('/')}>Go Back</button>
            </div>
        )
    }

    const ringColor = analysis.overall >= 75 ? '#3fb950' : analysis.overall >= 50 ? '#f5a623' : '#ff4d4d'
    const circumference = 2 * Math.PI * 42

    return (
        <div className='ra-page'>

            {/* Header */}
            <header className='ra-header'>
                <button className='ra-btn ra-btn--ghost' onClick={() => navigate('/', { state: { tab: location.state?.fromTab || 'generate' } })}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Back
                </button>
                <div className='ra-header__center'>
                    <h1>Resume Analysis <span className='ra-accent'>Report</span></h1>
                    <p>{analysis.fileName}</p>
                </div>
                <div className='ra-header__actions'>
                    <ThemeToggle />
                    <button className='ra-btn ra-btn--ghost' onClick={handleLogoutClick}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        Logout
                    </button>
                </div>
            </header>

            {/* Two-column body */}
            <div className='ra-body'>

                {/* LEFT — all analysis content */}
                <div className='ra-main'>

                    {analysis.one_line_verdict && (
                        <div className='ra-verdict'>"{analysis.one_line_verdict}"</div>
                    )}

                    <div className='ra-tags'>
                        {analysis.seniority_level && <span className='ra-tag ra-tag--accent'>{analysis.seniority_level}</span>}
                        {analysis.estimated_yoe != null && <span className='ra-tag ra-tag--blue'>{analysis.estimated_yoe} yrs exp</span>}
                        {(analysis.industry_fit || []).map((ind, i) => <span key={i} className='ra-tag ra-tag--green'>{ind}</span>)}
                        {(analysis.top_skills || []).map((sk, i) => <span key={i} className='ra-tag ra-tag--default'>{sk}</span>)}
                    </div>

                    <div className='ra-card ra-scores'>
                        <div className='ra-ring-wrap'>
                            <div className='ra-ring'>
                                <svg viewBox="0 0 100 100" width="130" height="130">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="#2a3348" strokeWidth="10" />
                                    <circle cx="50" cy="50" r="42" fill="none"
                                        stroke={ringColor}
                                        strokeWidth="10"
                                        strokeDasharray={`${circumference * analysis.overall / 100} ${circumference}`}
                                        strokeDashoffset={circumference * 0.25}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className='ra-ring__value'>
                                    <span className='ra-ring__num'>{analysis.overall}</span>
                                    <span className='ra-ring__denom'>/ 100</span>
                                </div>
                            </div>
                            <p className='ra-ring__label'>Overall Score</p>
                        </div>
                        <div className='ra-sub-scores'>
                            <ATSMeter score={analysis.ats} label="ATS Compatibility" />
                            <ATSMeter score={analysis.impact} label="Impact Language" />
                            <ATSMeter score={analysis.clarity} label="Clarity & Structure" />
                            <ATSMeter score={analysis.keywords} label="Keyword Density" />
                            <ATSMeter score={analysis.completeness} label="Section Completeness" />
                            <ATSMeter score={analysis.formatting} label="Formatting Quality" />
                            <ATSMeter score={analysis.seniority_alignment} label="Seniority Alignment" />
                        </div>
                    </div>

                    <div className='ra-grid-2'>
                        <div className='ra-card'>
                            <h3 className='ra-section-title ra-section-title--green'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Strengths
                            </h3>
                            {(analysis.strengths || []).map((s, i) => (
                                <div key={i} className='ra-feedback-item ra-feedback-item--green'>{s}</div>
                            ))}
                        </div>
                        <div className='ra-card'>
                            <h3 className='ra-section-title ra-section-title--yellow'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f5a623" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                Improvements
                            </h3>
                            {(analysis.improvements || []).map((s, i) => (
                                <div key={i} className='ra-feedback-item ra-feedback-item--yellow'>{s}</div>
                            ))}
                        </div>
                    </div>

                    {((analysis.missing_sections || []).length > 0 || (analysis.red_flags || []).length > 0) && (
                        <div className='ra-grid-2'>
                            {(analysis.missing_sections || []).length > 0 && (
                                <div className='ra-card'>
                                    <h3 className='ra-section-title ra-section-title--muted'>Missing Sections</h3>
                                    <div className='ra-chips'>
                                        {analysis.missing_sections.map((s, i) => <span key={i} className='ra-chip ra-chip--default'>{s}</span>)}
                                    </div>
                                </div>
                            )}
                            {(analysis.red_flags || []).length > 0 && (
                                <div className='ra-card'>
                                    <h3 className='ra-section-title ra-section-title--red'>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ff4d4d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
                                        Red Flags
                                    </h3>
                                    <div className='ra-chips'>
                                        {analysis.red_flags.map((s, i) => <span key={i} className='ra-chip ra-chip--red'>{s}</span>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* RIGHT — Resume text panel with CTA in header */}
                <ResumeTextPanel
                    resumeText={analysis.resumeText}
                    onGenerate={() => navigate('/')}
                />

            </div>
        </div>
    )
}

export default ResumeAnalysis