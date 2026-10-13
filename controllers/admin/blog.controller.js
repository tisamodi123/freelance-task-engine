const mongoose = require('mongoose');
const fs = require('fs');
const Listings = require('../../models/Listings');
const { BUSINESSSTATUS, IMAGE_PREFIX, IMAGE_PATH } = require('../../constants/constant');
const { API_RESPONSE_CODES, MSG } = require('../../constants/admin_messages');
const Blog = require('../../models/Blog');
const constant = require('../../constants/constant');

const create = async (req, res) => {
    try {
        const { title, excerpt, content, status } = req.body;

        // tags can be JSON string in FormData
        let tags = [];
        try {
            tags = req.body.tags ? JSON.parse(req.body.tags) : [];
            if (!Array.isArray(tags)) tags = [];
        } catch (e) {
            tags = [];
        }

        if (!title?.trim() || !content?.trim()) {
            return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                success: false,
                message: MSG.REQUIRED_FIELDS,
            });
        }

        // ✅ Get files from req.files (because your multer uses .any())
        const displayFile = req.files?.find((f) => f.fieldname === "displayImage");
        const galleryFiles = req.files?.filter((f) => f.fieldname === "images") || [];

        if (!displayFile) {
            return res.status(API_RESPONSE_CODES.BAD_REQUEST).json({
                success: false,
                message: "Display image is required",
            });
        }

        const baseUrl = `${req.protocol}://${req.get("host")}`;

        const displayImageUrl = `${baseUrl}/uploads/blogs/display/${displayFile.filename}`;
        const galleryUrls = galleryFiles.map(
            (f) => `${baseUrl}/uploads/blogs/gallery/${f.filename}`
        );

        const blog = await Blog.create({
            title: title.trim(),
            excerpt: excerpt || "",
            content,
            status: status === constant.BLOG_STATUS.PUBLISHED ? constant.BLOG_STATUS.PUBLISHED : constant.BLOG_STATUS.DRAFT,
            tags,
            displayImage: displayImageUrl,
            images: galleryUrls,
            createdBy: req.user?._id,
        });

        return res.status(API_RESPONSE_CODES.CREATED).json({
            success: true,
            message: "Blog created",
            data: blog,
        });
    } catch (err) {
        console.error("BLOG CREATE ERROR:", err);
        return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
            error: err.message,
        });
    }
};

const list = async (req, res) => {
    try {
        const blogs = await Blog.find({ isDeleted: false })
            .sort({ createdAt: -1 });
        return res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            message: "Blog list fetched",
            data: blogs,
        });
    } catch (err) {
        console.error("BLOG LIST ERROR:", err);
        return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
            error: err.message,
        });
    }
};

const getById = async (req, res) => {
    try {
        const blogId = req.params.id;
        const blog = await Blog.findOne({ _id: blogId, isDeleted: false });
        if (!blog) {
            return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
                success: false,
                message: "Blog not found",
            });
        }
        return res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            message: "Blog fetched",
            data: blog,
        });
    } catch (err) {
        console.error("BLOG GET BY ID ERROR:", err);
        return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
            error: err.message,
        });
    }
};

const update = async (req, res) => {
    try {
        const blogId = req.params.id;
        const { title, excerpt, content, status } = req.body;
        const blog = await Blog.findOne({ _id: blogId, isDeleted: false });
        if (!blog) {
            return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
                success: false,
                message: "Blog not found",
            });
        }
        // tags can be JSON string in FormData
        let tags = [];
        try {
            tags = req.body.tags ? JSON.parse(req.body.tags) : [];
            if (!Array.isArray(tags)) tags = [];
        } catch (e) {
            tags = [];
        }
        if (title?.trim()) blog.title = title.trim();
        if (excerpt !== undefined) blog.excerpt = excerpt;
        if (content) blog.content = content;
        if (status === constant.BLOG_STATUS.PUBLISHED || status === constant.BLOG_STATUS.DRAFT) blog.status = status;
        blog.tags = tags;



        // ✅ Get files from req.files (because your multer uses .any())
        const displayFile = req.files?.find((f) => f.fieldname === "displayImage");
        const galleryFiles = req.files?.filter((f) => f.fieldname === "images") || [];

        const baseUrl = `${req.protocol}://${req.get("host")}`;

        if (displayFile) {

            const displayImageUrl = `${baseUrl}/uploads/blogs/display/${displayFile.filename}`;
            blog.displayImage = displayImageUrl;
        }
        if (galleryFiles.length > 0) {
            const galleryUrls = galleryFiles.map(
                (f) => `${baseUrl}/uploads/blogs/gallery/${f.filename}`
            );

            const oldImages = req?.body?.oldImages ? JSON?.parse(req?.body?.oldImages) : [];
            blog.images = oldImages?.concat(galleryUrls);
        }


        await blog.save();
        return res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            message: "Blog updated",
            data: blog,
        });
    } catch (err) {
        console.error("BLOG UPDATE ERROR:", err);
        return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
            error: err.message,
        });
    }
};

const deleteBlog = async (req, res) => {
    try {
        const blogId = req.params.id;
        const blog = await Blog.findOne({ _id: blogId, isDeleted: false });
        if (!blog) {
            return res.status(API_RESPONSE_CODES.NOT_FOUND).json({
                success: false,
                message: "Blog not found",
            });
        }
        blog.isDeleted = true;
        await blog.save();
        return res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            message: "Blog deleted",
        });
    } catch (err) {
        console.error("BLOG DELETE ERROR:", err);
        return res.status(API_RESPONSE_CODES.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: MSG.SERVER_ERROR,
            error: err.message,
        });
    }
};

module.exports = {
    create,
    list,
    getById,
    update,
    deleteBlog
};