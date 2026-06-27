const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")

const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
}))

/* require all the routes here */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")


/* using all the routes here */
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

const { notFoundHandler, globalErrorHandler } = require("./middlewares/error.middleware")

/* 404 handler for unmatched routes - must come after all routes */
app.use(notFoundHandler)

/* global error handler - must be registered LAST (4-arg signature) so that
   any error thrown/rejected in a controller (e.g. the Gemini API call
   failing or timing out) is always returned as JSON instead of falling
   through to Express's default HTML error page. */
app.use(globalErrorHandler)

module.exports = app
