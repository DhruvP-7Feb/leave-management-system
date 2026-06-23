# Leave Management System

A full-stack web application designed to streamline the leave request and approval process for organizations. Built with a modern React frontend and a robust Django REST backend, this system supports distinct roles for Employees, Managers, and HR Administrators.

## 🚀 Features

### Role-Based Access Control
- **Employee**: Apply for leaves, view personal leave balances, cancel pending requests, and view public holidays.
- **Manager**: Approve or reject leave requests from their department team members, with mandatory rejection reasons.
- **HR Admin**: Manage the entire system, including employee accounts, departments, leave types, public holidays, and system-wide reporting.

### Core Modules
- **Automated Balances**: Leave balances are automatically prorated and allocated when an employee joins.
- **Proxy Work Handover**: Employees must designate a colleague to handle urgent tasks while they are away.
- **Manager Delegation**: Managers going on leave can temporarily delegate their approval permissions to another manager or HR Admin.
- **Smart Date Calculation**: Automatically excludes weekends and public holidays when calculating the total days of a leave request.
- **HR Reporting**: Comprehensive dashboards for HR to filter leave requests and export reports as CSV files.

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS, React Router, Recharts, Lucide Icons, Axios.
- **Backend**: Python, Django, Django REST Framework, SimpleJWT for Authentication.
<<<<<<< HEAD
- **Database**: PostgreSQL
=======
- **Database**: PostgreSQL (Development)
>>>>>>> c06ec93f99d528a2f2673065d4ebffbe85a1edd3

## 🏃‍♂️ Running Locally

### 1. Backend Setup
Open a terminal in the `backend` folder:
```bash
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start the server
python manage.py runserver
```

### 2. Frontend Setup
Open a terminal in the `frontend` folder:
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## 🔐 Default Login Roles
When setting up for the first time, you can create a superuser via Django to act as the initial HR Admin:
```bash
python manage.py createsuperuser
```
Use this account to log in and begin creating departments and employee accounts.
