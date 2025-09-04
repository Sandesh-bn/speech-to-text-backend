const express = require("express");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const { AssemblyAI } = require("assemblyai");
require("dotenv").config();

const app = express();
const upload = multer({ dest: "/tmp" }); // use tmp dir
app.use(cors());

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const client = new AssemblyAI({ apiKey: ASSEMBLYAI_API_KEY });

app.post("/upload", upload.single("audio"), async (req, res) => {
  try {
    const filePath = req.file.path;
    const audioUrl = await client.files.upload(fs.createReadStream(filePath));

    // Create transcript request
    const transcript = await client.transcripts.create({
      audio_url: audioUrl,
      speaker_labels: true,
      speakers_expected: 2,
    });

    //Instead of waiting forever, return transcript id
    res.json({ transcriptId: transcript.id });

    fs.unlinkSync(filePath); // cleanup temp file
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

// New endpoint to fetch transcript status
app.get("/transcript/:id", async (req, res) => {
  try {
    const completed = await client.transcripts.get(req.params.id);
    res.json(completed);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Failed to fetch transcript" });
  }
});

module.exports = app; 
