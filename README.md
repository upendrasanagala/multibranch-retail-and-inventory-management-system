# 🛒 Multi-Branch Retail & Inventory Management System

A premium, comprehensive solution for managing retail operations across multiple branch locations. Built with a focus on ease-of-use, real-time data sync, and intelligent inventory optimization.

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

### 5. 🚚 Multi-Branch Transfers
Streamlined workflow for moving stock between locations.
- **Request & Approval**: Managers can request stock from other branches.
- **Tracking**: Monitor the status of every transfer in real-time.

---

## 👥 Roles & Access

| Role | Capabilities |
| :--- | :--- |
| **Admin** | Full system control: Manage branches, staff, global inventory, and view detailed financial reports. |
| **Manager** | Branch control: Manage staff activity, local inventory, and handle stock transfer requests. |
| **Staff** | Operational: Access the POS terminal, view local stock, and check personal sales history. |

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
- **Frontend**: React.js with Vanilla CSS (Modern UI tokens)
- **Backend**: Python Flask with SQLAlchemy
- **Database**: PostgreSQL (Local)
- **Auth**: JWT-based secure authentication

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

4. **Run Server**:
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

---

## 🚀 Quick Setup

### Backend
1. Navigate to `/backend`
2. Install dependencies: `pip install -r requirements.txt`
3. Ensure `.env` is configured correctly (see Database Setup above)
4. Run the server: `py -3.12 run.py`

### Automated Testing
The system includes a suite of automated tests to ensure API stability and data integrity.
1. Navigate to `/backend`
2. Run tests: `python -m pytest tests/test_api.py`

### Frontend
1. Navigate to `/react`
2. Install dependencies: `npm install`
3. Launch the app: `npm run dev`

