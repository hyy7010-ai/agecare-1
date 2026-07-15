# Architecture, Compliance & Data Governance

## 1. Data Privacy & Governance (Australian Aged Care Act Compliant)
In accordance with Australian privacy laws (Privacy Act 1988) and guidelines from the Aged Care Quality and Safety Commission (ACQSC), this platform implements enterprise-grade data security:

*   **Data Residency:** All databases (Firestore) and file storage (Firebase Storage) are strictly provisioned in Australian regions (`australia-southeast1` Sydney) to guarantee data sovereignty.
*   **Encryption at Rest & In Transit:**
    *   All clinical data in Firestore is encrypted at rest using Google's AES-256 implementation.
    *   Data in transit is protected over strictly enforced TLS 1.3 tunnels.
*   **TFN & Sensitive PII Separation:** Staff Tax File Numbers (TFN) and core medical health records are stored in a dedicated, isolated sub-collection with separate key rotation schedules and restricted Access Control Lists (ACLs). 
*   **7-Year Immutable Audit Trail:** 
    *   System Activity Logging captures every login, data modification, SIRS report, and report export. 
    *   Logs are retained in an immutable/append-only structure for a minimum of 7 years, complying with financial and clinical audit requirements.

## 2. Progressive Web App (PWA) & Offline-First Working Model
*Planned Architecture for Production Checkouts*

To account for poor WiFi connectivity in specific aged care facility wings or external activity outings:
*   **Service Workers:** Incorporates `workbox` to preemptively cache the core application shell, critical JS bundles, and the day's assigned resident roster.
*   **Local Caching (IndexedDB/LocalStore):** When the application detects offline status, caregivers can still check off tasks, type/record notes, and capture images. 
*   **Background Sync:** Forms are serialized to IndexedDB. Once network connectivity resiliently restores, the `BackgroundSync` API automatically flushes the local payload to Firestore in the background, minimizing data loss.

*Status: Basic network monitoring UI implemented. Full IndexedDB persistence scheduled for Phase 3.*
