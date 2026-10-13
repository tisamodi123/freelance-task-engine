const Listings = require('../models/Listings');
const fs = require('fs');
const mongoose = require('mongoose')
const { API_RESPONSE_CODES, MSG } = require('../constants/user_messages');
const { BUSINESSSTATUS, IMAGE_PREFIX, IMAGE_PATH } = require('../constants/constant');

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
        templateIds = Array.isArray(template) ? template : JSON.parse(template);
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

    // Parse address safely
    let parsedAddress = {};
    if (address && address !== 'undefined') {
      try {
        parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;
      } catch (err) {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
          success: false,
          message: MSG.INVALID_ADDRESS_FORMAT,
        });
      }
    }

    // If address is provided, location must also be provided
    const hasAddress = parsedAddress && Object.values(parsedAddress).some(v => v && v.trim() !== '');
    if (hasAddress && (!locationObj || !Array.isArray(locationObj.coordinates) || locationObj.coordinates.length === 0)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.LOCATION_PROVIDED,
      });
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

    const query = { isDeleted: false, status: BUSINESSSTATUS.VERIFIED };

    if (search) query.name = { $regex: search, $options: 'i' };
    if (template) query.template = template;

    const total = await Listings.countDocuments(query);

    const listings = await Listings.find(query)
      .populate('template', 'templateName')
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
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG.SERVER_ERROR,
      error: err.message,
    });
  }
}

const getListingsDetail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
        success: false,
        message: MSG.INVALID_LISTING_ID,
      });
    }

    const loggedInUserId = req.user?._id;

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
          template: {
            _id: "$template._id",
            name: "$template.templateName",
          },
          createdBy: {
            _id: "$createdBy._id",
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

    let isOwner = false;
    if (loggedInUserId && listing[0].createdBy && listing[0].createdBy._id.equals(loggedInUserId)) {
      isOwner = true;
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
      isOwner
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

const getMyListings = async (req, res) => {
  try {
    const userId = req.user._id;
    let { page = 1, limit = 10, search = '', template } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const query = { createdBy: userId, isDeleted: false };

    if (search) query.name = { $regex: search, $options: 'i' };

    if (template) query.template = template;

    const total = await Listings.countDocuments(query);

    const listings = await Listings.find(query)
      .populate('template', 'templateName')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const listingsWithFullImages = listings.map(b => {
      const obj = b.toObject();
      if (obj.businessImages?.imageUrl) {
        obj.businessImages.imageUrl = `${IMAGE_PREFIX}${IMAGE_PATH.BUSINESS_IMAGES}${obj.businessImages.imageUrl}`;
      }
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
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.LISTING_NOT_FOUND });
    }

    const { name, description, phoneNo, address, location, tags, template, websitelink, status } = req.body;

    if (name) listing.name = name;
    if (description) listing.description = description;
    if (phoneNo) listing.phoneNo = phoneNo;

    if (address) {
      listing.address = typeof address === 'string' ? JSON.parse(address) : address;
    }

    if (location) {
      let locationObj = typeof location === 'string' ? JSON.parse(location) : location;
      if (!locationObj.type || !Array.isArray(locationObj.coordinates)) {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
          success: false,
          message: MSG.LOCATION_TYPE_COORDINATES,
        });
      }
      listing.location = locationObj;
    }

    if (tags) {
      listing.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    if (template) {
      let templateIds = [];
      try {
        templateIds = Array.isArray(template) ? template : JSON.parse(template);
      } catch (err) {
        return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
          success: false,
          message: MSG.INVALID_TEMPLATE_FORMAT,
        });
      }

      templateIds = templateIds.filter(t => t && mongoose.Types.ObjectId.isValid(t));
      listing.template = templateIds.map(t => new mongoose.Types.ObjectId(t));
    }

    if (websitelink) listing.websitelink = websitelink;
    if (status) listing.status = status;

    const businessImageFile = req.files?.find(f => f.fieldname === 'businessImages');
    if (businessImageFile) {
      if (listing.businessImages?.imageUrl) {
        const oldImagePath = `uploads/images/${listing.businessImages.imageUrl}`;
        if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);
      }
      listing.businessImages = { imageUrl: businessImageFile.filename };
    }

    await listing.save();
    res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, data: listing });
  } catch (err) {
    console.error(err);
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
  }
};

const deleteListing = async (req, res) => {
  try {
    const listing = await Listings.findById(req.params.id);
    if (!listing || listing.isDeleted) {
      return res.status(API_RESPONSE_CODES.NOT_FOUND).json({ success: false, message: MSG.USER_NOT_FOUND });
    }

    // listing.isDeleted = true;
    // await listing.save();

    await Listings.findByIdAndDelete(listing);

    res.status(API_RESPONSE_CODES.SUCCESS).json({ success: true, message: MSG.DELETED_SUCCESS });
  } catch (err) {
    res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({ success: false, message: MSG.SERVER_ERROR, error: err.message });
  }
};

module.exports = {
  createListing,
  getAllListings,
  updateListing,
  deleteListing,
  getMyListings,
  getListingsDetail
};