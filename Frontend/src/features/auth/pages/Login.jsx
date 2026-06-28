import React,{useState} from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'
import ProgressBar from '../../../components/ProgressBar.jsx'
import { useFakeProgress } from '../../../hooks/useFakeProgress.js'

const CONNECT_MESSAGES = [
    "Connecting to server...",
    "Verifying your session...",
    "Almost there...",
]

const Login = () => {

    const { loading, handleLogin } = useAuth()
    const navigate = useNavigate()

    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")

    const { progress, message } = useFakeProgress(loading, {
        duration: 18000,
        messages: CONNECT_MESSAGES,
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        await handleLogin({email,password})
        navigate('/')
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
        <main className='auth-form'>
            <div className="form-container">
                <h1>Login</h1>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            onChange={(e) => { setEmail(e.target.value) }}
                            type="email" id="email" name='email' placeholder='Enter email address' />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            onChange={(e) => { setPassword(e.target.value) }}
                            type="password" id="password" name='password' placeholder='Enter password' />
                    </div>
                    <button className='button primary-button' >Login</button>
                </form>
                <p>Don't have an account? <Link to={"/register"} >Register</Link> </p>
            </div>
        </main>
    )
}

export default Login