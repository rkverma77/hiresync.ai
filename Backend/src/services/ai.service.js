const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const PdfPrinter = require("pdfmake")
const { PDFParse } = require("pdf-parse")
const { AppError } = require("../middlewares/error.middleware")
const { pool } = require("./gemini.pool")

const AI_TIMEOUT_MS = 120000 // 60s per individual attempt — total max with retries: ~3.5 min
const MAX_RETRIES = 4
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash"

/**
 * Recursively strips JSON schema constraints that Gemini 2.5+ rejects:
 * minimum, maximum, minItems, maxItems, minLength, maxLength, exclusiveMinimum,
 * exclusiveMaximum. Also removes unsupported 'additionalProperties' and
 * flattens 'allOf' wrappers that zod-to-json-schema sometimes emits.
 */
function sanitizeSchemaForGemini(schema) {
    if (typeof schema !== "object" || schema === null) return schema
    if (Array.isArray(schema)) return schema.map(sanitizeSchemaForGemini)

    const STRIP_KEYS = new Set([
        "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
        "minItems", "maxItems", "minLength", "maxLength",
        "additionalProperties", "$schema"
    ])

    const out = {}
    for (const [k, v] of Object.entries(schema)) {
        if (STRIP_KEYS.has(k)) continue
        // Flatten allOf with a single entry (zod optional fields)
        if (k === "allOf" && Array.isArray(v) && v.length === 1) {
            Object.assign(out, sanitizeSchemaForGemini(v[0]))
            continue
        }
        out[k] = sanitizeSchemaForGemini(v)
    }
    return out
}

/**
 * @description Detects whether an error from the Gemini SDK is a transient
 * rate-limit (429 / RESOURCE_EXHAUSTED) that is worth retrying.
 * The @google/genai SDK can surface this in several shapes — check all of them.
 */
function isRateLimitError(err) {
    // Log the full error shape once so we can see exactly what Gemini sends
    console.error("[AI] Error shape:", JSON.stringify({
        status: err?.status,
        statusCode: err?.statusCode,
        code: err?.code,
        message: err?.message?.slice(0, 200),
        errorDetails: err?.errorDetails,
        httpStatus: err?.httpError?.status,
    }, null, 2))

    if (err?.status === 429) return true
    if (err?.status === 503) return true   // overloaded / high demand — retry on another key
    if (err?.statusCode === 429) return true
    if (err?.statusCode === 503) return true
    if (err?.httpError?.status === 429) return true
    if (err?.httpError?.status === 503) return true
    // @google/genai SDK wraps errors — check nested structures
    if (err?.error?.status === "RESOURCE_EXHAUSTED") return true
    if (err?.error?.status === "UNAVAILABLE") return true
    if (err?.error?.code === 429) return true
    if (err?.error?.code === 503) return true
    const msg = (err?.message || "").toLowerCase()
    return msg.includes("rate") || msg.includes("quota") || msg.includes("resource_exhausted") ||
           msg.includes("429") || msg.includes("503") || msg.includes("unavailable") ||
           msg.includes("high demand") || msg.includes("overloaded") || msg.includes("limit")
}

/**
 * @description Pool-aware retry wrapper.
 *
 * Strategy:
 * 1. Ask the pool for the best available client (round-robin across healthy keys).
 * 2. On a 429, mark that key as rate-limited (65s cooldown) and immediately
 * switch to the other key — no long sleep needed if a healthy key exists.
 * 3. Only sleep when ALL keys are on cooldown, and only until the soonest key recovers.
 * 4. Give up after MAX_RETRIES total attempts.
 *
 * With 2 keys: a single 429 causes ~0s delay (instant failover to key 2).
 * Only when both keys are exhausted simultaneously does the user wait.
 */
async function withRetry(fn, maxRetries = MAX_RETRIES) {
    let lastErr
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const { client, index } = pool.getClient()
        try {
            return await fn(client)
        } catch (err) {
            lastErr = err
            if (!isRateLimitError(err)) throw err          // non-429 → bubble up immediately
            if (attempt === maxRetries) throw err           // exhausted all retries

            pool.markRateLimited(index)

            if (pool.healthyCount > 0) {
                // Other key is healthy — switch immediately, no sleep
                console.warn(`[AI] Key ${index + 1} rate-limited — switching to another key instantly (attempt ${attempt + 1}/${maxRetries})`)
            } else {
                // All keys on cooldown — sleep until the soonest one recovers
                const waitMs = 65_000
                console.warn(`[AI] All keys rate-limited — waiting ${waitMs / 1000}s for cooldown (attempt ${attempt + 1}/${maxRetries})`)
                await new Promise(resolve => setTimeout(resolve, waitMs))
            }
        }
    }
    throw lastErr
}

