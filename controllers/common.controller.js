const mongoose = require('mongoose');
const fs = require('fs');
const { BUSINESSSTATUS,IMAGE_PREFIX,IMAGE_PATH } = require('../constants/constant');
const { API_RESPONSE_CODES, MSG } = require('../constants/admin_messages');
const Blog = require('../models/Blog');
const constant = require('../constants/constant');
const Template = require('../models/Template');
const Category = require('../models/Category');




const dashboard = async (req, res) => {
    try {
        const blogs = await Blog.find({ status:constant.BLOG_STATUS.PUBLISHED,isDeleted: false })
            .sort({ createdAt: -1 });

        const templates = await Template.find({ isDeleted: false, status: constant.STATUS.VERIFIED });
        const category =  (await Category.find({
              isDeleted: { $ne: true },
              status: constant.STATUS.VERIFIED
            }, "_id name icon").sort({ name: 1 })).map(cat => ({
              ...cat.toObject(),
              icon: cat.icon ? `${IMAGE_PREFIX}${IMAGE_PATH.CATEGORY}${cat.icon}` : null
            }));
            let data = {};

            data.blogs = blogs;
            data.templates = templates;
            data.category = category;
        return res.status(API_RESPONSE_CODES.SUCCESS).json({
            success: true,
            message: "Blog list fetched",
            data,
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

const getBlogById = async (req, res) => {
    try {
        const blogId = req.params.id;
        const blog = await Blog.findOne({ _id: blogId, status:constant.BLOG_STATUS.PUBLISHED,isDeleted: false });
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


const getBlogs = async (req, res) => {
    try {
        const blogs = await Blog.find({ status:constant.BLOG_STATUS.PUBLISHED,isDeleted: false })
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
       

module.exports = {
   dashboard,getBlogById,getBlogs
};