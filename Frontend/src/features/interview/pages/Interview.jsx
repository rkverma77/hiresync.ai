import React, { useState } from 'react'
import '../style/interview.scss'
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate, useParams } from 'react-router'
import ProgressBar from '../../../components/ProgressBar.jsx'
import { useFakeProgress } from '../../../hooks/useFakeProgress.js'
import { useAuth } from '../../auth/hooks/useAuth.js'
import ThemeToggle from '../../theme/ThemeToggle.jsx'


const NAV_ITEMS = [
    { id: 'technical', label: 'Technical Questions', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>) },
    { id: 'behavioral', label: 'Behavioral Questions', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>) },
    { id: 'roadmap', label: 'Road Map', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>) },
    { id: 'career', label: 'Career Path', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>) },
    { id: 'resources', label: 'Learning Resources', icon: (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14" /><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" /></svg>) },
]

const RESOURCE_TYPE_LABEL = {
    course: 'Course',
    documentation: 'Documentation',
    video: 'Video',
    article: 'Article',
    book: 'Book',
    practice: 'Practice',
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
/**
 * Converts a small subset of Markdown to React elements:
 *   **bold**, *italic*, `code`, numbered lists (1. ...), bullet lists (- ...)
 * Each "block" (blank-line-separated) is rendered as its own <p> or <ul>/<ol>.
 */
const parseInline = (text, keyPrefix) => {
    // Split on **bold**, *italic*, `code`
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
        if (part.startsWith('*') && part.endsWith('*'))
            return <em key={`${keyPrefix}-${i}`}>{part.slice(1, -1)}</em>
        if (part.startsWith('`') && part.endsWith('`'))
            return <code key={`${keyPrefix}-${i}`} style={{ background: 'rgba(127,127,127,.15)', borderRadius: 3, padding: '1px 4px', fontFamily: 'monospace', fontSize: '.88em' }}>{part.slice(1, -1)}</code>
        return part
    })
}

const MarkdownText = ({ text, className }) => {
    if (!text) return null
    // Split into blocks on blank lines
    const blocks = text.split(/\n{2,}/)
    const elements = blocks.map((block, bi) => {
        const lines = block.split('\n')
        // Ordered list  "1. item"
        if (/^\d+\.\s/.test(lines[0])) {
            return (
                <ol key={bi} style={{ paddingLeft: '1.4em', margin: '0.35em 0' }}>
                    {lines.map((l, li) => {
                        const m = l.match(/^\d+\.\s(.*)/)
                        return m ? <li key={li}>{parseInline(m[1], `${bi}-${li}`)}</li> : null
                    })}
                </ol>
            )
        }
        // Unordered list  "- item" or "* item"
        if (/^[-*]\s/.test(lines[0])) {
            return (
                <ul key={bi} style={{ paddingLeft: '1.4em', margin: '0.35em 0' }}>
                    {lines.map((l, li) => {
                        const m = l.match(/^[-*]\s(.*)/)
                        return m ? <li key={li}>{parseInline(m[1], `${bi}-${li}`)}</li> : null
                    })}
                </ul>
            )
        }
        // Paragraph – join single line-breaks with a space
        return (
            <p key={bi} className={bi === 0 ? className : undefined} style={bi > 0 ? { marginTop: '0.5em' } : undefined}>
                {parseInline(lines.join(' '), `${bi}`)}
            </p>
        )
    })
    return <>{elements}</>
}

