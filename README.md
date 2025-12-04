# PrivateTimeline

PrivateTimeline is a privacy-preserving personal location history system — a reimagined version of the Google Maps Timeline that never exposes user data.  
All location history remains encrypted on the user’s device, and all queries (such as “How many times did I visit a café last month?”) are executed homomorphically using **Fully Homomorphic Encryption (FHE)**.  
This means the server processes encrypted coordinates and time data without ever seeing where you’ve been.

---

## Overview

Location history can tell stories about our habits, memories, and routines — but it also represents one of the most sensitive forms of personal data.  
Traditional timeline services store your coordinates, timestamps, and movements in plaintext on centralized servers, creating risks of surveillance, profiling, and unintended data sharing.

**PrivateTimeline** eliminates those risks by designing an **FHE-powered, privacy-first location engine** that allows useful insights while preserving complete user sovereignty over location data.  

With PrivateTimeline, your movement history remains **yours and yours alone**. The system computes encrypted queries without ever decrypting your personal geospatial trail.

---

## Why FHE Is Central

Fully Homomorphic Encryption (FHE) is the cryptographic foundation that makes PrivateTimeline possible.  
It enables mathematical operations directly on encrypted data, allowing the system to answer questions such as:

- “How many unique cafés did I visit last month?”  
- “What’s my average commute distance?”  
- “How often do I leave home before 8 a.m.?”  

—all **without decrypting your location history**.

This resolves a core privacy paradox: you can gain insights from your data without ever revealing the data itself.  
FHE allows computation without trust — the cloud computes, but it never knows what it’s computing on.

---

## Key Features

### 1. Client-Side Encryption

- All GPS points and timestamps are encrypted locally before storage or transmission.  
- The platform never receives plaintext coordinates, routes, or timestamps.  
- Encryption keys remain exclusively on the user’s device.

### 2. FHE Query Engine

- Supports homomorphic distance, frequency, and category computations.  
- Allows private queries like “number of visits to restaurants in September.”  
- Employs bootstrapping to maintain ciphertext freshness during long-running queries.  

### 3. Local-First Data Storage

- Encrypted timeline data is stored locally and synchronized in encrypted form.  
- Users can export, prune, or reset history at any time.  
- No external cloud service has decryption capabilities.

### 4. Context-Aware Categories

- Local machine learning models classify visited locations (e.g., cafés, gyms, parks).  
- The classification results are encrypted and used for FHE-based statistical queries.  
- Enhances utility while maintaining total privacy.

### 5. Visual Encrypted Insights

- The dashboard shows charts and summaries derived from encrypted computations.  
- Examples: total time spent outdoors, visit frequency by location type, weekly travel radius.  
- All computations occur on ciphertexts — visualization happens post-decryption on the user’s side.

---

## Example Usage Scenarios

- “I want to know how many times I went jogging in September.”  
- “How much time do I typically spend commuting each weekday?”  
- “Which days did I travel more than 10 kilometers from home?”  

Each query is translated into a homomorphic operation over encrypted coordinates and timestamps.  
The server never learns any route, location, or movement pattern.

---

## Architecture

PrivateTimeline’s architecture is designed for total user control and cryptographic privacy.  

### 1. Data Collection Layer
- Continuously logs GPS points and timestamps on the user’s device.  
- Performs immediate local encryption using the FHE scheme.  
- Associates encrypted location labels (e.g., type of venue) via a local AI model.  

### 2. Secure Storage Layer
- Maintains encrypted database of time-location pairs.  
- Uses rolling encryption windows to enable efficient updates.  
- Supports encrypted compression and pruning mechanisms for older data.  

### 3. FHE Computation Layer
- Executes encrypted computations: distance sums, category counts, dwell-time averages.  
- Employs FHE bootstrapping to handle deep query circuits.  
- Utilizes batching techniques for efficient multi-day queries.  

### 4. Insight Visualization Layer
- Decrypts only aggregate results locally.  
- Generates private, client-side visualizations (heat maps, frequency histograms).  
- Never stores or transmits decrypted data beyond local scope.

---

## Cryptographic Design

PrivateTimeline leverages FHE for **confidential analytics**.  
Key operations include:

