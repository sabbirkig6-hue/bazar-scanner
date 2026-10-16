
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

app.post("/api/analyze", (req, res) => {
  const { image } = req.body || {};

  if (!image || typeof image !== "string") {
    return res.status(400).json({
      success: false,
      message: "Please select a product image"
    });
  }

  res.json({
    success: true,
    message: "Image received successfully",
    identified: false,
    note: "Product recognition is not connected yet"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Bazar Scanner server is ready");
});
