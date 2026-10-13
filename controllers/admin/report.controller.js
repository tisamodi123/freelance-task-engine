// Backend code: controllers/reportController.js
// Assuming you have a Report model, and other models: User, Business
// Add this to your routes: router.get('/reports/list', getReportsList);
// router.delete('/reports/:id', deleteReport);
// router.post('/users/:id/suspend', suspendUser);

const mongoose = require('mongoose');
const User = require('../../models/User'); // Adjust path
const Report = require('../../models/Report');

const getReportsList = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = '' } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1 || limit > 100) limit = 10;

    const searchRegex = search.trim() ? new RegExp(search.trim(), 'i') : null;

    const pipeline = [
      // Basic match (e.g., not deleted reports)
      { $match: { isDeleted: { $ne: true } } },

      // Lookup reporter
      {
        $lookup: {
          from: 'users',
          localField: 'userId', // reporter
          foreignField: '_id',
          as: 'reporter'
        }
      },
      { $unwind: { path: '$reporter', preserveNullAndEmptyArrays: true } },

      // Lookup reported business (if reportType: "business")
      {
        $lookup: {
          from: 'businesses',
          localField: 'businessId',
          foreignField: '_id',
          as: 'reportedBusiness'
        }
      },
      { $unwind: { path: '$reportedBusiness', preserveNullAndEmptyArrays: true } },

      // Lookup reported user from business (if business)
      {
        $lookup: {
          from: 'users',
          localField: 'reportedBusiness.user',
          foreignField: '_id',
          as: 'reportedUserFromBusiness'
        }
      },
      { $unwind: { path: '$reportedUserFromBusiness', preserveNullAndEmptyArrays: true } },

      // Lookup directly reported user (if reportType: "user")
      {
        $lookup: {
          from: 'users',
          localField: 'reportedUserId', // Assuming this field for user reports
          foreignField: '_id',
          as: 'reportedUserDirect'
        }
      },
      { $unwind: { path: '$reportedUserDirect', preserveNullAndEmptyArrays: true } },

      // Add fields for reported
      {
        $addFields: {
          reportedUser: {
            $cond: {
              if: { $eq: ['$reportType', 'business'] },
              then: '$reportedUserFromBusiness',
              else: '$reportedUserDirect'
            }
          },
          reportedName: {
            $cond: {
              if: { $eq: ['$reportType', 'business'] },
              then: '$reportedBusiness.businessName',
              else: {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ['$reportedUserDirect.firstName', ''] },
                      ' ',
                      { $ifNull: ['$reportedUserDirect.lastName', ''] }
                    ]
                  }
                }
              }
            }
          },
          reporterFullName: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$reporter.firstName', ''] },
                  ' ',
                  { $ifNull: ['$reporter.lastName', ''] }
                ]
              }
            }
          },
          isReportedUserDeleted: { $ifNull: ['$reportedUser.isDeleted', false] }
        }
      },

      // Post-lookup match for search (on reason, reporter name, reported name)
      ...(searchRegex ? [{
        $match: {
          $or: [
            { reason: searchRegex },
            { reporterFullName: searchRegex },
            { reportedName: searchRegex }
          ]
        }
      }] : []),

      // Sort, skip, limit
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },

      // Final project
      {
        $project: {
          _id: 1,
          reporter: {
            fullName: '$reporterFullName',
            email: '$reporter.email'
          },
          reported: {
            name: '$reportedName',
            userId: '$reportedUser._id', // For suspend action
            isDeleted: '$isReportedUserDeleted'
          },
          reason: 1,
          reportType: 1,
          imageUrl: 1,
          createdAt: 1
        }
      }
    ];

    const reports = await Report.aggregate(pipeline);

    // Separate count (repeat pipeline without skip/limit/project/sort, add $count)
    const countPipeline = pipeline.slice(0, pipeline.findIndex(stage => stage.$sort) || pipeline.length);
    countPipeline.push({ $count: 'total' });
    const countResult = await Report.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        reports
      }
    });
  } catch (err) {
    console.error('Reports list error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reports',
      error: err.message
    });
  }
};

// const deleteReport = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const report = await Report.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
//     if (!report) {
//       return res.status(404).json({ success: false, message: 'Report not found' });
//     }
//     res.status(200).json({ success: true, message: 'Report deleted successfully' });
//   } catch (err) {
//     console.error('Delete report error:', err);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

const suspendUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndUpdate(id, { isDeleted: true }, { new: true }); // Assuming you add isSuspended field to User schema
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, message: 'User suspended successfully' });
  } catch (err) {
    console.error('Suspend user error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getReportsList,  suspendUser };