- **Encrypted Distance Calculation:** Compute movement distances using encrypted GPS coordinates.  
- **Homomorphic Aggregation:** Count visits per category or location type without plaintext exposure.  
- **Encrypted Filtering:** Apply temporal constraints (e.g., “in the last 30 days”) over ciphertexts.  
- **Bootstrapping Pipeline:** Refresh ciphertext noise levels for sustainable long-term computation.  

Together, these techniques ensure the system remains functional and private even with large datasets.

---

## Security Principles

PrivateTimeline follows three immutable principles:

1. **Data never leaves the device unencrypted.**  
2. **The cloud computes without knowledge.**  
3. **Only the user holds the key to decrypt.**

This architecture means there is no need to “trust” the service provider — the mathematics itself enforces privacy.

### Additional Safeguards

- No GPS coordinate ever exists in plaintext on the server.  
- No API logs or network traces contain user identifiers.  
- All computations are stateless and ephemeral.  
- Optional secure enclave integration for enhanced on-device protection.

---

## Example Query Flow

1. The user asks: “How many times did I visit a park last month?”  
2. The app converts this query into an encrypted computation circuit.  
3. The encrypted query runs on the server, analyzing ciphertext location data.  
4. The result — still encrypted — is sent back to the device.  
5. The device decrypts and displays the answer (e.g., “14 times”) locally.  

At no stage can the server learn what a “park” is, where it was, or how many times it was visited.

---

## Technology Stack

- **Language:** Rust + Python (for encryption and data processing)  
- **Frontend:** React Native for cross-platform mobile interface  
- **Encryption Layer:** CKKS and BFV schemes (depending on query precision)  
- **Local Database:** Encrypted SQLite wrapper  
- **Visualization:** D3.js-based local rendering  

---

## Performance Considerations

FHE computations are inherently more demanding than plaintext ones.  
PrivateTimeline incorporates several optimization strategies:

- **Ciphertext Batching:** Processes multiple encrypted records simultaneously.  
- **Circuit Depth Optimization:** Minimizes query complexity through modular arithmetic.  
- **Incremental Bootstrapping:** Only refreshes noisy ciphertexts when required.  
- **Parallel Query Evaluation:** Splits encrypted data into multiple processing threads.  

While slightly slower than traditional systems, it offers absolute privacy — a worthwhile trade-off for sensitive location data.

---

## User Privacy Model

| Aspect | Traditional Timeline | PrivateTimeline |
|--------|----------------------|-----------------|
| Data Visibility | Cloud sees all coordinates | Cloud sees ciphertext only |
| Key Ownership | Managed by provider | Fully user-controlled |
| Query Privacy | Server learns user questions | Queries encrypted under FHE |
| Storage | Centralized in plaintext | Local encrypted database |
| Trust Model | Based on policy | Based on cryptography |

---

## Ethical Implications

Location history often reveals identity, religion, habits, and relationships.  
PrivateTimeline demonstrates that useful analytics can exist without invasive tracking — an important step toward ethical, privacy-respecting technology.  

By placing computation inside encryption, it restores **data sovereignty** to individuals, redefining what “personal analytics” can mean.

---

## Future Roadmap

1. **Temporal-Spatial FHE Indexing:** Faster encrypted lookups by date and region.  
2. **Private Mobility Insights:** Secure travel pattern clustering using FHE vectors.  
3. **Collaborative Analytics:** Shared FHE computations between trusted peers (e.g., family travel stats).  
4. **Hardware Acceleration:** Integrate GPU and ASIC-based FHE acceleration for mobile efficiency.  
5. **Offline Querying:** Allow queries without any network involvement.  

---

## Limitations and Research Directions

- FHE computations remain resource-intensive on mobile devices.  
- Long-term encrypted storage may require hybrid schemes (partially homomorphic + symmetric).  
- Venue classification accuracy depends on local ML performance.  

Research continues on lightweight FHE frameworks and adaptive bootstrapping methods to make encrypted timeline analytics even more practical.

---

## Vision

PrivateTimeline envisions a future where personal data stays truly personal —  
where we can reflect on our lives, habits, and journeys without surrendering our privacy.  

It redefines the balance between **utility and confidentiality**, proving that location analytics can be both insightful and entirely private.

---

Built with cryptographic care, for those who believe that **your movements belong to you — and no one else.**
