# Product Requirements Document (PRD)

## Employee Leave Management System

| Field         | Detail                                      |
|---------------|----------------------------------------------|
| **Project**   | Employee Leave Management System             |
| **Stack**     | Django (Backend) + React / Vite (Frontend)   |
| **Database**  | PostgreSQL                                   |
| **Auth**      | JWT (JSON Web Tokens)                        |
| **Deliverable** | Working, deployed web application          |

---

## 1. Overview

### 1.1 Purpose

Build a full-stack **Employee Leave Management System** — a real-world product that companies use to manage staff leave requests, approvals, and balances. The system replaces ad-hoc processes (WhatsApp messages, spreadsheets) with a structured, auditable web application.

### 1.2 Problem Statement

Most small companies manage leaves informally, leading to:

- Employees not knowing how many leave days they have remaining
- Managers forgetting to approve or reject requests
- No audit trail of who approved what and when
- HR having no data to understand absence patterns across the organization

### 1.3 Solution

A role-based web application where employees apply for leave, managers approve/reject requests, and HR administrators manage the entire system with full reporting capabilities.

---

## 2. User Roles & Permissions

### 2.1 Role Definitions

| Role          | Persona          | Capabilities                                                              |
|---------------|------------------|---------------------------------------------------------------------------|
| **Employee**  | Regular staff    | Apply for leave, view own history, check remaining balance                |
| **Manager**   | Team lead        | View and approve/reject leave requests from their **direct team only**    |
| **HR Admin**  | HR department    | Full access — manage employees, configure system, view reports            |

### 2.2 Access Control Rules

| # | Rule                                                                                      |
|---|-------------------------------------------------------------------------------------------|
| 1 | A **manager cannot approve their own leave** — it must be routed to HR Admin              |
| 2 | An **employee can only see their own leave history**                                      |
| 3 | A **manager can only see requests from their direct team**                                |
| 4 | Only **HR Admin** can add/edit leave types and public holidays                            |
| 5 | Logged-out users **cannot access any protected page** (redirect to login)                 |

---

## 3. Functional Requirements — Modules

### Module 1: User Accounts & Authentication

#### 3.1.1 Features

| Feature                        | Description                                                                 |
|--------------------------------|-----------------------------------------------------------------------------|
| Login / Logout                 | Email + password authentication; JWT token storage                          |
| Role-based dashboard           | Each role sees a **different dashboard** after login                         |
| User profile                   | Displays name, department, joining date                                     |
| Account management (HR only)   | HR Admin can **create** and **deactivate** employee accounts                |
| Department management (HR only)| HR Admin can **create departments** and **assign a manager** to each        |

#### 3.1.2 Business Rules

- Passwords must **never** be hardcoded; use environment variables for secrets
- JWT tokens must be stored securely on the client (e.g., `httpOnly` cookies or secure storage)
- Deactivated accounts cannot log in

---

### Module 2: Leave Types & Employee Balances

#### 3.2.1 Features

| Feature                        | Description                                                                 |
|--------------------------------|-----------------------------------------------------------------------------|
| Leave type CRUD (HR only)      | Create leave types with name + annual quota (e.g., Sick Leave — 10 days, Casual Leave — 12 days, Earned Leave — 15 days) |
| Auto-balance creation          | When a new employee is created, balances for **all existing leave types** are auto-generated |
| Pro-rata balance               | Employees joining **mid-year** receive a proportional balance based on joining month |
| Balance visibility             | Employee dashboard shows balance for **every leave type** (allocated, used, remaining) |

#### 3.2.2 Pro-Rata Calculation

```
remaining_months = 12 - joining_month + 1
prorated_balance = (annual_quota / 12) × remaining_months
```

> Round to nearest 0.5 day or whole day (implementation decision).

---

### Module 3: Applying & Managing Leave

#### 3.3.1 Leave Application Form Fields

| Field              | Type         | Required | Notes                                         |
|--------------------|--------------|----------|-----------------------------------------------|
| Leave Type         | Dropdown     | ✅       | Populated from active leave types              |
| Start Date         | Date picker  | ✅       | Cannot be in the past                          |
| End Date           | Date picker  | ✅       | Must be ≥ start date                           |
| Half Day           | Checkbox     | ❌       | Option to apply for half-day leave             |
| Reason             | Text area    | ✅       | Free-text reason for leave                     |
| Work Handover / Proxy | Dropdown  | ✅       | Nominate a colleague to handle urgent tasks    |

