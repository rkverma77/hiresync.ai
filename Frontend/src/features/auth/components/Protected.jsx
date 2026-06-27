import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router";
import React from 'react'
import "../auth.form.scss"
import ProgressBar from "../../../components/ProgressBar.jsx"
import { useFakeProgress } from "../../../hooks/useFakeProgress.js"

const CONNECT_MESSAGES = [
    "Connecting to server...",
    "Waking up the database...",
    "Almost there...",
]

const Protected = ({children}) => {
    const { loading,user } = useAuth()

    const { progress, message } = useFakeProgress(loading, {
        duration: 20000,
        messages: CONNECT_MESSAGES,
    })

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

    if(!user){
        return <Navigate to={'/login'} />
    }
    
    return children
}

export default Protected
