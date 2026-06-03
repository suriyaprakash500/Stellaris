# Stellaris RMPOSS - System User Guide

Welcome to the **Stellaris Restaurant Management & Point of Sale System (RMPOSS)**. This system is a full-stack platform designed specifically for foodpreneurs, managers, kitchen staff, delivery riders, and customers. It streamlines order management, real-time inventory adjustments, recipe links, scheduling, timesheets, and customer loyalty rewards.

---

## 🔑 1. User Authentication & Login Flow

Stellaris uses role-based access control (RBAC). Upon signing up, users can select a specific role:
*   **System Admin / Manager**: Full dashboard access to sales metrics, menu customization, inventory control, recipe associations, and employee scheduling.
*   **Kitchen Staff**: Screen displaying incoming orders to prepare and dispatch.
*   **Delivery Rider**: Dispatch portal showing orders ready for pickup, customer address locations, and delivery history logs.
*   **Customer**: Online ordering client, customization preferences, loyalty rewards tracking, and feedback.

### 🔒 Forgot / Reset Password Flow
If a user forgets their password:
1.  Click the **Forgot Password?** link on the login screen.
2.  Enter the registered email address. The system generates a secure **15-minute reset code** (which is logged to the server console).
3.  Enter the reset code along with the new password to update and secure the account.

---

## 🍽️ 2. Customer Portal (`Order Food`)

Accessible by all registered customers, this interface allows ordering and loyalty tracking:

*   **Menu Categories Filter**: Browse items by categories (e.g., Starters, Entrees, Desserts, Drinks).
*   **Customization Modal**: Click on any menu item to open a popup where you can specify quantities and write custom instructions (e.g., *"no onions"*, *"extra spicy"*).
*   **Loyalty Points Balance**: Displays your current **Loyalty Balance** in the header. For every **$10 spent** on completed orders, you receive **1 point** (earned points = `Math.floor(total_amount / 10)`).
*   **Shopping Cart & Payments**:
    *   Add items and view order subtotals in real-time.
    *   Simulate secure payments via **UPI**, **Credit/Debit Card**, **PayPal**, or **Digital Wallets**.
*   **Real-time Order Status**: Track your active orders from `PENDING` ➔ `PREPARING` ➔ `READY` ➔ `DELIVERED`.
*   **Feedback & Reviews**: Rate completed deliveries (1–5 Stars) and submit textual reviews.

---

## 🍳 3. Kitchen Queue Screen

Specifically designed for chefs and kitchen personnel to coordinate order preparation:

*   **Live Order Columns**:
    *   **New Orders** (Status: `PENDING`): Incoming orders fresh from the checkout counter.
    *   **Preparing** (Status: `PREPARING`): Dishes currently being cooked.
    *   **Ready for Pickup/Delivery** (Status: `READY`): Plated dishes awaiting rider collection.
*   **State Transitions**:
    *   Click **Start Cooking** on a new order to change its status to `PREPARING`.
    *   Click **Mark Ready** when cooking completes to move the order to the `READY` column.

---

## 🚴 4. Delivery Rider Portal

Empowers delivery riders to fulfill orders quickly:

*   **Dispatch View**: Lists all orders marked as `READY` by the kitchen. Displays customer names, contact emails, and delivery addresses.
*   **Simulated Dispatch Map**: Visual layout aiding route tracking.
*   **Completion Action**: Click **Mark as Delivered** once the order reaches the customer to change the status to `DELIVERED` and credit loyalty points.
*   **Rider Logs**: Scroll down to view the historic list of orders fulfilled by the logged-in rider.

---

## 📊 5. Operations Dashboard (Manager & Admin Only)

A central console to oversee business analytics, menu listings, recipe configurations, inventory levels, and staffing:

### A. Sales Analytics & Reports
*   **Revenue Metrics**: Tracks total revenue generated, total orders processed, and breakdown charts by menu categories.
*   **Customer Feedback Feed**: Real-time display of ratings, comments, and specific order references sent by customers.

### B. Menu Setup
*   Full CRUD interface (Create, Read, Update, Delete) for menu items.
*   Configure item names, prices, categories, detailed descriptions, and image URLs.
*   Toggle availability status (e.g., mark as "Out of stock" to temporarily hide from the customer portal).

### C. Inventory & Vendors
*   **Stock Tracking**: Real-time listing of ingredients, current quantities, units (e.g., units, kg, liters), and alert levels.
*   **Low Stock Warnings**: A visual warning banner alerts managers if any ingredient stock falls below its minimum limit.
*   **Stock Adjustments Form**: Quickly register restocking events or log wastage events with custom reasons.
*   **Vendor Directory**: Manage suppliers, their contacts, and view which ingredients are sourced from them.

### D. Recipe Planner (Recipe-Based Stock Adjustments)
*   Associate specific ingredients and quantities with a menu item (e.g., linking 1 "Beef Patty" and 1 "Burger Bun" to a "Classic Burger").
*   **Automated Deductions**: When a customer purchases a menu item, the system automatically checks the recipe links and decrements the corresponding raw material stock levels!

### E. Staff & Shift Scheduling
*   **Timesheets Tracker**: View live clock-in and clock-out logs for all active kitchen and delivery employees.
*   **Shift Scheduling Calendar**: Form to assign work shifts to employees for specific dates and timeframes.
*   **Swap Requests Panel**: View and approve/reject shift swap requests submitted by employees.
*   **Performance Metrics**: View ratings and employee feedback scores compiled automatically from customer reviews.

---

## ⏱️ 6. Employee Tools (Shift & Timesheet management)

Staff members (Kitchen and Delivery) have additional components integrated into their sidebar:
*   **Clock In / Clock Out**: Buttons to easily check in and check out of shifts. This logs hours in the manager's timesheet dashboard.
*   **Scheduled Shifts Dialog**: Opens a popup calendar showing all assigned shifts and statuses.
*   **Request Swap**: Submit a request for managers to swap an assigned shift when unavailable.
