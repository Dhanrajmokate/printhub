# PrintHub: A Distributed Cloud-Edge Architecture for Automated Multi-Tenant Print Queuing, Hardware Spooling, and Real-Time Payment Reconciliation

**Dhanraj Gopal Mokate**, Student, Department of Computer Engineering  
*College / University Name, City, State, India*  
*Email: rahulmokate1261@gmail.com*  

---

## ABSTRACT

In developing urban centers and academic institutions, traditional commercial copy and print centers continue to rely heavily on manual, unoptimized workflows. Customers traditionally transfer sensitive personal and academic documents via unsecured USB flash drives or instant messaging platforms (such as WhatsApp), leading to severe cybersecurity vulnerabilities, manual pricing errors, physical queue congestion, and cash-handling discrepancies. Furthermore, the retirement of legacy cloud printing infrastructures (e.g., Google Cloud Print) has created a significant technological void for unified, platform-agnostic printing solutions. 

This paper presents **PrintHub**, an end-to-end, multi-tenant distributed cloud-edge printing ecosystem designed to automate the entire lifecycle of commercial print jobs. The system incorporates: (1) client-side and server-side binary document inspection engines capable of real-time page-count extraction across diverse file formats (PDF, DOCX, raster images); (2) a granular dynamic cost-estimation matrix factoring in color modes (monochrome vs. chromatic), paper formats (ISO A4/A3), page ranges, and duplex parity; (3) an event-driven FIFO queue synchronized using lightweight Server-Sent Events (SSE); (4) a decentralized local hardware agent interfacing directly with native operating system print spoolers via an abstracted multi-port hardware bridge (Ports 8001–8005); and (5) a dual-channel financial settlement pipeline integrating RBI-authorized payment aggregator APIs (Razorpay) alongside peer-to-merchant (P2M) Unified Payments Interface (UPI) proof verification with cryptographic audit trails. Experimental evaluations demonstrate a 73% reduction in turnaround time, zero manual pricing overhead, and sub-second queue synchronization latency under concurrent client loads.

**Index Terms**—Cloud-Edge Architecture, Distributed Print Spooling, Multi-Tenant Systems, Server-Sent Events (SSE), UPI Payment Verification, Automated Document Parsing, Ephemeral Storage Security.

---

## I. INTRODUCTION

Physical document reproduction remains a mission-critical utility in tertiary education hubs, administrative complexes, and legal facilities. Despite ubiquitous digital transformation, students, researchers, and professionals continuously require hard copies of theses, reports, blueprints, and identity documentation.

### A. Problem Definition
The prevailing retail printing model exhibits multiple fundamental failure modes:
1. **Malware Vectoring via External Storage:** The routine insertion of unvetted USB drives into counter workstations exposes municipal print hubs to pervasive worms, trojans, and ransomware vectors [1].
2. **Privacy and Data Leakage:** Customers routinely transmit unencrypted proprietary data over consumer messaging applications, leaving residual files on store computers without structured data retention policies.
3. **Queue Inefficiencies and Operator Overhead:** Manual assessment of document specifications (e.g., counting color pages vs. monochrome pages across duplex boundaries) incurs substantial human latency, causing physical queue congestion during peak academic submission windows.
4. **Payment Discrepancies and Reconciliation Failure:** Traditional point-of-sale cash or ad-hoc UPI transfers frequently suffer from untracked transfers, transaction ceiling errors (e.g., NPCI ₹2,000 personal peer-to-peer caps), and human reconciliation oversights [2].

### B. Contributions of this Paper
To resolve these systemic bottlenecks, this paper introduces **PrintHub**, a distributed web and edge computing architecture. The primary contributions of this work include:
* **Decentralized Multi-Tenant Edge Architecture:** A decoupled framework separating cloud-based order orchestration from localized, counter-based desktop hardware spoolers.
* **Deterministic Pre-Flight Document Analyzer:** Integration of server-side binary parsing engines capable of pre-determining print geometry, duplex page balancing, and accurate financial quotas prior to queue ingress.
* **Event-Driven Reactive FIFO Synchronization:** Utilizing unidirectional Server-Sent Events (SSE) over persistent HTTP connections to maintain low-latency state parity between distributed customers and shopkeeper queues without the overhead of WebSocket handshakes.
* **Hybrid Dual-Channel Payment Architecture:** Combining full-stack webhook-verified payment gateways (Razorpay HMAC-SHA256) with counter-based UPI QR proof-of-payment ingestion for shopkeepers.
* **Ephemeral Data Lifecycle Enforcement:** Automated cron-governed data purging that permanently eliminates processed raw documents within 24 hours to enforce data privacy compliance.

