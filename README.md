# Webix Udirdlaga Backend

A Node.js backend API for managing organizations in a webtoon rental system. This system allows organizations to register, manage their subdomains, and handle user authentication.

## Features

- **Organization Management**: Register and manage organizations with subdomain support
- **User Authentication**: JWT-based authentication with role-based access control
- **Subdomain Management**: Each organization gets a unique subdomain
- **MongoDB Integration**: Using Mongoose for database operations
- **Input Validation**: Comprehensive validation using express-validator
- **Security**: Helmet, CORS, rate limiting, and password hashing
- **Error Handling**: Centralized error handling with proper HTTP status codes

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **helmet** - Security headers
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting

## Installation

1. Clone the repository

```bash
git clone <repository-url>
cd webix-udirdlaga-back
```

2. Install dependencies

```bash
npm install
```

3. Create environment file

```bash
cp .env.example .env
```

4. Configure environment variables in `.env`

```env
MONGODB_URI=mongodb://localhost:27017/webix-udirdlaga
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

5. Start the server

```bash
# Development
npm run dev

# Production
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/logout` - Logout user

### Organizations

- `POST /api/organizations` - Register new organization
- `GET /api/organizations` - Get all organizations (Admin only)
- `GET /api/organizations/:id` - Get organization by ID
- `GET /api/organizations/subdomain/:subdomain` - Get organization by subdomain
- `GET /api/organizations/check-subdomain/:subdomain` - Check subdomain availability
- `PUT /api/organizations/:id` - Update organization
- `DELETE /api/organizations/:id` - Delete organization
- `POST /api/organizations/:id/verify` - Verify organization (Admin only)

### Health Check

- `GET /api/health` - API health status

## Database Schema

### Organization Schema

- Basic information (name, displayName, description)
- Contact information (email, phone, website)
- Registration details (registrationNumber, taxId)
- Address with geolocation support
- Subdomain and custom domain configuration
- Business type and industry classification
- Subscription and billing information
- Settings for webtoon management, rental settings, user management
- API keys and admin users
- Status and verification information

### User Schema

- Personal information (firstName, lastName, email, phone)
- Profile details (avatar, bio, dateOfBirth, gender)
- Organization association and role-based permissions
- Account status and verification
- Login security (attempts, lockout)
- User preferences and settings
- Rental history and statistics

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Role-Based Access Control

- **Owner**: Full access to organization
- **Admin**: Manage users and content
- **Moderator**: Moderate content and users
- **User**: Basic access to organization features

## Subdomain Management

Each organization gets a unique subdomain that can be used to access their specific instance:

- Format: `https://{subdomain}.webix.com`
- Custom domains are also supported
- Subdomain availability is checked during registration

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message",
      "value": "invalidValue"
    }
  ]
}
```

## Rate Limiting

- 100 requests per 15 minutes per IP address
- Configurable via environment variables

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting
- CORS protection
- Security headers with Helmet
- Input validation and sanitization
- Account lockout after failed login attempts

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (not implemented yet)

### Environment Variables

- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 3000)
- `JWT_SECRET` - JWT secret key
- `JWT_EXPIRE` - JWT expiration time
- `CORS_ORIGIN` - Allowed CORS origin
- `NODE_ENV` - Environment (development/production)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