/**
 * @description Races a promise against a timeout so a slow/hung Gemini call
 * fails fast with a clear, user-facing message instead of leaving the request
 * (and the frontend's loading screen) hanging indefinitely.
 */
function withTimeout(promise, message = "The AI service took too long to respond. Please try again.") {
    let timeoutId
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new AppError(message, 504)), AI_TIMEOUT_MS)
    })
    return Promise.race([ promise, timeout ]).finally(() => clearTimeout(timeoutId))
}


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).min(8).max(12).describe("A list of AT LEAST 8 and UP TO 12 technical questions that can be asked in the interview, covering a broad range of topics relevant to the job description (e.g. core concepts, tools/technologies mentioned, problem solving, system design, coding, debugging) along with their intention and how to answer them. Do not return fewer than 8 questions."),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).min(8).max(12).describe("A list of AT LEAST 8 and UP TO 12 behavioral questions that can be asked in the interview, covering a broad range of scenarios (e.g. teamwork, conflict resolution, leadership, failure/learning, time management, communication, adaptability) along with their intention and how to answer them. Do not return fewer than 8 questions."),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances"),
        resources: z.array(z.object({
            title: z.string().describe("The name/title of the learning resource, e.g. a course name, doc page, book or tutorial title"),
            type: z.enum([ "course", "documentation", "video", "article", "book", "practice" ]).describe("The type/format of the resource"),
            provider: z.string().describe("The platform or source of the resource, e.g. 'freeCodeCamp', 'Official Docs', 'YouTube', 'Coursera', 'LeetCode'"),
            description: z.string().describe("A 1-2 sentence explanation of what this resource covers and why it helps close this specific skill gap"),
            searchQuery: z.string().describe("A precise search query (resource title + provider/platform) that can be used to find this exact resource online, since exact URLs cannot be reliably guaranteed")
        })).min(2).max(4).describe("2 to 4 specific, actionable learning resources (mix of free/paid, mix of types like courses, docs, videos, practice platforms) that would help the candidate close this particular skill gap")
    })).describe("List of skill gaps in the candidate's profile along with their severity and recommended learning resources to close each gap"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
    careerPath: z.object({
        currentRole: z.string().describe("The candidate's current or most recent role inferred from their resume/self-description"),
        targetRole: z.string().describe("The target role the candidate is aiming for, inferred from the job description"),
        timelineMonths: z.number().int().describe("Realistic total months needed to reach the target role (e.g. 6, 12, 18)"),
        salaryRange: z.object({
            current: z.string().describe("Estimated current salary range in Indian Rupees (INR), e.g. '₹4L-₹8L per annum'"),
            target: z.string().describe("Estimated target salary range in Indian Rupees (INR) after reaching the goal, e.g. '₹15L-₹25L per annum'"),
        }),
        stages: z.array(z.object({
            title: z.string().describe("Phase title, e.g. 'Strengthen Core Skills'"),
            duration: z.string().describe("Duration range, e.g. '0-3 months'"),
            status: z.enum(["current", "upcoming"]).describe("'current' for the first/active phase, 'upcoming' for the rest"),
            description: z.string().describe("1-2 sentence description of what this phase focuses on"),
            milestones: z.array(z.string()).min(2).max(4).describe("2-4 concrete actionable milestones for this phase"),
            skills: z.array(z.string()).min(2).max(5).describe("2-5 key skills to build in this phase"),
        })).min(3).max(5).describe("3-5 sequential career phases to reach the target role"),
        companySuggestions: z.array(z.object({
            name: z.string().describe("Company name relevant to the job description and candidate profile"),
            tier: z.enum(["Stretch", "Target", "Safe"]).describe("Stretch = ambitious, Target = realistic, Safe = high chance"),
            fit: z.number().int().min(50).max(99).describe("Percentage fit score based on the candidate's profile"),
        })).min(3).max(6).describe("3-6 real company suggestions at different tiers"),
        resumeTips: z.array(z.object({
            type: z.enum(["strength", "warning", "tip"]).describe("strength = something good, warning = something to fix, tip = general advice"),
            text: z.string().describe("Concise, specific resume feedback based on the candidate's actual resume content"),
        })).min(3).max(6).describe("3-6 specific resume tips based on the candidate's resume and target role"),
    }).describe("A personalised career path plan from the candidate's current role to the target role"),
})