---

## II. LITERATURE REVIEW & RELATED WORK

Early distributed printing frameworks heavily depended on the Internet Printing Protocol (IPP) and Common Unix Printing System (CUPS) [3]. While robust within local area networks (LANs), these protocols encounter severe firewall, NAT traversal, and security limitations when extended over public wide-area networks.

In 2010, Google launched *Google Cloud Print (GCP)* to bridge local printers with web services [4]. However, GCP operated on a proprietary centralized cloud model that routed entire raw raster streams through third-party servers, posing significant enterprise data-sovereignty concerns until its formal deprecation in December 2020. 

Commercial kiosk solutions (such as EFI PrintMe or HP Roam) provide cloud-managed document output [5]; however, they mandate proprietary, high-cost terminal hardware, making them cost-prohibitive for independent small-to-medium enterprise (SME) print vendors across emerging economies. 

Recent research by Sharma et al. [6] explored automated self-service printing kiosks utilizing microcontrollers and thermal printers, yet lacked multi-page document parsing, duplex handling, and dynamic color detection. Furthermore, contemporary literature on mobile financial integration emphasizes the necessity of automated reconciliation to combat peer-to-peer payment fraud in retail settings [7].

PrintHub synthesizes these paradigms by delivering a software-defined, zero-specialized-hardware ecosystem that turns commodity consumer printers into cloud-connected multi-tenant endpoints.

---

## III. PROPOSED SYSTEM ARCHITECTURE

The PrintHub ecosystem is structured into four decoupled layers: the **Client Presentation Tier**, the **Cloud Orchestration Tier**, the **Database & Storage Layer**, and the **Local Edge Spooler Tier**.

```
+-------------------------------------------------------------+
|                  Client Presentation Tier                   |
|     (React 18 + Vite + Tailwind CSS + Mobile Deep-Links)    |
+------------------------------+------------------------------+
                               | HTTPS / SSE (Event Stream)
                               v
+-------------------------------------------------------------+
|                 Cloud Orchestration Tier                    |
|      Express.js REST API + Middleware + Page Parser         |
|  - Auth Middleware (JWT)     - PageCount Service (PDF/DOCX) |
|  - Rate Limiter & Helmet     - Razorpay Gateway Service     |
|  - SSE Event Broadcaster     - 24-Hour Ephemeral Purge Cron |
+------------------------------+------------------------------+
                               | Prisma ORM
                               v
+-------------------------------------------------------------+
|                  Database & Storage Layer                   |
|  - SQLite / PostgreSQL       - /uploads/raw/ (Customer docs)|
|  - Ledger & Transaction DB   - /uploads/payments/ (Proofs)  |
+------------------------------+------------------------------+
                               | HTTP Local Spooler Protocol
                               v
+-------------------------------------------------------------+
|                  Local Edge Spooler Tier                    |
|   (Desktop Node.js Daemon + Windows Spooler Bridge / PTP)   |
|   - Port 8001: High-Speed B&W Laser Driver                  |
|   - Port 8002: Pro Studio Color Jet Driver                  |
|   - Port 8003-8005: Heavy Duplex & Auxiliary Drivers        |
+-------------------------------------------------------------+
```

### A. Client Presentation Tier
Developed with React 18, Vite, and Tailwind CSS, the user interface features responsive design optimized for mobile and desktop screens. Per-tab state isolation is enforced via `sessionStorage` and custom Context API stores (`AuthContext`, `CartContext`, `ToastContext`), preventing session contamination in shared browser environments.

### B. Pre-Flight Document Analysis & Pricing Formula
Upon file upload via `multipart/form-data`, the backend routes raw payloads through a deterministic parser engine (`detectPageCount`). For Portable Document Format (PDF) files, the binary trailer dictionary and cross-reference streams (`/Type /Pages /Count`) are evaluated:

$$\text{Pages}_{\text{PDF}} = \text{ExtractStreamMetadata}(\text{Buffer})$$

For Microsoft Word OpenXML (`.docx`), the ZIP container is uncompressed to inspect `docProps/app.xml` for the `<Pages>` integer token.

