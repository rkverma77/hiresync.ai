import React from 'react'
import './ProgressBar.scss'

/**
 * Horizontal progress bar with a live percentage readout and an optional
 * status message / hint. Purely presentational — feed it a 0-100 `progress`
 * value, typically from the `useFakeProgress` hook.
 */
const ProgressBar = ({ progress = 0, message, hint }) => {
    const value = Math.max(0, Math.min(100, Math.round(progress)))

    return (
        <div className='progress-bar'>
            {message && <p className='progress-bar__message'>{message}</p>}

            <div
                className='progress-bar__track'
                role='progressbar'
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={message || 'Loading progress'}
            >
                <div className='progress-bar__fill' style={{ width: `${value}%` }} />
            </div>

            <div className='progress-bar__footer'>
                <span className='progress-bar__pct'>{value}%</span>
                {hint && <span className='progress-bar__hint'>{hint}</span>}
            </div>
        </div>
    )
}

export default ProgressBar
