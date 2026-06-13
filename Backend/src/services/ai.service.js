const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const PdfPrinter = require("pdfmake")

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})


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
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {


    const prompt = `Generate an interview report for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        IMPORTANT: Generate AT LEAST 8 (and up to 12) technicalQuestions and AT LEAST 8 (and up to 12) behavioralQuestions.
                        The technical questions should cover a wide range of topics relevant to the job description, including core concepts, tools/technologies, problem solving, system design, coding and debugging.
                        The behavioral questions should cover a wide range of scenarios such as teamwork, conflict resolution, leadership, handling failure, time management, communication and adaptability.
                        Do not return fewer than 8 questions in either category.
`

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(interviewReportSchema),
        }
    })

    return JSON.parse(response.text)


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
 * @name resumeContentSchema
 * @description Structured schema for resume content. Instead of generating raw HTML
 * (which previously required puppeteer/chromium and was unreliable in serverless/
 * containerized deployments), the AI now returns structured JSON which is rendered
 * directly to a PDF using pdfmake - a pure JavaScript PDF generator with no browser dependency.
 */
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

/**
 * @name buildResumeDocDefinition
 * @description Converts the structured resume content into a pdfmake document definition.
 */
function buildResumeDocDefinition(content) {
    const contactLine = [
        content.contact?.email,
        content.contact?.phone,
        content.contact?.location,
        ...(content.contact?.links || [])
    ].filter(Boolean).join("   |   ")

    const docContent = []

    docContent.push({ text: content.fullName, style: "name" })
    if (content.title) {
        docContent.push({ text: content.title, style: "title" })
    }
    if (contactLine) {
        docContent.push({ text: contactLine, style: "contact" })
    }

    if (content.summary) {
        docContent.push({ text: "Summary", style: "sectionHeader" })
        docContent.push({ text: content.summary, style: "body", margin: [ 0, 0, 0, 10 ] })
    }

    if (content.skills && content.skills.length) {
        docContent.push({ text: "Skills", style: "sectionHeader" })
        docContent.push({ text: content.skills.join("  •  "), style: "body", margin: [ 0, 0, 0, 10 ] })
    }

    if (content.experience && content.experience.length) {
        docContent.push({ text: "Experience", style: "sectionHeader" })
        content.experience.forEach(exp => {
            docContent.push({
                columns: [
                    { text: `${exp.role} — ${exp.company}`, style: "entryTitle" },
                    { text: exp.duration, style: "entryMeta", alignment: "right" }
                ]
            })
            if (exp.highlights && exp.highlights.length) {
                docContent.push({
                    ul: exp.highlights,
                    style: "body",
                    margin: [ 0, 2, 0, 8 ]
                })
            }
        })
    }

    if (content.projects && content.projects.length) {
        docContent.push({ text: "Projects", style: "sectionHeader" })
        content.projects.forEach(proj => {
            docContent.push({ text: proj.name, style: "entryTitle" })
            if (proj.description) {
                docContent.push({ text: proj.description, style: "body" })
            }
            if (proj.highlights && proj.highlights.length) {
                docContent.push({
                    ul: proj.highlights,
                    style: "body",
                    margin: [ 0, 2, 0, 8 ]
                })
            }
        })
    }

    if (content.education && content.education.length) {
        docContent.push({ text: "Education", style: "sectionHeader" })
        content.education.forEach(edu => {
            docContent.push({
                columns: [
                    { text: `${edu.degree} — ${edu.institution}`, style: "entryTitle" },
                    { text: edu.duration, style: "entryMeta", alignment: "right" }
                ],
                margin: [ 0, 0, 0, 6 ]
            })
        })
    }

    return {
        pageSize: "A4",
        pageMargins: [ 40, 40, 40, 40 ],
        defaultStyle: {
            font: "Helvetica",
            fontSize: 10,
            lineHeight: 1.25
        },
        styles: {
            name: { fontSize: 20, bold: true, color: "#1a1f27", margin: [ 0, 0, 0, 2 ] },
            title: { fontSize: 12, color: "#3b5bdb", margin: [ 0, 0, 0, 4 ] },
            contact: { fontSize: 9, color: "#555555", margin: [ 0, 0, 0, 12 ] },
            sectionHeader: { fontSize: 12, bold: true, color: "#1a1f27", margin: [ 0, 10, 0, 4 ], decoration: "underline" },
            entryTitle: { fontSize: 10.5, bold: true, margin: [ 0, 4, 0, 1 ] },
            entryMeta: { fontSize: 9, color: "#777777" },
            body: { fontSize: 9.5, color: "#333333" }
        },
        content: docContent
    }
}

/**
 * @name generatePdfFromDocDefinition
 * @description Renders a pdfmake document definition to a PDF Buffer.
 * Replaces the previous puppeteer/chromium based HTML-to-PDF conversion which
 * frequently failed in production/serverless deployments due to missing
 * chromium binaries or memory constraints.
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

    const prompt = `Generate resume content for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        Return a structured JSON object describing the candidate's resume tailored for the given job description.
                        The content should highlight the candidate's strengths and relevant experience.
                        The content of resume should not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        Keep the content concise and focused so that it fits within 1-2 pages. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: zodToJsonSchema(resumeContentSchema),
        }
    })

    const resumeContent = JSON.parse(response.text)

    const docDefinition = buildResumeDocDefinition(resumeContent)

    const pdfBuffer = await generatePdfFromDocDefinition(docDefinition)

    return pdfBuffer

}

module.exports = { generateInterviewReport, generateResumePdf }