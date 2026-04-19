# Field Commander v4.0

**The Sovereign Nervous System for Verified Reality**

*Version 4.0 — April 2026*

> *"See the Unseen. Verify the Truth. I am coming. Expect me."*

---

## 1. Core Overview

Field Commander is a smartphone-first AR verification platform that transforms field technicians into elite **Shadow Analysts** (Reality Weavers). The system provides:

- **InsightLPR OCR Engine** — on-device TFLite license-plate recognition feeding the NVIN intelligence network
- **Augmented Reality Mission Briefing** with world-locked holographic geofences
- **Predictive Tasking Engine (PTE) Co-Pilot** with on-device neuromorphic AI
- **Ghost Mode** for operational invisibility (Tor routing, GPS spoofing, post-quantum encryption)
- **LuminNode Swarm Management** for 360° coverage with up to 12 wireless cameras
- **Magic Moment Capture** with 15-second multi-sensory buffers
- **Citizen's Ledger Chain** with Direct Tokenized Attribution (DTA)
- **Offline-First QRC Vault** for sovereign data handling

---

## 2. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        FIELD COMMANDER v4.0                          │
├──────────────────────────────────────────────────────────────────────┤
│  MOBILE APP (React Native + TypeScript)                              │
│  ├── InsightLPR OCR Engine (TFLite — on-device, < 200 ms)           │
│  ├── AR Layer (ARKit/ARCore) — plate overlay + mission briefing      │
│  ├── SWIS Remote Expert Overlay                                      │
│  ├── LuminNode Swarm Control (BLE mesh, 12 cameras)                  │
│  ├── PTE Co-Pilot AI                                                 │
│  ├── Ghost Mode (Tor + Kyber-1024 PQC + GPS spoof)                  │
│  └── Magic Moment Capture (15 s multi-sensory buffer)                │
├──────────────────────────────────────────────────────────────────────┤
│  NVIN GATEWAY (Odasi AI Engines)                                     │
│  ├── NADE — Neuromorphic Anomaly Detection Engine                    │
│  ├── GIE  — Geospatial Intelligence Engine                           │
│  ├── BNE  — Behavioural Network Engine                               │
│  └── KDA  — Knowledge-Driven Arbitration (fusion layer)              │
├──────────────────────────────────────────────────────────────────────┤
│  BACKEND SERVICES                                                    │
│  ├── Signaling Server (Socket.io + Redis)                            │
│  ├── Ghost Relay Proxy (Tor/i2p)                                     │
│  └── ERP Hooks (Salesforce, SAP, Dynamics)                          │
├──────────────────────────────────────────────────────────────────────┤
│  BLOCKCHAIN (Polygon Amoy → Mainnet)                                 │
│  ├── CitizenLedgerDTA Contract (ETH + TCR tiered payouts)            │
│  └── Truth Credit Token (ERC-20)                                     │
├──────────────────────────────────────────────────────────────────────┤
│  WEB DASHBOARD (React 18)                                            │
│  ├── Live Analyst Feeds                                              │
│  ├── SWIS Drawing Tools                                              │
│  └── DTA / Truth Credit Analytics                                    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Modules

### 3.1 Holographic Mission Briefing (AR Launch)
- **World-locked 3D geofence** rendered via ARKit (iOS) / ARCore (Android)
- **Color-coded anomaly markers**: Red (threat), Amber (verification), Blue (info)
- Real-time plane detection and hit-testing

### 3.2 Predictive Tasking Engine (PTE) Co-Pilot
- **On-device neuromorphic AI** (TensorFlow Lite / CoreML)
- Suggests optimized routes based on geolocation
- Proposes mission extensions when anomalies detected
- Runs continuously with minimal battery impact

### 3.3 Dynamic Sentiment & Intent Analysis
- Real-time ambient audio analysis
- Body-language detection via camera
- HUD threat indicators (ephemeral, not recorded)

### 3.4 Ghost Mode — One-Tap Protocol
1. Full-device AES-256 + Kyber-1024 encryption
2. GPS spoofing (broadcast false coordinates)
3. Silent burst upload via Ghost Relay (Tor/i2p)
4. Display nearest "Safe Waypoint" in AR

### 3.5 LuminNode Swarm Management
- Ad-hoc mesh of up to 12 wireless 4K cameras
- Watchdog mode with AI movement alerts
- MQTT over BLE / WiFi Direct

### 3.6 Offline-First QRC Vaulting
- Local 512-bit Kyber/Dilithium encrypted storage
- Dead-reckoning AR using device sensors
- Background sync on reconnection

