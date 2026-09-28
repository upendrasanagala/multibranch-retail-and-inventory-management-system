# 🛒 Multi-Branch Retail & Inventory Management System

A premium, comprehensive solution for managing retail operations across multiple branch locations. Built with a focus on ease-of-use, real-time data sync, and intelligent inventory optimization.

---

## 🚀 Live Demo & Deployments

| Component | Platform | URL |
| :--- | :--- | :--- |
| **Frontend Web App** | Vercel | [multibranch-retail-and-inventory-ma.vercel.app](https://multibranch-retail-and-inventory-ma.vercel.app/) |
| **Backend REST API** | Render | [multibranch-retail-and-inventory.onrender.com](https://multibranch-retail-and-inventory.onrender.com) |
| **Cloud Database** | Neon | Serverless PostgreSQL 16 |

### 🔑 Demo Credentials
* **Admin Login**: `admin@retail.com` / `Admin@123`
* *(Note: On free-tier hosting, Render backends spin down after 15 minutes of inactivity; the initial request may take ~30 seconds to wake up).*

---

## 🌟 Key Features

### 1. ⚖️ Stock Rebalancing Assistant (Smart Engine)
The system automatically monitors stock levels across all branches to identify imbalances.
- **Find Surplus**: Detects where items are overstocked (Dead Stock).
- **Find Deficit**: Detects where items are running low.
- **Quick Move**: Suggests exact quantities to transfer to keep every branch perfectly stocked without buying more inventory.

### 2. 📊 Advanced Admin Reports
Gain deep insights into your business performance with interactive reporting.
- **Calendar Filtering**: Pick any custom date range to view sales and performance.
- **Branch-Specific Data**: Filter every report by a specific branch or view globally.
- **Top Products**: See what sells fastest in which location.

### 3. 🖥️ Professional Point of Sale (POS)
A modern, fast interface for staff to handle customer transactions.
- **Real-time Inventory**: Stock levels update instantly across the system after every sale.
- **Itemized Receipts**: Generates professional receipts with GST (CGST/SGST) breakdowns.
- **Search & Filter**: Find products instantly by name or SKU.

### 4. 📦 Granular Inventory Control
- **Branch Distribution**: See exactly how many units of a product are in "Branch A" vs "Branch B".
- **Custom Thresholds**: Set independent "Low Stock" alerts for each branch.
- **Manual Adjustments**: Admins can easily add, subtract, or set stock levels manually.

### 6. 📢 Internal Announcements System
Administrators can broadcast important updates directly to the team.
- **Targeted Messaging**: Send messages to "Everyone", "Managers Only", or "Staff Only".
- **Real-time Badges**: Dynamic "NEW" tags appear on the sidebar for unread updates.
- **Read Tracking**: Individual read receipts (persistent per user) ensures everyone stays informed.

### 7. 📧 Public "Contact Us" Portal
A professional feedback loop for external inquiries.
- **Inquiry Management**: Admin dashboard to read, mark-as-read, or delete customer messages.
- **Email Integration**: 1-click reply via system-configured mail client.

### 8. 👤 User-Specific Profiles
Enhanced security and personal details management.
- **Secure Updates**: Staff and Managers can update their own phone, address, and bank details.
- **Visual Branding**: Initials-based avatars with role-specific color coding.

---

## 👥 Roles & Access

| Role | Capabilities |
| :--- | :--- |
| **Admin** | Full system control: Manage branches, staff, global inventory, view financial reports, and broadcast announcements. |
| **Manager** | Branch control: Manage staff activity, local inventory, handle stock transfer requests, and manage personal profile. |
| **Staff** | Operational: Access POS terminal, view local stock, check sales history, and manage personal profile. |

---

### 6. 🏛️ Comprehensive FAQ & Support
- **Integrated Knowledge Base**: Admins and Managers have access to an expanded FAQ section directly in the dashboard.
- **Role-Specific Guidance**: Tailored help for approving staff, managing transfers, and understanding financial reports.

---

## 📱 Universal Experience
- **Fully Responsive**: Works perfectly on Desktop, Tablets, and Mobile phones (Enhanced layout for stats and grids).
- **Internal Scrolling Tables**: Ensures that even large data tables are easy to read on small screens.
- **Premium UI**: Uses a clean, modern design with smooth animations, hero stat cards, and glassmorphism effect.
- **Dynamic Stats**: Real-time business health monitoring via animated dashboard widgets and charts.

---

## 🛠️ Tech Stack
- **Frontend**: React 18, Vite, Vanilla CSS (Modern UI tokens, responsive layouts) — Deployed on **Vercel**
- **Backend**: Python 3.11, Flask 3.1, Gunicorn, Flask-SQLAlchemy, Alembic migrations — Deployed on **Render** (pinned via `.python-version`)
- **Database**: PostgreSQL (Neon Serverless Cloud & Local PostgreSQL supported)
- **Authentication**: JWT-based stateless secure authentication (Flask-JWT-Extended)
- **Reporting & POS**: Pandas for analytical processing, OpenPyXL for Excel reporting

---

## 🗄️ Database Setup (Local PostgreSQL)

The system is configured to run with a **Local PostgreSQL** instance.

### Prerequisites
- [PostgreSQL](https://www.postgresql.org/download/) (v14+) installed and running.

### Setup Instructions

1. **Create the Database**:
   ```sql
   CREATE DATABASE retail_inventory_db;
   ```

2. **Configure Environment Variables**:
   Navigate to `/backend` and update your `.env` file:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://postgres:<YOUR_PASSWORD>@localhost:5432/retail_inventory_db

   # JWT Secret Key
   JWT_SECRET_KEY=yoursecretkeyhere
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Sync Database Models**:
   Whenever new features are pulled, ensure the database tables are synchronized:
   ```bash
   python create_tables.py
   ```

5. **Run Server**:
   ```bash
   py -3.12 run.py
   ```

---

---

## 📖 API Documentation

### Authentication
- `POST /api/auth/login`: Authenticate user and get JWT
- `POST /api/auth/register`: Register new user (Pending approval)
- `GET /api/auth/profile`: Get logged-in user details

### Inventory & Products
- `GET /api/products`: List all products (with pagination/filters)
- `GET /api/inventory/branch/<branch_id>`: Check stock in a specific branch
- `POST /api/inventory/adjust`: Manually adjust stock levels

### Sales & POS
- `POST /api/sales`: Create a new POS transaction
- `GET /api/sales/daily-summary`: View revenue summary for today

### Communication & Announcements
- `GET /api/announcements/feed`: Role-based announcement feed for staff/managers
- `GET /api/announcements/`: List all announcements (Admin)
- `POST /api/announcements/`: Broadcast new announcement (Admin)
- `POST /api/contact/`: Submit public inquiry
- `GET /api/contact/`: List all contact messages (Admin)

---

## 🗺️ Database Schema (ER Summary)

The system uses a normalized PostgreSQL schema with 10 tables:
1.  **Users**: Staff, Managers, and Admins with role-based permissions.
2.  **Branches**: Retail locations.
3.  **Categories**: Product grouping with parent-child support.
4.  **Products**: Global product catalog with pricing and barcodes.
5.  **Inventory**: Junction table for product quantities per branch.
6.  **Sales Transactions**: Header info for every customer sale.
7.  **Transaction Items**: Itemized details for each sale.
8.  **Stock Transfers**: Workflow for inter-branch stock movement.
9.  **Inventory Adjustments**: Audit logs for manual stock changes.
10. **Suppliers**: Manufacturer and vendor contact management.
11. **Announcements**: Broadcast records with role-based targeting.
12. **ContactMessages**: Customer inquiries from the public website.

---

## 🚀 Quick Setup (Local Development)

### Backend
1. Ensure Python 3.11+ is installed (pinned via `.python-version` as 3.11.9).
2. Navigate to `/backend`
3. Install dependencies: `pip install -r requirements.txt`
4. Configure `.env` with your `DATABASE_URL` and `JWT_SECRET_KEY`
5. Run migrations: `flask db upgrade`
6. Run the server: `python run.py` (or `gunicorn "app:create_app()"`)

### Frontend
1. Navigate to `/react`
2. Install dependencies: `npm install`
3. Launch the local dev server: `npm run dev`

### Automated Testing
The system includes automated API tests:
```bash
cd backend
python -m pytest tests/test_api.py
```

---

## ☁️ Production Deployment Guide

### 1. Database (Neon Serverless PostgreSQL)
* Create a free PostgreSQL project at [neon.tech](https://neon.tech).
* Copy the pooled connection string (`postgresql://...`).

### 2. Backend (Render Web Service)
* Connect this repository to [render.com](https://render.com).
* **Root Directory**: `backend`
* **Runtime**: `Python 3`
* **Build Command**: `pip install -r requirements.txt`
* **Start Command**: `gunicorn "app:create_app()"`
* **Environment Variables**:
  * `PYTHON_VERSION`: `3.11.9`
  * `DATABASE_URL`: Your Neon connection string
  * `FRONTEND_URL`: `https://multibranch-retail-and-inventory-ma.vercel.app`
  * `SECRET_KEY`: *(secure random string)*
  * `JWT_SECRET_KEY`: *(secure random string)*

### 3. Frontend (Vercel)
* Import the repository in [vercel.com](https://vercel.com).
* **Root Directory**: `react`
* **Framework Preset**: Vite
* **Environment Variables**:
  * `VITE_API_URL`: `https://multibranch-retail-and-inventory.onrender.com`

---

## 🧹 Maintenance
For a detailed guide on project organization and how to keep the repository clean (including ignoring `.pytest_cache` and logs), please refer to the [Project Structure Guide](PROJECT_STRUCTURE.md).

