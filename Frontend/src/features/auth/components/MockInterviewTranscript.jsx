import React, { useEffect, useRef, useState } from 'react'

// Rotating set of tiny mock-interview exchanges. Kept short on purpose —
// this is ambient texture for the brand panel, not something to read closely.
const EXCHANGES = [
    {
        q: "Tell me about a time you missed a deadline.",
        a: "I flagged it two days early and re-scoped the launch with my lead...",
    },
    {
        q: "Why are you leaving your current role?",
        a: "I've outgrown the scope of the position and want more ownership...",
    },
    {
        q: "Walk me through a conflict with a teammate.",
        a: "We disagreed on the data model, so I proposed a quick spike to...",
    },
]

const TYPE_SPEED = 26 // ms per character
const LINE_PAUSE = 500
const CYCLE_PAUSE = 2200

const MockInterviewTranscript = () => {
    const [exchangeIndex, setExchangeIndex] = useState(0)
    const [qText, setQText] = useState('')
    const [aText, setAText] = useState('')
    const [phase, setPhase] = useState('q') // 'q' | 'a' | 'pause'
    const reducedMotion = useRef(
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    )

    useEffect(() => {
        const current = EXCHANGES[exchangeIndex]

        if (reducedMotion.current) {
            setQText(current.q)
            setAText(current.a)
            return
        }

        let timer
        if (phase === 'q') {
            if (qText.length < current.q.length) {
                timer = setTimeout(() => setQText(current.q.slice(0, qText.length + 1)), TYPE_SPEED)
            } else {
                timer = setTimeout(() => setPhase('a'), LINE_PAUSE)
            }
        } else if (phase === 'a') {
            if (aText.length < current.a.length) {
                timer = setTimeout(() => setAText(current.a.slice(0, aText.length + 1)), TYPE_SPEED)
            } else {
                timer = setTimeout(() => setPhase('pause'), CYCLE_PAUSE)
            }
        } else if (phase === 'pause') {
            timer = setTimeout(() => {
                setQText('')
                setAText('')
                setPhase('q')
                setExchangeIndex((i) => (i + 1) % EXCHANGES.length)
            }, 300)
        }

        return () => clearTimeout(timer)
    }, [phase, qText, aText, exchangeIndex])

    return (
        <div className="auth-transcript" aria-hidden="true">
            <div className="auth-transcript__bar">
                <span className="auth-transcript__dot" />
                <span className="auth-transcript__dot" />
                <span className="auth-transcript__dot" />
                <span className="auth-transcript__label">mock-interview.session</span>
            </div>
            <div className="auth-transcript__body">
                <p className="auth-transcript__line">
                    <span className="auth-transcript__tag">Q&gt;</span>
                    {qText}
                    {phase === 'q' && <span className="auth-transcript__cursor" />}
                </p>
                {(aText.length > 0 || phase === 'a') && (
                    <p className="auth-transcript__line auth-transcript__line--answer">
                        <span className="auth-transcript__tag">A&gt;</span>
                        {aText}
                        {phase === 'a' && <span className="auth-transcript__cursor" />}
                    </p>
                )}
            </div>
        </div>
    )
}

export default MockInterviewTranscript