const resumeContentSchema = z.object({
    fullName: z.string().describe("Candidate's full name"),
    title: z.string().describe("A professional title/headline tailored to the job description, e.g. 'Senior Frontend Engineer'"),
    contact: z.object({
        email: z.string().optional().describe("Candidate's email address if available"),
        phone: z.string().optional().describe("Candidate's phone number if available"),
        location: z.string().optional().describe("Candidate's location if available"),
        links: z.array(z.string()).optional().describe("Relevant links such as LinkedIn, GitHub, portfolio")
    }).describe("Contact information for the candidate"),
    summary: z.string().describe("A concise 2-4 sentence professional summary tailored to the job description, written in a natural, human tone"),
    skills: z.array(z.string()).describe("A list of relevant skills tailored to the job description"),
    experience: z.array(z.object({
        company: z.string().describe("Company name"),
        role: z.string().describe("Job title/role"),
        duration: z.string().describe("Duration of employment, e.g. 'Jan 2022 - Present'"),
        highlights: z.array(z.string()).describe("Bullet points describing achievements and responsibilities, quantified where possible")
    })).describe("Work experience entries, most recent first"),
    projects: z.array(z.object({
        name: z.string().describe("Project name"),
        description: z.string().describe("Brief description of the project"),
        highlights: z.array(z.string()).describe("Bullet points describing key contributions/results")
    })).optional().describe("Notable projects, if relevant"),
    education: z.array(z.object({
        institution: z.string().describe("Institution name"),
        degree: z.string().describe("Degree/qualification obtained"),
        duration: z.string().describe("Duration of study, e.g. '2018 - 2022'")
    })).describe("Education history")
})

const resumeAnalysisSchema = z.object({
    ats: z.number().int().min(0).max(100).describe("ATS compatibility score 0-100"),
    impact: z.number().int().min(0).max(100).describe("Impact language score 0-100"),
    clarity: z.number().int().min(0).max(100).describe("Clarity and structure score 0-100"),
    keywords: z.number().int().min(0).max(100).describe("Keyword density score 0-100"),
    completeness: z.number().int().min(0).max(100).describe("Section completeness score 0-100"),
    formatting: z.number().int().min(0).max(100).describe("Formatting quality score 0-100"),
    seniority_alignment: z.number().int().min(0).max(100).describe("Seniority alignment score 0-100"),
    strengths: z.array(z.string()).min(3).max(5),
    improvements: z.array(z.string()).min(3).max(5),
    missing_sections: z.array(z.string()),
    top_skills: z.array(z.string()).max(6),
    estimated_yoe: z.number().int().min(0),
    seniority_level: z.enum(["Junior", "Mid-level", "Senior", "Lead", "Executive"]),
    industry_fit: z.array(z.string()).max(3),
    red_flags: z.array(z.string()).max(3),
    one_line_verdict: z.string()
})

