const mongoose = require('mongoose');


const technicalQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [ true, "Technical question is required" ]
    },
    intention: {
        type: String,
        required: [ true, "Intention is required" ]
    },
    answer: {
        type: String,
        required: [ true, "Answer is required" ]
    }
}, {
    _id: false
})

const behavioralQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [ true, "Technical question is required" ]
    },
    intention: {
        type: String,
        required: [ true, "Intention is required" ]
    },
    answer: {
        type: String,
        required: [ true, "Answer is required" ]
    }
}, {
    _id: false
})

const resourceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [ true, "Resource title is required" ]
    },
    type: {
        type: String,
        enum: [ "course", "documentation", "video", "article", "book", "practice" ],
        required: [ true, "Resource type is required" ]
    },
    provider: {
        type: String,
        required: [ true, "Resource provider is required" ]
    },
    description: {
        type: String,
        required: [ true, "Resource description is required" ]
    },
    searchQuery: {
        type: String,
        required: [ true, "Resource search query is required" ]
    }
}, {
    _id: false
})

const skillGapSchema = new mongoose.Schema({
    skill: {
        type: String,
        required: [ true, "Skill is required" ]
    },
    severity: {
        type: String,
        enum: [ "low", "medium", "high" ],
        required: [ true, "Severity is required" ]
    },
    resources: [ resourceSchema ]
}, {
    _id: false
})

const preparationPlanSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: [ true, "Day is required" ]
    },
    focus: {
        type: String,
        required: [ true, "Focus is required" ]
    },
    tasks: [ {
        type: String,
        required: [ true, "Task is required" ]
    } ]
})

const careerStageSchema = new mongoose.Schema({
    title: { type: String },
    duration: { type: String },
    status: { type: String, enum: ["current", "upcoming"] },
    description: { type: String },
    milestones: [{ type: String }],
    skills: [{ type: String }],
}, { _id: false })

const companySuggestionSchema = new mongoose.Schema({
    name: { type: String },
    tier: { type: String, enum: ["Stretch", "Target", "Safe"] },
    fit: { type: Number },
}, { _id: false })

const resumeTipSchema = new mongoose.Schema({
    type: { type: String, enum: ["strength", "warning", "tip"] },
    text: { type: String },
}, { _id: false })

const careerPathSchema = new mongoose.Schema({
    currentRole: { type: String },
    targetRole: { type: String },
    timelineMonths: { type: Number },
    salaryRange: {
        current: { type: String },
        target: { type: String },
    },
    stages: [careerStageSchema],
    companySuggestions: [companySuggestionSchema],
    resumeTips: [resumeTipSchema],
}, { _id: false })

const interviewReportSchema = new mongoose.Schema({
    jobDescription: {
        type: String,
        required: [ true, "Job description is required" ]
    },
    resume: {
        type: String,
    },
    selfDescription: {
        type: String,
    },
    matchScore: {
        type: Number,
        min: 0,
        max: 100,
    },
    technicalQuestions: [ technicalQuestionSchema ],
    behavioralQuestions: [ behavioralQuestionSchema ],
    skillGaps: [ skillGapSchema ],
    preparationPlan: [ preparationPlanSchema ],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    },
    title: {
        type: String,
        required: [ true, "Job title is required" ]
    },
    careerPath: { type: careerPathSchema, default: null },

    // FIX 2: Cache the generated resume PDF as a Base64 string so that
    // clicking "Download Resume" more than once does NOT fire another Gemini
    // API call. The PDF is generated once and stored here on first request.
    cachedResumePdf: {
        type: String,   // Base64-encoded PDF
        default: null,
    },
}, {
    timestamps: true
})


const interviewReportModel = mongoose.model("InterviewReport", interviewReportSchema);

module.exports = interviewReportModel;
