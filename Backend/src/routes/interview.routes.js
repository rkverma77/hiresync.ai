const express = require("express")
const authMiddleware = require("../middlewares/auth.middleware")
const interviewController = require("../controllers/interview.controller")
const upload = require("../middlewares/file.middleware")

const interviewRouter = express.Router()

/**
 * @route POST /api/interview/
 */
interviewRouter.post("/", authMiddleware.authUser, upload.single("resume"), interviewController.generateInterViewReportController)

/**
 * @route GET /api/interview/report/:interviewId
 */
interviewRouter.get("/report/:interviewId", authMiddleware.authUser, interviewController.getInterviewReportByIdController)

/**
 * @route GET /api/interview/
 */
interviewRouter.get("/", authMiddleware.authUser, interviewController.getAllInterviewReportsController)

/**
 * @route POST /api/interview/resume/pdf/:interviewReportId
 */
interviewRouter.post("/resume/pdf/:interviewReportId", authMiddleware.authUser, interviewController.generateResumePdfController)

/**
 * @route GET /api/interview/analyze/history
 * @description Get all resume analyses for the logged-in user.
 * @access private
 */
interviewRouter.get("/analyze/history", authMiddleware.authUser, interviewController.getResumeAnalysisHistoryController)

/**
 * @route POST /api/interview/analyze
 * @description Analyze a resume PDF and return ATS/quality scores via AI.
 * @access private
 */
interviewRouter.post("/analyze", authMiddleware.authUser, upload.single("resume"), interviewController.analyzeResumeController)

module.exports = interviewRouter