# DEPA Consent Manager & Inter-College Federation Architecture

## 1. Project Directory Structure

The codebase has been refactored into modular, self-contained sub-projects. Each organization and node maintains an explicit separation between its **backend API services** and **frontend web portal**:

```
Consent_Manager/
│
├── consent-manager/                    # CENTRAL CONSENT MANAGER SYSTEM (Server 1)
│   ├── backend/                        # Spring Boot Application (Port 8095)
│   │   ├── src/main/java/              # Auth, Consents, Grants, Audit, Organizations
│   │   ├── src/main/resources/         # DB migrations & application configs
│   │   ├── pom.xml                     # Maven build descriptor
│   │   └── Dockerfile                  # Production container definition
│   └── frontend/                       # Dedicated CM Web Portal (Port 3001 or 8095)
│       ├── index.html                  # Consent Manager Web Interface
│       ├── config.js                   # Network server autodetector & endpoints
│       ├── style.css                   # Enterprise design styling
│       ├── app.js                      # CM Role Switcher & Audit Logs Controller
│       ├── server.js                   # Node static web server
│       └── package.json                # Frontend package configuration
│
├── college-a/                          # COLLEGE A UNIVERSITY (Server 2 - Data Provider)
│   ├── backend/                        # Spring Boot Application (Port 8081)
│   │   ├── src/main/java/              # Student Registry DB, Provider API, P2P Transfer
│   │   ├── pom.xml                     # Maven build descriptor
│   │   └── Dockerfile                  # Production container definition
│   └── frontend/                       # College A Academic Portal (Port 3002 or 8081)
│       ├── index.html                  # College A Student & Exchange Interface
│       ├── config.js                   # Configured for College A (:8081) & CM (:8095)
│       ├── style.css                   # University portal styling
│       ├── app.js                      # Academic exchange and student record viewer
│       ├── server.js                   # Node static web server
│       └── package.json                # Frontend package configuration
│
├── college-b/                          # COLLEGE B UNIVERSITY (Server 3 - Data Consumer & Node)
│   ├── backend/                        # Spring Boot Application (Port 8082)
│   │   ├── src/main/java/              # Student DB, Consumer API, Validation Client
│   │   ├── pom.xml                     # Maven build descriptor
│   │   └── Dockerfile                  # Production container definition
│   └── frontend/                       # College B Academic Portal (Port 3003 or 8082)
│       ├── index.html                  # College B Student & Exchange Interface
│       ├── config.js                   # Configured for College B (:8082) & CM (:8095)
│       ├── style.css                   # University portal styling
│       ├── app.js                      # Academic exchange and student record viewer
│       ├── server.js                   # Node static web server
│       └── package.json                # Frontend package configuration
│
├── gateway-hub/                        # UNIFIED REVIEWER GATEWAY & LAUNCHPAD
│   ├── index.html                      # Central 1-Click Launchpad for CM and Colleges
│   ├── server.js                       # Gateway server running on Port 3000
│   └── package.json                    # Gateway package configuration
│
├── deploy/                             # MULTI-SERVER DEPLOYMENT SCRIPTS
│   ├── run_server1_cm.ps1 / .sh        # Launch Server 1 (Consent Manager)
│   ├── run_server2_college_a.ps1 / .sh # Launch Server 2 (College A University)
│   ├── run_server3_college_b.ps1 / .sh # Launch Server 3 (College B University)
│   └── server*.env                     # Environment variables for distributed hosts
│
├── tools/                              # UTILITIES & TEST GENERATORS
│   ├── BCryptGen.java                  # Password hash generator
│   └── IntegrationTest.java            # Java test harness
│
├── pom.xml                             # Root Parent POM (Reactor build for all backends)
├── start_all.ps1                       # 1-Click script to start all nodes and frontends
├── stop_all.ps1                        # 1-Click script to stop all nodes and release ports
├── verify_all.ps1                      # Complete 10-step automated integration test suite
└── docker-compose.yml                  # Full multi-container orchestration
```

---

## 2. Server & Port Allocation

| Component | Project Path | Backend Port | Frontend Port | Role in DEPA Ecosystem |
| :--- | :--- | :---: | :---: | :--- |
| **Consent Manager** | `consent-manager/` | `8095` | `3001` or `/cm.html` | Trust Anchor, Asymmetric Token Issuance (RS256), Audit Ledger |
| **College A** | `college-a/` | `8081` | `3002` or `/college.html` | Data Provider (Holds Alice's academic records & cryptographic signatures) |
| **College B** | `college-b/` | `8082` | `3003` or `/college.html` | Data Consumer (Evaluates transcripts & validates CM tokens) |
| **Gateway Hub** | `gateway-hub/` | N/A | `3000` | Reviewer Launchpad Hub for quick switching between nodes |

---

## 3. Quick-Start Guide

### Option A: 1-Click Automated Startup
```powershell
# From the project root:
.\start_all.ps1
```

### Option B: Run Automated Integration Verification
```powershell
.\verify_all.ps1
```

### Option C: 1-Click Clean Shutdown
```powershell
.\stop_all.ps1
```

---

## 4. Running Each Project Individually

Each project is completely self-contained and can be executed independently from its own directory:

### A. Run Consent Manager Individually (Server 1)
```powershell
cd consent-manager
.\start.ps1
# Backend: http://localhost:8095
# Frontend: http://localhost:3001

# To stop:
.\stop.ps1
```

### B. Run College A University Individually (Server 2)
```powershell
cd college-a
.\start.ps1
# Backend: http://localhost:8081
# Frontend: http://localhost:3002

# To stop:
.\stop.ps1
```

### C. Run College B University Individually (Server 3)
```powershell
cd college-b
.\start.ps1
# Backend: http://localhost:8082
# Frontend: http://localhost:3003

# To stop:
.\stop.ps1
```

---

## 5. Distinct Interface Profiles

| Node | Interface Focus | Visual Branding | Dedicated URL |
| :--- | :--- | :--- | :--- |
| **Consent Manager** | Regulatory Fiduciary, RS256 Trust Center, Audit Ledger with User ID & Timestamps | Blue / Slate Enterprise | `http://localhost:3001` |
| **College A University** | Data Provider, Custodian of Alice Johnson's Records, Diffie-Hellman P2P Dispatch | Emerald / Teal Registrar | `http://localhost:3002` |
| **College B University** | Data Consumer, Request External Transcripts, Evaluate Verified Credentials | Purple / Cyan Admissions | `http://localhost:3003` |
| **Reviewer Gateway Hub** | Central Multi-Node Federation Launcher & Live Health Indicators | Modern Glassmorphism | `http://localhost:3000` |

