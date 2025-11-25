import OpenAI from "openai";
import fs from "fs";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";

/**
 * Transcribes an audio file using OpenAI Whisper API.
 * Saves the file temporarily to disk to satisfy the OpenAI SDK requirements.
 */
export async function transcribeAudio(file: File): Promise<string> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${uuidv4()}-${file.name}`);

    try {
        // Convert File/Blob to Buffer and write to temp file
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.promises.writeFile(tempFilePath, buffer);

        console.log(`🎙️ Transcribing audio file: ${tempFilePath} (${file.size} bytes)`);

        const transcript = await client.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-1",
        });

        console.log("✅ Transcription complete");
        return transcript.text;
    } catch (error) {
        console.error("❌ Transcription failed:", error);
        throw error;
    } finally {
        // Clean up temp file
        try {
            if (fs.existsSync(tempFilePath)) {
                await fs.promises.unlink(tempFilePath);
            }
        } catch (cleanupError) {
            console.error("⚠️ Failed to delete temp file:", cleanupError);
        }
    }
}
