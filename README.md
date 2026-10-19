# FoodRescue — Food Donation Management System

FoodRescue is a database management system mini-project developed to help reduce food wastage by connecting food donors with NGOs.

The application enables donors to register surplus food, NGOs to request available food, and administrators to manage organizations, allocations, and deliveries.

## Technology Stack

- **Database:** Oracle Database 21c XE
- **Backend:** Node.js, Express.js, OracleDB
- **Frontend:** React, Vite, CSS
- **Authentication:** JWT-based role authentication
- **Version Control:** Git and GitHub

## User Roles

### Donor

- Register and log in to a donor account
- Add surplus food batches with quantities and expiry times
- View available food batches and donation statistics
- View matching NGO requests
- Accept NGO food requests
- Track allocations and deliveries
- View organization and account details

### NGO

- Register and log in to an NGO account
- Browse available, unexpired food
- Submit food requests
- View request statuses and allocation progress
- Track assigned deliveries
- View organization and account details

### Administrator

- Review and manage organization registrations
- Approve or reject organizations
- Monitor donors, NGOs, and food requests
- Manage food allocations
- Assign and track deliveries
- Monitor the food redistribution process

## Database Design

FoodRescue uses Oracle relational tables with primary keys, foreign keys, check constraints, and unique constraints.

The project also demonstrates:

- Sequences for generating identifiers
- Stored procedures for database operations
- PL/SQL functions
- A PL/SQL package
- Triggers for enforcing business rules
- SQL joins and aggregate queries
- Transaction handling
- Referential integrity

### Database Scripts

The `database/` directory contains:

| File | Description |
|---|---|
| `01_tables.sql` | Database tables and constraints |
| `02_sequences.sql` | Sequences |
| `03_procedures.sql` | Stored procedures |
| `04_functions.sql` | Functions |
| `05_package.sql` | Package specification and body |
| `06_triggers.sql` | Triggers |

The exported scripts contain references to the `FOODRESCUE` Oracle schema. Database installation requires the corresponding schema and compatible Oracle configuration.

**Note:** A complete fresh-schema installation using these scripts has not yet been verified.

## Core Workflow

1. A donor registers surplus food with quantity and expiry information.
2. An approved NGO browses available food and creates a request.
3. A donor reviews matching requests and accepts a quantity.
4. An administrator allocates accepted food to the NGO.
5. An administrator arranges delivery.
6. Delivery progress is tracked until completion.

## Expiry Handling

FoodRescue checks food expiry dates and times using Oracle database time.

Expired batches are excluded from the available food listing, and the backend rejects requests for food items without an eligible available batch.

Overdue NGO requests can automatically become `EXPIRED` when they have no donor acceptances or allocations. Requests with existing fulfillment activity are preserved.

## Running the Project

### Prerequisites

- Node.js and npm
- Oracle Database 21c XE
- A configured `FOODRESCUE` schema
- Database objects installed and compiled

### Frontend

From the project root:

```bash
npm install
npm run dev
```

Vite displays the local frontend URL in the terminal.

### Backend

From the `backend` directory:

```bash
npm install
node server.js
```

The backend is configured to run on:

`http://localhost:5000`

Configure the backend's required database connection settings and `JWT_SECRET` in its environment configuration before running it.

**Do not commit real database passwords, JWT secrets, or `.env` files to GitHub.**

### Production Frontend Build

From the project root:

```bash
npm run build
```

## Project Status

The Donor, NGO, and Admin dashboards are implemented, and the main donation, request, allocation, and delivery workflows have been tested with existing Oracle records.

The project has also passed frontend build checks, backend syntax checks, and Oracle object validity checks.

A fresh database installation and final deployment/security review remain separate verification tasks.

## Repository

[FoodRescue on GitHub](https://github.com/tanmayyy0810/FoodRescue)

## Academic Purpose

Developed as a DBMS mini-project to demonstrate the practical application of relational database design, Oracle SQL, PL/SQL, data integrity constraints, and integration with a web application.