// index.js
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import fs from 'fs';
import axios from 'axios';

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(cors());
app.use(express.json());

// Map AI scores to your parameter keys
const PARAMS_KEYS = [
  'greeting',
  'collectionUrgency',
  'rebuttalCustomerHandling',
  'callEtiquette',
  'callDisclaimer',
  'correctDisposition',
  'callClosing',
  'fatalIdentification',
  'fatalTapeDiscloser',
  'fatalToneLanguage',
];

app.post('/api/analyze-call', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: 'No audio file uploaded' });

    const audioPath = req.file.path;

    // ---------- Step 1: Upload audio to AssemblyAI ----------
    const uploadResp = await axios({
      method: 'post',
      url: 'https://api.assemblyai.com/v2/upload',
      headers: {
        Authorization: process.env.ASSEMBLYAI_API_KEY,
        'Content-Type': 'application/octet-stream',
      },
      data: fs.createReadStream(audioPath),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const upload_url = uploadResp.data.upload_url;

    // ---------- Step 2: Create transcript ----------
    const createResp = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url: upload_url,
      },
      { headers: { Authorization: process.env.ASSEMBLYAI_API_KEY } }
    );

    const transcriptId = createResp.data.id;

    // ---------- Step 3: Poll until transcript is ready ----------
    let transcript;
    while (true) {
      const pollResp = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: { Authorization: process.env.ASSEMBLYAI_API_KEY } }
      );

      if (pollResp.data.status === 'completed') {
        transcript = pollResp.data.text;
        break;
      }
      if (pollResp.data.status === 'failed')
        throw new Error('Transcription failed');
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log('🎧 Transcript:', transcript);

    // ---------- Step 4: Send transcript to Perplexity ----------
    const prompt = `
      You are an evaluator analyzing a customer call transcript.
      Evaluate the transcript on these parameters:
      greeting, collectionUrgency, rebuttalCustomerHandling, callEtiquette,
      callDisclaimer, correctDisposition, callClosing,
      fatalIdentification, fatalTapeDiscloser, fatalToneLanguage.

      Return ONLY valid JSON like:
      {
        "scores": {
          "greeting": <number 0-5>,
          "collectionUrgency": <0-15>,
          "rebuttalCustomerHandling": <0-15>,
          "callEtiquette": <0-15>,
          "callDisclaimer": <0-5>,
          "correctDisposition": <0-10>,
          "callClosing": <0-5>,
          "fatalIdentification": <0-5>,
          "fatalTapeDiscloser": <0-10>,
          "fatalToneLanguage": <0-15>
        },
        "overallFeedback": "short summary",
        "observation": "any extra notes"
      }

      Transcript: """${transcript}"""
    `;

    const perplexityResp = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'sonar-pro',
        messages: [
          { role: 'system', content: 'You are a strict evaluator bot.' },
          { role: 'user', content: prompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiText = perplexityResp.data.choices[0].message.content;
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(aiText);
    } catch {
      parsedOutput = { scores: {}, overallFeedback: aiText, observation: '' };
    }

    // Ensure all keys exist
    PARAMS_KEYS.forEach((k) => {
      if (!(k in parsedOutput.scores)) parsedOutput.scores[k] = 0;
    });

    res.json({ transcript, aiResult: parsedOutput });
    fs.unlinkSync(audioPath);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error: 'Processing failed',
      details: err.response?.data || err.message,
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
