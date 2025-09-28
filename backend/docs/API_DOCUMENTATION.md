# RentXpress API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:8085/api`  
**Protocol:** HTTPS (Production) / HTTP (Development)  
**Content-Type:** `application/json`

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [File Uploads](#file-uploads)
6. [API Endpoints](#api-endpoints)
   - [Authentication Endpoints](#authentication-endpoints)
   - [User Management](#user-management)
   - [Payment Processing](#payment-processing)
   - [Vehicle Management](#vehicle-management)
   - [Booking System](#booking-system)
   - [Trip Management](#trip-management)
7. [SDK & Examples](#sdk--examples)
8. [Changelog](#changelog)

---

## Overview

The RentXpress API is a RESTful service that provides comprehensive vehicle rental management capabilities. It supports multiple user roles (Customer, Vehicle Owner, Driver, Vehicle Inspector, Admin) with role-based access control and secure authentication.

### Key Features
- JWT-based authentication with refresh tokens
- Role-based authorization
- File upload support
- Real-time notifications
- Payment processing integration
- Comprehensive booking management
- Trip tracking and management

### API Principles
- RESTful design with predictable URLs
- JSON request/response format
- HTTP status codes for response indication
- Comprehensive error messages
- Pagination for list endpoints
- Input validation and sanitization

---

## Authentication

The API uses JSON Web Tokens (JWT) for authentication with automatic token refresh capabilities.

### Token Types
- **Access Token**: Short-lived (7 days), used for API requests
- **Refresh Token**: Long-lived (30 days), used to obtain new access tokens

### Authentication Methods

#### 1. HTTP-Only Cookies (Recommended)
Tokens are automatically managed via secure HTTP-only cookies.

#### 2. Authorization Header
```http
Authorization: Bearer <access_token>
```

### Token Management
- Tokens are automatically refreshed when expired
- Secure cookie settings in production
- Automatic logout on token expiration

---

## Rate Limiting

To ensure fair usage and system stability, the API implements rate limiting:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| General API | 100 requests | 15 minutes |
| File Upload | 10 requests | 15 minutes |

### Rate Limit Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```

---

## Error Handling

### Standard Error Response Format
```json
{
  "success": false,
  "message": "Human-readable error description",
  "errors": ["Detailed validation error 1", "Detailed validation error 2"],
  "code": "ERROR_CODE",
  "timestamp": "2025-01-27T12:00:00.000Z",
  "path": "/api/auth/register"
}
```

### HTTP Status Codes

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation errors, malformed requests |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Semantic validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side errors |

---

## File Uploads

### Supported File Types

| Field | Types | Max Size | Usage |
|-------|-------|----------|-------|
| `profilePicture` | JPG, PNG, GIF | 5MB | User profile photos |
| `drivingLicensePhoto` | JPG, PNG | 5MB | Driver license verification |
| `certificationDocument` | JPG, PNG, PDF | 5MB | Professional certifications |
| `vehicleImages` | JPG, PNG | 5MB each | Vehicle photos |

### Upload Locations
- Profile pictures: `/uploads/profiles/`
- License photos: `/uploads/licenses/`
- Certifications: `/uploads/certifications/`
- Vehicle images: `/uploads/vehicles/`

### Security Features
- File type validation
- Size limitations
- Virus scanning (production)
- Secure filename generation

---

## API Endpoints

## Authentication Endpoints

### Register User
Register a new user account with role-specific validation.

**Endpoint:** `POST /auth/register`  
**Authentication:** None required  
**Content-Type:** `application/json`

#### Customer Registration

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.customer@rentxpress.com",
  "phoneNumber": "+94771234567",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "customer",
  "address": {
    "street": "123 Main Street, Colombo 07",
    "city": "Colombo",
    "postalCode": "00700"
  },
  "nicNumber": "199012345678",
  "dateOfBirth": "1990-01-15",
  "gender": "male",
  "profilePicture": "https://example.com/profile-pictures/john-doe.jpg",
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "spouse",
    "phoneNumber": "+94771234568"
  }
}
```

#### Vehicle Owner Registration

**Request Body:**
```json
{
  "firstName": "Sarah",
  "lastName": "Wilson",
  "email": "sarah.owner@rentxpress.com",
  "phoneNumber": "+94772345678", 
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "vehicle_owner",
  "address": {
    "street": "456 Oak Avenue",
    "city": "Kandy",
    "postalCode": "20000"
  },
  "nicNumber": "198712345678",
  "vehicleModel": "Toyota Prius 2020",
  "profilePicture": "https://example.com/profile-pictures/sarah-wilson.jpg",
  "businessRegistration": {
    "registrationNumber": "BR-2024-001234",
    "businessName": "Wilson Car Rentals"
  }
}
```

#### Driver Registration

**Request Body:**
```json
{
  "firstName": "Michael",
  "lastName": "Johnson",
  "email": "michael.driver@rentxpress.com",
  "phoneNumber": "+94773456789",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "driver",
  "address": {
    "street": "789 Pine Road, Galle",
    "city": "Galle",
    "postalCode": "80000"
  },
  "nicNumber": "198512345678",
  "dateOfBirth": "1985-03-20",
  "gender": "male",
  "maritalStatus": "married",
  "drivingLicenseNumber": "B1234567890",
  "licenseExpiryDate": "2027-12-31",
  "drivingExperience": 10,
  "vehicleCategories": ["car", "van", "motorcycle"],
  "languages": ["Sinhala", "English", "Tamil"],
  "previousEmployment": "Professional taxi driver for 5 years",
  "profilePicture": "https://example.com/profile-pictures/michael-johnson.jpg",
  "drivingLicensePhoto": "https://example.com/license-photos/license-123456.jpg",
  "emergencyContact": {
    "name": "Lisa Johnson",
    "relationship": "wife",
    "phoneNumber": "+94773456788"
  }
}
```

#### Vehicle Inspector Registration

**Request Body:**
```json
{
  "firstName": "David",
  "lastName": "Thompson",
  "email": "david.inspector@rentxpress.com",
  "phoneNumber": "+94774567890",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "role": "vehicle_inspector",
  "address": {
    "street": "321 Cedar Lane",
    "city": "Negombo",
    "postalCode": "11500"
  },
  "nicNumber": "198312345678",
  "workExperience": 8,
  "qualifications": "Certified Automotive Inspector with specialization in safety systems and mechanical diagnostics. Licensed by Motor Traffic Department.",
  "certificationNumber": "VI-2024-001234",
  "specializations": ["safety_inspection", "mechanical_diagnostics", "emission_testing"],
  "profilePicture": "https://example.com/profile-pictures/david-thompson.jpg",
  "certificationDocument": "https://example.com/certifications/cert-123456.pdf"
}
```

---

### User Login
Authenticate existing users and obtain access tokens.

**Endpoint:** `POST /auth/login`  
**Authentication:** None required

**Request Body:**
```json
{
  "email": "john.customer@rentxpress.com",
  "password": "SecurePass123!",
  "rememberMe": true,
  "deviceInfo": {
    "platform": "web",
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.1"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "65f1a2b3c4d5e6f789012345",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.customer@rentxpress.com",
      "role": "customer",
      "profilePicture": "/uploads/profiles/profile-1234567890.jpg",
      "isEmailVerified": true,
      "lastLogin": "2025-01-27T12:00:00.000Z",
      "permissions": ["create_booking", "view_vehicles", "make_payment"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  },
  "meta": {
    "loginCount": 15,
    "lastLoginLocation": "Colombo, Sri Lanka",
    "accountStatus": "active"
  }
}
```

---

### Get User Profile
Retrieve the authenticated user's profile information.

**Endpoint:** `GET /auth/profile`  
**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "65f1a2b3c4d5e6f789012345",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john.customer@rentxpress.com",
      "phoneNumber": "+94771234567",
      "role": "customer",
      "profilePicture": "/uploads/profiles/profile-1234567890.jpg",
      "address": {
        "street": "123 Main Street, Colombo 07",
        "city": "Colombo",
        "postalCode": "00700"
      },
      "dateOfBirth": "1990-01-15",
      "gender": "male",
      "nicNumber": "199012345678",
      "isEmailVerified": true,
      "isActive": true,
      "profileCompletion": 95,
      "accountStatistics": {
        "totalBookings": 12,
        "completedTrips": 10,
        "totalSpent": 125000.00,
        "memberSince": "2024-06-15T00:00:00.000Z"
      },
      "preferences": {
        "notifications": {
          "email": true,
          "sms": false,
          "push": true
        },
        "language": "en",
        "currency": "LKR"
      },
      "createdAt": "2024-06-15T10:30:00.000Z",
      "lastUpdated": "2025-01-27T11:45:00.000Z"
    }
  },
  "meta": {
    "profileCompletionTasks": [
      "Add emergency contact",
      "Verify phone number"
    ]
  }
}
```

---

### Update User Profile
Update the authenticated user's profile information.

**Endpoint:** `PUT /auth/profile`  
**Authentication:** Required  
**Content-Type:** `application/json`

**Request Body:**
```json
{
  "firstName": "John Updated",
  "phoneNumber": "+94771234568",
  "address": {
    "street": "124 Main Street, Colombo 07",
    "city": "Colombo",
    "postalCode": "00700"
  },
  "profilePicture": "https://example.com/profile-pictures/john-updated.jpg",
  "preferences": {
    "notifications": {
      "email": true,
      "sms": true,
      "push": true
    },
    "language": "en"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "_id": "65f1a2b3c4d5e6f789012345",
      "firstName": "John Updated",
      "lastName": "Doe",
      "phoneNumber": "+94771234568",
      "profilePicture": "/uploads/profiles/profile-1640995200.jpg",
      "profileCompletion": 98,
      "lastUpdated": "2025-01-27T13:00:00.000Z"
    }
  },
  "meta": {
    "updatedFields": ["firstName", "phoneNumber", "profilePicture"],
    "nextRecommendedAction": "verify_phone_number"
  }
}
```

---

## Payment Processing

### Create Payment
Process a payment for a booking.

**Endpoint:** `POST /payments`  
**Authentication:** Required

**Request Body:**
```json
{
  "bookingId": "65f1a2b3c4d5e6f789012346",
  "amount": 15750.00,
  "currency": "LKR",
  "paymentMethod": "credit_card",
  "paymentDetails": {
    "cardNumber": "4111111111111111",
    "expiryMonth": "12",
    "expiryYear": "2026",
    "cvv": "123",
    "cardHolderName": "John Doe"
  },
  "billingAddress": {
    "street": "123 Main Street",
    "city": "Colombo 07",
    "postalCode": "00700",
    "country": "Sri Lanka"
  },
  "paymentDescription": "Vehicle rental payment for Toyota Prius - 4 days",
  "metadata": {
    "bookingReference": "RX-2025-001234",
    "customerNote": "Payment for weekend trip to Kandy"
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "payment": {
      "_id": "65f1a2b3c4d5e6f789012347",
      "paymentId": "PAY-2025-001234",
      "bookingId": "65f1a2b3c4d5e6f789012346",
      "userId": "65f1a2b3c4d5e6f789012345",
      "amount": 15750.00,
      "currency": "LKR",
      "paymentMethod": "credit_card",
      "status": "completed",
      "transactionId": "txn_1234567890abcdef",
      "processingFee": 315.00,
      "netAmount": 15435.00,
      "paymentGateway": "stripe",
      "receipt": {
        "receiptNumber": "RCP-2025-001234",
        "receiptUrl": "/receipts/receipt-1234567890.pdf",
        "downloadUrl": "https://api.rentxpress.com/receipts/download/RCP-2025-001234"
      },
      "cardDetails": {
        "last4": "1111",
        "brand": "visa",
        "fingerprint": "Xt5EWLLDS7FJjR1c"
      },
      "processedAt": "2025-01-27T14:30:00.000Z",
      "createdAt": "2025-01-27T14:30:00.000Z"
    }
  },
  "meta": {
    "estimatedSettlement": "2025-01-29T00:00:00.000Z",
    "refundDeadline": "2025-02-26T23:59:59.000Z"
  }
}
```

---

### Get Payment History
Retrieve payment history for the authenticated user.

**Endpoint:** `GET /payments`  
**Authentication:** Required

**Query Parameters:**
```
?page=1&limit=10&status=completed&startDate=2025-01-01&endDate=2025-01-31&sortBy=createdAt&sortOrder=desc
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "_id": "65f1a2b3c4d5e6f789012347",
        "paymentId": "PAY-2025-001234",
        "amount": 15750.00,
        "currency": "LKR",
        "status": "completed",
        "paymentMethod": "credit_card",
        "booking": {
          "bookingId": "65f1a2b3c4d5e6f789012346",
          "bookingReference": "RX-2025-001234",
          "vehicle": {
            "make": "Toyota",
            "model": "Prius",
            "year": 2020,
            "licensePlate": "CAR-1234"
          }
        },
        "receiptUrl": "/receipts/receipt-1234567890.pdf",
        "processedAt": "2025-01-27T14:30:00.000Z"
      }
    ],
    "summary": {
      "totalPayments": 8,
      "totalAmount": 89250.00,
      "averagePayment": 11156.25,
      "paymentMethods": {
        "credit_card": 6,
        "bank_transfer": 2
      }
    }
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 8,
    "itemsPerPage": 10,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```

---

## Vehicle Management

### Get Available Vehicles
Retrieve a list of available vehicles with filtering options.

**Endpoint:** `GET /vehicles`  
**Authentication:** None required

**Query Parameters:**
```
?city=Colombo&category=sedan&priceMin=2000&priceMax=5000&startDate=2025-02-01&endDate=2025-02-05&transmission=automatic&fuelType=hybrid&seats=5&features=GPS,AC&sortBy=price&sortOrder=asc&page=1&limit=12
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "_id": "65f1a2b3c4d5e6f789012348",
        "ownerId": "65f1a2b3c4d5e6f789012349",
        "make": "Toyota",
        "model": "Prius",
        "year": 2020,
        "category": "sedan",
        "transmission": "automatic",
        "fuelType": "hybrid",
        "engineCapacity": "1800cc",
        "seats": 5,
        "doors": 4,
        "licensePlate": "CAR-1234",
        "pricePerDay": 3500.00,
        "pricePerWeek": 21000.00,
        "pricePerMonth": 80000.00,
        "availability": {
          "isAvailable": true,
          "availableFrom": "2025-01-28T00:00:00.000Z",
          "nextUnavailableDate": "2025-03-15T00:00:00.000Z"
        },
        "location": {
          "city": "Colombo",
          "area": "Bambalapitiya",
          "address": "123 Galle Road, Bambalapitiya",
          "coordinates": {
            "latitude": 6.8649,
            "longitude": 79.8560
          },
          "pickupRadius": 5
        },
        "features": [
          "GPS Navigation",
          "Air Conditioning",
          "Bluetooth",
          "Backup Camera",
          "USB Charging Ports",
          "Keyless Entry"
        ],
        "specifications": {
          "fuelEfficiency": "20km/L",
          "bootCapacity": "502L",
          "groundClearance": "133mm",
          "turningRadius": "5.2m"
        },
        "images": [
          {
            "url": "/uploads/vehicles/vehicle-1234567890-1.jpg",
            "type": "exterior",
            "caption": "Front view"
          },
          {
            "url": "/uploads/vehicles/vehicle-1234567890-2.jpg",
            "type": "interior",
            "caption": "Dashboard and seats"
          }
        ],
        "rating": {
          "average": 4.7,
          "totalReviews": 23,
          "breakdown": {
            "5star": 15,
            "4star": 6,
            "3star": 2,
            "2star": 0,
            "1star": 0
          }
        },
        "owner": {
          "firstName": "Sarah",
          "lastName": "Wilson",
          "rating": 4.8,
          "totalVehicles": 3,
          "responseTime": "< 1 hour",
          "joinedDate": "2024-03-15T00:00:00.000Z"
        },
        "insurance": {
          "provider": "Sri Lanka Insurance",
          "coverage": "comprehensive",
          "validUntil": "2025-12-31T00:00:00.000Z"
        },
        "lastServiceDate": "2024-12-15T00:00:00.000Z",
        "mileage": 45230,
        "instantBooking": true,
        "cancellationPolicy": "flexible",
        "createdAt": "2024-08-15T10:00:00.000Z",
        "updatedAt": "2025-01-20T14:30:00.000Z"
      }
    ],
    "filters": {
      "appliedFilters": {
        "city": "Colombo",
        "category": "sedan",
        "priceRange": [2000, 5000]
      },
      "availableFilters": {
        "cities": ["Colombo", "Kandy", "Galle", "Negombo"],
        "categories": ["sedan", "suv", "hatchback", "van"],
        "makes": ["Toyota", "Honda", "Nissan", "Suzuki"],
        "priceRange": {
          "min": 1500,
          "max": 8000
        }
      }
    }
  },
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 32,
    "itemsPerPage": 12,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "meta": {
    "searchRadius": "Colombo and surrounding areas",
    "currency": "LKR",
    "pricesInclude": "Insurance and basic maintenance"
  }
}
```

---

## Booking System

### Create Booking
Create a new vehicle booking.

**Endpoint:** `POST /Bookings`  
**Authentication:** Required

**Request Body:**
```json
{
  "vehicleId": "65f1a2b3c4d5e6f789012348",
  "startDate": "2025-02-01T09:00:00.000Z",
  "endDate": "2025-02-05T18:00:00.000Z",
  "pickupLocation": {
    "type": "owner_location",
    "address": "123 Galle Road, Bambalapitiya, Colombo",
    "coordinates": {
      "latitude": 6.8649,
      "longitude": 79.8560
    },
    "contactPerson": "Sarah Wilson",
    "contactPhone": "+94772345678"
  },
  "dropoffLocation": {
    "type": "custom",
    "address": "456 Beach Road, Galle",
    "coordinates": {
      "latitude": 6.0535,
      "longitude": 80.2210
    },
    "specialInstructions": "Drop off at hotel main entrance"
  },
  "bookingType": "self_drive",
  "driverId": null,
  "passengers": 3,
  "totalAmount": 15750.00,
  "breakdown": {
    "basePrice": 14000.00,
    "insurance": 560.00,
    "serviceFee": 700.00,
    "taxes": 490.00,
    "discounts": 0.00
  },
  "paymentMethod": "credit_card",
  "specialRequests": [
    "GPS navigation system",
    "Child car seat",
    "Full fuel tank on pickup"
  ],
  "customerNotes": "First time renting, please provide brief orientation",
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "spouse",
    "phoneNumber": "+94771234568"
  },
  "bookingPreferences": {
    "instantConfirmation": true,
    "flexibleTiming": false,
    "cancellationProtection": true
  }
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "booking": {
      "_id": "65f1a2b3c4d5e6f78901234a",
      "bookingNumber": "RX-2025-001234",
      "userId": "65f1a2b3c4d5e6f789012345",
      "vehicleId": "65f1a2b3c4d5e6f789012348",
      "status": "pending_confirmation",
      "bookingType": "self_drive",
      "startDate": "2025-02-01T09:00:00.000Z",
      "endDate": "2025-02-05T18:00:00.000Z",
      "duration": {
        "days": 4,
        "hours": 105
      },
      "totalAmount": 15750.00,
      "paymentStatus": "pending",
      "confirmationDeadline": "2025-01-28T12:00:00.000Z",
      "vehicle": {
        "make": "Toyota",
        "model": "Prius",
        "year": 2020,
        "licensePlate": "CAR-1234",
        "image": "/uploads/vehicles/vehicle-1234567890-1.jpg"
      },
      "owner": {
        "firstName": "Sarah",
        "lastName": "Wilson",
        "phoneNumber": "+94772345678",
        "responseTime": "< 1 hour"
      },
      "timeline": {
        "created": "2025-01-27T15:00:00.000Z",
        "estimatedConfirmation": "2025-01-27T16:00:00.000Z",
        "paymentDue": "2025-01-28T15:00:00.000Z"
      },
      "cancellationPolicy": {
        "type": "flexible",
        "freeUntil": "2025-01-30T09:00:00.000Z",
        "refundPercentage": 100
      }
    }
  },
  "meta": {
    "nextSteps": [
      "await_owner_confirmation",
      "make_payment",
      "receive_pickup_instructions"
    ],
    "estimatedConfirmationTime": "1 hour",
    "paymentDueIn": "24 hours"
  }
}
```

---

## Trip Management

### Get Available Trips (Driver)
Retrieve available trips for drivers.

**Endpoint:** `GET /Trip/available`  
**Authentication:** Required (Driver role)

**Query Parameters:**
```
?location=Colombo&radius=25&vehicleTypes=sedan,suv&minEarnings=2000&maxDistance=150&startDate=2025-02-01&sortBy=earnings&sortOrder=desc
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "trips": [
      {
        "_id": "65f1a2b3c4d5e6f78901234b",
        "bookingId": "65f1a2b3c4d5e6f78901234a",
        "tripNumber": "TR-2025-001234",
        "status": "available",
        "vehicleType": "sedan",
        "startLocation": {
          "address": "123 Galle Road, Bambalapitiya, Colombo",
          "coordinates": {
            "latitude": 6.8649,
            "longitude": 79.8560
          },
          "landmark": "Near Bambalapitiya Railway Station"
        },
        "endLocation": {
          "address": "456 Beach Road, Galle",
          "coordinates": {
            "latitude": 6.0535,
            "longitude": 80.2210
          },
          "landmark": "Galle Fort Area"
        },
        "scheduledStartTime": "2025-02-01T09:00:00.000Z",
        "estimatedEndTime": "2025-02-01T12:30:00.000Z",
        "estimatedDuration": "3 hours 30 minutes",
        "estimatedDistance": 125.5,
        "route": {
          "primary": "Southern Expressway",
          "alternative": "Coastal Road (A2)",
          "tolls": "Rs. 485",
          "traffic": "light"
        },
        "earnings": {
          "baseAmount": 4200.00,
          "distanceBonus": 315.00,
          "timeBonus": 0.00,
          "totalEarnings": 4515.00
        },
        "vehicle": {
          "make": "Toyota",
          "model": "Prius",
          "year": 2020,
          "licensePlate": "CAR-1234",
          "fuelType": "hybrid",
          "transmission": "automatic"
        },
        "customer": {
          "firstName": "John",
          "lastName": "Doe",
          "rating": 4.6,
          "totalTrips": 12,
          "phoneNumber": "+94771234567"
        },
        "requirements": {
          "driverExperience": "3+ years",
          "languagePreference": ["English", "Sinhala"],
          "specialSkills": ["highway_driving"]
        },
        "tripType": "one_way",
        "priority": "normal",
        "acceptanceDeadline": "2025-01-31T18:00:00.000Z",
        "specialInstructions": "Customer prefers smooth driving due to motion sickness",
        "createdAt": "2025-01-27T15:30:00.000Z"
      }
    ],
    "driverLocation": {
      "currentCity": "Colombo",
      "coordinates": {
        "latitude": 6.9271,
        "longitude": 79.8612
      },
      "lastUpdated": "2025-01-27T15:45:00.000Z"
    },
    "summary": {
      "totalAvailableTrips": 8,
      "totalPotentialEarnings": 28500.00,
      "averageDistance": 95.5,
      "preferredRoutes": ["Colombo-Kandy", "Colombo-Galle"]
    }
  },
  "meta": {
    "searchRadius": "25km from current location",
    "updateFrequency": "Real-time",
    "nextRefresh": "2025-01-27T16:00:00.000Z"
  }
}
```

---

## SDK & Examples

### JavaScript/Node.js SDK

```javascript
class RentXpressAPI {
  constructor(baseURL = 'http://localhost:8085/api', apiKey = null) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.token = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  }

  async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (response.data.token) {
      this.token = response.data.token;
    }
    
    return response;
  }

  async login(email, password, rememberMe = false) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe })
    });
    
    this.token = response.data.token;
    return response;
  }

  async getVehicles(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    return this.request(`/vehicles?${queryString}`);
  }

  async createBooking(bookingData) {
    return this.request('/Bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  }

  async makePayment(paymentData) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData)
    });
  }
}

// Usage Example
const api = new RentXpressAPI();

// Register a customer
try {
  const result = await api.register({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'SecurePass123!',
    role: 'customer',
    // ... other fields
  });
  console.log('Registration successful:', result);
} catch (error) {
  console.error('Registration failed:', error.message);
}

// Search vehicles
const vehicles = await api.getVehicles({
  city: 'Colombo',
  category: 'sedan',
  startDate: '2025-02-01',
  endDate: '2025-02-05'
});

// Create booking
const booking = await api.createBooking({
  vehicleId: vehicles.data.vehicles[0]._id,
  startDate: '2025-02-01T09:00:00.000Z',
  endDate: '2025-02-05T18:00:00.000Z',
  totalAmount: 15750.00
});
```

### cURL Examples

```bash
# Register Customer
curl -X POST http://localhost:8085/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "role": "customer",
    "address": {
      "street": "123 Main St",
      "city": "Colombo"
    },
    "nicNumber": "199012345678",
    "phoneNumber": "+94771234567"
  }' \
  -c cookies.txt

# Login
curl -X POST http://localhost:8085/api/auth/login \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -c cookies.txt \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Get available vehicles
curl -X GET "http://localhost:8085/api/vehicles?city=Colombo&category=sedan&priceMax=5000" \
  -H "Accept: application/json"

# Create booking
curl -X POST http://localhost:8085/api/Bookings \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "vehicleId": "65f1a2b3c4d5e6f789012348",
    "startDate": "2025-02-01T09:00:00.000Z",
    "endDate": "2025-02-05T18:00:00.000Z",
    "totalAmount": 15750.00,
    "bookingType": "self_drive"
  }'

# Make payment
curl -X POST http://localhost:8085/api/payments \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "bookingId": "65f1a2b3c4d5e6f78901234a",
    "amount": 15750.00,
    "currency": "LKR",
    "paymentMethod": "credit_card",
    "paymentDetails": {
      "cardNumber": "4111111111111111",
      "expiryMonth": "12",
      "expiryYear": "2026",
      "cvv": "123",
      "cardHolderName": "John Doe"
    }
  }'
```

### Python Example

```python
import requests
import json

class RentXpressClient:
    def __init__(self, base_url='http://localhost:8085/api'):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None
    
    def login(self, email, password):
        response = self.session.post(
            f'{self.base_url}/auth/login',
            json={'email': email, 'password': password}
        )
        data = response.json()
        if response.status_code == 200:
            self.token = data['data']['token']
            self.session.headers.update({
                'Authorization': f'Bearer {self.token}'
            })
        return data
    
    def get_vehicles(self, **filters):
        response = self.session.get(
            f'{self.base_url}/vehicles',
            params=filters
        )
        return response.json()
    
    def create_booking(self, booking_data):
        response = self.session.post(
            f'{self.base_url}/Bookings',
            json=booking_data
        )
        return response.json()

# Usage
client = RentXpressClient()
client.login('john@example.com', 'SecurePass123!')

vehicles = client.get_vehicles(city='Colombo', category='sedan')
print(f"Found {len(vehicles['data']['vehicles'])} vehicles")

booking = client.create_booking({
    'vehicleId': vehicles['data']['vehicles'][0]['_id'],
    'startDate': '2025-02-01T09:00:00.000Z',
    'endDate': '2025-02-05T18:00:00.000Z',
    'totalAmount': 15750.00
})
```

---

## Changelog

### Version 1.0.0 (2025-01-27)
- Initial API release
- Authentication system with JWT
- User registration for all roles
- Vehicle management
- Booking system
- Payment processing
- Trip management for drivers
- File upload capabilities
- Rate limiting implementation
- Comprehensive error handling

### Upcoming Features (v1.1.0)
- Real-time notifications via WebSocket
- Advanced search with AI recommendations
- Multi-language support
- Mobile app SDK
- Webhook notifications
- Advanced analytics dashboard
- Integration with third-party services

---

## Support & Contact

**API Documentation:** [https://docs.rentxpress.com](https://docs.rentxpress.com)  
**Developer Support:** [dev-support@rentxpress.com](mailto:dev-support@rentxpress.com)  
**Status Page:** [https://status.rentxpress.com](https://status.rentxpress.com)  
**GitHub Repository:** [https://github.com/rentxpress/api](https://github.com/rentxpress/api)

---

*© 2025 RentXpress. All rights reserved.*
    'totalAmount': 15750.00
})
```

---

## Changelog

### Version 1.0.0 (2025-01-27)
- Initial API release
- Authentication system with JWT
- User registration for all roles
- Vehicle management
- Booking system
- Payment processing
- Trip management for drivers
- File upload capabilities
- Rate limiting implementation
- Comprehensive error handling

### Upcoming Features (v1.1.0)
- Real-time notifications via WebSocket
- Advanced search with AI recommendations
- Multi-language support
- Mobile app SDK
- Webhook notifications
- Advanced analytics dashboard
- Integration with third-party services

---

## Support & Contact

**API Documentation:** [https://docs.rentxpress.com](https://docs.rentxpress.com)  
**Developer Support:** [dev-support@rentxpress.com](mailto:dev-support@rentxpress.com)  
**Status Page:** [https://status.rentxpress.com](https://status.rentxpress.com)  
**GitHub Repository:** [https://github.com/rentxpress/api](https://github.com/rentxpress/api)

---

*© 2025 RentXpress. All rights reserved.*