#### 3.3.2 Validations (Server-Side + Client-Side)

| Validation                      | Error Condition                                                  |
|---------------------------------|------------------------------------------------------------------|
| Date in past                    | Start date is before today                                       |
| Insufficient balance            | Requested working days exceed remaining balance for that type    |
| Overlapping leave               | Employee already has an approved leave overlapping the date range |
| Invalid date range              | End date is before start date                                    |

#### 3.3.3 Working Day Calculation

- Count only **Monday–Friday**
- **Exclude public holidays** (managed by HR Admin)
- Half-day counts as **0.5 working days**

#### 3.3.4 Leave Request States

```
┌─────────┐    submit    ┌─────────┐
│  (new)  │ ──────────── │ Pending │
└─────────┘              └────┬────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         manager approves  manager rejects  employee cancels
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐    ┌───────────┐
        │ Approved │    │ Rejected │    │ Cancelled │
        └────┬─────┘    └──────────┘    └───────────┘
             │
       employee cancels
             │
             ▼
       ┌───────────┐
       │ Cancelled │  (balance restored)
       └───────────┘
```

| Transition              | Side Effects                                      |
|-------------------------|---------------------------------------------------|
| Pending → Approved      | Leave balance **deducted**                        |
| Pending → Rejected      | No balance change; rejection **reason required**  |
| Pending → Cancelled     | No balance change                                 |
| Approved → Cancelled    | Leave balance **restored**                        |

---

### Module 4: Manager Approval Workflow

#### 3.4.1 Features

| Feature                          | Description                                                         |
|----------------------------------|---------------------------------------------------------------------|
| Pending requests list            | Manager sees all **Pending** requests from their direct team        |
| Approve action                   | Status → Approved; balance deducted; employee notified              |
| Reject action                    | Status → Rejected; **reason is mandatory**; employee notified       |
| Status visibility                | Employee can see updated status + rejection reason in real time     |
| Delegation on leave              | If a manager is going on leave, they must **assign a delegate** to handle approvals |

#### 3.4.2 Manager's Own Leave

- A manager's leave request is **automatically routed to HR Admin** for approval
- The manager **cannot** approve their own request under any circumstance

#### 3.4.3 Scope Restriction

- Manager's view of employees and requests is **strictly limited to their direct team** (same department)

---

### Module 5: HR Dashboard & Reports

#### 3.5.1 Dashboard Summary Cards

| Metric                    | Description                                            |
|---------------------------|--------------------------------------------------------|
| Total leaves this month   | Count of all approved leaves in the current month      |
| Pending approvals         | Count of all requests currently in Pending state       |
| Upcoming leaves this week | Approved leaves starting in the current/next 7 days    |

#### 3.5.2 Reports & Filters

| Report                       | Filters Available                                          |
|------------------------------|-------------------------------------------------------------|
| Full leave request list      | By employee, department, date range, status                 |
| Employee balance report      | Days used + remaining per person, per leave type            |

#### 3.5.3 Export

- HR Admin can **export the leave list as a CSV file**

---

## 4. Non-Functional Requirements

### 4.1 Security

| Requirement                      | Detail                                                     |
|----------------------------------|------------------------------------------------------------|
| Authentication                   | JWT-based; tokens expire and refresh                       |
| Authorization                    | Role-based access control on every API endpoint            |
| Secrets management               | All passwords, keys, DB credentials via **environment variables** |
| Protected routes                 | Frontend guards + backend permission checks                |

### 4.2 UX & Error Handling

| Requirement                      | Detail                                                     |
|----------------------------------|------------------------------------------------------------|
| Error messages                   | Every user action that can fail must show a **clear, user-friendly error message** |
| Loading states                   | Show loading indicators during API calls                   |
| Empty states                     | Handle and display empty states gracefully (e.g., "No pending requests") |
| Responsive design                | App should be usable on desktop browsers                   |

### 4.3 Code Quality