// FIX 3: Pre-serialize all Zod schemas once at module load time.
// Previously these were called inside generateContent() on every single request,
// adding token overhead and CPU cost for every API call. Now they are computed
// once and reused across all requests.
const interviewReportJsonSchema = sanitizeSchemaForGemini(zodToJsonSchema(interviewReportSchema))
const resumeContentJsonSchema = sanitizeSchemaForGemini(zodToJsonSchema(resumeContentSchema))
const resumeAnalysisJsonSchema = sanitizeSchemaForGemini(zodToJsonSchema(resumeAnalysisSchema))

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `You are an elite Technical Interviewer and Career Coach. Generate a comprehensive interview report for a candidate based strictly on the provided inputs.

<INPUTS>
Resume: ${resume || "(No resume provided)"}
Self Description: ${selfDescription || "(No self description provided)"}
Job Description: ${jobDescription}
</INPUTS>

<INSTRUCTIONS>
1. Fact-Based Analysis: Base the match score, skill gaps, and preparation plan EXCLUSIVELY on the candidate's actual Resume and Self Description compared against the Job Description. Do not hallucinate skills they do not possess.
2. Question Generation: Provide exactly 8 to 12 technical questions and 8 to 12 behavioral questions.
3. Technical Depth: Technical questions must span core language concepts, specific tools/frameworks mentioned in the inputs, system design, and debugging scenarios.
4. Behavioral Scope: Behavioral questions must assess teamwork, conflict resolution, adaptability, and failure mitigation.
5. Resource Recommendations: For each skill gap, provide 2-4 highly specific, real-world learning resources (e.g., official docs, well-known practice platforms like LeetCode, or specific YouTube channels). Provide a precise search query, not a URL.
6. Financial Constraints: All salary ranges MUST be in Indian Rupees (INR) formatted as '₹XL-₹YL per annum' (e.g., '₹4L-₹8L per annum'). Do not use USD.
</INSTRUCTIONS>`

    const response = await withRetry((client) => withTimeout(client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: interviewReportJsonSchema,  // FIX 3: use pre-serialized schema
        }
    }), "Generating your interview report took too long. Please try again."))

    try {
        return JSON.parse(response.text)
    } catch (err) {
        throw new AppError("The AI returned an unexpected response. Please try again.", 502)
    }

}


// pdfmake fonts setup - uses built-in PDF standard fonts (no external font files needed,
// so this works reliably in serverless / containerized deployments without chromium)
const fonts = {
    Helvetica: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique"
    }
}

const printer = new PdfPrinter(fonts)

/**
 * @name buildResumeDocDefinition
 * @description Converts the structured resume content into a polished pdfmake document
 * definition: a header band with name/title/contact, followed by a two-column body
 * (left: summary, experience, projects; right: skills, education) for a clean,
 * professional, ATS-friendly single/two-page resume.
 */
