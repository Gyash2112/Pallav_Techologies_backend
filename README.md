# Pallav Technologies - AI Feedback Form (Backend)

## Project Title

AI Feedback Analysis Server using AssemblyAI and Perplexity API

---

## Overview

This is the backend for the AI Feedback Form assignment for Pallav Technologies.  
It is built with Node.js and Express, and integrates two AI services:

1. **AssemblyAI** – to transcribe uploaded audio files (mp3 or wav).
2. **Perplexity API** – to analyze the transcribed text and generate evaluation scores, overall feedback, and observations.

The backend exposes a single API endpoint that accepts an audio file, transcribes it, and returns structured JSON feedback.

---

## Features

- Upload audio recordings (`.mp3` / `.wav`).
- Automatic transcription using **AssemblyAI**.
- AI-based call evaluation using **Perplexity (Sonar-Pro)** model.
- Returns:
  - Transcribed text
  - Evaluation scores for all parameters
  - Overall feedback and observations
- Handles missing data gracefully and cleans up uploaded files after processing.

---

## Installation and Setup

### 1. Clone the repository

bash
git clone <repository_url>

### 2. Install Packages

npm i

### Create a .env file in the root directory

ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
PORT=5000

### Start the server

node index.js

### API Endpoint

POST /api/analyze-call

### Description:

Accepts an uploaded audio file and returns the transcription with AI-based feedback.

### Response Example:

{
"transcript": "Hello, this is the agent calling from ABC Bank...",
"aiResult": {
"scores": {
"greeting": 5,
"collectionUrgency": 12,
"rebuttalCustomerHandling": 14,
"callEtiquette": 13,
"callDisclaimer": 5,
"correctDisposition": 10,
"callClosing": 5,
"fatalIdentification": 5,
"fatalTapeDiscloser": 10,
"fatalToneLanguage": 15
},
"overallFeedback": "Agent maintained a professional tone but missed the closing disclaimer.",
"observation": "Good urgency and clarity. Needs to include tape disclosure next time."
}
}

### How It Works

The API receives an audio file through the /api/analyze-call route.

It uploads the file to AssemblyAI for transcription.

The server continuously polls until the transcription is completed.

Once the transcript is ready, it is sent to Perplexity AI for evaluation using the sonar-pro model.

The AI returns structured feedback in JSON format.

The server validates all parameters, fills in any missing scores, deletes the temporary audio file, and responds with the final JSON result.
