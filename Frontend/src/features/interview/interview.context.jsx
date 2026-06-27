import { createContext,useState } from "react";


export const InterviewContext = createContext()

export const InterviewProvider = ({ children }) => {
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [pdfLoading, setPdfLoading] = useState(false)
    const [report, setReport] = useState(null)
    const [reports, setReports] = useState([])
    const [generateError, setGenerateError] = useState(null)

    return (
        <InterviewContext.Provider value={{ loading, setLoading, generating, setGenerating, pdfLoading, setPdfLoading, report, setReport, reports, setReports, generateError, setGenerateError }}>
            {children}
        </InterviewContext.Provider>
    )
}