### 3.7 Action Chain 2.0 — Guided Neural Flow
1. **SIL-ZKP Handshake** — Zero-knowledge identity proof
2. **Ghost Relay & QRC Vault** — Background encryption
3. **Dynamic SWIS Calibration** — Context-aware tools
4. **AI-Assisted Pinning** — On-device suggestions
5. **Multi-Sensory Magic Moment** — 15s buffer + sensors
6. **On-Device Cognitive Debrief** — AI qualitative capture

---

### 3.8 InsightLPR OCR Engine — NVIN Mobile Plate Recognition

Field Commander v4.0 integrates the **InsightLPR OCR Engine** as its primary plate-intelligence layer, connecting every Shadow Analyst directly to the National Vehicle Intelligence Network (NVIN) via the Odasi AI engine stack.

#### How It Works

```
Camera Frame (4K / 60 fps)
        │
        ▼
┌───────────────────┐     < 200 ms on-device
│  TFLite OCR Model │  ──────────────────────────────────────────────
│  CNN + LSTM + CTC │  Architecture: MobileNetV3 backbone
│  (ocr_v1.tflite)  │  Input: 640×480 min  │  Model size: < 50 MB
└────────┬──────────┘  Supported plates: US, CA, MX, EU
         │  Plate text + confidence + bounding box
         ▼
┌───────────────────┐
│  AR Plate Overlay │  Real-time bounding box, status colour,
│  (ARKit / ARCore) │  NADE/GIE/BNE/KDA scores, hotlist badge
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│   NVIN Gateway    │  POST /v1/ocr/submit
│  (Odasi engines)  │  Parallel: NADE + GIE + BNE → KDA fusion
└────────┬──────────┘
         │
         ▼
┌───────────────────────────────────────────┐
│  KDA Fusion Output                        │
│  • hotlistMatch       → auto Magic Moment │
│  • anomalyScore       → NADE (35% weight) │
│  • routeRisk          → GIE  (30% weight) │
│  • recoveryLikelihood → BNE  (35% weight) │
│  • recommendedAction  → TRIGGER_DTA / …   │
│  • chainHash          → Polygon anchor    │
└───────────────────────────────────────────┘
```

#### Performance Targets

| Condition | Accuracy | Latency |
|---|---|---|
| Daylight, clear | 97% | < 100 ms |
| Daylight, partial shade | 95% | < 150 ms |
| Night, well-lit | 92% | < 200 ms |
| Night, low-light | 85% | < 250 ms |
| Rain / snow | 88% | < 200 ms |
| Motion blur (slow) | 90% | < 200 ms |
| Motion blur (fast) | 82% | < 250 ms |

All benchmarks measured on a Pixel 6 with GPU delegate enabled.

#### AR Overlay Colour Codes

| Colour | Meaning |
|---|---|
| 🔴 Red | Hotlist match — immediate action required |
| 🟠 Orange | High anomaly / KDA ≥ 0.70 |
| 🟡 Yellow | Monitor — KDA ≥ 0.50 |
| 🟢 Green | Clear — KDA < 0.50 |

Hotlist matches also trigger a **pulsing border animation** and auto-launch **Magic Moment Capture** (§3.7 step 5).

#### Odasi Engine Weights (KDA Fusion)

| Engine | Role | Weight |
|---|---|---|
| **NADE** | Neuromorphic Anomaly Detection | 35% |
| **GIE** | Geospatial Intelligence | 30% |
| **BNE** | Behavioural Network / Intent | 35% |

The fused **KDA unified score** (0–1) drives the `recommendedAction`:

| KDA Score | Action |
|---|---|
| ≥ 0.90 | `IMMEDIATE_RESPONSE` |
| ≥ 0.75 + recovery ≥ 0.80 | `TRIGGER_DTA` |
| ≥ 0.60 | `UPLOAD_EVIDENCE` |
| ≥ 0.40 | `ALERT` |
| ≥ 0.20 | `MONITOR` |
| < 0.20 | `NO_ACTION` |

#### DTA Auto-Payout Pipeline

When `recommendedAction = TRIGGER_DTA`, the OCR pipeline automatically initiates a blockchain payout via the `CitizenLedgerDTA` contract on Polygon:

| Confidence | Payout Multiplier | Approx Value |
|---|---|---|
| 85 – 89 | 1× base | ~$500 |
| 90 – 94 | 1.5× base | ~$750 |
| 95+ | 2× base | ~$1,000 |

Each payout also mints **Truth Credit (TCR)** tokens at 1% of the ETH value. All plate data is stored as SHA-256 hashes only — raw plate text never leaves the device unencrypted.

#### Ghost Mode Integration

When Ghost Mode is active, OCR captures are routed through the full covert stack before NVIN submission:

