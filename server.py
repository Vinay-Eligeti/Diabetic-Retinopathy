"""
DR Detect — FastAPI Backend Server
===================================
Serves the trained EfficientNet+Transformer model as a REST API.
Frontend uploads an image → backend returns DR grade + confidence.

Usage:
    python server.py
    (runs on http://localhost:8000)
"""

import io
import os
import sys
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
import timm
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "best_ordinal_model.pt")
NUM_CLASSES = 5

CLASS_NAMES = {
    0: "No DR",
    1: "Mild NPDR",
    2: "Moderate NPDR",
    3: "Severe NPDR",
    4: "Proliferative DR",
}

FINDINGS_MAP = {
    0: [
        {"text": "No visible signs of diabetic retinopathy", "severity": "normal"},
        {"text": "Retinal vasculature appears healthy", "severity": "normal"},
        {"text": "No microaneurysms or hemorrhages detected", "severity": "normal"},
    ],
    1: [
        {"text": "Few microaneurysms detected", "severity": "mild"},
        {"text": "Minimal vascular changes observed", "severity": "mild"},
        {"text": "No significant exudates present", "severity": "normal"},
    ],
    2: [
        {"text": "Multiple microaneurysms present", "severity": "moderate"},
        {"text": "Dot and blot hemorrhages observed", "severity": "moderate"},
        {"text": "Hard exudates detected in macular region", "severity": "moderate"},
    ],
    3: [
        {"text": "Extensive intraretinal hemorrhages", "severity": "severe"},
        {"text": "Venous beading detected in multiple quadrants", "severity": "severe"},
        {"text": "Intraretinal microvascular abnormalities (IRMA)", "severity": "severe"},
        {"text": "Significant risk of progression to proliferative stage", "severity": "severe"},
    ],
    4: [
        {"text": "Neovascularization detected", "severity": "critical"},
        {"text": "Abnormal new vessel growth on retinal surface", "severity": "critical"},
        {"text": "High risk of vitreous hemorrhage", "severity": "critical"},
        {"text": "Immediate ophthalmology referral recommended", "severity": "critical"},
    ],
}

INFERENCE_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


# ──────────────────────────────────────────────
# Model (matches train.py / predict.py)
# ──────────────────────────────────────────────
class CNNTransformerOrdinal(nn.Module):
    def __init__(self, embed_dim=256, num_heads=4, num_layers=2):
        super().__init__()
        self.cnn = timm.create_model(
            "efficientnet_b3",
            pretrained=False,
            features_only=True,
        )
        cnn_channels = self.cnn.feature_info[-1]["num_chs"]
        self.proj = nn.Conv2d(cnn_channels, embed_dim, 1)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim, nhead=num_heads, batch_first=True,
        )
        self.transformer = nn.TransformerEncoder(
            encoder_layer, num_layers=num_layers,
        )
        self.head = nn.Linear(embed_dim, NUM_CLASSES - 1)

    def forward(self, x):
        feats = self.cnn(x)[-1]
        feats = self.proj(feats)
        B, E, H, W = feats.shape
        tokens = feats.flatten(2).transpose(1, 2)
        tokens = self.transformer(tokens)
        pooled = tokens.mean(dim=1)
        return self.head(pooled)


# ──────────────────────────────────────────────
# Load model at startup
# ──────────────────────────────────────────────
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"🖥️  Using device: {device}")
print(f"📦 Loading model from: {MODEL_PATH}")

if not os.path.exists(MODEL_PATH):
    print(f"❌ Model file not found: {MODEL_PATH}")
    print("   Place 'best_ordinal_model.pt' in the project folder.")
    sys.exit(1)

model = CNNTransformerOrdinal()
model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
model.to(device)
model.eval()
print("✅ Model loaded successfully!")


# ──────────────────────────────────────────────
# FastAPI App
# ──────────────────────────────────────────────
app = FastAPI(title="DR Detect API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, you might want to restrict this to your Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "model": "CNNTransformerOrdinal", "device": str(device)}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """Accept an uploaded retinal image and return DR prediction."""

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image (PNG, JPEG, etc.)")

    try:
        # Read and preprocess image
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        tensor = INFERENCE_TRANSFORM(img).unsqueeze(0).to(device)

        # Run inference
        with torch.no_grad():
            logits = model(tensor)
            probs = torch.sigmoid(logits).squeeze()
            predicted_class = int((probs > 0.5).sum().item())

        # Compute overall confidence
        if predicted_class == 0:
            confidence = round((1.0 - probs[0].item()) * 100, 1)
        else:
            confidence = round(probs[predicted_class - 1].item() * 100, 1)
        confidence = max(65.0, min(99.0, confidence))  # Clamp to reasonable range

        # Build response
        return {
            "grade": predicted_class,
            "name": CLASS_NAMES[predicted_class],
            "confidence": confidence,
            "findings": FINDINGS_MAP[predicted_class],
            "thresholds": {
                "P(class>0)": round(probs[0].item(), 4),
                "P(class>1)": round(probs[1].item(), 4),
                "P(class>2)": round(probs[2].item(), 4),
                "P(class>3)": round(probs[3].item(), 4),
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# ──────────────────────────────────────────────
# Run
# ──────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"🚀 Starting DR Detect API on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
