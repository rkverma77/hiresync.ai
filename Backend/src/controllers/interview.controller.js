const { PDFParse: pdfParse } = require("pdf-parse")
const { generateInterviewReport, generateResumePdf, analyzeResume } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")
const resumeAnalysisModel = require("../models/resumeAnalysis.model")
const { AppError } = require("../middlewares/error.middleware")

// ---------------------------------------------------------------------------
// FIX 4: Per-user rate limiting (in-memory)
//
// Why in-memory instead of a package like express-rate-limit?
// No extra dependency needed — this is a simple Map-based token bucket that
// enforces a max of RATE_LIMIT_MAX AI-generating requests per user per
// RATE_LIMIT_WINDOW_MS. It resets automatically as windows expire.
//
// Limits apply only to the two expensive AI-generation routes:
//   POST /api/interview/          (generateInterviewReport)
//   POST /api/interview/analyze   (analyzeResume)
//
// The resume PDF route is protected by the caching fix (Fix 2) instead,
// since it reads from DB on repeat calls and only hits Gemini once per report.
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000  // 1 hour rolling window
const RATE_LIMIT_MAX = 20                      // max 20 AI generations per user per hour

// Map<userId, { count: number, windowStart: number }>
const rateLimitStore = new Map()

/**
 * @description Checks whether a user has exceeded their AI generation quota.
 * Returns true if the request should be allowed, false if it should be blocked.
 * Automatically resets the counter when the window expires.
 */
function checkRateLimit(userId) {
    const now = Date.now()
    const entry = rateLimitStore.get(userId)

    if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
        // First request in this window — start fresh
        rateLimitStore.set(userId, { count: 1, windowStart: now })
        return { allowed: true, remaining: RATE_LIMIT_MAX - 1 }
    }

    if (entry.count >= RATE_LIMIT_MAX) {
        const resetsInMs = RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)
        const resetsInMins = Math.ceil(resetsInMs / 60000)
        return { allowed: false, remaining: 0, resetsInMins }
    }

    entry.count++
    return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count }
}


/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {

    // FIX 4: Enforce per-user rate limit before touching Gemini
    const { allowed, remaining, resetsInMins } = checkRateLimit(req.user.id)
    if (!allowed) {
        return res.status(429).json({
            message: `You've reached the limit of ${RATE_LIMIT_MAX} AI generations per hour. Please try again in ${resetsInMins} minute${resetsInMins !== 1 ? "s" : ""}.`
        })
    }

    const { selfDescription, jobDescription } = req.body

    if (!jobDescription || !jobDescription.trim()) {
        return res.status(400).json({
            message: "Job description is required."
        })
    }

    if (!req.file && (!selfDescription || !selfDescription.trim())) {
        return res.status(400).json({
            message: "Either a resume file or a self description is required."
        })
    }

    let resumeText = ""
    if (req.file) {
        try {
            const parser = new pdfParse({ data: req.file.buffer })
            const pdfData = await parser.getText()
            resumeText = pdfData.text
            await parser.destroy()
        } catch (err) {
            throw new AppError("We couldn't read your resume file. Please make sure it's a valid, non-password-protected PDF.", 400)
        }
    }

    const interViewReportByAi = await generateInterviewReport({
        resume: resumeText,
        selfDescription,
        jobDescription
    })

    const interviewReport = await interviewReportModel.create({
        user: req.user.id,
        resume: resumeText,
        selfDescription,
        jobDescription,
        ...interViewReportByAi
    })

    // Include remaining quota in response so frontend can show a heads-up if needed
    res.status(201).json({
        message: "Interview report generated successfully.",
        interviewReport,
        quota: { remaining, limit: RATE_LIMIT_MAX }
    })

}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {

    const { interviewId } = req.params

    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}


/** 
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}


/**
 * @description Controller to generate (or return cached) resume PDF.
 *
 * FIX 2: Resume PDF caching.
 * Previously, every click of "Download Resume" fired a fresh Gemini API call
 * (generateResumePdf). Now:
 *   1. On first request → generate PDF via Gemini, store as Base64 in the
 *      document's `cachedResumePdf` field, return the PDF.
 *   2. On subsequent requests → decode from DB, return immediately.
 *      Zero additional Gemini calls.
 */
async function generateResumePdfController(req, res) {
    const { interviewReportId } = req.params

    const interviewReport = await interviewReportModel.findById(interviewReportId)

    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    let pdfBuffer

    if (interviewReport.cachedResumePdf) {
        // Cache HIT — decode from stored Base64, no Gemini call needed
        console.log(`[PDF] Cache hit for report ${interviewReportId} — serving from DB`)
        pdfBuffer = Buffer.from(interviewReport.cachedResumePdf, "base64")
    } else {
        // Cache MISS — generate via Gemini and cache the result
        console.log(`[PDF] Cache miss for report ${interviewReportId} — generating via Gemini`)
        const { resume, jobDescription, selfDescription } = interviewReport

        pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

        // Persist to DB asynchronously — don't block the response
        interviewReportModel.findByIdAndUpdate(
            interviewReportId,
            { cachedResumePdf: pdfBuffer.toString("base64") },
            { new: false }
        ).catch(err => console.error("[PDF] Failed to cache PDF in DB:", err))
    }

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)
}

/**
 * @description Controller to analyze a resume PDF and return ATS/quality scores.
 */
async function analyzeResumeController(req, res) {

    // FIX 4: Enforce per-user rate limit before touching Gemini
    const { allowed, remaining, resetsInMins } = checkRateLimit(req.user.id)
    if (!allowed) {
        return res.status(429).json({
            message: `You've reached the limit of ${RATE_LIMIT_MAX} AI generations per hour. Please try again in ${resetsInMins} minute${resetsInMins !== 1 ? "s" : ""}.`
        })
    }

    if (!req.file) {
        return res.status(400).json({ message: "A resume PDF file is required." })
    }

    let resumeText = ""
    try {
        const parser = new pdfParse({ data: req.file.buffer })
        const pdfData = await parser.getText()
        resumeText = pdfData.text
        await parser.destroy()
    } catch (err) {
        throw new AppError("We couldn't read your resume file. Please make sure it's a valid, non-password-protected PDF.", 400)
    }

    if (!resumeText || resumeText.trim().length < 50) {
        throw new AppError("The resume appears to be empty or unreadable. Please upload a text-based PDF.", 400)
    }

    const analysis = await analyzeResume(resumeText)

    // Save to DB so history persists across sessions
    await resumeAnalysisModel.create({
        user: req.user.id,
        fileName: req.file.originalname || 'resume.pdf',
        resumeText,
        ...analysis,
    })

    res.status(200).json({
        message: "Resume analyzed successfully.",
        analysis: { ...analysis, resumeText },
        quota: { remaining, limit: RATE_LIMIT_MAX }
    })
}

/**
 * @description Controller to get all resume analyses for the logged-in user.
 */
async function getResumeAnalysisHistoryController(req, res) {
    const analyses = await resumeAnalysisModel
        .find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .select('-__v')

    res.status(200).json({
        message: 'Resume analysis history fetched successfully.',
        analyses,
    })
}

module.exports = { generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController, analyzeResumeController, getResumeAnalysisHistoryController }