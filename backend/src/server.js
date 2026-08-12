import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { initDatabase } from './config/db.js';

import { login } from './controllers/authController.js';

import {
    authenticateToken,
    authorizeRoles
} from './middleware/auth.js';

import {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    addFollowUp
} from './controllers/customerController.js';

import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    addStockMovement
} from './controllers/productController.js';

import {
    getChallans,
    getChallanById,
    createChallan,
    updateChallanStatus
} from './controllers/challanController.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

// =========================
// Global Middleware
// =========================

app.use(cors());

app.use(express.json());

app.use((req, res, next) => {
    console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.path}`
    );

    next();
});

// =========================
// Public Routes
// =========================

app.post('/api/auth/login', login);

// =========================
// Authentication Middleware
// Everything below this
// requires JWT
// =========================

app.use('/api', authenticateToken);

// =========================
// Customer Routes
// =========================

app.get(
    '/api/customers',
    getCustomers
);

app.get(
    '/api/customers/:id',
    getCustomerById
);

app.post(
    '/api/customers',
    authorizeRoles('Admin', 'Sales'),
    createCustomer
);

app.put(
    '/api/customers/:id',
    authorizeRoles('Admin', 'Sales'),
    updateCustomer
);

app.post(
    '/api/customers/:id/followups',
    authorizeRoles('Admin', 'Sales'),
    addFollowUp
);

// =========================
// Product Routes
// =========================

app.get(
    '/api/products',
    getProducts
);

app.get(
    '/api/products/:id',
    getProductById
);

app.post(
    '/api/products',
    authorizeRoles('Admin', 'Warehouse'),
    createProduct
);

app.put(
    '/api/products/:id',
    authorizeRoles('Admin', 'Warehouse'),
    updateProduct
);

app.post(
    '/api/products/:id/stock-movement',
    authorizeRoles('Admin', 'Warehouse'),
    addStockMovement
);

// =========================
// Sales Challan Routes
// =========================

app.get(
    '/api/challans',
    getChallans
);

app.get(
    '/api/challans/:id',
    getChallanById
);

app.post(
    '/api/challans',
    authorizeRoles('Admin', 'Sales'),
    createChallan
);

app.patch(
    '/api/challans/:id/status',
    authorizeRoles('Admin', 'Sales', 'Accounts'),
    updateChallanStatus
);

// =========================
// Global Error Handler
// =========================

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);

    res.status(err.status || 500).json({
        error: err.message || 'An unexpected error occurred on the server'
    });
});

// =========================
// Start Server
// =========================

async function startServer() {
    try {
        await initDatabase();

        app.listen(PORT, () => {
            console.log(
                `ERP/CRM Server is running on port ${PORT}`
            );
        });
    } catch (error) {
        console.error(
            'Failed to initialize database or start server:',
            error
        );

        process.exit(1);
    }
}

startServer();