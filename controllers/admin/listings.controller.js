const mongoose = require('mongoose');
const fs = require('fs');
const Listings = require('../../models/Listings');
const { BUSINESSSTATUS, IMAGE_PREFIX, IMAGE_PATH } = require('../../constants/constant');
const { API_RESPONSE_CODES, MSG } = require('../../constants/admin_messages')

const createListing = async (req, res) => {
    try {
        const { name, description, phoneNo, address, location, tags, template, websitelink } = req.body;

        if (!name) {
            return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({ success: false, message: MSG.REQUIRED_FIELDS });
        }

        const businessImageFile = req.files?.find(f => f.fieldname === 'businessImages');

        const businessImages = businessImageFile
            ? {
                imageUrl: businessImageFile.filename,
            }
            : {};

        let templateIds = [];
        if (template) {
            try {
                if (Array.isArray(template)) {
                    templateIds = template;
                } else if (typeof template === 'string') {
                    try {
                        templateIds = JSON.parse(template);
                    } catch {
                        templateIds = [template];
                    }
                }
            } catch (err) {
                return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                    success: false,
                    message: MSG.INVALID_TEMPLATE_FORMAT
                });
            }
        }


        let locationObj = {};
        if (location) {
            if (typeof location === 'string') {
                try {
                    locationObj = JSON.parse(location);
                } catch (err) {
                    return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                        success: false,
                        message: MSG.INVALID_LOCATION_FORMAT,
                    });
                }
            } else {
                locationObj = location;
            }

            if (!locationObj.type || !Array.isArray(locationObj.coordinates)) {
                return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                    success: false,
                    message: MSG.LOCATION_TYPE_COORDINATES,
                });
            }
        }

        const listing = new Listings({
            name,
            description,
            phoneNo,
            address: address ? JSON.parse(address) : {},
            location: locationObj,
            tags: tags ? JSON.parse(tags) : [],
            template: templateIds,
            websitelink,
            businessImages,
            createdBy: req.user._id
        });

        await listing.save();
        res.status(API_RESPONSE_CODES.CREATED).json({ success: true, data: listing, message: MSG.LIST_ADDED_SUCCESS });
    } catch (err) {
        console.error(err);
        res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
    }
};

const getAllListings = async (req, res) => {
    try {
        let { page = 1, limit = 10, search = '', template } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const query = { isDeleted: false };
        if (search) query.name = { $regex: search, $options: 'i' };
        if (template) query.template = template;

        const total = await Listings.countDocuments(query);

        const listings = await Listings.find(query)
            .populate('template', 'templateName')
            .populate('createdBy', 'firstName lastName email')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort({ createdAt: -1 });

        const listingsWithFullImages = listings.map(b => {
            const obj = b.toObject();
            if (obj.businessImages?.imageUrl) {
                obj.businessImages.imageUrl = `${IMAGE_PREFIX}${IMAGE_PATH.BUSINESS_IMAGES}${obj.businessImages.imageUrl}`;
            }
            obj.location = obj.location
                ? {
                    lat: obj.location.coordinates[1],
                    lng: obj.location.coordinates[0],
                }
                : null;
            return obj;
        });

        res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            data: listingsWithFullImages,
        });
    } catch (err) {
        console.error('Get All Listings Error:', err);
        res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
            error: err.message,
        });
    }
};

const getListingDetail = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                success: false,
                message: MSG.INVALID_LISTING_ID,
            });
        }

        const listing = await Listings.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(id),
                    isDeleted: false,
                },
            },

            {
                $lookup: {
                    from: "templates",
                    localField: "template",
                    foreignField: "_id",
                    as: "template",
                },
            },
            { $unwind: { path: "$template", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "users",
                    localField: "createdBy",
                    foreignField: "_id",
                    as: "createdBy",
                },
            },
            { $unwind: { path: "$createdBy", preserveNullAndEmptyArrays: true } },

            {
                $project: {
                    name: 1,
                    description: 1,
                    phoneNo: 1,
                    address: 1,
                    location: 1,
                    tags: 1,
                    websitelink: 1,
                    status: 1,
                    businessImages: 1,
                    templates: {
                        $map: {
                            input: "$templates",
                            as: "t",
                            in: {
                                _id: "$$t._id",
                                name: "$$t.templateName",
                            },
                        },
                    },
                    createdBy: {
                        name: {
                            $concat: [
                                { $ifNull: ["$createdBy.firstName", ""] },
                                " ",
                                { $ifNull: ["$createdBy.lastName", ""] },
                            ],
                        },
                    },
                },
            },
        ]);

        if (!listing.length) {
            return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
                success: false,
                message: MSG.LISTING_NOT_FOUND,
            });
        }

        const data = listing[0];

        if (data.businessImages?.imageUrl) {
            data.businessImages.imageUrl = `${IMAGE_PREFIX}${IMAGE_PATH.BUSINESS_IMAGES}${data.businessImages.imageUrl}`;
        }

        data.location = data.location
            ? {
                lat: data.location.coordinates[1],
                lng: data.location.coordinates[0],
            }
            : null;

        res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            listing: data,
        });
    } catch (err) {
        console.error("Get listing detail error:", err);
        res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
            error: err.message,
        });
    }
};

