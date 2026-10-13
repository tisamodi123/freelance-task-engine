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
        // General
        SERVER_ERROR: "Something went wrong. Please try again later.",
        NOT_FOUND: "Resource not found",
        UNAUTHORIZED: "Unauthorized access",
        ALL_FIELDS_REQUIRED: "All fields are required",
        INVALID_STATUS: "Invalid status",
        INVALID_ID: "Invalid business ID",
        INVALID_SUPPORT_ID: "Invalid support ID",
        STATUS_REQUIRED: "Status is required",

        // User Messages
        USER_CREATED_SUCCESS: "User created successfully",
        USER_UPDATED_SUCCESS: "User updated successfully",
        USER_DELETED_SUCCESS: "User deleted successfully",
        USER_NOT_FOUND: "User not found",
        USER_VERIFIED: "User is already verified",
        USER_SUSPENDED: "User account has been suspended",
        USER_STATUS_UPDATED: "User status updated",
        EMAIL_ALREADY_EXISTS: "Email already exists",
        INVALID_CREDENTIALS: "Invalid credentials",
        LOGIN_SUCCESS: "Logged in successfully",
        LOGOUT_SUCCESS: "Logged out successfully",
        EMAIL_ALREADY_IN_USE: "Email already in use by another account",

        // Template Messages
        TEMPLATES_FETCHED_SUCCESS: "Templates fetched successfully",
        TEMPLATE_CREATED_SUCCESS: "Template created successfully",
        TEMPLATE_UPDATED_SUCCESS: "Template updated successfully",
        TEMPLATE_DELETED_SUCCESS: "Template deleted successfully",
        TEMPLATE_ALREADY_EXISTS_IN_CATEGORY: "Template already exists in this category",
        TEMPLATE_NOT_FOUND: "Template not found",
        TEMPLATE_ICON_REQUIRED: "Icon is required",
        TEMPLATE_POSTER_REQUIRED: "Poster image is required",
        STATUS_UPDATED: "Status updated",

        // Category Messages
        CATEGORY_NOT_FOUND: "Category not found",
        CATEGORY_FETCHED_SUCCESS: "Categories fetched successfully",
        CATEGORY_NAME_ICON_SLUG_REQUIRED: "Name, icon, and slug are required",
        SLUG_ALREADY_EXISTS: 'Slug already exists',
        CATEGORY_ALREADY_EXISTS: 'Category already exists',
        CATEGORY_CREATED_SUCCESS: 'Category created successfully',
        CATEGORY_UPDATED_SUCCESS: 'Category updated successfully',
        CATEGORY_DELETED_SUCCESS: 'Category deleted successfully',
        CATEGORY_STATUS_UPDATED: 'Category status updated',
        CATEGORY_MISMATCH: "Selected category and sub_category do not match",
        INVALID_SUB_CATEGORY_FORMAT: "Invalid sub_category format",

        // Task Messages
        TASK_NOT_FOUND: "Task not found",
        INVALID_TASK_ID: "Invalid tasl id",
        TASK_CREATED_SUCCESS: "Task created successfully",
        TASK_UPDATED_SUCCESS: "Task updated successfully",
        TASK_DELETED_SUCCESS: "Task deleted successfully",
        TASK_STATUS_UPDATED: "Task status updated successfully",

        // Business Messages
        BUSINESS_NOT_FOUND: "Business not found",
        BUSINESS_ID_REQUIRED: "Business ID is required",
        UNAUTHORIZED_USER_NOT_FOUND: "Unauthorized: user not found",
        BUSINESS_REGISTERED_SUCCESS: "Business registered successfully",
        BUSINESS_UPDATED_SUCCESS: "Business updated successfully",
        BUSINESS_WEBSITE_INVALID: "Website link is invalid",
        PORTFOLIO_INVALID: "Portfolio format is invalid",
        CANNOT_CHANGE_STATUS: "Cannot change business status",
        BUSINESS_STATUS_UPDATED: "Business status updated",
        BUSINESS_DELETED_SUCCESS: "Business deleted successfully",

        // Homepage / Dashboard
        HOMEPAGE_FETCHED_SUCCESS: "Homepage data fetched successfully",
        BUSINESS_NOT_REGISTERED: "Business is not registered yet",

        // Listings
        REQUIRED_FIELDS: "All fields are required",
        INVALID_LISTING_ID: "Invalid listing ID",
        LISTING_NOT_FOUND: "Listing not found",
        LIST_ADDED_SUCCESS: "Listing created successfully",
        INVALID_TEMPLATE_FORMAT: 'Invalid template format',
        INVALID_LOCATION_FORMAT: 'Invalid location format',
        INVALID_ADDRESS_FORMAT: 'Invalid address format',
        INVALID_TAGS_FORMAT: 'Invalid tags format',
        LOCATION_TYPE_COORDINATES: 'Location must have type and coordinates',
        LIST_UPDATED: 'Listing updated successfully',
        LIST_DELETED: 'Listing deleted successfully',
        LISTINGS_STATUS_UPDATED: "Listing status updated",

        // Misc
        FILE_UPLOAD_SUCCESS: "File uploaded successfully",
        FILE_UPLOAD_FAILED: "File upload failed",

        // REVIEWLISTING
        REVIEW_NOT_FOUND:"Review not found",
        REVIEW_DELETED_SUCCESS:"Review deleted successfully"
    }
};