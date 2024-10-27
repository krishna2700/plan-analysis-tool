require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const fsPromises = fs.promises;
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = process.env.PORT || 3690;

// Configure multer for file uploads
const upload = multer({ dest: "upload/" });
app.use(express.json({ limit: "10mb" }));

// Initialize Google Generative AI with the API key from .env
const generativeAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
app.use(express.static("public"));

// Endpoint to analyze an image
app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    // Check if the file is uploaded
    if (!req.file) {
      return res.status(400).json({ error: "Please upload an image" });
    }

    // Read the uploaded file as base64 and log size
    const imagePath = req.file.path;
    const imageData = await fsPromises.readFile(imagePath, {
      encoding: "base64",
    });

    // Log image size (base64 strings are roughly 1.37 times larger than the original file size in bytes)
    console.log(
      "Image size (in bytes):",
      Buffer.byteLength(imageData, "base64")
    );

    // Configure the model
    const model = generativeAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    // Generate content using the image data and prompt
    const results = await model.generateContent([
      "Analyze this plant image and provide detailed analysis of its species, health, and care recommendations, its characteristics, care instructions, and any interesting facts. Please provide the response in plain text without using any markdown formatting.",
      {
        inlineData: {
          mimeType: req.file.mimetype, // Ensure correct mimetype
          data: imageData,
        },
      },
    ]);

    console.log("Generated content results:", results);

    // Check if the response contains the expected data
    if (!results || !results.response) {
      throw new Error(
        "The API response is undefined or missing the expected structure."
      );
    }

    const plantInfo = results.response.text
      ? results.response.text()
      : "No text response received.";

    // Remove the uploaded image file after processing
    await fsPromises.unlink(imagePath);

    // Send the response back with the plant information and image data
    res.json({
      results: plantInfo,
      image: `data:${req.file.mimetype};base64,${imageData}`,
    });
  } catch (error) {
    // Log detailed error information for debugging
    console.error("Error details:", error);

    // Enhanced error response for the client
    res.status(500).json({
      error: error.message,
      status: error.status || "Unknown",
      statusText: error.statusText || "Unknown",
      errorDetails: error.errorDetails || "No additional details available",
    });
  }
});

// Endpoint to download PDF (placeholder)
app.post("/download", async (req, res) => {
  res.json({ success: true });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
