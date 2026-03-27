# Secure File Share

A secure file sharing application with client-side encryption and secure file transfer.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running on localhost:27017)
- npm or yarn

## Installation & Setup

### 1. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory with:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/secure-file-share
ENCRYPTION_KEY=your-super-secret-encryption-key-change-this-in-production-32-chars
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

## Running the Application

### Option 1: Run Both Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### Option 2: Quick Start Commands

```bash
# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies  
cd frontend && npm install && cd ..

# Start backend (in one terminal)
cd backend && npm run dev

# Start frontend (in another terminal)
cd frontend && npm start
```

## Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Features

- **Secure Upload**: Files are encrypted before storage
- **Secure Download**: Files are decrypted on-the-fly
- **File Management**: List and delete uploaded files
- **Modern UI**: Responsive React interface

## API Endpoints

- `POST /api/files/upload` - Upload and encrypt a file
- `GET /api/files/download/:fileId` - Download and decrypt a file
- `GET /api/files/list` - List all uploaded files
- `DELETE /api/files/:fileId` - Delete a file

## Security Notes

- Files are encrypted using AES-256-CBC algorithm
- Encryption key should be changed in production
- Files are stored encrypted on the server
- Original files are deleted after encryption

## Troubleshooting

1. **MongoDB Connection Error**: Ensure MongoDB is running on localhost:27017
2. **Port Already in Use**: Change PORT in .env file (backend) or use different port for frontend
3. **CORS Issues**: Backend is configured to allow frontend on localhost:3000

# Secure-File-Sharing