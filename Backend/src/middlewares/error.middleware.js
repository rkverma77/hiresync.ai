const multer = require("multer")

/**
 * @description Custom error class for known/expected errors (e.g. AI timeout,
 * bad upstream response) so the global handler can attach a status code and
 * a safe, user-facing message instead of guessing.
 */
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message)
        this.statusCode = statusCode
        this.isAppError = true
    }
}

/**
 * @description Catch-all 404 handler for routes that don't match anything.
 * Keeps the response JSON instead of falling through to Express's default
 * HTML "Cannot GET /..." page.
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        message: `Route not found: ${req.method} ${req.originalUrl}`
    })
}

/**
 * @description Global error-handling middleware. Must be registered LAST,
 * after all routes, with the 4-arg (err, req, res, next) signature so
 * Express recognizes it as an error handler.
 *
 * Without this, any error thrown/rejected inside an async controller
 * (e.g. the Gemini API call failing, timing out, or hitting a quota limit)
 * falls through to Express's default error handler, which returns an HTML
 * page rather than JSON - so the frontend has nothing usable to show the
 * user and the request just appears to "fail silently".
 */
function globalErrorHandler(err, req, res, next) {
    // Log full details server-side for debugging - never leak stack traces to the client.
    console.error(`[Error] ${req.method} ${req.originalUrl} ->`, err)

    // Known/expected application errors (timeouts, upstream failures, etc.)
    if (err.isAppError) {
        return res.status(err.statusCode).json({ message: err.message })
    }

    // Multer file upload errors (e.g. file too large)
    if (err instanceof multer.MulterError) {
        const message = err.code === "LIMIT_FILE_SIZE"
            ? "Resume file is too large. Please upload a file under 3MB."
            : "There was a problem with the uploaded file. Please try again."
        return res.status(400).json({ message })
    }

    // Mongoose validation errors
    if (err.name === "ValidationError") {
        return res.status(400).json({ message: "Some of the submitted data was invalid. Please check your inputs and try again." })
    }

    // Mongoose invalid ObjectId / cast errors (e.g. bad interviewId in the URL)
    if (err.name === "CastError") {
        return res.status(400).json({ message: "Invalid request - please check the link or ID and try again." })
    }

    // Errors surfaced from the Google GenAI SDK usually carry a `status` (HTTP-like code)
    if (typeof err.status === "number") {
        if (err.status === 429) {
            return res.status(503).json({ message: "Our AI provider is currently rate-limited. Please wait a moment and try again." })
        }
        if (err.status >= 400 && err.status < 500) {
            return res.status(502).json({ message: "The AI service rejected the request. Please try again in a moment." })
        }
    }

    // Fallback - unknown/unexpected error
    res.status(500).json({
        message: "Something went wrong while processing your request. Please try again in a moment."
    })
}

module.exports = { AppError, notFoundHandler, globalErrorHandler }
