module.exports = {
  // --- API STATUS CODES ---
  API_RESPONSE_CODES: {
    // --- SUCCESS CODES (2xx) ---
    SUCCESS: 200, // OK
    CREATED: 201, // Created
    ACCEPTED: 202, // Accepted
    NO_CONTENT: 204, // No Content

    // --- CLIENT ERROR CODES (4xx) ---
    BAD_REQUEST: 400, // Bad Request
    UNAUTHORIZED: 401, // Unauthorized
    FORBIDDEN: 403, // Forbidden
    NOT_FOUND: 404, // Not Found
    METHOD_NOT_ALLOWED: 405, // Method Not Allowed
    CONFLICT: 409, // Conflict
    GONE: 410, // Gone
    UNPROCESSABLE_ENTITY: 422, // Unprocessable Entity
    TOO_MANY_REQUESTS: 429, // Too Many Requests

    // --- SERVER ERROR CODES (5xx) ---
    INTERNAL_SERVER_ERROR: 500, // Internal Server Error
    NOT_IMPLEMENTED: 501, // Not Implemented
    BAD_GATEWAY: 502, // Bad Gateway
    SERVICE_UNAVAILABLE: 503, // Service Unavailable
    GATEWAY_TIMEOUT: 504, // Gateway Timeout
  },

  // --- RESPONSE MESSAGES ---
  MSG: {
    //authController
    REQUIRED_FIELDS: 'All fields are required',
    REQUIRED_FIELDS_MISSING: 'Required fields are missing',
    TERMS_ACCEPT: 'You must accept Terms & Conditions',
    PASSWORD_MISMATCH: 'Password and confirm password do not match',
    EMAIL_EXISTS: 'An account with this email already exists',
    EMAIL_REQUIRED: 'Email is required',
    REGISTRATION_SUCCESS: 'Registration successful. Please check your email to verify',
    TOKEN_MISSING: 'Token missing',
    USER_NOT_FOUND: 'User not found',
    EMAIL_ALREADY_VERIFIED: 'Email already verified',
    LINK_EXPIRED: "Verification link expired",
    EMAIL_VERIFIED_SUCCESS: 'Email verified successfully',
    LOGIN_SUCCESS: 'Login successful',
    USER_ACCOUNT_SUSPENDED: 'User account is suspended',
    INVALID_EMAIL_PASSWORD: 'Invalid email or password',
    EMAIL_NOT_VERIFIED: 'Your email address has not been verified. Please check your inbox and complete the verification process',
    RESET_PASSWORD_LINK: 'Please check your Inbox for Reset Password Link',
    PASSWORD_RESET_SUCCESS: 'Password reset successfully. Please login again',
    USER_NOT_REQUESTED_RESET: 'User not requested for password reset..!',
    LOGOUT_SUCCESS: 'Logout successful',
    SERVER_ERROR_LOGOUT: "Something went wrong during logout",
    UNAUTHORIZED: "Unauthorized",
    TOKEN_REQUIRED: "Authorization token required",
    SERVER_ERROR: 'Server error',
    SERVER_ERROR_REGISTRATION: 'Server error during registration',
    SERVER_ERROR_LOGIN: 'Server error during login',
    SERVER_ERROR_VERIFICATION: 'Server error during verification',
    SERVER_ERROR_CANCEL: 'Server error during cancelation',
    BUSINESS_CANCEL_SUCCESS: 'Business profile canceled successfully',
    TOKEN_EXPIRED: "Invalid or expired verification link",
    LOCATION_PROVIDED: "Please select your location on Google Map before submitting.",
    INVALID_ADDRESS_FORMAT: "Invalid address format",

    // --- Task Controller Messages ---
    TASK_CREATED: 'Task created successfully',
    TASK_UPDATED: 'Task updated successfully',
    TASK_DELETED: 'Task deleted successfully',
    TASK_COMPLETED: "Task completed successfully",
    UNAUTHORIZED_USER_NOT_FOUND: "Unauthorized: User not found",
    NO_BID_FOUND: "No accepted bid found for this task",
    TASK_ALREADY_COMPLETED: "Task is already completed",
    TASK_CANNOT_COMPLETED: "Task cannot be completed now",
    OTP_SENT: "OTP sent to task owner",
    OTP_EXPIRED: "OTP has expired. Please request a new one.",
    INVALID_OTP: "Invalid OTP",
    RESEND_OTP: "A new OTP has been sent to the task owner",
    NO_ACCEPTED_BID: "No accepted bid found for this task",
    CANNOT_RESEND_OTP: "Cannot resend OTP for this task",
    TASK_COMPLETED_WITHOUT_OTP: "Task marked as completed without OTP",
    REASON_IS_REQUIRED: "Reason is required",
    TASK_NOT_FOUND: 'Task not found',
    INVALID_TASK_ID: 'Invalid task ID',
    LOCATION_REQUIRED: 'Location is required',
    USER_ACCOUNT_SUSPENDED_TASK: 'Cannot create task because user account is suspended',
    SERVER_ERROR_TASK: 'Server error during task operation',
    INVALID_ADDRESS: 'Incomplete address. Please provide all required address fields',
    BUSINESS_PROFILE_FOR_TASKS: 'You must create a business profile before viewing tasks',
    PROFILE_UNDER_VERIFICATION: 'Your business profile is under verification',
    PROFILE_SUSPENDED: 'Your business profile has been suspended',
    TASK_NOT_OWNER: 'You are not the owner of the task',

    // --- Business Controller Messages ---
    INVALID_BUSINESS_ID: "Invalid business ID",
    UNAUTHORIZED_ACCESS: 'Unauthorized Access',
    BUSINESS_NOT_FOUND: "Business not found",
    BUSINESS_REGISTERED_SUCCESS: "Business registered successfully",
    BUSINESS_ALREADY_EXISTS: "Business already exists",
    BUSINESS_UNDER_VERIFICATION: "Your business profile is under verification",
    BUSINESS_SUSPENDED: "Your business profile has been suspended",
    CATEGORY_MISMATCH: "Selected category and sub_category do not match",
    INVALID_PORTFOLIO: "Invalid portfolio JSON",
    DELETED_SUCCESS: "Deleted successfully",
    BUSINESS_UPDATED: "Business updated successfully",
    BUSINESS_DELETED: "Business deleted successfully",
    INVALID_SUB_CATEGORY_FORMAT: "Invalid sub_category format",
    INVALID_LOCATION_FORMAT: "Invalid location format",
    COORDINATES_MUST_BE_AN_ARRAY: "Location coordinates must be an array",

    USER_NOT_FOUNDS: "User not found!! Please register",
    USER_SUSPENDED: "User account is suspended",
    SERVER_ERROR_BUSINESS: "Something went wrong",

    // --- Bid Controller Messages ---
    INVALID_BID_ID: 'Invalid bid ID',
    BID_PLACED_SUCCESS: "Bid placed successfully",
    BID_ACCEPTED: "Bid accepted successfully",
    BID_ALREADY_EXISTS: "You already placed a bid",
    BID_ON_OWN_TASK: "You cannot place a bid on your own task",
    TASK_BID_NOT_FOUND: 'Task associated with this bid not found',
    CANNOT_DELETE_BID: 'You do not have permission to delete this bid',
    BID_NOT_FOUND: "Bid not found",
    SERVER_ERROR_BID: "Server error while handling bid",
    ERROR_FETCH_BID: "Something went wrong while fetching bids",
    ERROR_DELETE_BID: 'Server error while deleting bid',
    BID_UPDATED_SUCCESS: "Bid updated successfully",
    ID_NOT_FOUND: "Task ID and Bid ID are required",
    NOT_AUTHORIZED: "You are not authorized to view this task bid details",
    DETAILS_FETCHED: "Task and bid details fetched successfully",
    BID_DELETED: 'Bid deleted successfully',
    HAVE_BUSINESS_TO_PLACE_BID: "You must have a registered business to place a bid",
    NOT_HAVE_ASSIGNED_SUB_CATEGORIES: "Your business does not have any assigned subcategories",
    CANNOT_BID: "You cannot bid on this task as it does not belong to your selected sub-category",

    // --- Category / Template Controller Messages ---
    TEMPLATES_FETCHED_SUCCESS: "Templates fetched successfully",
    CATEGORY_NOT_FOUND: "Category not found",
    TEMPLATE_NOT_FOUND: "Template not found",
    SERVER_ERROR_CATEGORY: "Server error while fetching categories or templates",

    // Listings
    INVALID_LISTING_ID: "Invalid listing ID",
    LISTING_NOT_FOUND: "Listing not found",
    LIST_ADDED_SUCCESS: "Business created successfully",
    INVALID_TEMPLATE_FORMAT: 'Invalid template format',
    INVALID_LOCATION_FORMAT: 'Invalid location format',
    LOCATION_TYPE_COORDINATES: 'Location must have type and coordinates',

    // Review controller messages
    BUSINESS_NOT_FOUND_IN_REVIEW: 'Business not found for this user',
    CANNOT_REVIEW: 'You cannot review this task',
    REVIEW_COMPLETED_TASK: 'You can only review completed tasks',
    TASK_NOT_ASSIGNED: 'Task not assigned to this business',
    TASK_NOT_CREATED: 'You’re not the owner of this task',
    REVIEW_SUCCESS: "Review submitted successfully",
    ALREADY_REVIEWED_TASKS: "You have already reviewed this user for this task",
    NOT_AUTHORIZED_SKIP_REVIEW: "Not authorized to skip review",
    REVIEW_SKIPPED: "Review skipped",

    // Report controller messages
    REPORT_SUCCESS: "Report submitted successfully",

    // Support messages
    SUPPORT_CREATED: "Your request has been submitted successfully",
    DESCRIPTION_REQUIRED: "Description is required",
    NOT_FOUND: "Data not found",
    NOT_AUTHORISED: "You are not authorized to edit",
    DATA_UPDATED: "Data updated successfully",
    DATA_DELETED: "Data deleted successfully",

    // Contact Us messages
    CONTACT_US_CREATED: "Your message has been received. We will get back to you shortly.",
    NAME_REQUIRED: "Name is required",
    EMAIL_REQUIRED_CONTACT: "Email is required",
    MESSAGE_REQUIRED: "Message is required",
    CITY_REQUIRED: "City is required",
    INCORRECT_EMAIL_FORMAT: "Incorrect email format",
    
  }
};