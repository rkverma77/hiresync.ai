const mongoose = require('mongoose')

const resumeAnalysisSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    fileName: {
        type: String,
        default: 'resume.pdf',
    },
    resumeText: {
        type: String,
    },
    overall:             { type: Number },
    ats:                 { type: Number },
    impact:              { type: Number },
    clarity:             { type: Number },
    keywords:            { type: Number },
    completeness:        { type: Number },
    formatting:          { type: Number },
    seniority_alignment: { type: Number },
    strengths:           [{ type: String }],
    improvements:        [{ type: String }],
    missing_sections:    [{ type: String }],
    top_skills:          [{ type: String }],
    estimated_yoe:       { type: Number },
    seniority_level:     { type: String },
    industry_fit:        [{ type: String }],
    red_flags:           [{ type: String }],
    one_line_verdict:    { type: String },
}, {
    timestamps: true,
})

module.exports = mongoose.model('ResumeAnalysis', resumeAnalysisSchema)
