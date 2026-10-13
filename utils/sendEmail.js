const nodemailer = require('nodemailer');
const { taskOtpTemplate, bidAcceptedTemplate, taskCompletionProviderTemplate, taskCompletionSeekerTemplate } = require('../utils/mailtemplates')

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'checkdemo02@gmail.com',
        pass: 'vqdoqmekygtousli'
    }
});

const sendEmail = async ({ to, subject, html }) => {
    if (!to) throw new Error('Recipient email is required');
    if (!subject) throw new Error('Email subject is required');
    if (!html) throw new Error('Email HTML content is required');

    return transporter.sendMail({
        from: '"Task.io" <checkdemo02@gmail.com>',
        to,
        subject,
        html
    });
};

const sendOtpEmail = async (user, otp) => {
    return sendEmail({
        to: user.email,
        subject: 'Your Task Completion OTP',
        html: taskOtpTemplate({ firstName: user.firstName, lastName: user.lastName, otp })
    });
};

const sendBidAcceptedEmail = async (user, taskTitle) => {
    return sendEmail({
        to: user.email,
        subject: 'Your Bid Has Been Accepted',
        html: bidAcceptedTemplate({ firstName: user.firstName, lastName: user.lastName, taskTitle })
    });
};

const sendTaskCompletionProviderEmail = async (user, taskTitle) => {
    return sendEmail({
        to: user.email,
        subject: 'Task Completed Successfully',
        html: taskCompletionProviderTemplate({ firstName: user.firstName, lastName: user.lastName, taskTitle })
    });
};

const sendTaskCompletionSeekerEmail = async (user, taskTitle, provider) => {
    return sendEmail({
        to: user.email,
        subject: 'Your Task Has Been Completed',
        html: taskCompletionSeekerTemplate({ firstName: user.firstName, lastName: user.lastName, taskTitle, firstname: provider.firstName, lastname: provider.lastName })
    });
};

module.exports = {
    sendEmail,
    sendOtpEmail,
    sendBidAcceptedEmail,
    sendTaskCompletionProviderEmail,
    sendTaskCompletionSeekerEmail
}