# DR Detect AI — Diabetic Retinopathy Screening Assistant 👁️

[![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**DR Detect AI** is an intelligent web application designed to assist healthcare professionals in the early detection and monitoring of Diabetic Retinopathy (DR). It combines deep learning analysis of retinal fundus images with comprehensive patient management and risk assessment tools.

---

## 🚀 Key Features

### 🧠 AI-Powered Analysis
-   **Retinal Scan Classification**: Instantly analyzes fundus images to detect DR severity (Grade 0-4).
-   **Confidence Scoring**: Provides AI confidence metrics and detailed clinical findings (microaneurysms, hemorrhages, etc.).
-   **Visual Explanation**: Highlights severity on a color-coded scale.

### 🗂️ Patient Registry & History
-   **Multi-Patient Management**: Create, update, and manage profiles for multiple patients.
-   **Longitudinal Tracking**: Store and view screening history for every patient over time.
-   **Smart Search**: Quickly find patient records by name or ID.

### 📊 Risk & Progression
-   **Risk Scoring**: Calculates a holistic risk score (0-100) based on AI results + clinical metadata (HbA1c, duration, BP).
-   **Progression Charts**: Visualizes historical scan grades to track disease stability or progression.

### 📄 Comprehensive Reporting
-   **One-Click PDF Reports**: Generates professional medical reports including patient bio, scan image, AI findings, and actionable follow-up recommendations.
-   **Follow-Up Plans**: Automatically suggests screening intervals and urgency based on DR severity.

### 💬 AI Medical Assistant
-   **Context-Aware Chat**: Built-in AI assistant (powered by Gemini) to answer questions about DR guidelines, treatment options, and patient care.

---

## 🛠️ Technology Stack

-   **Frontend**: React (Vite), CSS Modules (Glassmorphism UI), Recharts (Data Viz), jsPDF (Reporting).
-   **Backend**: Python, FastAPI, Uvicorn.
-   **AI/ML**: Deep Learning model (EfficientNet/ResNet based) for classification.
-   **Storage**: LocalStorage (for demo persistence) / REST API integration.

---

## ⚙️ Installation & Setup

### Prerequisites
-   Node.js (v16+)
-   Python (v3.8+)

### 1. Frontend Setup
Navigate to the project directory and install dependencies:

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```
Access the app at `http://localhost:5173`.

### 2. Backend Setup
Ensure you have the necessary Python packages installed (create a virtual environment recommended):

```bash
# Install required Python packages
pip install fastapi uvicorn python-multipart torch torchvision pillow

# Start the API server
python server.py
```
The backend will run at `http://localhost:8000`.

---

## 📖 Usage Guide

1.  **Dashboard**: Overview of recent activity and quick actions.
2.  **Patient Registry**: Go here first to **Add a New Patient**.
3.  **Scan Analysis**:
    -   Select a patient from the registry (or it uses the active one).
    -   Upload a retinal fundus image.
    -   Click **Analyze** to get AI results.
4.  **Report**: Click **Download Report** to get a PDF summary.
5.  **Risk/Follow-up**: View detailed progression charts and management plans.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