const updateListing = async (req, res) => {
    try {
        const listing = await Listings.findById(req.params.id);
        if (!listing || listing.isDeleted) {
            return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
                success: false,
                message: MSG.LISTING_NOT_FOUND,
            });
        }

        const {
            name,
            description,
            phoneNo,
            address,
            location,
            tags,
            template,
            websitelink,
            status,
        } = req.body;

        if (name) listing.name = name;
        if (description) listing.description = description;
        if (phoneNo) listing.phoneNo = phoneNo;
        if (websitelink) listing.websitelink = websitelink;
        if (status) listing.status = status;

        if (address) {
            try {
                listing.address = typeof address === 'string' ? JSON.parse(address) : address;
            } catch {
                return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                    success: false,
                    message: MSG.INVALID_ADDRESS_FORMAT,
                });
            }
        }

        if (tags) {
            try {
                listing.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
            } catch {
                return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                    success: false,
                    message: MSG.INVALID_TAGS_FORMAT,
                });
            }
        }

        if (location) {
            try {
                listing.location = typeof location === 'string' ? JSON.parse(location) : location;
            } catch {
                return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                    success: false,
                    message: MSG.INVALID_LOCATION_FORMAT,
                });
            }
        }

        if (template) {
            try {
                const parsed = Array.isArray(template) ? template : JSON.parse(template);
                listing.template = parsed.filter(id => mongoose.Types.ObjectId.isValid(id));
            } catch {
                return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                    success: false,
                    message: MSG.INVALID_TEMPLATE_FORMAT,
                });
            }
        }

        const businessImageFile = req.files?.find(f => f.fieldname === 'businessImages');
        if (businessImageFile) {
            if (listing.businessImages?.imageUrl) {
                const oldPath = `uploads/images/${listing.businessImages.imageUrl}`;
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            listing.businessImages = { imageUrl: businessImageFile.filename };
        }

        await listing.save();

        res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            message: MSG.LIST_UPDATED,
            data: listing,
        });
    } catch (err) {
        console.error('Update Listing Error:', err);
        res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
            error: err.message,
        });
    }
};

const deleteListing = async (req, res) => {
    try {
        const listing = await Listings.findByIdAndDelete(req.params.id);
        if (!listing) {
            return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
                success: false,
                message: MSG.LISTING_NOT_FOUND,
            });
        }

        res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            message: MSG.LIST_DELETED,
        });
    } catch (err) {
        console.error('Delete Listing Error:', err);
        res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
            error: err.message,
        });
    }
};

const changeStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status: newStatus } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                status: false,
                message: MSG.INVALID_ID
            });
        }

        const allowedStatuses = Object.values(BUSINESSSTATUS);
        if (!allowedStatuses.includes(newStatus)) {
            return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                status: false,
                message: MSG.INVALID_STATUS
            });
        }

        const listings = await Listings.findByIdAndUpdate(
            id,
            { status: newStatus },
            { new: true, select: 'status' }
        );

        if (!listings) {
            return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
                status: false,
                message: MSG.LISTING_NOT_FOUND
            });
        }

        res.status(API_RESPONSE_CODES.SUCCESS).json({
            status: true,
            message: MSG.LISTINGS_STATUS_UPDATED,
            data: { status: listings.status }
        });

    } catch (err) {
        console.error('Change status error:', err);
        res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: MSG.SERVER_ERROR
        });
    }
};

module.exports = {
    createListing,
    getAllListings,
    getListingDetail,
    updateListing,
    deleteListing,
    changeStatus
};