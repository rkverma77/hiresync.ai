import React from 'react'
import { Link } from 'react-router'
import ThemeToggle from '../../theme/ThemeToggle.jsx'
import MockInterviewTranscript from './MockInterviewTranscript.jsx'

const AuthLayout = ({ mode, brandLine, title, subtitle, children }) => {
    const isLogin = mode === 'login'

    return (
        <main className="auth-shell">
            <section className="auth-shell__brand">
                <div className="auth-shell__brand-inner">
                    <div className="auth-wordmark">
                        <span className="auth-wordmark__mark">hs</span>
                        <span className="auth-wordmark__text">hiresync<span className="highlight">.ai</span></span>
                    </div>

                    <h2 className="auth-brand-headline">{brandLine}</h2>
                    <p className="auth-brand-sub">
                        Upload a resume, get real questions, and rehearse the answers
                        before the interview that counts.
                    </p>

                    <MockInterviewTranscript />

                    <div className="auth-brand-footer">
                        <span className="auth-live-dot" />
                        AI interviewer standing by
                    </div>
                </div>
            </section>

            <section className="auth-shell__panel">
                <div className="auth-theme-toggle">
                    <ThemeToggle />
                </div>

                <div className="auth-card">
                    <div className="auth-tabs" role="tablist" aria-label="Choose sign in or create account">
                        <Link
                            to="/login"
                            viewTransition
                            role="tab"
                            aria-selected={isLogin}
                            className={`auth-tabs__item ${isLogin ? 'is-active' : ''}`}
                            style={isLogin ? { viewTransitionName: 'auth-active-tab' } : undefined}
                        >
                            Sign in
                        </Link>
                        <Link
                            to="/register"
                            viewTransition
                            role="tab"
                            aria-selected={!isLogin}
                            className={`auth-tabs__item ${!isLogin ? 'is-active' : ''}`}
                            style={!isLogin ? { viewTransitionName: 'auth-active-tab' } : undefined}
                        >
                            Create account
                        </Link>
                    </div>

                    <div className="auth-card__head" style={{ viewTransitionName: 'auth-card-head' }}>
                        <h1>{title}</h1>
                        <p>{subtitle}</p>
                    </div>

                    <div style={{ viewTransitionName: 'auth-card-form' }}>
                        {children}
                    </div>
                </div>
            </section>
        </main>
    )
}

export default AuthLayout