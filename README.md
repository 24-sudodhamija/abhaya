# Abhaya — Autonomous Transit Telemetry & Women's Safety Engine

> **Live Web Application:** [https://abhaya-lemon-two.vercel.app](https://abhaya-lemon-two.vercel.app)

Abhaya is an identity-verified, real-time pedestrian telemetry platform built for female commuters. It combines continuous geofenced telemetry tracking, crowd-verified spatial hazard radar, and instant cryptographic SOS dispatching.

---

## ⚡ Hackathon Evaluation Quickstart

* **Live Deployment:** [https://abhaya-lemon-two.vercel.app](https://abhaya-lemon-two.vercel.app)
* **Demo OTP:** `123456`
* **Device Permissions:** Please allow browser Location (GPS) access when prompted to experience live safe-corridor tracking.
* **Identity Verification Gate:** The platform uses simulated e-KYC demographic verification; ensure a female full name is entered during onboarding.

---

## ✨ Core Features

* **Real-Time Safe Corridor Telemetry:** Live GPS coordinate polling, speed tracking, battery-level monitoring, and dead-reckoning corridor deviation alerts.
* **Spatial Hazard Radar:** Dark-mode vector mapping showing community-reported street infrastructure defects, poor lighting, and high-risk zones.
* **Verified Crowdsourced Reports:** Eliminates spam through mandatory identity verification; anonymous incident reporting is prohibited.
* **One-Tap SOS Dispatch:** Instant emergency escalation that captures location burst pings and triggers responder notifications.
* **P2P Community & Safe Spaces:** Encrypted volunteer support rooms and real-time community coordination.

---

## 🛠 Tech Stack

* **Framework:** Next.js (App Router, Turbopack)
* **Language:** TypeScript
* **Database:** Neon Serverless PostgreSQL (`@neondatabase/serverless`)
* **Mapping:** Leaflet.js with optimized OpenStreetMap tile rendering
* **Styling:** Tailwind CSS with custom dark wine visual hierarchy
* **Deployment:** Vercel (Edge network, automated CI/CD)

---

## 🚀 Local Development

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/24-sudodhamija/abhaya.git](https://github.com/24-sudodhamija/abhaya.git)
   cd abhaya