function buildResumeDocDefinition(content) {
    const ACCENT = "#3b5bdb"
    const TEXT_DARK = "#1a1f27"
    const TEXT_MUTED = "#5b6472"
    const TEXT_BODY = "#333333"

    const contactParts = [
        content.contact?.email,
        content.contact?.phone,
        content.contact?.location,
        ...(content.contact?.links || [])
    ].filter(Boolean)

    // ---------- Header ----------
    const headerStack = [
        { text: content.fullName || "Candidate Name", style: "name" }
    ]
    if (content.title) {
        headerStack.push({ text: content.title, style: "title" })
    }
    if (contactParts.length) {
        headerStack.push({
            text: contactParts.join("    |    "),
            style: "contact",
            margin: [ 0, 4, 0, 0 ]
        })
    }

    const header = {
        stack: [
            { stack: headerStack },
            { canvas: [ { type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: ACCENT } ], margin: [ 0, 10, 0, 14 ] }
        ]
    }

    // ---------- Left column ----------
    const leftColumn = []

    if (content.summary) {
        leftColumn.push({ text: "PROFILE", style: "sectionHeader" })
        leftColumn.push({ text: content.summary, style: "body", margin: [ 0, 0, 0, 14 ] })
    }

    if (content.experience && content.experience.length) {
        leftColumn.push({ text: "EXPERIENCE", style: "sectionHeader" })
        content.experience.forEach((exp, idx) => {
            leftColumn.push({
                columns: [
                    { text: exp.role || "Role", style: "entryTitle", width: "*" },
                    { text: exp.duration || "", style: "entryMeta", alignment: "right", width: "auto" }
                ]
            })
            if (exp.company) {
                leftColumn.push({ text: exp.company, style: "entrySubtitle" })
            }
            if (exp.highlights && exp.highlights.length) {
                leftColumn.push({
                    ul: exp.highlights,
                    style: "body",
                    margin: [ 0, 3, 0, idx === content.experience.length - 1 ? 14 : 10 ]
                })
            } else {
                leftColumn.push({ text: "", margin: [ 0, 0, 0, idx === content.experience.length - 1 ? 14 : 10 ] })
            }
        })
    }

    if (content.projects && content.projects.length) {
        leftColumn.push({ text: "PROJECTS", style: "sectionHeader" })
        content.projects.forEach((proj, idx) => {
            leftColumn.push({ text: proj.name || "Project", style: "entryTitle" })
            if (proj.description) {
                leftColumn.push({ text: proj.description, style: "body", margin: [ 0, 1, 0, 0 ] })
            }
            if (proj.highlights && proj.highlights.length) {
                leftColumn.push({
                    ul: proj.highlights,
                    style: "body",
                    margin: [ 0, 3, 0, idx === content.projects.length - 1 ? 0 : 10 ]
                })
            }
        })
    }

    // ---------- Right column (sidebar) ----------
    const rightColumn = []

    if (content.skills && content.skills.length) {
        rightColumn.push({ text: "SKILLS", style: "sectionHeaderSidebar" })
        rightColumn.push({
            stack: content.skills.map(skill => ({
                text: skill,
                style: "skillItem",
                margin: [ 0, 0, 0, 4 ]
            })),
            margin: [ 0, 0, 0, 14 ]
        })
    }

    if (content.education && content.education.length) {
        rightColumn.push({ text: "EDUCATION", style: "sectionHeaderSidebar" })
        content.education.forEach((edu, idx) => {
            rightColumn.push({ text: edu.degree || "Degree", style: "entryTitleSidebar" })
            if (edu.institution) {
                rightColumn.push({ text: edu.institution, style: "entrySubtitleSidebar" })
            }
            if (edu.duration) {
                rightColumn.push({ text: edu.duration, style: "entryMetaSidebar", margin: [ 0, 0, 0, idx === content.education.length - 1 ? 0 : 10 ] })
            }
        })
    }

    const body = {
        columns: [
            { width: "65%", stack: leftColumn },
            { width: 12, text: "" },
            {
                width: "*",
                stack: rightColumn,
                margin: [ 12, 0, 0, 0 ]
            }
        ],
        columnGap: 0
    }

    return {
        pageSize: "A4",
        pageMargins: [ 40, 40, 40, 50 ],
        defaultStyle: {
            font: "Helvetica",
            fontSize: 9.5,
            lineHeight: 1.3,
            color: TEXT_BODY
        },
        footer: {
            text: "This is an AI-generated resume and may contain errors. Kindly check the text before use.",
            alignment: "center",
            fontSize: 7.5,
            color: TEXT_MUTED,
            italics: true,
            margin: [ 40, 10, 40, 0 ]
        },
        styles: {
            name: { fontSize: 22, bold: true, color: TEXT_DARK },
            title: { fontSize: 12, color: ACCENT, bold: true, margin: [ 0, 2, 0, 0 ] },
            contact: { fontSize: 9, color: TEXT_MUTED },

            sectionHeader: { fontSize: 11, bold: true, color: ACCENT, characterSpacing: 0.5, margin: [ 0, 0, 0, 6 ] },
            entryTitle: { fontSize: 10.5, bold: true, color: TEXT_DARK, margin: [ 0, 6, 0, 0 ] },
            entrySubtitle: { fontSize: 9.5, italics: true, color: TEXT_MUTED, margin: [ 0, 1, 0, 0 ] },
            entryMeta: { fontSize: 9, color: TEXT_MUTED, margin: [ 0, 6, 0, 0 ] },
            body: { fontSize: 9.5, color: TEXT_BODY },

            sectionHeaderSidebar: { fontSize: 10.5, bold: true, color: ACCENT, characterSpacing: 0.5, margin: [ 0, 0, 0, 6 ] },
            skillItem: { fontSize: 9.5, color: TEXT_BODY },
            entryTitleSidebar: { fontSize: 9.5, bold: true, color: TEXT_DARK, margin: [ 0, 4, 0, 0 ] },
            entrySubtitleSidebar: { fontSize: 9, color: TEXT_BODY, margin: [ 0, 1, 0, 0 ] },
            entryMetaSidebar: { fontSize: 8.5, color: TEXT_MUTED, margin: [ 0, 1, 0, 0 ] }
        },
        content: [ header, body ]
    }
}

/**
 * @name generatePdfFromDocDefinition
 * @description Renders a pdfmake document definition to a PDF Buffer.
 */
