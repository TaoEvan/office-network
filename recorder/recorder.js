const express = require('express')
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js')
require("dotenv/config")


const router = express.Router()
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() })
const elevenlabs = new ElevenLabsClient();

async function interpretAudio (audioBlob) {
    const transcription = await elevenlabs.speechToText.convert({
        file: audioBlob,
        modelId: "scribe_v1", // Model to use, for now only "scribe_v1" is supported.
        tagAudioEvents: true, // Tag audio events like laughter, applause, etc.
        languageCode: "eng", // Language of the audio file. If set to null, the model will detect the language automatically.
        diarize: true, // Whether to annotate who is speaking

    })

    console.log(transcription)

    return transcription
}

router.use(async (req, res, next) => {
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
    next()
})

router.post("/", upload.single('audio'), async (req, res) => {
    try {
        const job_id = (Math.random()).toString(36).substring(2)

        const audio = new Blob([req.file.buffer], {type: req.file.mimetype})

        const transcript = await interpretAudio(audio)

        res.render("transcript", {transtext: transcript.text});
    } catch (e) {
        res.render("transcript", {transtext: JSON.stringify(e)})
    }
})

module.exports = router