| Requirement                      | Detail                                                     |
|----------------------------------|------------------------------------------------------------|
| Naming conventions               | Meaningful names for variables, functions, files            |
| Git history                      | Clean commit history with meaningful messages              |
| No hardcoded secrets             | Environment variables for all sensitive data               |
| Dual validation                  | Validation on **both** frontend and backend                |

---

## 5. Tech Stack & Architecture

### 5.1 Backend — Django

| Component         | Technology / Library                       |
|-------------------|--------------------------------------------|
| Framework         | Django + Django REST Framework              |
| Database          | PostgreSQL                                 |
| Authentication    | JWT (via `djangorestframework-simplejwt`)  |
| API style         | RESTful JSON APIs                          |
| Environment vars  | `python-dotenv` or `django-environ`        |

### 5.2 Frontend — React (Vite)

| Component         | Technology / Library                       |
|-------------------|--------------------------------------------|
| Build tool        | Vite                                       |
| UI framework      | React                                      |
| HTTP client       | Axios or Fetch API                         |
| Routing           | React Router                               |
| State management  | React Context / hooks (or Redux if needed) |

### 5.3 Project Structure (Current)

```
leave-management-system/
├── backend/
│   ├── accounts/          # User model, auth, roles
│   ├── departments/       # Department CRUD
│   ├── leaves/            # Leave types, applications, balances
│   ├── reports/           # HR reports & CSV export
│   ├── config/            # Django settings, URLs, WSGI
│   ├── manage.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/               # React components, pages, services
│   ├── public/
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── PRD.md
```

---

## 6. Data Model (Conceptual)

### 6.1 Core Entities

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│     User     │       │  Department  │       │  LeaveType   │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id           │       │ id           │       │ id           │
│ email        │  ┌───▶│ name         │       │ name         │
│ password     │  │    │ manager (FK) │──┐    │ annual_quota │
│ first_name   │  │    └──────────────┘  │    │ is_active    │
│ last_name    │  │                      │    └──────┬───────┘
│ role (enum)  │  │                      │           │
│ department   │──┘                      │           │
│ joining_date │◀────────────────────────┘           │
│ is_active    │                                     │
└──────┬───────┘                                     │
       │                                             │
       │         ┌──────────────────┐                │
       │         │  LeaveBalance    │                │
       ├────────▶├──────────────────┤◀───────────────┘
       │         │ employee (FK)    │
       │         │ leave_type (FK)  │
       │         │ allocated_days   │
       │         │ used_days        │
       │         │ remaining_days   │
       │         └──────────────────┘
       │
       │         ┌──────────────────┐       ┌──────────────────┐
       │         │ LeaveRequest     │       │  PublicHoliday   │
       └────────▶├──────────────────┤       ├──────────────────┤
                 │ employee (FK)    │       │ id               │
                 │ leave_type (FK)  │       │ name             │
                 │ start_date       │       │ date             │
                 │ end_date         │       │ year             │
                 │ is_half_day      │       └──────────────────┘
                 │ reason           │
                 │ handover_to (FK) │
                 │ status (enum)    │
                 │ rejection_reason │
                 │ reviewed_by (FK) │
                 │ created_at       │
                 │ updated_at       │
                 └──────────────────┘
