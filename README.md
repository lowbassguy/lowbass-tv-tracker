# TV Tracker

A personal TV show tracking application to manage your watchlist and track episode progress.

## Features

- Search for TV shows using the TVMaze API
- Add shows to your personal watchlist
- Track episode watch status with detailed progress
- Visual indicators for shows already in watchlist
- Remove shows from watchlist
- Persistent data storage with SQLite

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd simple-backend
npm install
```

### Running the Application

1. Start the backend server:

```bash
cd simple-backend
npm start
```

2. Start the frontend development server:

```bash
npm run dev
```

3. Open your browser to `http://localhost:5173`

## Security Configuration

For production deployments, you can secure the application with HTTP Basic Authentication by setting environment variables:

```bash
# Set these environment variables before starting the backend
export AUTH_USERNAME=your-username
export AUTH_PASSWORD=your-secure-password

# Then start the backend
cd simple-backend
npm start
```

Or create a `.env` file in the `simple-backend` directory:

```
AUTH_USERNAME=your-username
AUTH_PASSWORD=your-secure-password
```

When authentication is enabled, users will be prompted to enter credentials when accessing the application.

**Note:** If no authentication environment variables are set, the application will run without security (suitable for local development only).

## Production Deployment

1. Set the authentication environment variables on your hosting platform
2. Ensure the backend server is accessible to the frontend
3. Update CORS settings in `simple-backend/server.js` to include your production domain
4. Consider using HTTPS for secure credential transmission

## Database

The application uses SQLite for data persistence. The database file (`tv-tracker.db`) is created automatically in the `simple-backend` directory when you first run the application.

## API Endpoints

- `GET /api/watchlist` - Get all shows in watchlist
- `POST /api/watchlist` - Add a show to watchlist
- `PUT /api/watchlist/:id` - Update a show in watchlist
- `DELETE /api/watchlist/:id` - Remove a show from watchlist