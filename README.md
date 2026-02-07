# 🌾 ANNAM - Food Donation & Distribution Platform

**ANNAM** is a comprehensive food donation and distribution platform that connects farmers, NGOs, and delivery drivers to reduce food waste and combat hunger. The platform enables seamless coordination of surplus food donations, from listing to delivery tracking.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [User Roles](#user-roles)
- [Contributing](#contributing)

## 🎯 Overview

ANNAM bridges the gap between food surplus and food scarcity by creating an efficient ecosystem where:
- **Farmers** donate surplus produce instead of letting it go to waste
- **NGOs** claim and distribute food to communities in need
- **Drivers** facilitate pickup and delivery with real-time tracking

## ✨ Features

### Core Functionality
- **Multi-Role Authentication** - Secure signup/login for Farmers, NGOs, and Drivers
- **Real-time Marketplace** - Browse and claim available food donations
- **Smart Listing Management** - Create, edit, and track food donation listings
- **Delivery Tracking** - Real-time GPS tracking and status updates
- **Impact Dashboard** - Analytics and metrics showing community impact
- **Notification System** - SMS/Email notifications via Twilio integration

### Role-Specific Features

#### 👨‍🌾 Farmer Features
- Create food donation listings with details (type, quantity, expiry)
- Upload images and manage pickup locations
- Track listing status from available to delivered
- View analytics and donation history
- Profile and settings management

#### 🏢 NGO Features
- Browse available food donations in marketplace
- Claim donations for their beneficiaries
- Assign drivers to pickups
- Track claimed donations and delivery status
- View impact metrics and donation history

#### 🚚 Driver Features
- View available pickup assignments
- Accept and manage deliveries
- Real-time route mapping and navigation
- Update delivery status (picked up, in transit, delivered)
- Track earnings and delivery history

### Additional Features
- **Analytics Dashboard** - Comprehensive statistics and trends
- **History Tracking** - Complete audit trail of all transactions
- **Settings Management** - Customizable user profiles
- **Responsive Design** - Mobile-first, works on all devices
- **Secure Authentication** - JWT-based auth with password reset

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **React Router v7** - Client-side routing
- **Lucide React** - Beautiful icon components
- **CSS3** - Custom styling

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - NoSQL database
- **Pydantic** - Data validation
- **Passlib** - Password hashing (bcrypt)
- **Twilio** - SMS/Email notifications
- **Python-dotenv** - Environment configuration
- **Uvicorn** - ASGI server

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **Vite** - Development server with HMR

## 📁 Project Structure

> **Note:** The backend contains both a modular structure (`backend/app/`) and legacy files (`backend/*.py`). The modular structure in `backend/app/` is recommended for active development.

```
AnnamRepo/
├── backend/                        # FastAPI backend
│   ├── app/                        # Modular backend structure
│   │   ├── core/                   # Core configurations
│   │   │   ├── __init__.py
│   │   │   ├── config.py           # Environment config
│   │   │   └── database.py         # MongoDB connection
│   │   ├── models/                 # Pydantic models
│   │   │   ├── __init__.py
│   │   │   ├── user_model.py
│   │   │   ├── listing_model.py
│   │   │   ├── marketplace_model.py
│   │   │   └── settings_model.py
│   │   ├── routes/                 # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── auth_routes.py
│   │   │   ├── listing_routes.py
│   │   │   ├── marketplace_routes.py
│   │   │   ├── notification_routes.py
│   │   │   └── settings_routes.py
│   │   ├── services/               # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── listing_service.py
│   │   │   ├── notification_service.py
│   │   │   └── settings_service.py
│   │   ├── utils/                  # Utilities
│   │   │   ├── __init__.py
│   │   │   └── security.py
│   │   └── main.py                 # FastAPI app entry
│   ├── auth.py                     # Legacy auth module
│   ├── config.py                   # Legacy config
│   ├── database.py                 # Legacy database
│   ├── main.py                     # Legacy main entry
│   ├── models.py                   # Legacy models
│   ├── requirements.txt            # Python dependencies
│   ├── .env                        # Environment variables
│   └── annam.db                    # SQLite database (if used)
│
├── src/                            # React frontend (all components)
│   ├── Landing.tsx / .css          # Landing page
│   ├── AuthPage.tsx / .css         # Authentication
│   ├── HomePage.tsx / .css         # Dashboard
│   ├── Marketplace.tsx / .css      # Browse donations marketplace
│   ├── Listing.tsx / .css          # Create listing form
│   ├── Mylisting.tsx / .css        # View my listings
│   ├── EditListing.tsx / .css      # Edit listing form
│   ├── FarmerListingForm.tsx / .css # Farmer-specific listing
│   ├── AvailablePickups.tsx / .css # Driver pickup view
│   ├── Mydeliveries.tsx / .css     # Driver deliveries
│   ├── ClaimedDonations.tsx / .css # NGO claimed items
│   ├── OrderTracking.tsx           # Real-time tracking
│   ├── RouteMap.tsx / .css         # GPS route mapping
│   ├── ImpactDashboard.tsx / .css  # Impact metrics
│   ├── Analytics.tsx / .css        # Analytics dashboard
│   ├── Impact.tsx / .css           # Impact leaderboard
│   ├── History.tsx / .css          # Transaction history
│   ├── Earnings.tsx / .css         # Driver earnings
│   ├── Settings.tsx / .css         # General settings
│   ├── FarmerSettings.tsx / .css   # Farmer profile
│   ├── NgoSettings.tsx / .css      # NGO profile
│   ├── DriverSettings.tsx / .css   # Driver profile
│   ├── ForgotPassword.tsx          # Password recovery
│   ├── VerifyOTP.tsx               # OTP verification
│   ├── ResetPassword.tsx           # Password reset
│   ├── Checkout.tsx / .css         # Marketplace checkout
│   ├── App.tsx / .css              # Main app component
│   ├── main.tsx                    # React entry point
│   ├── index.css                   # Global styles
│   ├── Tracking.css                # Tracking styles
│   ├── assets/                     # Static assets
│   │   └── react.svg
│   ├── config/
│   │   └── api.ts                  # API configuration
│   └── types/
│       └── marketplace.ts          # TypeScript types
│
├── public/                         # Public assets
│   ├── Background.png
│   ├── Homebackground.png
│   ├── sgnp.png
│   └── vite.svg
│
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.9 or higher)
- **MongoDB** (local or Atlas)
- **Twilio Account** (for notifications)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   Create a `.env` file in the `backend` directory:
   ```env
   MONGO_URI=mongodb://localhost:27017
   DB_NAME=annam
   JWT_SECRET=your_secret_key_here
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   ```

5. **Run the backend server:**
   ```bash
   # Option 1: Using the modular app structure (recommended)
   uvicorn app.main:app --reload
   
   # Option 2: Using the root main.py
   uvicorn main:app --reload
   ```
   Backend will run on `http://localhost:8000`

### Frontend Setup

1. **Navigate to project root:**
   ```bash
   cd ..
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API endpoint:**
   Update `src/config/api.ts` with your backend URL:
   ```typescript
   export const API_BASE_URL = 'http://localhost:8000';
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Frontend will run on `http://localhost:5173`

### Building for Production

```bash
# Build frontend
npm run build

# Preview production build
npm run preview
```

## ⚙️ Configuration

### Frontend Configuration

- **vite.config.ts** - Vite build configuration
- **tsconfig.json** - TypeScript compiler options
- **eslint.config.js** - ESLint rules

### Backend Configuration

- **backend/.env** - Environment variables (git-ignored)
- **backend/.env.example** - Environment variables template
- **backend/app/core/config.py** - Modular environment config
- **backend/app/core/database.py** - Modular MongoDB connection
- **backend/config.py** - Legacy config (if used)
- **backend/database.py** - Legacy database (if used)

## 📚 API Documentation

Once the backend is running, visit:
- **Interactive API Docs:** `http://localhost:8000/docs`
- **Alternative Docs:** `http://localhost:8000/redoc`

### Main API Endpoints

#### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - User login
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/verify-otp` - Verify OTP
- `POST /auth/reset-password` - Reset password

#### Listings
- `GET /listings` - Get all listings
- `POST /listings` - Create new listing
- `GET /listings/{id}` - Get listing by ID
- `PUT /listings/{id}` - Update listing
- `DELETE /listings/{id}` - Delete listing
- `POST /listings/{id}/claim` - Claim a listing
- `POST /listings/{id}/assign-driver` - Assign driver

#### Marketplace
- `GET /marketplace` - Browse available donations
- `GET /marketplace/categories` - Get food categories

#### Settings
- `GET /settings/{user_id}` - Get user settings
- `PUT /settings/{user_id}` - Update user settings

#### Notifications
- `POST /notifications/send` - Send notification

## 👥 User Roles

### Farmer
- Primary food donors who list surplus produce
- Can manage their active and historical listings
- View impact metrics of their contributions

### NGO
- Organizations that claim food for distribution
- Manage beneficiary networks
- Coordinate with drivers for pickup

### Driver
- Facilitate food transportation
- Real-time delivery tracking
- Earnings and delivery history

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 📧 Contact

For questions or support, please reach out to the development team.

---

**Built with ❤️ to reduce food waste and fight hunger**
