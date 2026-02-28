"""
Diabetic Retinopathy Detection — Prediction Script
====================================================
Loads the trained model and classifies a retinal image from the terminal.

Usage:
    python predict.py
    (then enter the path to an image when prompted)
"""

import os
import sys
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import timm


# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(SCRIPT_DIR, "best_ordinal_model.pt")
NUM_CLASSES = 5

CLASS_NAMES = {
    0: "No_DR        (No Diabetic Retinopathy)",
    1: "Mild         (Mild Non-Proliferative DR)",
    2: "Moderate     (Moderate Non-Proliferative DR)",
    3: "Severe       (Severe Non-Proliferative DR)",
    4: "Proliferate_DR (Proliferative Diabetic Retinopathy)",
}

# Same normalization used during training
INFERENCE_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


# ──────────────────────────────────────────────
# Model (must match train.py exactly)
# ──────────────────────────────────────────────
class CNNTransformerOrdinal(nn.Module):
    def __init__(self, embed_dim=256, num_heads=4, num_layers=2):
        super().__init__()

        self.cnn = timm.create_model(
            "efficientnet_b3",
            pretrained=False,  # weights loaded from checkpoint
            features_only=True,
        )

        cnn_channels = self.cnn.feature_info[-1]["num_chs"]
        self.proj = nn.Conv2d(cnn_channels, embed_dim, 1)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=embed_dim,
            nhead=num_heads,
            batch_first=True,
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
# Inference helpers
# ──────────────────────────────────────────────
def ordinal_to_class(logits):
    """Convert CORAL logits → integer class prediction."""
    return (torch.sigmoid(logits) > 0.5).sum(dim=1)


def get_confidence(logits):
    """Get per-threshold probabilities for a more detailed view."""
    probs = torch.sigmoid(logits).squeeze()
    return probs


def load_model(device):
    """Load the trained model from disk."""
    if not os.path.exists(MODEL_PATH):
        print(f"❌ Model file not found: {MODEL_PATH}")
        print("   Please train the model first by running:  python train.py")
        print("   Or place the trained 'best_ordinal_model.pt' in the project folder.")
        sys.exit(1)

    model = CNNTransformerOrdinal()
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    model.to(device)
    model.eval()
    return model


def predict_image(model, image_path, device):
    """Run inference on a single image and return results."""
    if not os.path.exists(image_path):
        print(f"  ❌ File not found: {image_path}")
        return None, None, None

    try:
        img = Image.open(image_path).convert("RGB")
    except Exception as e:
        print(f"  ❌ Could not open image: {e}")
        return None, None, None

    # Preprocess
    tensor = INFERENCE_TRANSFORM(img).unsqueeze(0).to(device)

    # Inference
    with torch.no_grad():
        logits = model(tensor)
        predicted_class = ordinal_to_class(logits).item()
        confidence = get_confidence(logits)

    return int(predicted_class), CLASS_NAMES[int(predicted_class)], confidence


# ──────────────────────────────────────────────
# Main loop
# ──────────────────────────────────────────────
def main():
    print("=" * 60)
    print("  Diabetic Retinopathy Detection — Prediction")
    print("=" * 60)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"🖥️  Using device: {device}")
    print(f"📦 Loading model from: {MODEL_PATH}")

    model = load_model(device)
    print("✅ Model loaded successfully!\n")

    print("-" * 60)
    print("Enter the path to a retinal image to classify.")
    print("Type 'quit' or 'exit' to stop.\n")

    while True:
        image_path = input("🖼️  Image path: ").strip()

        # Handle exit
        if image_path.lower() in ("quit", "exit", "q"):
            print("\n👋 Goodbye!")
            break

        # Handle empty input
        if not image_path:
            print("  ⚠️  Please enter a valid image path.\n")
            continue

        # Remove surrounding quotes if present
        image_path = image_path.strip("\"'")

        # Predict
        pred_class, pred_name, confidence = predict_image(model, image_path, device)

        if pred_class is not None:
            print(f"\n  ┌─────────────────────────────────────────────")
            print(f"  │  🔍 PREDICTION RESULT")
            print(f"  │")
            print(f"  │  Class : {pred_class}")
            print(f"  │  Label : {pred_name}")
            print(f"  │")
            print(f"  │  CORAL threshold probabilities:")
            print(f"  │    P(class > 0) = {confidence[0]:.4f}")
            print(f"  │    P(class > 1) = {confidence[1]:.4f}")
            print(f"  │    P(class > 2) = {confidence[2]:.4f}")
            print(f"  │    P(class > 3) = {confidence[3]:.4f}")
            print(f"  └─────────────────────────────────────────────\n")


if __name__ == "__main__":
    main()
