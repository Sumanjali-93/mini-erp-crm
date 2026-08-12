# Mini ERP + CRM Operations Portal

A complete, responsive, full-stack ERP and CRM portal designed for wholesale/distribution operations. It is built using **Node.js, Express, React, CSS, and MySQL** in pure JavaScript (ES Modules).

---

## Architecture Summary

This project follows a decoupled client-server architecture:
1. **Database (MySQL)**: Stores relational data for users, CRM customers, customer follow-up notes, products/inventory, stock movements logs, sales challans, and item snapshots.
2. **Backend Server (Node + Express)**:
   - Built using Node.js and Express.
   - Uses JWT (JSON Web Tokens) to provide secure role-based session authentication.
   - Implements transactional queries (via MySQL `FOR UPDATE` row locks) for processing confirmed sales challans, ensuring inventory levels never go negative even under high concurrent loads.
   - Implements product snapshots: copies item details into a JSON field when challans are generated so historic invoices remain static even if catalog prices or descriptions change.
3. **Frontend Client (React)**:
   - Renders a modern glassmorphic dashboard optimized for all viewports (responsive).
   - Tailors layouts dynamically by evaluating user role tokens.
   - Integrates `canvas-confetti` to celebrate confirmed transactions.
   - Leverages `jspdf` and `jspdf-autotable` to compile and export professional PDF invoices directly in the client.

---

## Initial Setup & Prerequisites

### 1. Database Configuration
Ensure a local MySQL instance is installed and running on your system.
1. Default connection parameters assume Host: `localhost` and Port: `3306`.
2. The server will **automatically create** the database (`mini_erp_crm`), compile all required tables, and seed them with default role-based accounts and starting items upon startup. You do not need to pre-create the database.

---

## Installation & Running Locally

### Step 1: Clone or locate the project root
Open your terminal and navigate to the project directory:
```bash
cd C:\Users\suman\.gemini\antigravity\scratch\mini-erp-crm
```

### Step 2: Set up Backend Environment variables
Create or verify the `.env` file located in `backend/.env`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=mini_erp_crm
JWT_SECRET=myawesomeerpkeythatshouldbechanged
```
*Modify the values to match your local MySQL username (`DB_USER`) and password (`DB_PASSWORD`).*

### Step 3: Run the Backend Server
Open a terminal in the `backend` directory and start the server:
```bash
cd backend
npm run dev
```
*The server will boot on port `5000`.*

### Step 4: Run the Frontend Client
Open a new terminal in the `frontend` directory and start the Vite dev server:
```bash
cd frontend
npm run dev
```
*The client will boot on port `3000` (automatically proxying `/api` requests to port `5000`)*

---

## Test Login Credentials

Use these accounts to evaluate role-based dashboards and access restrictions:

| Username | Password | Role | Primary Features Accessible |
| :--- | :--- | :--- | :--- |
| **admin** | `admin123` | **Admin** | Unrestricted access, full CRM + Inventory adjustment + Invoicing |
| **sales** | `sales123` | **Sales** | Add/edit CRM customers, write follow-up notes, generate sales challans |
| **warehouse** | `warehouse123` | **Warehouse** | View products, catalog new items, adjust stock levels (IN/OUT logs) |
| **accounts** | `accounts123` | **Accounts** | View sales invoices, change challan status, export invoice PDFs |

---

## REST API Documentation

All routes (except `/api/auth/login`) require the HTTP header `Authorization: Bearer <JWT_TOKEN>`.

### Authentication
- `POST /api/auth/login`
  - Body: `{ "username": "...", "password": "..." }`
  - Returns: `{ "token": "...", "user": { "id", "username", "role", "name" } }`

### Customers CRM
- `GET /api/customers?page=1&limit=10&search=&status=&type=` (Paginated search filter)
- `GET /api/customers/:id` (Returns customer detail + full followups history log)
- `POST /api/customers` (Add customer - Admin/Sales only)
  - Body: `{ "name", "mobile", "email", "business_name", "type", "address", "status", "follow_up_date", "notes" }`
- `PUT /api/customers/:id` (Edit customer info - Admin/Sales only)
- `POST /api/customers/:id/followups` (Log timeline note - Admin/Sales only)
  - Body: `{ "note": "Client requested bulk delivery." }`

### Inventory Catalog
- `GET /api/products?page=1&limit=10&search=&category=&lowStock=true` (Paginated search + stock alert warnings filter)
- `GET /api/products/:id` (Returns product details + full stock movement log history)
- `POST /api/products` (Catalog new item - Admin/Warehouse only)
  - Body: `{ "name", "sku", "category", "unit_price", "current_stock", "min_stock_alert", "location" }`
- `PUT /api/products/:id` (Edit specifications - Admin/Warehouse only)
- `POST /api/products/:id/stock-movement` (Adjust stock - Admin/Warehouse only)
  - Body: `{ "quantity": 10, "movement_type": "IN", "reason": "Restocked from supplier" }`
  - *Prevents stock levels from going negative if movement is OUT.*

### Sales Invoices / Challans
- `GET /api/challans?page=1&limit=10&search=&status=` (List invoices)
- `GET /api/challans/:id` (Returns invoice detail + line item snapshots)
- `POST /api/challans` (Draft/Confirm sales order - Admin/Sales only)
  - Body: `{ "customer_id", "products": [{ "product_id", "quantity" }], "status": "Draft" | "Confirmed" }`
  - *If `Confirmed`, checks stock levels and subtracts stock. Aborts if stock is low.*
- `PUT /api/challans/:id` (Update status - Admin/Sales/Accounts only)
  - Body: `{ "status": "Confirmed" | "Cancelled" }`
  - *Draft -> Confirmed: Deducts stock, writes OUT log.*
  - *Confirmed -> Cancelled: Restores stock, writes IN log.*