```

### 6.2 Enumerations

| Enum        | Values                                     |
|-------------|---------------------------------------------|
| **Role**    | `EMPLOYEE`, `MANAGER`, `HR_ADMIN`           |
| **Status**  | `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED` |

---

## 7. API Endpoints (High-Level)

### 7.1 Authentication

| Method | Endpoint              | Description           | Access      |
|--------|-----------------------|-----------------------|-------------|
| POST   | `/api/auth/login/`    | Login, return JWT     | Public      |
| POST   | `/api/auth/logout/`   | Logout / blacklist    | Authenticated |
| GET    | `/api/auth/profile/`  | Get current user info | Authenticated |

### 7.2 Users & Departments (HR Admin)

| Method | Endpoint                    | Description                          | Access    |
|--------|-----------------------------|--------------------------------------|-----------|
| GET    | `/api/employees/`           | List all employees                   | HR Admin  |
| POST   | `/api/employees/`           | Create new employee                  | HR Admin  |
| PATCH  | `/api/employees/:id/`       | Update / deactivate employee         | HR Admin  |
| GET    | `/api/departments/`         | List all departments                 | HR Admin  |
| POST   | `/api/departments/`         | Create department                    | HR Admin  |
| PATCH  | `/api/departments/:id/`     | Update department (assign manager)   | HR Admin  |

### 7.3 Leave Types & Balances

| Method | Endpoint                         | Description                          | Access        |
|--------|----------------------------------|--------------------------------------|---------------|
| GET    | `/api/leave-types/`              | List all leave types                 | Authenticated |
| POST   | `/api/leave-types/`              | Create leave type                    | HR Admin      |
| GET    | `/api/balances/`                 | Get current user's balances          | Authenticated |
| GET    | `/api/balances/all/`             | Get all employees' balances          | HR Admin      |

### 7.4 Leave Requests

| Method | Endpoint                              | Description                          | Access          |
|--------|---------------------------------------|--------------------------------------|-----------------|
| POST   | `/api/leaves/apply/`                  | Submit leave application             | Employee        |
| GET    | `/api/leaves/my/`                     | Get own leave history                | Authenticated   |
| PATCH  | `/api/leaves/:id/cancel/`             | Cancel own leave request             | Employee (owner)|
| GET    | `/api/leaves/team/`                   | Get team's pending requests          | Manager         |
| PATCH  | `/api/leaves/:id/approve/`            | Approve a leave request              | Manager / HR    |
| PATCH  | `/api/leaves/:id/reject/`             | Reject with reason                   | Manager / HR    |

### 7.5 HR Reports

| Method | Endpoint                              | Description                          | Access    |
|--------|---------------------------------------|--------------------------------------|-----------|
| GET    | `/api/reports/dashboard/`             | Summary stats for HR dashboard       | HR Admin  |
| GET    | `/api/reports/leaves/`                | Filterable leave list                | HR Admin  |
| GET    | `/api/reports/leaves/export/`         | Export leave list as CSV             | HR Admin  |

### 7.6 Public Holidays

| Method | Endpoint                    | Description                          | Access    |
|--------|-----------------------------|--------------------------------------|-----------|
| GET    | `/api/holidays/`            | List all public holidays             | Authenticated |
| POST   | `/api/holidays/`            | Add a public holiday                 | HR Admin  |
| DELETE | `/api/holidays/:id/`        | Remove a public holiday              | HR Admin  |

---

## 8. Frontend Pages & Views

### 8.1 Shared Pages

| Page          | Route           | Description                                |
|---------------|-----------------|--------------------------------------------|
| Login         | `/login`        | Email + password form; redirects by role   |
| Profile       | `/profile`      | View own name, department, joining date    |

### 8.2 Employee Pages

| Page              | Route                | Description                              |
|-------------------|----------------------|------------------------------------------|
| Dashboard         | `/dashboard`         | Balance overview for all leave types     |
| Apply for Leave   | `/apply`             | Leave application form                   |
| My Leaves         | `/my-leaves`         | History table with status indicators     |

### 8.3 Manager Pages

| Page              | Route                | Description                              |
|-------------------|----------------------|------------------------------------------|
| Dashboard         | `/dashboard`         | Team overview + pending count            |
| Team Requests     | `/team-requests`     | List of pending requests with actions    |
| My Leaves         | `/my-leaves`         | Own leave history                        |
| Apply for Leave   | `/apply`             | Apply (routed to HR Admin)               |

### 8.4 HR Admin Pages

| Page                | Route                 | Description                             |
|---------------------|-----------------------|-----------------------------------------|
| Dashboard           | `/dashboard`          | Summary cards (monthly stats)           |
| Manage Employees    | `/employees`          | CRUD employee accounts                  |
| Manage Departments  | `/departments`        | CRUD departments + assign managers      |
| Manage Leave Types  | `/leave-types`        | CRUD leave types + annual quotas        |
| All Leave Requests  | `/all-leaves`         | Filterable list + CSV export            |
| Employee Balances   | `/balances`           | All employees' balance report           |
| Public Holidays     | `/holidays`           | Manage public holidays                  |

---

## 9. Acceptance Criteria

### Module 1 — User Accounts & Authentication
- [ ] HR Admin can create an employee account with email, name, role, department, joining date
- [ ] HR Admin can deactivate an employee account (user can no longer log in)
- [ ] HR Admin can create departments and assign a manager to each
- [ ] Users can log in with email and password and receive a JWT
- [ ] Each role is redirected to a role-appropriate dashboard after login
- [ ] Logged-out users are redirected to the login page when accessing protected routes

### Module 2 — Leave Types & Balances
- [ ] HR Admin can create a leave type with a name and annual quota
- [ ] When a new employee is created, balances for all leave types are auto-created
- [ ] Mid-year joiners receive pro-rated balances based on joining month
- [ ] Employees can view their balance (allocated, used, remaining) on the dashboard

### Module 3 — Apply & Manage Leave
- [ ] Employee can submit a leave application with type, dates, reason, half-day option, and handover person
- [ ] System calculates working days (Mon–Fri, excluding public holidays)
- [ ] System rejects: past dates, insufficient balance, overlapping approved leaves
- [ ] Leave request is created in **Pending** status
- [ ] Employee can cancel a Pending request
- [ ] Employee can cancel an Approved request and balance is restored
- [ ] Employee can view their leave history with statuses

### Module 4 — Manager Approval
- [ ] Manager sees all Pending requests from their direct team
- [ ] Manager can approve a request → status becomes Approved, balance deducted
- [ ] Manager can reject a request with a mandatory reason → status becomes Rejected
- [ ] Employee sees updated status and rejection reason immediately
- [ ] Manager's own leave request is routed to HR Admin
- [ ] Manager can assign a delegate for approvals when going on leave

### Module 5 — HR Dashboard & Reports
- [ ] HR dashboard shows: total leaves this month, pending approvals, upcoming leaves this week
- [ ] HR can view all leave requests with filters (employee, department, date range, status)
- [ ] HR can view all employee balances (used + remaining per person per leave type)
- [ ] HR can export the filtered leave list as a CSV file

### Cross-Cutting
- [ ] All forms validate on both client and server side
- [ ] All API endpoints enforce role-based permissions
- [ ] Clear, user-friendly error messages for every failure case
- [ ] Loading and empty states handled gracefully
- [ ] No hardcoded secrets in source code
- [ ] Clean Git commit history with meaningful messages

---

## 10. Development Plan

### Phase 1 — Foundation & Core Features

| Day   | Focus Area                  | Deliverable                                                                                     |
|-------|-----------------------------|-------------------------------------------------------------------------------------------------|
| Day 1 | Project Setup               | Django + PostgreSQL + React running; User model with roles; Login API works                     |
| Day 2 | Auth & Roles                | Login page; JWT storage; role-based dashboards; route protection                                |
| Day 3 | Departments & Employees     | HR can create departments + assign managers; HR can create employees; profile page              |
| Day 4 | Leave Types & Balances      | HR can create leave types; auto-balance creation; employee dashboard shows balances             |
| Day 5 | Apply for Leave             | Leave form with validation; working day calculation; pending request in employee list           |

### Phase 2 — Approval, Reporting & Polish

| Day    | Focus Area                  | Deliverable                                                                                    |
|--------|-----------------------------|------------------------------------------------------------------------------------------------|
| Day 6  | Manager Approval — View     | Manager sees pending requests from team with full details                                      |
| Day 7  | Manager Approval — Actions  | Approve/reject with status update + balance deduction; employee sees result                    |
| Day 8  | Cancel & Edge Cases         | Cancel pending/approved leaves; manager leave → HR Admin; error handling                       |
| Day 9  | HR Dashboard & Reports      | Summary stats; filterable leave list; balance table; CSV export                                |
| Day 10 | Testing & Final Polish      | End-to-end testing for all roles; bug fixes; loading/empty states; deploy                      |

---

## 11. Final Deliverable Checklist

- [ ] Deployed web application accessible via a URL
- [ ] All three roles working — Employee, Manager, HR Admin
- [ ] All 5 modules functional end-to-end
- [ ] Git repository with clean commit history
- [ ] Demo flow: Apply leave → Manager approves → Balance updates
