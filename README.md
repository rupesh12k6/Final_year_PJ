# DEPA Academic Credential Trust & Consent Network
**Final Year Project — Distributed Consent & Data Governance Architecture**

---

## 📌 Executive Overview

The **DEPA Academic Credential Trust & Consent Network** is a distributed, privacy-first data exchange ecosystem designed in strict accordance with the **Data Empowerment and Protection Architecture (DEPA)** principles.

It provides a secure, auditable, and cryptographic framework enabling individuals to maintain sovereign control over their educational records while facilitating seamless peer-to-peer verification between institutions.

The ecosystem comprises three completely decoupled, production-grade Spring Boot applications and independent Single-Page Application (SPA) frontends:

1. **Consent Manager (CM)** — Central trust anchor managing organizations, consent requests, access grants, public keys, and global audit trails. **The Consent Manager never stores or proxies academic data.**
2. **College A (Data Provider)** — Academic data custodian holding student records, enforcing field-level authorization, and responding to authorized P2P data exchange requests.
3. **College B (Data Consumer)** — Inquiring university initiating consent-driven verification requests, retrieving authorized records via direct encrypted P2P channels, and managing student admissions.

---

## 🏛️ Topology & Port Allocation

| Component | Role | Backend Port | Frontend Port | Database |
| :--- | :--- | :---: | :---: | :--- |
| **Consent Manager** | Trust Anchor & Consent Broker | `8095` | `3001` | `consent_manager_db_fyp` |
| **College A** | Academic Data Provider | `8081` | `3002` | `college_a_db` |
| **College B** | Academic Data Consumer | `8082` | `3003` | `college_b_db` |

---

## 🔐 Core Architecture & Security Principles

1. **Strict Database Isolation**:
   - Consent Manager, College A, and College B connect to three isolated PostgreSQL databases.
   - Cross-database queries or shared connection pools are strictly prohibited.
2. **Zero-Knowledge Consent Manager**:
   - The Consent Manager handles identity, consent artifacts, cryptographic token issuance, and audit logs.
   - Academic records *never* touch the Consent Manager.
3. **Direct P2P Encrypted Data Transfer**:
   - College B connects directly to College A's data exchange endpoints (`/api/provider/data-exchange`).
   - Payloads are encrypted using Elliptic Curve / Diffie-Hellman ephemeral key exchange and authenticated with AES-GCM.
4. **Field-Level Data Authorization**:
   - When a student approves consent for specific fields (e.g. `gpa`, `degree`, but not `financial_status`), College A strictly filters and redacts unauthorized fields before encryption.
5. **Cryptographic Trust Hierarchy**:
   - Asymmetric RSA-2048 keypairs for Access JWT signing and verification.
   - Public keys are registered and discoverable via Consent Manager's Trust Registry.

---

## 📂 Repository Structure

```
├── ARCHITECTURE.md                  # Detailed architectural specifications
├── MULTI_SERVER_DEPLOYMENT_GUIDE.md # Production multi-server deployment guide
├── docker-compose.yml               # Containerized stack deployment
├── start_all.ps1                    # Unified cluster startup script
├── stop_all.ps1                     # Unified cluster shutdown script
├── verify_all.ps1                   # Full test and verification suite runner
│
├── consent-manager/                 # Consent Manager application
│   ├── backend/                     # Spring Boot 3.x backend (:8095)
│   │   ├── src/main/resources/application.properties
│   │   └── keys/                    # CM RSA signing keys
│   └── frontend/                    # Native Vanilla JS SPA (:3001)
│
├── college-a/                       # College A Provider application
│   ├── backend/                     # Spring Boot 3.x backend (:8081)
│   │   ├── src/main/resources/application.properties
│   │   └── keys/                    # College A RSA signing keys
│   └── frontend/                    # Native Vanilla JS SPA (:3002)
│
├── college-b/                       # College B Consumer application
│   ├── backend/                     # Spring Boot 3.x backend (:8082)
│   │   └── src/main/resources/application.properties
│   └── frontend/                    # Native Vanilla JS SPA (:3003)
│
├── keys/                            # Global cryptographic root keys & certificates
├── deploy/                          # Production systemd and deployment configurations
├── screenshots/                     # Comprehensive browser acceptance captures
└── tools/                           # Automated E2E verification & testing suites
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Java**: OpenJDK 17 or 21+ (Java 26 supported)
- **Node.js**: v18+ (used for lightweight static asset serving)
- **PostgreSQL**: v14+ running on port `5432` with databases:
  - `consent_manager_db_fyp`
  - `college_a_db`
  - `college_b_db`
- **Maven**: 3.8+

### Database Setup
```sql
CREATE DATABASE consent_manager_db_fyp;
CREATE DATABASE college_a_db;
CREATE DATABASE college_b_db;
```

### Launching the Cluster
To launch all three backends and frontends simultaneously on Windows:
```powershell
.\start_all.ps1
```

To stop all services:
```powershell
.\stop_all.ps1
```

### Running Integration & Acceptance Tests
Run the comprehensive end-to-end verification suite:
```powershell
node tools/verify_phase0_defects.js
node tools/verify_stage7_final_acceptance.js
```

---

## 🔑 Demonstration Credentials

| Portal | URL | Role | Username | Password |
| :--- | :--- | :--- | :--- | :--- |
| **Consent Manager** | `http://localhost:3001` | Super Admin | `admin` | `Admin@123` |
| **Consent Manager** | `http://localhost:3001/org-admin-login.html` | Org Admin (Col A) | `admin_cola` | `Admin@123` |
| **Consent Manager** | `http://localhost:3001/org-admin-login.html` | Org Admin (Col B) | `admin_colb` | `Admin@123` |
| **College A Portal** | `http://localhost:3002` | Registrar | `admin_cola` | `Admin@123` |
| **College B Portal** | `http://localhost:3003` | Inquirer / Officer | `colb_admin` | `Admin@123` |

---

## 📜 License & Acknowledgements
Developed as a Final Year Project researching and implementing the Data Empowerment and Protection Architecture (DEPA) for academic credentials.
