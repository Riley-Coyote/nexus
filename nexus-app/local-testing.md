# Local Testing Guide - Nexus App

## 🚀 Quick Start

### Prerequisites
- **Node.js**: Version 18.0 or higher ([Download here](https://nodejs.org/))
- **npm**: Usually comes with Node.js
- **Git**: For cloning the repository
- **Modern browser**: Chrome, Firefox, Safari, or Edge

### 1. Clone & Setup
```bash
# Clone the repository (if not already done)
git clone <your-repo-url>
cd nexus/nexus-app

# Install dependencies
npm install

# Create environment file (optional)
cp .env.example .env.local
```

### 2. Start Development Server
```bash
# Start the development server
npm run dev
```

The app will automatically open at:
- **Primary**: http://localhost:3000
- **Fallback**: http://localhost:3001 (if 3000 is in use)

