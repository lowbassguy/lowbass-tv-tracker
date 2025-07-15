# 📺 lowbass' TV Tracker - Database Implementation Plan

## 🎯 **Overview**

This document outlines the complete implementation plan for migrating from localStorage to a proper database system with user authentication and cross-device synchronization.

## 🏗️ **Architecture Overview**

### **Tech Stack**
- **Frontend**: React + TypeScript + Tailwind CSS (existing)
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **API**: RESTful endpoints with comprehensive error handling
- **Deployment**: Railway/Vercel for backend, existing deployment for frontend

### **Database Schema**
The database consists of 5 main tables:
1. **Users** - User accounts with authentication
2. **UserPreferences** - User UI/app preferences
3. **Shows** - TV show metadata from TVmaze
4. **Episodes** - Episode data for each show
5. **UserShows** - User's watchlist (many-to-many relationship)
6. **UserEpisodes** - Individual episode watch tracking

## 🚀 **Setup Instructions**

### **1. Backend Setup**

```bash
# Create backend directory
mkdir backend && cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and JWT secret

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name initial

# Start development server
npm run dev
```

### **2. Database Setup**

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL locally
# Create database
createdb lowbass_tv_tracker

# Add to .env
DATABASE_URL="postgresql://username:password@localhost:5432/lowbass_tv_tracker"
```

**Option B: Railway (Recommended)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and create project
railway login
railway create lowbass-tv-tracker

# Add PostgreSQL service
railway add postgresql

# Get database URL
railway variables
```

### **3. Frontend Updates**

The frontend will need to be updated to use the new API endpoints instead of localStorage. Key changes:

1. **API Client Setup**
2. **Authentication Integration**
3. **Data Synchronization**
4. **Offline Support**

## 📡 **API Endpoints**

### **Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/password` - Change password
- `GET /api/auth/verify` - Verify token

### **Watchlist Management**
- `GET /api/watchlist` - Get user's watchlist
- `POST /api/watchlist` - Add show to watchlist
- `DELETE /api/watchlist/:showId` - Remove show
- `PUT /api/watchlist/:showId/watched` - Mark show as watched
- `PUT /api/watchlist/:showId/expanded-seasons` - Update UI state

### **Episode Tracking**
- `PUT /api/episodes/:episodeId/watched` - Mark episode watched
- `PUT /api/episodes/season/:showId/:seasonNumber/watched` - Mark season watched

### **Show Search**
- `GET /api/shows/search?q=query` - Search shows via TVmaze

### **User Preferences**
- `GET /api/user/preferences` - Get user preferences
- `PUT /api/user/preferences` - Update preferences
- `GET /api/user/stats` - Get user statistics

## 🔄 **Migration Strategy**

### **Phase 1: Backend Development** ✅
- [x] Database schema design
- [x] API endpoints implementation
- [x] Authentication system
- [x] TVmaze API integration
- [x] Daily update system

### **Phase 2: Frontend Integration** 🔄
- [ ] Create API client service
- [ ] Implement authentication UI
- [ ] Update data fetching logic
- [ ] Add loading states and error handling

### **Phase 3: Data Migration** 📅
- [ ] Create migration utility
- [ ] Export localStorage data
- [ ] Import data to database
- [ ] Verify data integrity

### **Phase 4: Deployment** 📅
- [ ] Deploy backend to Railway/Vercel
- [ ] Update frontend API endpoints
- [ ] Test cross-device synchronization
- [ ] Monitor performance

## 🔧 **Frontend Changes Required**

### **1. API Client Setup**
```typescript
// src/services/api.ts
class ApiClient {
  private baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }
}
```

### **2. Authentication Context**
```typescript
// src/contexts/AuthContext.tsx
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => {
    const response = await api.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    api.setToken(response.token);
    setUser(response.user);
    return response;
  };

  // ... other auth methods
};
```

### **3. Data Synchronization**
```typescript
// src/hooks/useWatchlist.ts
export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const response = await api.request('/watchlist');
      setWatchlist(response.watchlist);
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToWatchlist = async (show) => {
    await api.request('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ tvmazeId: show.tvmazeId }),
    });
    fetchWatchlist(); // Refresh list
  };

  // ... other watchlist operations
};
```

## 🔒 **Security Features**

- **JWT Authentication** with 7-day expiration
- **Password Hashing** using bcrypt with salt rounds
- **Rate Limiting** to prevent API abuse
- **Input Validation** using Joi schemas
- **CORS Protection** for cross-origin requests
- **Helmet** for security headers

## 📊 **Performance Optimizations**

- **Database Indexing** on frequently queried fields
- **API Rate Limiting** to prevent abuse
- **Batch Processing** for bulk operations
- **Connection Pooling** for database connections
- **Caching** for frequently accessed data
- **Compression** for API responses

## 🌍 **Deployment Guide**

### **Backend Deployment (Railway)**
```bash
# Connect to Railway
railway login
railway link

# Deploy
railway up

# Set environment variables
railway variables set DATABASE_URL=your-db-url
railway variables set JWT_SECRET=your-jwt-secret
railway variables set FRONTEND_URL=https://your-frontend.com
```

### **Frontend Environment Variables**
```env
REACT_APP_API_URL=https://your-backend.railway.app/api
```

## 🚀 **Next Steps**

1. **Start Backend Development** - Set up the backend infrastructure
2. **Create Authentication UI** - Login/register forms
3. **Implement API Integration** - Replace localStorage calls
4. **Test Migration** - Verify data transfer works correctly
5. **Deploy and Monitor** - Launch the new system

## 📋 **Benefits of This Implementation**

✅ **Cross-Device Synchronization** - Access your watchlist anywhere
✅ **Data Persistence** - Never lose your progress again
✅ **User Accounts** - Secure, personal data management
✅ **Automatic Updates** - Daily episode data refresh
✅ **Scalability** - Support for multiple users
✅ **Performance** - Optimized database queries
✅ **Security** - Industry-standard authentication
✅ **Maintenance** - Automated data cleanup and updates

## 🛠️ **Development Timeline**

- **Week 1-2**: Backend API development and testing
- **Week 3**: Frontend integration and authentication
- **Week 4**: Data migration and testing
- **Week 5**: Deployment and monitoring

This implementation will transform your TV tracker from a single-device app to a fully-featured, multi-user platform with robust data management and synchronization capabilities. 