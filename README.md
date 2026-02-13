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

## 📱 Universal Experience
- **Fully Responsive**: Works perfectly on Desktop, Tablets, and Mobile phones.
- **Internal Scrolling Tables**: Ensures that even large data tables are easy to read on small screens.
- **Premium UI**: Uses a clean, modern design with smooth animations and glassmorphism effects.

---

## 🛠️ Tech Stack
- **Frontend**: React.js with Vanilla CSS (Modern UI tokens)
- **Backend**: Python Flask with SQLAlchemy
- **Database**: SQL-based (Drizzle ORM compatibility)
- **Auth**: JWT-based secure authentication

---

## 🚀 Quick Setup

### Backend
1. Navigate to `/backend`
2. Install dependencies: `pip install -r requirements.txt`
3. Run the server: `python run.py`

### Frontend
1. Navigate to `/react`
2. Install dependencies: `npm install`
3. Launch the app: `npm run dev`