// ── Sub-components ────────────────────────────────────────────────────────────
const QuestionCard = ({ item, index }) => {
    const [open, setOpen] = useState(false)
    return (
        <div className='q-card'>
            <div className='q-card__header' onClick={() => setOpen(o => !o)}>
                <span className='q-card__index'>Q{index + 1}</span>
                <MarkdownText text={item.question} className='q-card__question' />
                <span className={`q-card__chevron ${open ? 'q-card__chevron--open' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
            </div>
            {open && (
                <div className='q-card__body'>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--intention'>Intention</span>
                        <MarkdownText text={item.intention} />
                    </div>
                    <div className='q-card__section'>
                        <span className='q-card__tag q-card__tag--answer'>Model Answer</span>
                        <MarkdownText text={item.answer} />
                    </div>
                </div>
            )}
        </div>
    )
}

const ResourceItem = ({ resource }) => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(resource.searchQuery || resource.title)}`
    return (
        <a className='resource-item' href={searchUrl} target='_blank' rel='noopener noreferrer'>
            <div className='resource-item__top'>
                <span className={`resource-item__type resource-item__type--${resource.type}`}>
                    {RESOURCE_TYPE_LABEL[resource.type] || resource.type}
                </span>
                <span className='resource-item__provider'>{resource.provider}</span>
            </div>
            <p className='resource-item__title'>{resource.title}</p>
            <MarkdownText text={resource.description} className='resource-item__desc' />
            <span className='resource-item__link'>
                Find this resource
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
            </span>
        </a>
    )
}

const SkillGapCard = ({ gap, cardId }) => (
    <div className='skill-gap-card' id={cardId}>
        <div className='skill-gap-card__header'>
            <h3 className='skill-gap-card__skill'>{gap.skill}</h3>
            <span className={`skill-tag skill-tag--${gap.severity}`}>{gap.severity} priority</span>
        </div>
        {gap.resources && gap.resources.length > 0 ? (
            <div className='skill-gap-card__resources'>
                {gap.resources.map((resource, i) => (
                    <ResourceItem key={i} resource={resource} />
                ))}
            </div>
        ) : (
            <p className='skill-gap-card__empty'>No resources were generated for this skill gap. Generate a new interview plan to get resource suggestions.</p>
        )}
    </div>
)

const RoadMapDay = ({ day }) => (
    <div className='roadmap-day'>
        <div className='roadmap-day__header'>
            <span className='roadmap-day__badge'>Day {day.day}</span>
            <h3 className='roadmap-day__focus'>{day.focus}</h3>
        </div>
        <ul className='roadmap-day__tasks'>
            {day.tasks.map((task, i) => (
                <li key={i}>
                    <span className='roadmap-day__bullet' />
                    {task}
                </li>
            ))}
        </ul>
    </div>
)

// ── Career Path Components ────────────────────────────────────────────────────
const CareerStage = ({ stage, index }) => {
    const [expanded, setExpanded] = useState(stage.status === 'current')
    const statusIcons = {
        current: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
        ),
        upcoming: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
        ),
        done: (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        ),
    }
    return (
        <div className={`career-stage career-stage--${stage.status}`}>
            <div className='career-stage__connector' />
            <div className='career-stage__dot'>
                {statusIcons[stage.status]}
            </div>
            <div className='career-stage__card' onClick={() => setExpanded(e => !e)}>
                <div className='career-stage__header'>
                    <div className='career-stage__meta'>
                        <span className='career-stage__num'>Phase {index + 1}</span>
                        <span className='career-stage__duration'>{stage.duration}</span>
                    </div>
                    <h3 className='career-stage__title'>{stage.title}</h3>
                    <span className={`career-stage__chevron ${expanded ? 'career-stage__chevron--open' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </span>
                </div>
                {expanded && (
                    <div className='career-stage__body'>
                        <MarkdownText text={stage.description} className='career-stage__desc' />
                        <div className='career-stage__milestones'>
                            {stage.milestones.map((m, i) => (
                                <div key={i} className='career-milestone'>
                                    <span className='career-milestone__check'>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    </span>
                                    {m}
                                </div>
                            ))}
                        </div>
                        <div className='career-stage__skills'>
                            {stage.skills.map((s, i) => (
                                <span key={i} className='career-skill-chip'>{s}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

const CompanyCard = ({ company }) => {
    const tierColors = { Stretch: '#a78bfa', Target: '#ff2d78', Safe: '#3fb950' }
    const color = tierColors[company.tier] || '#7d8590'
    return (
        <div className='company-card'>
            <div className='company-card__avatar' style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
                <span style={{ color }}>{company.name[0]}</span>
            </div>
            <div className='company-card__info'>
                <p className='company-card__name'>{company.name}</p>
                <span className='company-card__tier' style={{ color, background: `${color}18`, borderColor: `${color}44` }}>{company.tier}</span>
            </div>
            <div className='company-card__fit'>
                <div className='company-card__fit-bar'>
                    <div className='company-card__fit-fill' style={{ width: `${company.fit}%`, background: color }} />
                </div>
                <span className='company-card__fit-label' style={{ color }}>{company.fit}% fit</span>
            </div>
        </div>
    )
}

const ResumeTipItem = ({ tip }) => {
    const icons = {
        strength: { icon: '✓', color: '#3fb950' },
        warning: { icon: '!', color: '#f5a623' },
        tip: { icon: '→', color: '#3fa9f5' },
    }
    const { icon, color } = icons[tip.type] || icons.tip
    return (
        <div className='resume-tip'>
            <span className='resume-tip__icon' style={{ color, background: `${color}18`, borderColor: `${color}33` }}>{icon}</span>
            <MarkdownText text={tip.text} className='resume-tip__text' />
        </div>
    )
}

const CareerPathSection = ({ report }) => {
    const cp = report.careerPath

    if (!cp) {
        return (
            <section>
                <div className='content-header'>
                    <h2>Career Path</h2>
                    <span className='content-header__count'>AI-generated roadmap</span>
                </div>
                <p style={{ color: '#7d8590', padding: '2rem', textAlign: 'center' }}>
                    Career path data is not available for this report. Generate a new interview strategy to get a personalised career path.
                </p>
            </section>
        )
    }

    return (
        <section>
            <div className='content-header'>
                <h2>Career Path</h2>
                <span className='content-header__count'>AI-generated roadmap</span>
            </div>

            {/* Trajectory Banner */}
            <div className='trajectory-banner'>
                <div className='trajectory-banner__role'>
                    <span className='trajectory-banner__label'>Current Role</span>
                    <strong>{cp.currentRole}</strong>
                </div>
                <div className='trajectory-banner__arrow'>
                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    <span className='trajectory-banner__timeline'>{cp.timelineMonths} month plan</span>
                </div>
                <div className='trajectory-banner__role trajectory-banner__role--target'>
                    <span className='trajectory-banner__label'>Target Role</span>
                    <strong>{cp.targetRole}</strong>
                </div>
                <div className='trajectory-banner__salary'>
                    <span className='trajectory-banner__label'>Salary Uplift</span>
                    <span className='trajectory-banner__salary-range'>{cp.salaryRange.current} → <span className='trajectory-banner__salary-target'>{cp.salaryRange.target}</span></span>
                </div>
            </div>

            {/* Stage Timeline */}
            <div className='career-stages'>
                {cp.stages.map((stage, i) => (
                    <CareerStage key={i} stage={stage} index={i} />
                ))}
            </div>

            {/* Bottom row: company suggestions + resume tips */}
            <div className='career-bottom-row'>

                {/* Company Suggestions */}
                <div className='career-companies'>
                    <h3 className='career-subheader'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                        Target Companies
                    </h3>
                    <div className='career-companies__list'>
                        {cp.companySuggestions.map((c, i) => (
                            <CompanyCard key={i} company={c} />
                        ))}
                    </div>
                </div>

                {/* Resume Tips */}
                <div className='career-resume-tips'>
                    <h3 className='career-subheader'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                        Resume Feedback
                    </h3>
                    <div className='career-resume-tips__list'>
                        {cp.resumeTips.map((tip, i) => (
                            <ResumeTipItem key={i} tip={tip} />
                        ))}
                    </div>
                </div>

            </div>
        </section>
    )
}

// ── Main Component ────────────────────────────────────────────────────────────
const Interview = () => {
    const [activeNav, setActiveNav] = useState('technical')
    const [activePanel, setActivePanel] = useState('jd')
    const { report, getReportById, loading, pdfLoading, getResumePdf } = useInterview()
    const { interviewId } = useParams()
    const { handleLogout } = useAuth()
    const navigate = useNavigate()

    const { progress, message } = useFakeProgress(loading, {
        duration: 7000,
        messages: ["Loading your interview plan..."],
    })

    if (loading || !report || (progress > 0 && progress < 100)) {
        return (
            <main className='loading-screen'>
                <ProgressBar progress={progress} message={message} />
            </main>
        )
    }

    const scoreColor =
        report.matchScore >= 80 ? 'score--high' :
            report.matchScore >= 60 ? 'score--mid' : 'score--low'

    const scoreMessage =
        report.matchScore >= 90 ? "Excellent match — you're a top candidate" :
        report.matchScore >= 80 ? 'Strong match for this role' :
        report.matchScore >= 70 ? 'Good match — a few gaps to address' :
        report.matchScore >= 60 ? 'Moderate match — preparation needed' :
        report.matchScore >= 50 ? 'Partial match — significant gaps exist' :
        report.matchScore >= 40 ? 'Weak match — consider upskilling first' :
        'Low match — role may not align with your profile'

    return (
        <div className='interview-page'>
            <div className='interview-layout'>

                {/* ── Left Nav ── */}
                <nav className='interview-nav'>
                    <div className="nav-content">
                        <p className='interview-nav__label'>Sections</p>
                        {NAV_ITEMS.map(item => (
                            <button
                                key={item.id}
                                className={`interview-nav__item ${activeNav === item.id ? 'interview-nav__item--active' : ''}`}
                                onClick={() => setActiveNav(item.id)}
                            >
                                <span className='interview-nav__icon'>{item.icon}</span>
                                {item.label}
                                {item.id === 'career' && <span className='interview-nav__new-badge'>New</span>}
                            </button>
                        ))}
                    </div>

                </nav>

                <div className='interview-divider' />

                {/* ── Center Content ── */}
                <main className='interview-content'>
                    {activeNav === 'technical' && (
                        <section>
                            <div className='content-header'>
                                <h2>Technical Questions</h2>
                                <span className='content-header__count'>{report.technicalQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {report.technicalQuestions.map((q, i) => (
                                    <QuestionCard key={i} item={q} index={i} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'behavioral' && (
                        <section>
                            <div className='content-header'>
                                <h2>Behavioral Questions</h2>
                                <span className='content-header__count'>{report.behavioralQuestions.length} questions</span>
                            </div>
                            <div className='q-list'>
                                {report.behavioralQuestions.map((q, i) => (
                                    <QuestionCard key={i} item={q} index={i} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'roadmap' && (
                        <section>
                            <div className='content-header'>
                                <h2>Preparation Road Map</h2>
                                <span className='content-header__count'>{report.preparationPlan.length}-day plan</span>
                            </div>
                            <div className='roadmap-list'>
                                {report.preparationPlan.map((day) => (
                                    <RoadMapDay key={day.day} day={day} />
                                ))}
                            </div>
                        </section>
                    )}

                    {activeNav === 'career' && (
                        <CareerPathSection report={report} />
                    )}

                    {activeNav === 'resources' && (
                        <section>
                            <div className='content-header'>
                                <h2>Learning Resources</h2>
                                <span className='content-header__count'>{report.skillGaps.length} skill gap{report.skillGaps.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className='skill-gap-list'>
                                {report.skillGaps.map((gap, i) => (
                                    <SkillGapCard key={i} gap={gap} cardId={`skill-gap-${i}`} />
                                ))}
                            </div>
                        </section>
                    )}
                </main>

                <div className='interview-divider' />

                {/* ── Reference Panel (JD + Resume tabs) ── */}
                {(report.jobDescription || report.resume) && (
                    <>
                        <aside className='interview-jd-panel'>
                            {/* Tab switcher */}
                            <div className='jd-tabs'>
                                {report.jobDescription && (
                                    <button
                                        className={`jd-tabs__tab ${activePanel === 'jd' ? 'jd-tabs__tab--active' : ''}`}
                                        onClick={() => setActivePanel('jd')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                                        Job Description
                                    </button>
                                )}
                                {report.resume && (
                                    <button
                                        className={`jd-tabs__tab ${activePanel === 'resume' ? 'jd-tabs__tab--active' : ''}`}
                                        onClick={() => setActivePanel('resume')}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                        Resume
                                    </button>
                                )}
                            </div>

                            {/* JD Content */}
                            {activePanel === 'jd' && report.jobDescription && (
                                <div className='interview-jd-panel__body'>
                                    {(() => {
                                        const HEADER_RE = /(?:^|\s)(About(?:\s+the\s+Role)?|Overview|Key Responsibilities|Responsibilities|Requirements|Required Qualifications|Preferred Qualifications|Qualifications|What You.ll Do|What We.re Looking For|Nice to Have|Benefits|About Us|The Role|Your Role|Skills & Experience|Technical Skills|Soft Skills|Tools & Technologies|What You.ll Bring|Who You Are|Compensation)(?=:|\s*[A-Z])/g
                                        let rawLines = report.jobDescription.split('\n')
                                        const hasStructure = rawLines.length > 3
                                        const lines = hasStructure
                                            ? rawLines
                                            : report.jobDescription.replace(HEADER_RE, '\n$1').split('\n')
                                        const elements = []
                                        let bulletBuffer = []
                                        const flushBullets = (key) => {
                                            if (bulletBuffer.length === 0) return
                                            elements.push(
                                                <ul key={`ul-${key}`} className='interview-jd-panel__bullets'>
                                                    {bulletBuffer.map((b, j) => <li key={j}>{b}</li>)}
                                                </ul>
                                            )
                                            bulletBuffer = []
                                        }
                                        lines.forEach((line, i) => {
                                            const trimmed = line.trim()
                                            if (!trimmed) return
                                            const bulletMatch = trimmed.match(/^[-•*]\s+(.+)/) || trimmed.match(/^\d+\.\s+(.+)/)
                                            if (bulletMatch) { bulletBuffer.push(bulletMatch[1]); return }
                                            flushBullets(i)
                                            const isHeader =
                                                (trimmed.endsWith(':') && trimmed.length < 80) ||
                                                /^(About|Overview|Key Responsibilities|Responsibilities|Requirements|Required|Preferred|Qualifications|Benefits|The Role|Your Role|What You|Who You|Skills|Tools|Compensation|Technical|Soft Skills|Innovation|Maintenance|Collaboration|Problem.Solving)/i.test(trimmed) && trimmed.length < 80
                                            if (isHeader) {
                                                elements.push(<p key={i} className='interview-jd-panel__section-header'>{trimmed.replace(/:$/, '')}</p>)
                                            } else {
                                                elements.push(<p key={i} className='interview-jd-panel__line'>{trimmed}</p>)
                                            }
                                        })
                                        flushBullets('end')
                                        return elements
                                    })()}
                                </div>
                            )}

                            {/* Resume Content */}
                            {activePanel === 'resume' && report.resume && (
                                <div className='interview-jd-panel__body'>
                                    {(() => {
                                        const lines = report.resume.split('\n')
                                        const elements = []
                                        let bulletBuffer = []
                                        const flushBullets = (key) => {
                                            if (bulletBuffer.length === 0) return
                                            elements.push(
                                                <ul key={`ul-${key}`} className='interview-jd-panel__bullets'>
                                                    {bulletBuffer.map((b, j) => <li key={j}>{b}</li>)}
                                                </ul>
                                            )
                                            bulletBuffer = []
                                        }
                                        lines.forEach((line, i) => {
                                            const trimmed = line.trim()
                                            if (!trimmed) return
                                            const bulletMatch = trimmed.match(/^[-•*]\s+(.+)/) || trimmed.match(/^\d+\.\s+(.+)/)
                                            if (bulletMatch) { bulletBuffer.push(bulletMatch[1]); return }
                                            flushBullets(i)
                                            // Resume headers: ALL CAPS lines, or short lines with no sentence punctuation
                                            const isHeader =
                                                (trimmed === trimmed.toUpperCase() && trimmed.length > 2 && trimmed.length < 60 && /[A-Z]/.test(trimmed)) ||
                                                (trimmed.endsWith(':') && trimmed.length < 60) ||
                                                /^(Experience|Education|Skills|Projects|Summary|Objective|Certifications|Awards|Publications|Languages|Contact|Profile|Work History|Technical Skills|Achievements)/i.test(trimmed) && trimmed.length < 60
                                            if (isHeader) {
                                                elements.push(<p key={i} className='interview-jd-panel__section-header'>{trimmed.replace(/:$/, '')}</p>)
                                            } else {
                                                elements.push(<p key={i} className='interview-jd-panel__line'>{trimmed}</p>)
                                            }
                                        })
                                        flushBullets('end')
                                        return elements
                                    })()}
                                </div>
                            )}
                        </aside>
                        <div className='interview-divider' />
                    </>
                )}

                {/* ── Right Sidebar ── */}
                <aside className='interview-sidebar'>

                    {/* Match Score */}
                    <div className='match-score'>
                        <p className='match-score__label'>Match Score</p>
                        <div className={`match-score__ring ${scoreColor}`}>
                            <span className='match-score__value'>{report.matchScore}</span>
                            <span className='match-score__pct'>%</span>
                        </div>
                        <p className='match-score__sub'>{scoreMessage}</p>
                    </div>

                    <div className='sidebar-divider' />

                    {/* Skill Gaps */}
                    <div className='skill-gaps'>
                        <p className='skill-gaps__label'>Skill Gaps</p>
                        <div className='skill-gaps__list'>
                            {report.skillGaps.map((gap, i) => (
                                <button
                                    key={i}
                                    type='button'
                                    className={`skill-tag skill-tag--${gap.severity}`}
                                    onClick={() => {
                                        setActiveNav('resources')
                                        requestAnimationFrame(() => {
                                            document.getElementById(`skill-gap-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                        })
                                    }}
                                    title='View learning resources for this skill'
                                >
                                    {gap.skill}
                                </button>
                            ))}
                        </div>
                        <p className='skill-gaps__hint'>Tap a skill to see resources to learn it</p>
                    </div>

                    <div className='sidebar-divider' />

                    {/* Career Path Quick Nav */}
                    <div className='sidebar-career-cta' onClick={() => setActiveNav('career')}>
                        <div className='sidebar-career-cta__icon'>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                        </div>
                        <div>
                            <p className='sidebar-career-cta__title'>Career Path</p>
                            <p className='sidebar-career-cta__sub'>See your growth plan →</p>
                        </div>
                    </div>

                    <div className='sidebar-divider' />

                    {/* Action Buttons */}
                    <div className='sidebar-spacer' />
                    <div className='sidebar-actions'>
                        <ThemeToggle />
                        <button
                            onClick={() => navigate('/')}
                            className='button secondary-button'
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.6rem' }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                            Check Another Plan
                        </button>
                        <button
                            onClick={() => { getResumePdf(interviewId) }}
                            disabled={pdfLoading}
                            className='button primary-button'>
                            {pdfLoading ? (
                                <>
                                    <span className='button__spinner' />
                                    Generating Resume...
                                </>
                            ) : (
                                <>
                                    <svg height={"0.8rem"} style={{ marginRight: "0.8rem" }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10.6144 17.7956 11.492 15.7854C12.2731 13.9966 13.6789 12.5726 15.4325 11.7942L17.8482 10.7219C18.6162 10.381 18.6162 9.26368 17.8482 8.92277L15.5079 7.88394C13.7092 7.08552 12.2782 5.60881 11.5105 3.75894L10.6215 1.61673C10.2916.821765 9.19319.821767 8.8633 1.61673L7.97427 3.75892C7.20657 5.60881 5.77553 7.08552 3.97685 7.88394L1.63658 8.92277C.868537 9.26368.868536 10.381 1.63658 10.7219L4.0523 11.7942C5.80589 12.5726 7.21171 13.9966 7.99275 15.7854L8.8704 17.7956C9.20776 18.5682 10.277 18.5682 10.6144 17.7956ZM19.4014 22.6899 19.6482 22.1242C20.0882 21.1156 20.8807 20.3125 21.8695 19.8732L22.6299 19.5353C23.0412 19.3526 23.0412 18.7549 22.6299 18.5722L21.9121 18.2532C20.8978 17.8026 20.0911 16.9698 19.6586 15.9269L19.4052 15.3156C19.2285 14.8896 18.6395 14.8896 18.4628 15.3156L18.2094 15.9269C17.777 16.9698 16.9703 17.8026 15.956 18.2532L15.2381 18.5722C14.8269 18.7549 14.8269 19.3526 15.2381 19.5353L15.9985 19.8732C16.9874 20.3125 17.7798 21.1156 18.2198 22.1242L18.4667 22.6899C18.6473 23.104 19.2207 23.104 19.4014 22.6899Z"></path></svg>
                                    Download Resume
                                </>
                            )}
                        </button>
                        <button
                            onClick={handleLogout}
                            className='button logout-button'
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.6rem' }}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            Logout
                        </button>
                    </div>

                </aside>
            </div>
        </div>
    )
}

export default Interview