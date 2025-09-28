/*
=============================================================================
RENTXPRESS API DOCUMENTATION
=============================================================================

BASE URL: http://localhost:5000/api

AUTHENTICATION ENDPOINTS:
=============================================================================

1. REGISTER USER
POST /auth/register
Content-Type: multipart/form-data (for file uploads) or application/json

Sample Requests:

A) CUSTOMER REGISTRATION:
{
  "firstName": "John",
  "lastName": "Doe", 
  "email": "john.customer@example.com",
  "phoneNumber": "+94771234567",
  "password": "password123",
  "confirmPassword": "password123",
  "role": "customer",
  "address": {
    "street": "123 Main Street",
    "city": "Colombo"
  },
  "nicNumber": "123456789V",
  "dateOfBirth": "1990-01-15",
  "gender": "male"
}

B) VEHICLE OWNER REGISTRATION:
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane.owner@example.com", 
  "phoneNumber": "+94772345678",
  "password": "password123",
  "confirmPassword": "password123",
  "role": "vehicle_owner",
  "address": {
    "street": "456 Oak Avenue",
    "city": "Kandy"
  },
  "nicNumber": "987654321V",
  "vehicleModel": "Toyota Prius 2020"
}

C) DRIVER REGISTRATION (with file upload):
FormData fields:
- firstName: "Mike"
- lastName: "Driver"
- email: "mike.driver@example.com"
- phoneNumber: "+94773456789" 
- password: "password123"
- confirmPassword: "password123"
- role: "driver"
- address[street]: "789 Pine Road"
- address[city]: "Galle"
- nicNumber: "456789123V"
- dateOfBirth: "1985-03-20"
- gender: "male"
- maritalStatus: "married"
- drivingLicenseNumber: "DL123456789"
- licenseExpiryDate: "2027-12-31"
- drivingExperience: "8"
- vehicleCategories: ["car", "van"]
- profilePicture: [File]
- drivingLicensePhoto: [File]

D) VEHICLE INSPECTOR REGISTRATION:
FormData fields:
- firstName: "Sarah"
- lastName: "Inspector"
- email: "sarah.inspector@example.com"
- phoneNumber: "+94774567890"
- password: "password123" 
- confirmPassword: "password123"
- role: "vehicle_inspector"
- address[street]: "321 Cedar Lane"
- address[city]: "Negombo"
- nicNumber: "789123456V"
- workExperience: "5"
- qualifications: "Certified Vehicle Inspector with expertise in automotive safety"
- profilePicture: [File]
- certificationDocument: [File]

2. LOGIN
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "john.customer@example.com",
  "password": "password123",
  "rememberMe": false
}

Response:
{
  "success": true,
  "message": "Login successful",
  "user": {
    "_id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.customer@example.com",
    "role": "customer"
  },
  "token": "jwt_token_here"
}

3. LOGOUT
POST /auth/logout
Authorization: Bearer token OR cookies

4. GET PROFILE
GET /auth/profile
Authorization: Bearer token OR cookies

5. UPDATE PROFILE
PUT /auth/profile  
Authorization: Bearer token OR cookies
Content-Type: multipart/form-data

6. CHANGE PASSWORD
POST /auth/change-password
Authorization: Bearer token OR cookies
Content-Type: application/json

Request:
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}

7. FORGOT PASSWORD
POST /auth/forgot-password
Content-Type: application/json

Request:
{
  "email": "user@example.com"
}

8. RESET PASSWORD
POST /auth/reset-password
Content-Type: application/json

Request:
{
  "token": "reset_token_from_email",
  "newPassword": "newpassword123"
}

9. VERIFY EMAIL
GET /auth/verify-email/:token

10. DELETE ACCOUNT
DELETE /auth/account
Authorization: Bearer token OR cookies
Content-Type: application/json

Request:
{
  "password": "currentpassword123"
}

ADMIN ENDPOINTS:
=============================================================================

11. GET ALL CUSTOMERS
GET /auth/customers
Authorization: Bearer token (admin only)

12. GET ALL DRIVERS  
GET /auth/drivers
Authorization: Bearer token (vehicle_owner or admin)

13. GET USER STATISTICS
GET /auth/stats
Authorization: Bearer token (admin only)

Response:
{
  "success": true,
  "stats": {
    "total": 150,
    "active": 145,
    "verified": 120,
    "byRole": [
      {
        "_id": "customer",
        "count": 80,
        "active": 78,
        "verified": 70
      },
      {
        "_id": "driver", 
        "count": 45,
        "active": 43,
        "verified": 40
      }
    ]
  }
}

ERROR RESPONSES:
=============================================================================
All endpoints return errors in this format:

{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error 1", "Detailed error 2"]
}

HTTP STATUS CODES:
- 200: Success
- 201: Created (registration)
- 400: Bad Request (validation errors)
- 401: Unauthorized (invalid/missing token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 429: Too Many Requests (rate limited)
- 500: Internal Server Error

FILE UPLOAD REQUIREMENTS:
=============================================================================
- profilePicture: Image files only, max 5MB
- drivingLicensePhoto: Image files only, max 5MB  
- certificationDocument: Image or PDF files, max 5MB
- Supported formats: JPG, JPEG, PNG, GIF, PDF
*/

const validateRegistrationData = (userData, role) => {
    const errors = [];

    // Common validation for all roles
    if (!userData.firstName || userData.firstName.trim().length < 2) {
        errors.push('First name must be at least 2 characters long');
    }

    if (!userData.lastName || userData.lastName.trim().length < 2) {
        errors.push('Last name must be at least 2 characters long');
    }

    if (!userData.email || !isValidEmail(userData.email)) {
        errors.push('Valid email is required');
    }

    if (!userData.phoneNumber || !isValidPhoneNumber(userData.phoneNumber)) {
        errors.push('Valid phone number is required');
    }

    if (!userData.password || userData.password.length < 6) {
        errors.push('Password must be at least 6 characters long');
    }

    if (!userData.nicNumber || userData.nicNumber.trim().length === 0) {
        errors.push('NIC number is required');
    }

    // Address validation based on role
    if (role === 'vehicle_owner') {
        if (!userData.address || typeof userData.address !== 'object') {
            errors.push('Address object with street and city is required for vehicle owners');
        } else {
            if (!userData.address.street || userData.address.street.trim().length === 0) {
                errors.push('Street address is required');
            }
            if (!userData.address.city || userData.address.city.trim().length === 0) {
                errors.push('City is required');
            }
        }

        if (!userData.vehicleModel || userData.vehicleModel.trim().length === 0) {
            errors.push('Vehicle model is required for vehicle owners');
        }
    } else {
        // For other roles, address can be a string
        if (!userData.address || (typeof userData.address === 'string' && userData.address.trim().length === 0)) {
            errors.push('Address is required');
        }
    }

    // Driver-specific validation
    if (role === 'driver') {
        if (!userData.drivingLicenseNumber || userData.drivingLicenseNumber.trim().length === 0) {
            errors.push('Driving license number is required for drivers');
        }

        if (!userData.licenseExpiryDate) {
            errors.push('License expiry date is required for drivers');
        } else {
            const expiryDate = new Date(userData.licenseExpiryDate);
            if (expiryDate <= new Date()) {
                errors.push('License expiry date must be in the future');
            }
        }

        if (!userData.vehicleCategories || !Array.isArray(userData.vehicleCategories) || userData.vehicleCategories.length === 0) {
            errors.push('At least one vehicle category is required for drivers');
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidPhoneNumber = (phone) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};

export { validateRegistrationData };