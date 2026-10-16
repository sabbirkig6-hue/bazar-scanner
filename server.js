
import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

const MODEL = "gemini-2.5-flash";

async function askGemini(parts) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }]
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Gemini API error:", data);
    throw new Error("GEMINI_REQUEST_FAILED");
  }

  const answer = data.candidates?.[0]?.content?.parts
    ?.map(part => part.text || "")
    .join("\n")
    .trim();

  if (!answer) throw new Error("EMPTY_ANSWER");
  return answer;
}

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    app: "Bangla AI Assistant + Bazar Scanner"
  });
});

// বাংলায় যেকোনো প্রশ্নের উত্তর
app.post("/api/chat", async (req, res) => {
  try {
    const question = req.body?.question;

    if (typeof question !== "string" || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "আপনার প্রশ্নটি লিখুন।"
      });
    }

    if (question.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "প্রশ্নটি একটু ছোট করে লিখুন।"
      });
    }

    const answer = await askGemini([{
      text:
        "তুমি একজন সহায়ক বাংলা AI সহকারী। " +
        "ব্যবহারকারীর প্রশ্নের উত্তর সহজ, পরিষ্কার বাংলায় দাও। " +
        "তথ্য নিশ্চিত না হলে তা স্পষ্ট করে বলো, বানিয়ে তথ্য দিও না।\n\n" +
        "প্রশ্ন: " + question.trim()
    }]);

    res.json({ success: true, answer });
  } catch (error) {
    console.error("Chat error:", error.message);

    const missingKey = error.message === "MISSING_API_KEY";

    res.status(missingKey ? 500 : 502).json({
      success: false,
      message: missingKey
        ? "Gemini API Key সার্ভার পাচ্ছে না। Render-এর Environment Group পরীক্ষা করুন।"
        : "AI উত্তর দিতে পারেনি। API Key, মডেল এবং API ব্যবহারের সীমা পরীক্ষা করুন।"
    });
  }
});

// পণ্যের ছবি শনাক্ত করা
app.post("/api/analyze", async (req, res) => {
  try {
    const image = req.body?.image;

    if (typeof image !== "string") {
      return res.status(400).json({
        success: false,
        message: "আগে একটি ছবি নির্বাচন করুন।"
      });
    }

    const match = image.match(
      /^data:(image\/(?:jpeg|png|webp));base64,([\s\S]+)$/
    );

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "JPG, PNG অথবা WebP ছবি ব্যবহার করুন।"
      });
    }

    const answer = await askGemini([
      {
        inline_data: {
          mime_type: match[1],
          data: match[2]
        }
      },
      {
        text:
          "ছবির পণ্যটি শনাক্ত করো। বাংলায় নাম, দৃশ্যমান ব্র্যান্ড " +
          "ও প্যাকেটের ওজন বলো। নিশ্চিত না হলে তা জানাও। " +
          "বাংলাদেশের বাজারদর নিশ্চিত না হলে দাম বানিয়ে বলো না।"
      }
    ]);

    res.json({
      success: true,
      identified: true,
      result: answer,
      message: answer
    });
  } catch (error) {
    console.error("Analysis error:", error.message);

    res.status(502).json({
      success: false,
      message: error.message === "MISSING_API_KEY"
        ? "Gemini API Key সার্ভার পাচ্ছে না।"
        : "ছবি বিশ্লেষণ করা যায়নি। আবার চেষ্টা করুন।"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Bazar Scanner server is ready");
});
  