function generatePdfFromDocDefinition(docDefinition) {
    return new Promise((resolve, reject) => {
        try {
            const pdfDoc = printer.createPdfKitDocument(docDefinition)
            const chunks = []

            pdfDoc.on("data", (chunk) => chunks.push(chunk))
            pdfDoc.on("end", () => resolve(Buffer.concat(chunks)))
            pdfDoc.on("error", (err) => reject(err))

            pdfDoc.end()
        } catch (err) {
            reject(err)
        }
    })
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const prompt = `You are an Expert Executive Resume Writer. Transform the provided inputs into a highly professional, ATS-optimized resume structure tailored for the target job description.

<INPUTS>
Resume: ${resume || "(No resume provided)"}
Self Description: ${selfDescription || "(No self description provided)"}
Job Description: ${jobDescription}
</INPUTS>

<INSTRUCTIONS>
1. Fact Retention: Retain all real company names, roles, durations, and hard skills from the original inputs. Do not invent unverified experience.
2. Tailoring: Highlight strengths and reframe existing experience to best align with the Job Description.
3. Tone & Style: Write in a concise, high-impact professional tone using strong action verbs. Use objective language and avoid generic filler words.
4. Density & Impact: Ensure bullet points focus on quantifiable achievements and technical depth.
5. Formatting: Keep the content focused to fit a standard 1-2 page layout while maximizing relevance to ensure high ATS parsability.
</INSTRUCTIONS>`

    const response = await withRetry((client) => withTimeout(client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: resumeContentJsonSchema,  // FIX 3: use pre-serialized schema
        }
    }), "Generating your resume took too long. Please try again."))

    let resumeContent
    try {
        resumeContent = JSON.parse(response.text)
    } catch (err) {
        throw new AppError("The AI returned an unexpected response. Please try again.", 502)
    }

    const docDefinition = buildResumeDocDefinition(resumeContent)
    const pdfBuffer = await generatePdfFromDocDefinition(docDefinition)
    return pdfBuffer

}

async function analyzeResume(resumeText) {
    const prompt = `You are a top-tier Technical Recruiter. Analyze the following resume text and provide a brutally honest, objective assessment independent of any specific job description.

<RESUME_TEXT>
${resumeText.slice(0, 8000)}
</RESUME_TEXT>

<SCORING_RULES>
1. Range Utilization: Use the full 0-100 scale. A genuinely weak area should score 10-30; a world-class area should score 90-100. Do not default to middle scores.
2. Experience Context: DO NOT penalize for 0 years of formal employment if the candidate demonstrates exceptional technical depth through complex projects, open-source work, or elite competitive programming rankings. Impact can be achieved outside of formal employment.
3. Evidence-Based: Every score and qualitative feedback point must be justified by the provided text.
4. Score Differentiation: Each dimension MUST receive a different score. If all 7 scores are within 5 points of each other, your evaluation is wrong — no resume is equally strong across all dimensions.
</SCORING_RULES>

<DIMENSIONS_TO_EVALUATE>
Evaluate exactly against these JSON schema keys:
- ats: Is the text clean and parsable? Penalize heavily for missing standard sections or scrambled text.
- impact: Are bullet points quantified (e.g., efficiency gains, user counts)? Penalize vague duties.
- clarity: Is the hierarchy logical? Can it be skimmed by a human in 6-7 seconds?
- keywords: Are modern industry standard tools present and contextualized within achievements (not just a comma-separated list)?
- completeness: Are all vital sections (Contact, Education, Experience/Projects, Skills) present?
- formatting: Are date formats consistent? Are there obvious typos or casing errors (e.g., "node.js" instead of "Node.js")?
- seniority_alignment: Does the depth of achievements match the inferred seniority level?
</DIMENSIONS_TO_EVALUATE>`

    const response = await withRetry((client) => withTimeout(client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: resumeAnalysisJsonSchema,
        }
    }), "Analyzing your resume took too long. Please try again."))

    let result
    try {
        result = JSON.parse(response.text)
    } catch (err) {
        throw new AppError("The AI returned an unexpected response. Please try again.", 502)
    }

    // Calculate overall as a weighted average of sub-scores so it is always consistent.
    // Weights reflect how much each dimension impacts overall resume quality.
    const weights = {
        ats:                 0.20,
        impact:              0.20,
        clarity:             0.15,
        keywords:            0.15,
        completeness:        0.15,
        formatting:          0.10,
        seniority_alignment: 0.05,
    }
    const overall = Math.round(
        Object.entries(weights).reduce((sum, [key, weight]) => {
            return sum + (result[key] ?? 0) * weight
        }, 0)
    )
    result.overall = overall

    return result
}

module.exports = { generateInterviewReport, generateResumePdf, analyzeResume }