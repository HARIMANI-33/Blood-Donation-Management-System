# Blood Bank Management and Real-Time Blood Inventory Monitoring System

## Project Description
A comprehensive web-based platform designed to streamline blood bank operations, automate donor and recipient management, facilitate blood requisition processing, and provide real-time blood stock tracking and monitoring. The system ensures efficient, transparent, and timely blood supply chain management across blood banks, hospitals, and donors.

---

## Technology Stack

- **Frontend:** React, TypeScript
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Caching & Real-Time Performance:** Redis
- **Communication:** REST API
- **Containerization:** Docker & Docker Compose
- **Version Control:** Git and GitHub

---

## Planned Modules

1. **Authentication & Authorization Module**
   - Role-Based Access Control (RBAC): Super Admin, Blood Bank Staff, Hospital Representative, Donor.
   - Secure token-based session and authentication management.

2. **Donor Management Module**
   - Donor registration, medical history, eligibility checks, and donation history tracking.
   - Appointment scheduling and donation certificate generation.

3. **Blood Inventory & Real-Time Monitoring Module**
   - Real-time stock levels categorized by blood group (A+, A-, B+, B-, AB+, AB-, O+, O-) and blood components (Whole Blood, Packed Red Cells, Platelets, Fresh Frozen Plasma).
   - Redis caching for low-latency inventory availability queries.
   - Expiration date tracking and low-stock / expiry alert mechanisms.

4. **Blood Request & Requisition Module**
   - Hospital and patient emergency blood requests.
   - Workflow for approval, verification, cross-matching status, and dispatch tracking.

5. **Blood Camp & Drive Management Module**
   - Organizing, scheduling, and publicizing blood donation camps.
   - On-site donor registration and collection logs.

6. **Analytics & Reporting Module**
   - Dashboards showing donation trends, utilization rates, and shortage forecasts.
   - Audit trails and compliance reporting for blood safety standards.

---

## Project Structure

```text
Blood donation/
├── frontend/     # React + TypeScript client application
├── backend/      # Node.js + Express.js REST API server
├── database/     # PostgreSQL schemas, migrations, and seeds
├── docker/       # Docker configuration and compose definitions
├── .gitignore    # Git exclusion rules
└── README.md     # Project overview and documentation
```
