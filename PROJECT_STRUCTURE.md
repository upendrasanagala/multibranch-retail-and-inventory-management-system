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
    - `stock_request.py`: Logic for branches requesting stock from the main warehouse.
- **`routes/`**: API endpoints.
    - `auth.py`: Login, registration, and password management.
    - `products.py`: CRUD operations for products.
    - `sales.py`: Processing sales and fetching history.
    - `admin.py`: Admin-specific dashboard stats and reports.
- **`utils/`**: Helper functions.
    - `decorators.py`: Custom decorators like `@admin_required` or `@manager_required` for permission checking.

### Utility Scripts
- **`run.py`**: The entry point to start the Flask server.
- **`requirements.txt`**: List of Python dependencies.

---

## ⚛️ Frontend (`/react`)
The frontend is built with **React** and **Vite**.

### Source Code (`/react/src`)
- **`main.jsx`**: The entry point that renders the React app into the HTML.
- **`App.jsx`**: The main component that handles routing (navigation) between pages.
- **`api.js`** (or similar in `/services`): Handles HTTP requests to the backend API.
- **`context/`**: React Context for global state management (e.g., `AuthContext` to store the logged-in user).
- **`components/`**: Reusable UI elements (Buttons, Navbar, Sidebar, Modals).
- **`pages/`**: Full application pages.
    - `Login.jsx`: User login screen.
    - `AdminDashboard.jsx`: Main view for Admins.
    - `ManagerDashboard.jsx`: Main view for Branch Managers.
    - `Billing.jsx`: The point-of-sale interface for staff.
    - `Inventory.jsx`: Stock management view.

### Configuration
- **`vite.config.js`**: Configuration for the Vite build tool.
- **`package.json`**: List of JavaScript dependencies and scripts (like `npm run dev`).
