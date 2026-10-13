module.exports = {
    STATUS: {
        VERIFIED: "verified",
        SUSPENDED: "suspended",
        PENDING_EMAIL: "pending_email",
        DEACTIVATED: "deactivated",

        ALL: ['verified', 'suspended', 'pending_email', 'deactivated']
    },
    TASKSTATUS: {
        OPEN: 'open',
        ASSIGNED: 'assigned',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        EXPIRED: 'expired',
        DELETE: 'delete',

        ALL: ['open', 'assigned', 'completed', 'cancelled', 'expired', 'delete']
    },
    USERTYPE: {
        CUSTOMER: 'customer',
        ADMIN: 'admin',

        ALL: ['customer', 'admin']
    },
    BUSINESSSTATUS: {
        PENDING: 'pending',
        VERIFIED: 'verified',
        SUSPENDED: 'suspended',

        ALL: ['pending', 'verified', 'suspended']
    },
    BIDSTATUS: {
        PENDING: 'pending',
        ACCEPTED: 'accepted',
        REJECTED: 'rejected',
        CANCELED: 'canceled',

        ALL: ['pending', 'accepted', 'rejected', 'canceled']
    },
    SUPPORTSTATUS: {
        OPEN: 'open',
        IN_PROGRESS: 'in_progress',
        RESOLVED: 'resolved',
        ALL: ["open", "in_progress", "resolved"]
    },
    CONTACTUSSTATUS: {
        OPEN: 'open',
        HOLD: 'hold',
        RESOLVED: 'resolved',
        ALL: ["open", "hold", "resolved"]
    },
    BLOG_STATUS : {
        DRAFT: 'draft',
        PUBLISHED: 'published',
        ARCHIVED: 'archived',
        ALL: ['draft', 'published', 'archived']
    },
    // FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
      LOGO : "http://localhost:3000/images/itask-logo.svg",
    IMAGE_PREFIX: `${process.env.BASE_URL}/${process.env.UPLOAD_PATH}`,
    IMAGE_PATH: {
        CATEGORY: "icons/",
        TEMPLATES: "icons/",
        TASK_IMAGES: "taskImages/",
        BUSINESS_IMAGES: "images/",
        PORTFOLIO_IMAGES: "images/",
        BID_MEDIA: "bidMedia/",
        OTHERS: "others/"
    },
}