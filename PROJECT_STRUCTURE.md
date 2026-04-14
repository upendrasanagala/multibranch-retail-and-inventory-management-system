# Project Structure and Guide

This document explains the organization of the Retail and Inventory Management System codebase.

## 📁 Root Directory
- **`backend/`**: Contains the Python/Flask API server and database logic.
- **`react/`**: Contains the React frontend application.
- **`README.md`**: General project overview and setup instructions.

---

## 🐍 Backend (`/backend`)
The backend is built with **Flask** and uses **SQLAlchemy** for database interactions.

### Core Application (`/backend/app`)
- **`__init__.py`**: Initialises the Flask app, database connection, and registers blueprints (routes).
- **`config.py`**: Configuration settings (Database URI, Secret Keys, etc.).
- **`extensions.py`**: Initializes Flask extensions like `db` (SQLAlchemy) and `migrate` (Flask-Migrate).
- **`models/`**: Defines the database schema (tables).
    - `user.py`: User accounts and roles (Admin, Manager, Staff).
    - `branch.py`: Branch details.
    - `product.py`: Product inventory, categories, and pricing.
    - `sales.py`: Sales transactions and items.
    - `stock_transfer.py`: Inter-branch stock movement workflow.
    - `announcement.py`: Internal broadcast messages for staff/managers.
    - `contact.py`: Public customer inquiries and support messages.
- **`routes/`**: API endpoints.
    - `auth.py`: Login, registration, and password management.
    - `products.py`: CRUD operations for products.
    - `sales.py`: Processing sales and fetching history.
    - `transfer.py`: Approving, rejecting, and tracking stock transfers.
    - `announcements.py`: Managing and fetching internal broadcasts.
    - `contact.py`: Managing public contact inquiries.
    - `admin.py`: Admin-specific dashboard stats and reports.
- **`utils/`**: Helper functions.
    - `decorators.py`: Custom decorators like `@admin_required` or `@manager_required` for permission checking.

### Utility Scripts
- **`run.py`**: The entry point to start the Flask server.
- **`requirements.txt`**: List of Python dependencies.
- **`scripts/validation/`**: Helpful scripts for manual database and engine validation.
    - `check_data.py`: Quick overview of record counts (Products, Sales, etc.).
    - `check_expiry.py`: Lists products nearing their expiration date.
    - `test_pricing.py`: Validates the AI pricing engine logic and recommendations.

---

## ⚛️ Frontend (`/react`)
The frontend is built with **React** and **Vite**.

### Source Code (`/react/src`)
- **`main.jsx`**: The entry point that renders the React app into the HTML.
- **`App.jsx`**: The main component that handles routing (navigation) between pages.
- **`api.js`** (or similar in `/services`): Handles HTTP requests to the backend API.
- **`context/`**: React Context for global state management (e.g., `AuthContext`, `ToastContext`, `ConfirmContext`).
- **`components/`**: Reusable UI elements (Buttons, Navbar, Sidebar, Modals, Badges).
- **`pages/`**: Full application pages.

---

## 🧪 Testing & Validation Guide

To ensure the system is running correctly, follow these testing procedures:

### 1. Automated API Tests (Pytest)
The most robust way to test the system is using the built-in test suite.
- **Location:** `backend/tests/`
- **How to run:**
  ```bash
  cd backend
  python -m pytest tests/test_api.py
  ```
- **What it covers:** Authentication, authorized access, profile retrieval, and branch listing.

### 2. Manual Data Validation Scripts
For quick sanity checks on your local data without running the full test suite.
- **Location:** `backend/scripts/validation/`
- **How to run:**
  ```bash
  cd backend
  # Check general data counts
  python scripts/validation/check_data.py
  
  # Check for expiring soon products
  python scripts/validation/check_expiry.py
  
  # Test the pricing recommendation engine
  python scripts/validation/test_pricing.py
  ```

### 3. Database Migrations
Always ensure your local database is in sync with the latest code changes.
- **Check Status:** `flask db current`
- **Apply Changes:** `flask db upgrade`

---

## 🧹 Maintenance & Cleanup
Before pushing changes to the repository, ensure no unnecessary data is included:
1. **Logs:** Rotated logs in `backend/logs/` are automatically ignored by `.gitignore` (*.log*).
2. **Environment:** `.env` files and `.venv` directories must never be committed.
3. **Temp Files:** Avoid committing PDF reports or one-off root level scripts.
