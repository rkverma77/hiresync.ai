import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'
import ProgressBar from '../../../components/ProgressBar.jsx'
import { useFakeProgress } from '../../../hooks/useFakeProgress.js'
import AuthLayout from '../components/AuthLayout.jsx'
import AuthInput from '../components/AuthInput.jsx'

const CONNECT_MESSAGES = [
    "Connecting to server...",
    "Verifying your session...",
    "Almost there...",
]

const Register = () => {

    const navigate = useNavigate()
    const [ username, setUsername ] = useState("")
    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")

    const {loading,handleRegister} = useAuth()

    const { progress, message } = useFakeProgress(loading, {
        duration: 18000,
        messages: CONNECT_MESSAGES,
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        await handleRegister({username,email,password})
        navigate("/")
    }

    if(loading || (progress > 0 && progress < 100)){
        return (
            <main className='auth-loading-screen'>
                <div className='auth-loading-screen__content'>
                    <h1>Connecting...</h1>
                    <ProgressBar
                        progress={progress}
                        message={message}
                        hint="Free hosting can take up to a minute to wake up — thanks for your patience."
                    />
                </div>
            </main>
        )
    }

    return (
        <AuthLayout
            mode="register"
            brandLine="Let's build your edge."
            title="Create your account"
            subtitle="Set up mock interviews tailored to the role you're chasing."
        >
            <form onSubmit={handleSubmit}>
                <AuthInput
                    id="username"
                    label="Username"
                    type="text"
                    kind="user"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <AuthInput
                    id="email"
                    label="Email address"
                    type="email"
                    kind="mail"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <AuthInput
                    id="password"
                    label="Password"
                    type="password"
                    kind="lock"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button className="button primary-button auth-submit" type="submit">
                    Create account
                </button>
            </form>

            <p className="auth-card__foot">
                Already have an account? <Link to="/login">Sign in</Link>
            </p>
        </AuthLayout>
    )
}

export default Register