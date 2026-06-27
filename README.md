# HireSync.AI — Full Stack Gen AI Career Platform

> Upload your resume, analyze job descriptions, detect skill gaps, generate ATS-optimized resumes, and get AI-powered interview questions — all in one platform.


![Node](https://img.shields.io/badge/Node.js-18%2B-green)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Gemini](https://img.shields.io/badge/Google%20Gemini-AI-4285F4)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen)






## Overview

**HireSync.AI** is a real-world, production-grade Full Stack + Generative AI platform built to supercharge your job search. It bridges the gap between where you are and where you want to be - by intelligently analyzing your resume against job descriptions, identifying missing skills, generating ATS-friendly resumes tailored to each role, and preparing you with role-specific AI-generated interview questions.

This project is a complete walkthrough of building a modern SaaS-like application using **React.js**, **Node.js/Express**, **MongoDB**, and **Google Gemini** - ideal for developers who want to master Full Stack + Gen AI by building something real.


## Features

- **Resume Upload & Parsing** - Upload your resume (PDF/DOCX) and extract structured content automatically
- **Job Description Analysis** - Paste any JD and let AI break down required skills, experience, and keywords
- **Skill Gap Detection** - Instantly identify what's missing between your profile and the target role
- **ATS-Optimized Resume Generation** - Generate a tailored, ATS-friendly resume aligned to the job description using Google Gemini
- **AI Interview Question Generation** - Get role-specific, personalized interview questions based on your resume and JD
- **Authentication** - Secure user login and registration (JWT-based)
- **User Dashboard** - Track your resumes, analyses, and interview prep sessions
- **Responsive UI** - Clean, modern interface that works on desktop and mobile


## 🛠 Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| **React 18** | Core UI library for building components |
| **Tailwind CSS / SCSS** | Styling & responsive design |
| **Axios / Fetch API** | HTTP client for API calls |

### Backend

| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime environment |
| **Express.js** | REST API server & routing |
| **MongoDB + Mongoose** | NoSQL database & ODM |
| **JWT (jsonwebtoken)** | Authentication & authorization |
| **Multer** | File upload handling (resume PDF/DOCX) |
| **dotenv** | Environment variable management |
| **CORS** | Cross-origin request handling |

### AI / Integrations

| Technology | Purpose |
|------------|---------|
| **Google Gemini API** | Resume generation, skill gap analysis & interview question generation |

---

## Project Structure

```
hiresync-ai/
├── Backend/
│   ├── server.js                   # Entry point — starts the Express server
│   └── src/
│       ├── app.js                  # Express app config & middleware setup
│       ├── config/                 # DB connection & environment config
│       ├── controllers/            # Route handler logic
│       │   ├── auth.controller.js  # Register / Login
│       │   ├── resume.controller.js# Resume upload & parsing
│       │   └── interview.controller.js # Interview question generation
│       ├── middlewares/            # Auth guards, error handlers, file upload
│       ├── models/                 # Mongoose schemas (User, Resume, Interview)
│       ├── routes/                 # API route definitions
│       └── services/
│           └── ai.service.js       # Google Gemini API integration logic
│
└── Frontend/
    ├── app/                        # React page components
    │   ├── dashboard/              # User dashboard
    │   ├── resume/                 # Resume upload & analysis pages
    │   └── interview/              # Interview prep pages
    ├── components/                 # Reusable React components
    ├── public/                     # Static assets
    ├── styles/                     # Global & module SCSS/CSS
    ├── vite.config.js                # Build tool configuration
    └── package.json
```



## Prerequisites

Make sure the following are installed on your system before running the project:

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) v9+ or [yarn](https://yarnpkg.com/)
- [MongoDB](https://www.mongodb.com/) (local instance or MongoDB Atlas cloud)
- A **Google Gemini API Key** from [Google AI Studio](https://aistudio.google.com/)



## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ankurdotio/interview-ai-yt.git
cd interview-ai-yt-main
```



### 2. Backend Setup

```bash
# Navigate to the backend folder
cd Backend

# Install dependencies
npm install
```

Create a `.env` file in the `Backend/` directory:

```bash
cp .env.example .env
```

Then fill in the values (see [Environment Variables](#-environment-variables) below).



### 3. Frontend Setup

```bash
# Open a new terminal and navigate to the frontend folder
cd Frontend

# Install dependencies
npm install
```

Create a `.env.local` file in the `Frontend/` directory:

```bash
cp .env.example .env.local
```

Fill in the frontend environment variables as needed.



## Environment Variables

### Backend — `Backend/.env`

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/hiresync-ai
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/hiresync-ai

# JWT
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# AI Provider
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Google Gemini
GEMINI_API_KEY=your-gemini-api-key-here
```

### Frontend — `Frontend/.env.local`

```env
# Backend API Base URL
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```





## Running the Project

You need **two terminals** — one for the backend, one for the frontend.

### Terminal 1 — Start the Backend

```bash
cd Backend
npm run dev
```

### Terminal 2 — Start the Frontend

```bash
cd Frontend
npm run dev
```





## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive a JWT token |

### Resume
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/resume/upload` | Upload and parse a resume (PDF/DOCX) |
| `POST` | `/api/resume/analyze` | Analyze resume against a job description |
| `POST` | `/api/resume/generate` | Generate an ATS-optimized resume |
| `GET`  | `/api/resume` | Get all resumes for the logged-in user |
| `DELETE` | `/api/resume/:id` | Delete a resume |

### Interview
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/interviews/generate` | Generate AI interview questions |
| `GET`  | `/api/interviews` | Get all interview sessions |
| `GET`  | `/api/interviews/:id` | Get a specific interview session |
| `DELETE` | `/api/interviews/:id` | Delete an interview session |