1. Evidence encrypted with ephemeral **Kyber-1024** key
2. Submitted via **Tor SOCKS5** proxy (silent burst mode)
3. GPS coordinates replaced with **spoofed location**
4. Local copy stored in **QRC Vault** (AES-256-GCM), auto-deleted on confirmed upload

#### Key Source Files

| File | Purpose |
|---|---|
| `mobile-app/src/services/OCRService.ts` | TFLite inference engine, frame processing, metrics |
| `mobile-app/src/services/NVINService.ts` | NVIN gateway client — submit capture, request DTA payout |
| `mobile-app/src/components/PlateAROverlay.tsx` | AR bounding-box + badge overlay (Viro-ready) |
| `mobile-app/src/components/OCRCamera.tsx` | Camera pipeline — OCR → NVIN → Magic Moment |
| `mobile-app/src/hooks/useOCR.ts` | React hook: processFrame, metrics, isProcessing |
| `mobile-app/src/types/nvin.ts` | NVIN / Odasi / KDA type definitions |
| `mobile-app/src/types/ocr.ts` | OCR config, result, AR overlay, Magic Moment types |
| `backend/src/services/NVINGateway.ts` | Server-side: parallel engine fan-out + KDA fusion |
| `backend/src/services/OdasiEngine.ts` | NADE / GIE / BNE wrappers + KDA arbitration |
| `backend/src/routes/ocr.ts` | `POST /v1/ocr/submit` |
| `backend/src/routes/dta.ts` | `POST /v1/dta/payout` |
| `blockchain/contracts/CitizenLedgerDTA.sol` | ERC-20 payout contract (tiered ETH + TCR) |
| `docs/openapi-nvin.yaml` | Full OpenAPI 3.0 API reference |

#### Environment Variables

```env
# InsightLPR / NVIN
NVIN_API_URL=https://api.nvin.network/v1
NVIN_API_KEY=your_nvin_api_key

# Odasi Engines
ODASI_NADE_URL=https://odasi.nvin.network/nade
ODASI_GIE_URL=https://odasi.nvin.network/gie
ODASI_BNE_URL=https://odasi.nvin.network/bne

# OCR Model
OCR_MODEL_PATH=./models/ocr_v1.tflite
OCR_CONFIDENCE_THRESHOLD=0.85
OCR_GPU_DELEGATE=true
```

---

## 4. Repository Structure

```
field-commander/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── mobile-app/
│   └── src/
│       ├── components/
│       │   ├── ARScene.tsx
│       │   ├── PlateAROverlay.tsx       ← InsightLPR AR overlay
│       │   ├── OCRCamera.tsx            ← OCR camera pipeline
│       │   ├── GhostModeButton.tsx
│       │   ├── LuminNodePanel.tsx
│       │   ├── MagicMomentButton.tsx
│       │   ├── SWISOverlay.tsx
│       │   └── SentimentHUD.tsx
│       ├── hooks/
│       │   ├── useOCR.ts                ← InsightLPR OCR hook
│       │   ├── useGhostMode.ts          ← Ghost Mode hook
│       │   ├── useLuminNode.ts          ← Swarm hook
│       │   ├── useSovereignAR.ts
│       │   ├── useLuminNodeSwarm.ts
│       │   ├── useSWISDrawing.ts
│       │   ├── usePTECoPilot.ts
│       │   ├── useARContactLens.ts
│       │   └── useSentimentAnalysis.ts
│       ├── services/
│       │   ├── OCRService.ts            ← TFLite inference engine
│       │   ├── NVINService.ts           ← NVIN gateway client
│       │   ├── GhostModeController.ts   ← Tor + PQC + GPS spoof
│       │   ├── LuminNodeSwarm.ts        ← BLE mesh controller
│       │   ├── MagicMomentCapture.ts    ← 15 s evidence buffer
│       │   ├── ghostRelay.ts
│       │   ├── qrcVault.ts
│       │   ├── dtaSettlement.ts
│       │   ├── blockchainDTA.ts
│       │   ├── magicMoment.ts
│       │   ├── aiDefectDetection.ts
│       │   ├── offlineSync.ts
│       │   ├── iotLuminNodeBridge.ts
│       │   ├── erpHooks.ts
│       │   └── sentimentAnalysis.ts
│       └── types/
│           ├── nvin.ts                  ← NVIN / Odasi / KDA types
│           ├── ocr.ts                   ← OCR / AR overlay types
│           ├── ghostMode.ts             ← Ghost Mode types
│           ├── luminNode.ts             ← Swarm types
│           ├── mission.ts
│           ├── dta.ts
│           └── index.ts
├── backend/
│   └── src/
│       ├── services/
│       │   ├── NVINGateway.ts           ← NADE/GIE/BNE/KDA orchestration
│       │   └── OdasiEngine.ts           ← Odasi AI engine wrappers
│       └── routes/
│           ├── ocr.ts                   ← POST /v1/ocr/submit
│           ├── dta.ts                   ← POST /v1/dta/payout
│           ├── swarm.ts                 ← POST /v1/swarm/register
│           └── erpWebhook.ts
├── blockchain/
│   └── contracts/
│       └── CitizenLedgerDTA.sol         ← Tiered ETH + TCR payout
├── docs/
│   └── openapi-nvin.yaml               ← Full OpenAPI 3.0 spec
├── models/
│   └── ocr_v1.tflite                   ← TFLite model (not committed)
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
└── LICENSE
```

