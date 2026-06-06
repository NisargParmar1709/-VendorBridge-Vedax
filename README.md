# VendorBridge

> A procurement and vendor management platform that streamlines RFQs, quotations, approvals, purchase orders, invoices, reporting, and vendor collaboration from a single dashboard.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Frontend](https://img.shields.io/badge/frontend-React%2018-61DAFB)
![Backend](https://img.shields.io/badge/backend-Flask-green)
![Database](https://img.shields.io/badge/database-SQLAlchemy-orange)

## About the Project

VendorBridge is a procurement workflow platform designed to help organizations manage vendors, procurement requests, quotations, approvals, purchase orders, invoices, and reporting from a centralized system.

## Key Features

- Vendor registration and management
- RFQ creation and publishing
- AI-assisted RFQ generation using Gemini
- Quotation comparison workflow
- Multi-stage approvals
- Purchase order lifecycle management
- Invoice and payment tracking
- PDF generation
- JWT authentication
- Role-based access control

## Tech Stack

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Query
- Zustand

### Backend
- Flask
- SQLAlchemy
- Flask-JWT-Extended
- Alembic

### Database
- PostgreSQL
- SQLite (development)

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
pip install -r requirements.txt
python run.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Backend:

```env
DATABASE_URL=postgresql://user:password@localhost/vendorbridge
JWT_SECRET_KEY=your-secret
GEMINI_API_KEY=your-gemini-key
```

Frontend:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

## API Modules

- Authentication
- Vendors
- RFQs
- Quotations
- Approvals
- Purchase Orders
- Invoices
- Reports

## Deployment

Recommended:

- React build served via Nginx/Vercel
- Flask via Gunicorn
- PostgreSQL database

## License

No explicit LICENSE file was found in the repository snapshot.

---
*README generated from full codebase analysis. All sections reflect the actual project structure and code found in the repository.*