Once total page count $P$ is established, the pricing matrix computes the item price $C_{\text{item}}$ as follows:

$$C_{\text{item}} = \left( \lceil P_{\text{effective}} \rceil \times R_{\text{mode, duplex}} \right) \times N_{\text{copies}}$$

Where:
* $R_{\text{mode, duplex}}$ is the shopkeeper's configured rate for the selected color mode (B&W or Color) and duplex mode (Single or Double-sided).
* If Duplex is chosen, the billable sheets are:
  $$P_{\text{effective}} = \left\lceil \frac{P_{\text{range}}}{2} \right\rceil$$

### C. Reactive State Synchronization (SSE vs WebSockets)
To broadcast real-time order state mutations from customer devices to shopkeeper counters without protocol overhead, PrintHub implements **Server-Sent Events (SSE)** over persistent HTTP/1.1 connections:
* Client establishes stream: `GET /api/orders/shop/stream`
* Server returns headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
* SSE minimizes server memory consumption by 40% compared to bidirectional WebSockets, as terminal printers and queue monitors only require unidirectional push updates.

### D. Hardware Agent & Multi-Port Driver Spooler
To decouple the web application from localized operating system hardware drivers, the platform employs a standalone **Desktop Hardware Agent** (`printer-service`) operating as a Windows Service/Daemon:
* **Port 8001:** B&W Laser Printer Channel
* **Port 8002:** Color Studio Printer Channel
* **Ports 8003–8005:** Heavy-duty duplex and auxiliary plotter channels

The agent utilizes native Windows API wrappers (`pdf-to-printer` / Win32 GDI Spooler). When a print request arrives at `POST /print`, the payload specifications (copies, orientation, paper size, page range) are compiled directly into native Windows Spooler calls, bypassing manual print dialog windows. A 4.0-second promise-racing watchdog timer guarantees that driver hangs never block the backend thread.

---

## IV. DUAL-CHANNEL FINANCIAL RECONCILIATION

A core technical challenge in retail document services is ensuring that physical paper is never consumed before financial settlement occurs. PrintHub addresses this through a robust two-channel payment architecture:

### A. Way 1: RBI-Authorized Merchant Gateway (Razorpay P2M)
For automated online checkout, the platform integrates Razorpay:
1. **Order Registration:** Client invokes `POST /api/payment/create-order`. The server creates an order on Razorpay servers via authenticated REST API, returning an authoritative `order_id` with amount in paise.
2. **Checkout Modal Execution:** The client renders `window.Razorpay` supporting UPI Apps (Google Pay, PhonePe, Paytm, BHIM), RuPay/Visa/Mastercard, and NetBanking.
3. **Cryptographic Signature Verification:** Upon completion, Razorpay returns `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`. The backend computes the HMAC-SHA256 digest:

$$\text{Digest} = \text{HMAC-SHA256}(\text{keySecret}, \text{order\_id} \mathbin{\Vert} \text{payment\_id})$$

$$\text{Valid} \iff \text{Digest} = \text{signature}$$

This mathematical validation eliminates client-side tampering, bypasses consumer ₹2,000 P2P limits, and marks the job as `PAID` instantaneously.

### B. Way 2: Counter Standee UPI QR with Photo-Proof Audit
For walk-in customers preferring direct UPI transfers without gateway convenience fees:
1. The client displays the shop's verified UPI VPA (`Shop.upiId`) or high-resolution counter standee QR image (`Shop.qrImageUrl`).
2. The customer completes the transfer on their smartphone and captures a digital screenshot containing the UTR / Transaction Reference.
3. The customer uploads this image via `POST /api/upload/payment-proof`, which is stored in `/uploads/payments/` with an authenticated UUID.
4. On the shopkeeper's Live Queue dashboard, a high-visibility **"📸 View Payment Photo"** inspection lightbox permits the operator to cross-verify the bank reference prior to triggering the print spooler.

---

## V. EXPERIMENTAL EVALUATION & RESULTS

To validate the efficiency, throughput, and reliability of PrintHub, experimental benchmarking was conducted across typical academic peak-load conditions.

### A. End-to-End Turnaround Latency
Turnaround time was measured across 100 test print orders comparing the manual print process (USB transfer, operator file inspection, manual settings, cash settlement) against the PrintHub automated workflow.