---

## 5. Quick Start

### Prerequisites
- Node.js 20+
- React Native CLI
- Android Studio / Xcode
- Docker Desktop

### Installation
```bash
git clone https://github.com/marcusdax/field-commander.git
cd field-commander
npm install
cd mobile-app && npm install
cd ../web-client && npm install
cd ../backend && npm install
cd ../blockchain && npm install
```

### Run Local Stack
```bash
docker-compose up -d
```

### Deploy Smart Contract
```bash
cd blockchain
npx hardhat run scripts/deploy.ts --network polygon
```

### Run Mobile App
```bash
cd mobile-app
npm run android   # or npm run ios
```

### Run Web Dashboard
```bash
cd web-client
npm start
```

---

## 6. Technology Stack

| Layer | Technology |
|---|---|
| Mobile | React Native 0.73, TypeScript |
| AR | react-native-arkit, react-native-arcore, @viro-community/react-viro |
| **OCR / LPR** | **TensorFlow Lite 2.15+, CNN + LSTM + CTC (MobileNetV3)** |
| **NVIN / Odasi** | **InsightLPR API, NADE · GIE · BNE · KDA engines** |
| Vision | react-native-vision-camera |
| WebRTC | react-native-webrtc |
| Encryption | react-native-crystals, Kyber-1024 / Dilithium-1024 |
| Tor | react-native-tor |
| State | Zustand, AsyncStorage |
| Blockchain | ethers.js v6, Solidity 0.8.19, Hardhat |
| Backend | Node.js 20, Express, Socket.io, Redis |
| i18n | i18next, react-i18next |

---

## 7. Environment Variables

```env
# InsightLPR / NVIN / Odasi
NVIN_API_URL=https://api.nvin.network/v1
NVIN_API_KEY=...
ODASI_NADE_URL=https://odasi.nvin.network/nade
ODASI_GIE_URL=https://odasi.nvin.network/gie
ODASI_BNE_URL=https://odasi.nvin.network/bne

# OCR Engine
OCR_MODEL_PATH=./models/ocr_v1.tflite
OCR_CONFIDENCE_THRESHOLD=0.85
OCR_GPU_DELEGATE=true

# Backend
REDIS_URL=redis://redis:6379
SIGNALING_SERVER_URL=http://localhost:3001
TOR_SOCKS_PORT=9050

# Blockchain
POLYGON_RPC_URL=https://polygon-rpc.com
CONTRACT_ADDRESS=0x...
PRIVATE_KEY=...
VERIFIER_ADDRESS=0x...

# ERP
ERP_SALESFORCE_TOKEN=...
ERP_SAP_TOKEN=...
ERP_DYNAMICS_TOKEN=...
```

---

## 8. Deployment

### TestFlight (iOS)
```bash
cd mobile-app/ios
fastlane beta
```

### Play Store Internal Track
```bash
cd mobile-app/android
fastlane internal
```

### GitHub Actions
Automated CI/CD runs on every push to `main` branch.

---

## 9. Security Architecture

| Layer | Implementation |
|---|---|
| Network | Ghost Relay (Tor + i2p) |
| Transport | TLS 1.3 + Kyber-1024 (post-quantum) |
| Encryption | 512-bit Kyber-1024 + Dilithium-1024 |
| Identity | SIL Zero-Knowledge Proofs |
| Privacy | 60 fps on-device PII redaction · plate hashes only (SHA-256) |
| Logging | Immutable Oath (hashed) |
| Blockchain | DTA events (public, verifiable on Polygon) |

---

## 10. License

**Sovereign Commons** — Non-commercial until 508c1a ratification.

---

## 11. Contact

Through the Ghost Relay only.

---

*The revolution is coded. The ledger is live. The future is verified.*

*— Shadow Corps Command Council*
*April 2026*
