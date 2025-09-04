const express = require("express");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const { AssemblyAI } = require("assemblyai");
require("dotenv").config();


const app = express();
const upload = multer({ dest: "uploads/" });
app.use(cors()); // Allow all origins

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;


const client = new AssemblyAI({
  apiKey: ASSEMBLYAI_API_KEY,
});

// Upload endpoint
app.post("/upload", upload.single("audio"), async (req, res) => {
  try {
    const filePath = req.file.path;
    console.log("File uploaded:", filePath);

    const audioUrl = await client.files.upload(fs.createReadStream(filePath));

    // transcription with diarization
    const transcript = await client.transcripts.create({
      audio_url: audioUrl,
      speaker_labels: true,
      speakers_expected: 2, 
    });

    // Poll until transcription is complete
    let completed;
    while (true) {
      completed = await client.transcripts.get(transcript.id);

      if (completed.status === "completed") break;
      if (completed.status === "error") throw new Error(completed.error);

      console.log("Still processing...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    // Create speaker-labeled transcript
    const labeledTranscript = completed.utterances
      .map((u) => `Speaker ${u.speaker}: ${u.text}`)
      .join("\n");

    // Cleanup
    fs.unlinkSync(filePath);

    let output = [];
    for (let row of completed.utterances){
      let {speaker, text} = row;
      output.push({speaker, text})
    }

    res.json({
      transcript: labeledTranscript,
      raw: output,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

app.listen(process.env.PORT, () => {
  console.log("Server running on http://localhost: " + process.env.PORT);
});