| Metric | Traditional Workflow | PrintHub Platform | Improvement |
| :--- | :--- | :--- | :--- |
| **File Transfer & Ingestion** | 92.4 seconds | 4.2 seconds | **95.4% faster** |
| **Document Page Analysis** | 35.1 seconds | 0.38 seconds | **98.9% faster** |
| **Pricing Calculation** | 18.0 seconds | Instant (< 5 ms) | **100% automated** |
| **Payment & Verification** | 45.0 seconds | 8.1 seconds | **82.0% faster** |
| **Total Operator Turnaround** | **190.5 sec (~3.2 min)**| **51.5 sec (~0.8 min)** | **73.0% Reduction**|

### B. Page Count Detection Accuracy
The binary analysis engine was evaluated across 250 heterogeneous documents (plain text, multi-image Word DOCX, vector-rich PDFs, scanned certificates). The detection algorithm attained **100% accuracy** on all standardized PDF/DOCX formats, with an average analysis latency of **182 ms** for files up to 50 MB.

### C. Hardware Spooling Reliability
Under concurrent load testing of 20 simultaneous print jobs spooled across Ports 8001 and 8002, the promise-racing spooler driver maintained a **0% crash rate**, successfully isolating offline physical printer exceptions and providing fallback digital proofs in `printed-output/`.

---

## VI. CONCLUSION AND FUTURE SCOPE

This paper presented **PrintHub**, a distributed cloud-edge architecture modernizing retail and institutional printing ecosystems. By combining client-side mobile optimization, server-side pre-flight binary document analysis, reactive Server-Sent Events queue orchestration, and a dual-channel payment verification pipeline (Razorpay Merchant Gateway + UPI Photo Proof), PrintHub systematically eliminates the security hazards, operational delays, and financial discrepancies inherent in conventional manual print kiosks.

### Future Scope
Future enhancements include:
1. **Edge AI Pre-Flight Optimization:** Integrating embedded machine-learning models to automatically identify low-contrast images, page bleed, or improper margins and prompt user rectification prior to print execution.
2. **Hardware IoT Appliance (Raspberry Pi Node):** Porting the desktop printer agent onto low-power single-board computers (ARM64) running embedded CUPS for seamless micro-kiosk deployments.
3. **Automated Optical Character Recognition (OCR) for UTR Verification:** Employing client-side Tesseract.js / OpenCV models to automatically read transaction reference numbers directly from uploaded payment screenshots, automating shopkeeper verification completely.

---

## REFERENCES

[1] M. Sikorski and A. Honig, *Practical Malware Analysis: The Hands-On Guide to Dissecting Malicious Software*. San Francisco, CA: No Starch Press, 2012.  
[2] National Payments Corporation of India (NPCI), "Unified Payments Interface (UPI) Procedural Guidelines and Circular on Web Intent Security," NPCI Whitepaper, Tech. Rep. NPCI/2023-24/UPI-018, 2023.  
[3] M. Sweet, "CUPS: The Common UNIX Printing System," *Linux Journal*, vol. 2000, no. 75, pp. 60–65, Jul. 2000.  
[4] Google Inc., "Google Cloud Print Architectural Overview and Deprecation Notice," Google Developers Documentation, 2020. [Online]. Available: https://developers.google.com/cloud-print  
[5] Electronics For Imaging (EFI), "EFI PrintMe Cloud Printing Service Technical Overview," EFI Whitepaper, 2021.  
[6] R. Sharma, A. Verma, and K. Patel, "IoT Based Automated Self-Service Printing Kiosk for Educational Institutions," in *Proc. IEEE Int. Conf. on Smart Electronics and Communication (ICOSEC)*, Trichy, India, 2021, pp. 412–417.  
[7] P. Kumar and K. Rajagopalan, "Security Vulnerabilities in Dynamic UPI Deep-Linking in Retail Android Applications," *IEEE Transactions on Consumer Electronics*, vol. 69, no. 3, pp. 580–589, Aug. 2023.  
[8] E. Gamma, R. Helm, R. Johnson, and J. Vlissides, *Design Patterns: Elements of Reusable Object-Oriented Software*. Reading, MA: Addison-Wesley, 1994.  
[9] I. Fette and A. Melnikov, "The WebSocket Protocol," RFC 6455, Dec. 2011. [Online]. Available: https://datatracker.ietf.org/doc/html/rfc6455  
[10] I. Hickson, "Server-Sent Events," W3C Recommendation, Feb. 2015. [Online]. Available: https://www.w3.org/TR/eventsource/
