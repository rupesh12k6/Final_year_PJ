# Consent Manager Architecture & Workflow

Here are the diagrams explaining the system architecture and the step-by-step workflow of how data is securely requested, consented to, and transferred.

## 1. System Architecture

This diagram shows the three main Spring Boot applications and how they interact. Notice that **no actual student data (like grades or medical records)** ever passes through the Consent Manager. It only handles the cryptographic tokens (Consent Artefacts).

```mermaid
graph TD
    %% Entities
    Student((Student / Data Principal))
    
    subgraph Consent Manager Ecosystem
        CM[Consent Manager<br/>Port: 8080<br/>Handles Trust & Tokens]
        DB[(CM Database<br/>Consents, Grants)]
    end
    
    subgraph Organization B
        Consumer[College B / Consumer<br/>Port: 8081<br/>Requests Data]
    end
    
    subgraph Organization A
        Provider[College A / Provider<br/>Port: 8082<br/>Holds Actual Data]
        Data[(Student Data<br/>Grades, Records)]
    end

    %% Connections
    CM --- DB
    Provider --- Data
    
    %% Flows
    Consumer -- "1. Sends Consent Request" --> CM
    Student -- "2. Logs in & Approves Request" --> CM
    CM -- "3. Issues Signed Consent Artefact (Token)" --> Consumer
    
    Consumer -- "4. Sends Token to Request Data" --> Provider
    Provider -- "5. Introspects Token (Is it valid?)" --> CM
    
    Provider -. "6. Sends Encrypted Data DIRECTLY" .-> Consumer
    
    %% Styling
    classDef cm fill:#f9f,stroke:#333,stroke-width:2px;
    classDef org fill:#bbf,stroke:#333,stroke-width:2px;
    class CM cm;
    class Consumer,Provider org;
```

---

## 2. DEPA Consent Workflow (Sequence Diagram)

This diagram shows the strict step-by-step lifecycle we implemented in the code (Days 8-11). It shows the flow from `PENDING` to `ACTIVE` and finally to the secure data transfer.

```mermaid
sequenceDiagram
    autonumber
    
    actor Student
    participant Consumer as College B (Consumer)
    participant CM as Consent Manager
    participant Provider as College A (Provider)

    %% Step 1: The Request
    Note over Consumer,CM: Day 8: Consent Request
    Consumer->>CM: POST /api/consents/requests (Request Grades)
    CM-->>Consumer: Returns Request ID (Status: PENDING)
    
    %% Step 2: The Approval
    Note over Student,CM: Day 10-11: Consent & Access Grant
    Student->>CM: Logs in and views PENDING requests
    Student->>CM: POST /api/consents/requests/{id}/approve
    
    Note right of CM: CM creates "Consent" record (The Legal Decision)
    Note right of CM: CM creates "AccessGrant" (The Ticket)
    
    CM->>CM: Signs AccessGrant with RSA Private Key
    CM-->>Student: Success
    
    %% Step 3: Fetching the Token
    Consumer->>CM: Polls status (or gets webhook)
    CM-->>Consumer: Provides Signed Consent Artefact (Token)
    
    %% Step 4: The Data Exchange
    Note over Consumer,Provider: Phase 5: The Data Exchange
    Consumer->>Provider: Give me grades! Here is the Token.
    
    %% Step 5: Verification
    Provider->>Provider: Verifies RSA Signature (Math Check)
    Provider->>CM: POST /api/authorization/introspect
    CM-->>Provider: {"active": true, "allowedFields": ["grades"]}
    
    %% Step 6: Encrypted Transfer
    Note right of Provider: Provider pulls grades from local DB
    Note right of Provider: Encrypts data using Diffie-Hellman
    Provider-->>Consumer: Returns Encrypted Grades
```
