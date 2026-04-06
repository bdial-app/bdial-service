# Admin Authentication API Routes

## Base URL
`http://localhost:3000/admin-auth`

## Endpoints

### 1. Send OTP to Admin
**POST** `/admin-auth/send-otp`

**Request Body:**
```json
{
  "mobileNumber": "9876543210"
}
```

**Success Response (200):**
```json
{
  "message": "OTP sent successfully to admin mobile number",
  "otp": "123456" // Only in development mode
}
```

**Error Responses:**
- `404 Not Found`: User not found with this mobile number
- `400 Bad Request`: User does not have admin privileges
- `400 Bad Request`: Admin account is not active

---

### 2. Verify Admin OTP
**POST** `/admin-auth/verify-otp`

**Request Body:**
```json
{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "mobileNumber": "9876543210",
    "name": "Admin User",
    "role": "admin"
  }
}
```

**Error Responses:**
- `400 Bad Request`: OTP not found or expired
- `400 Bad Request`: OTP expired
- `400 Bad Request`: Invalid OTP
- `400 Bad Request`: Admin access revoked or account inactive

## Key Differences from User Auth

1. **Role Validation**: Only users with `role: 'admin'` can use these endpoints
2. **Account Status**: Admin account must be `active`
3. **JWT Token**: Includes role information in the token payload
4. **Separate OTP Store**: Uses different OTP storage than regular users
5. **Enhanced Security**: Additional validation for admin privileges

## Testing

To test these APIs:

1. Create an admin user in the database:
```sql
INSERT INTO users (id, mobile_number, name, gender, role, status, created_at, updated_at)
VALUES ('admin-test-id', '9876543210', 'Test Admin', 'other', 'admin', 'active', NOW(), NOW());
```

2. Use the above endpoints to test admin authentication

3. The JWT token can be used to access protected admin endpoints
