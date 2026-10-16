
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    app: "Bazar Scanner",
    message: "Server is ready"
  });
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { image } = req.body || {};

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        message: "আগে একটি ছবি নির্বাচন করুন।"
      });
    }

    const match = image.match(
      /^data:(image\/(?:jpeg|png|webp|heic|heif));base64,([\s\S]+)$/
    );

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "JPG, PNG অথবা WebP ছবি ব্যবহার করুন।"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Gemini API key সেট করা নেই।"
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: match[1],
                  data: match[2]
                }
              },
              {
                text: "ছবির পণ্যটি শনাক্ত করার চেষ্টা করো। বাংলায় পণ্যের নাম, ব্র্যান্ড (দেখা গেলে), প্যাকেটের ওজন (দেখা গেলে) এবং পরিচয় নিশ্চিত না হলে তা স্পষ্ট করে বলো। বাংলাদেশের বর্তমান বাজারদর নিশ্চিতভাবে জানা না থাকলে কোনো দাম বানিয়ে বলবে না।"
              }
            ]
          }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(502).json({
        success: false,
        message: "AI কাজ করেনি। API key, মডেল ও ব্যবহারের সীমা পরীক্ষা করুন।"
      });
    }

    const answer = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      return res.status(502).json({
        success: false,
        message: "AI কোনো ফলাফল দেয়নি। আবার চেষ্টা করুন।"
      });
    }

    res.json({
      success: true,
      identified: true,
      result: answer,
      message: answer
    });

  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({
      success: false,
      message: "সার্ভারে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Bazar Scanner server is ready");
});
        
