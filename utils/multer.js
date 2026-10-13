const multer = require('multer');
const path = require('path');
const fs = require('fs')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder = 'uploads/others';

        // ✅ BLOG UPLOADS
        if (file.fieldname === 'displayImage') {
            folder = 'uploads/blogs/display';
        } else if (file.fieldname === 'images') {
            folder = 'uploads/blogs/gallery';
        }

        if (file.fieldname === 'icon' || file.fieldname === 'posterImage') {
            folder = 'uploads/icons';
        } else if (
            file.fieldname === 'businessImages' ||
            file.fieldname.startsWith('projectImages')
        ) {
            folder = 'uploads/images';
        } else if (file.fieldname === 'attachments') {
            folder = 'uploads/taskImages';
        } else if (file.fieldname === 'media') {
            folder = 'uploads/bidMedia';
        }

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        cb(null, folder);
    },

    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const fileFilter = (req, file, cb) => {
    const imageTypes = /jpeg|jpg|png|svg|webp|gif/;
    const videoTypes = /mp4|mov|avi|mkv|webm|flv|wmv/;
    const docTypes = /pdf|doc|docx|xlsx|ppt|pptx|txt|csv|ods|odt/;

    const ext = path.extname(file.originalname).toLowerCase();

    if (file.fieldname === 'attachments') {
        // Allow images + videos + docs in attachments/taskImages
        if (imageTypes.test(ext) || videoTypes.test(ext) || docTypes.test(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only images, videos, or document files are allowed in attachments.'));
        }
    } else if (file.fieldname === 'media') {
        if (imageTypes.test(ext) || videoTypes.test(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only images or videos allowed for media.'));
        }
    }
    else {
        // For other folders, only allow images
        if (imageTypes.test(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed.'));
        }
    }
};

const multerUpload = multer({ storage, fileFilter });

const upload = (req, res, next) => {
    multerUpload.any()(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ success: false, message: err.message });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        try {
            const fieldCounts = {
                icon: 0,
                posterImage: 0,
                businessImages: 0,
                projectImages: 0,
                attachments: 0,
                media: 0,

                displayImage: 0,
                images: 0,
            };

            req.files?.forEach(file => {
                if (file.fieldname in fieldCounts) {
                    fieldCounts[file.fieldname]++;
                }

                if (file.fieldname === 'icon' && file.size > 5 * 1024 * 1024) {
                    throw new Error('Icon file too large. Max 5 MB.');
                }
                if (
                    file.fieldname === 'posterImage' ||
                    file.fieldname === 'businessImages' ||
                    file.fieldname.startsWith('projectImages')
                ) {
                    if (file.size > 5 * 1024 * 1024) {
                        throw new Error('Image too large. Max 5 MB.');
                    }
                }
                if (file.fieldname === 'attachments') {
                    if (!(file.size <= 5 * 1024 * 1024)) {
                        throw new Error('Attachment too large. Max 5 MB.');
                    }
                }

                if (file.fieldname === 'media') {
                    if (file.size > 5 * 1024 * 1024) {
                        throw new Error('Media file too large. Max 5 MB per file.');
                    }
                }

                if (!['icon', 'businessImages'].includes(file.fieldname) && file.size > 5 * 1024 * 1024) {
                    throw new Error(`File ${file.originalname} too large. Max 5 MB for other files.`);
                }

                // ✅ BLOG MAX SIZE 5MB
                if (['displayImage', 'images'].includes(file.fieldname) && file.size > 5 * 1024 * 1024) {
                    throw new Error('Blog image too large. Max 5 MB.');
                }
            });

            if (fieldCounts.icon > 1) {
                throw new Error('Only 1 icon file allowed.');
            }
            if (fieldCounts.posterImage > 1) throw new Error('Only 1 posterImage file allowed.');
            if (fieldCounts.businessImages > 5) {
                throw new Error('Maximum 5 business images allowed.');
            }

            if (fieldCounts.displayImage > 1) {
  throw new Error('Only 1 displayImage allowed.');
}
if (fieldCounts.images > 10) {
  throw new Error('Maximum 10 blog images allowed.');
}


            let totalProjectImages = 0;
            req.files?.forEach(file => {
                if (file.fieldname.startsWith('projectImages')) {
                    totalProjectImages++;
                }
            });
            if (totalProjectImages > 5) {
                throw new Error('Maximum 5 images are allowed per previous work');
            }
            if (fieldCounts.attachments > 5) {
                throw new Error('Maximum 5 attachments allowed.');
            }

            if (fieldCounts.media > 5) {
                throw new Error('Maximum 5 media files allowed.');
            }

            next();
        } catch (sizeErr) {
            return res.status(400).json({ success: false, message: sizeErr.message });
        }
    });
};

module.exports = upload;