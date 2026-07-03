import React, { useState } from 'react'

const icons = {
    user: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    ),
    mail: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
    ),
    lock: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    ),
    eye: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    ),
    eyeOff: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 7 11 7a13.16 13.16 0 0 1-1.67 2.68" />
            <path d="M6.61 6.61C3.35 8.36 1 12 1 12s4 7 11 7a10.44 10.44 0 0 0 5.06-1.27" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    ),
}

/**
 * Floating-label input used across the auth screens.
 * Relies on the `:placeholder-shown` trick, so it always renders
 * a single space as the placeholder — don't override it.
 */
const AuthInput = ({ id, label, type = 'text', value, onChange, autoComplete, kind = 'text' }) => {
    const [revealed, setRevealed] = useState(false)
    const isPassword = type === 'password'
    const resolvedType = isPassword ? (revealed ? 'text' : 'password') : type

    return (
        <div className="auth-field">
            <span className="auth-field__icon">{icons[kind]}</span>
            <input
                id={id}
                name={id}
                type={resolvedType}
                value={value}
                onChange={onChange}
                autoComplete={autoComplete}
                placeholder=" "
                required
            />
            <label htmlFor={id}>{label}</label>

            {isPassword && (
                <button
                    type="button"
                    className="auth-field__reveal"
                    onClick={() => setRevealed((r) => !r)}
                    aria-label={revealed ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                >
                    {revealed ? icons.eyeOff : icons.eye}
                </button>
            )}
        </div>
    )
}

export default AuthInput
