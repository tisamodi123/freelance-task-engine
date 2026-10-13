const constant = require("../constants/constant");

const EmailHeader = (title = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: "Helvetica Neue", Arial, sans-serif;
      background-color: #f5f7fa;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background-color: #fff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 3px 12px rgba(0,0,0,0.08);
    }
    .header {
      text-align: center;
      padding: 24px 15px;
    }
    .header img {
      height: 45px;
      margin-bottom: 8px;
    }
    .header h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      color: #fff;
    }
    .content {
      padding: 24px 28px;
      font-size: 15px;
      line-height: 1.6;
    }
    .content p {
      margin: 10px 0;
      color: #555;
    }
    .button {
      display: inline-block;
      background-color: #38aaa4;
      color: #fff !important;
      text-decoration: none;
      padding: 12px 28px;
      border-radius: 8px;
      margin: 18px 0;
      font-weight: 600;
      letter-spacing: 0.3px;
      transition: all 0.2s ease-in-out;
    }
    .button:hover {
      background-color: #2e8f8a;
    }
    .footer {
      background-color: #f1f1f1;
      text-align: center;
      color: #777;
      padding: 14px;
      font-size: 12px;
      border-top: 1px solid #e0e0e0;
    }
    a {
      color: #38aaa4;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
        <img src="${constant.LOGO}" alt="iTask.io logo" />
    </div>
    <div class="content">
`;

const EmailFooter = () => `
    </div>
    <div class="footer">
        <p>© ${new Date().getFullYear()} Taskio. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const verificationEmailHtml = (verifyUrl, firstName, lastName, userTypes) => `
${EmailHeader('Verify Your Email')}

  <p style="margin:0 0 8px 0;"><strong>Dear ${firstName} ${lastName},</strong></p>

  <p style="margin:8px 0;">Welcome to Task.io! We're delighted to have you on board.</p>

  <p style="margin:8px 0;">
    Thank you for registering as a <strong>${userTypes}</strong>. Please confirm your email address by clicking the button below:
  </p>

  <div style="text-align:center; margin:16px 0;">
    <a href="${verifyUrl}" class="button" style="background-color:#4CAF50; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; display:inline-block; font-weight:600;">
      Verify Email
    </a>
  </div>

  <p style="margin:8px 0;">This verification link will expire in <strong>1 hour</strong>.</p>

  <p style="margin:16px 0 4px 0;">If the button doesn’t work, copy and paste the link below into your browser:</p>
  <p style="margin:0;"><a href="${verifyUrl}" style="color:#4CAF50; text-decoration:none;">${verifyUrl}</a></p>

  <p style="margin:16px 0 0 0;">Thank you for choosing Task.io!</p>

  <p style="margin:16px 0 0 0; text-align: left; font-weight: 600;">Regards,</p>
  <p style="margin:4px 0 0 0; text-align: left; font-weight: 600;">Team Task.io</p>

${EmailFooter()}
`;

const forgotPasswordEmailHtml = (resetUrl, firstName, lastName) => `
${EmailHeader('Reset Your Password')}
  <p style="margin:0 0 10px 0;"><strong>Dear ${firstName} ${lastName},</strong></p>

  <p style="margin:0 0 10px 0;">You requested to reset your password. Click below to create a new one:</p>

  <div style="text-align:center; margin:20px 0;">
    <a href="${resetUrl}" class="button" style="background-color:#7b7b7b;">Reset Password</a>
  </div>

  <p style="margin:0 0 10px 0;">This link is valid for <strong>1 hour</strong>.</p>
  
  <p style="margin:0 0 10px 0;">If the button doesn’t work, copy and paste this link:</p>
  <p style="margin:0 0 20px 0;"><a href="${resetUrl}">${resetUrl}</a></p>

  <p style="margin:0 0 4px 0; text-align:left; font-weight:600;">Regards,</p>
  <p style="margin:0; text-align:left; font-weight:600;">Team Task.io</p>
${EmailFooter()}
`;

const taskOtpTemplate = ({ firstName, lastName, otp }) => `
${EmailHeader('Task Completion OTP')}

  <p style="margin:0 0 8px 0;"><strong>Dear ${firstName} ${lastName},</strong></p>

  <p style="margin:8px 0;">
    Your task has been completed by the service provider. To confirm completion, please use the following OTP:
  </p>

  <div style="text-align:center; margin:16px 0;">
    <span style="color:#2E86C1; border-radius:6px; display:inline-block; font-weight:600; font-size:22px;">
      ${otp}
    </span>
  </div>

  <p style="margin:8px 0;">This OTP is valid for <strong>10 minutes</strong>. Please provide it to the service provider to complete the task.</p>

  <p style="margin:16px 0 0 0;">If you did not request this, please ignore this email.</p>

  <p style="margin:16px 0 0 0; text-align: left; font-weight: 600;">Regards,</p>
  <p style="margin:4px 0 0 0; text-align: left; font-weight: 600;">Team Task.io</p>

${EmailFooter()}
`;

const bidAcceptedTemplate = ({ firstName, lastName, taskTitle }) => `
${EmailHeader('Your Bid Has Been Accepted')}

  <p style="margin:0 0 8px 0;"><strong>Dear ${firstName} ${lastName},</strong></p>

  <p style="margin:8px 0;">
    Great news! Your bid for the task <strong>${taskTitle}</strong> has been <strong>accepted</strong> by the customer.
  </p>

  <p style="margin:8px 0;">
    You can now start communicating with the customer to begin work.
  </p>

  <p style="margin:8px 0;">We’re excited to see your excellent work on this project!</p>

  <p style="margin:16px 0 0 0;">Thank you for being a part of Task.io.</p>

  <p style="margin:16px 0 0 0; text-align: left; font-weight: 600;">Best Regards,</p>
  <p style="margin:4px 0 0 0; text-align: left; font-weight: 600;">Team Task.io</p>

${EmailFooter()}
`;

const taskCompletionProviderTemplate = ({ firstName, lastName, taskTitle }) => `
${EmailHeader('Task Completed Successfully')}

  <p><strong>Dear ${firstName} ${lastName},</strong></p>

  <p>Congratulations! The task <strong>${taskTitle}</strong> has been successfully completed.</p>

  <p>You’ve done a great job delivering your service.</p>

  <p>Thank you for being part of Task.io and helping our users get things done efficiently!</p>

  <p style="margin-top:16px; font-weight:600;">Regards,<br/>Team Task.io</p>

${EmailFooter()}
`;

const taskCompletionSeekerTemplate = ({ firstName, lastName, taskTitle, firstname, lastname }) => `
${EmailHeader('Your Task Has Been Completed')}

  <p><strong>Dear ${firstName} ${lastName},</strong></p>

  <p>Good news! Your posted task <strong>${taskTitle}</strong> has been successfully completed by ${firstname} ${lastname}.</p>

  <p>Please review the completed work and share your feedback to help maintain high-quality service on Task.io.</p>

  <p>We hope you’re satisfied with the service. Thank you for using Task.io!</p>

  <p style="margin-top:16px; font-weight:600;">Regards,<br/>Team Task.io</p>

${EmailFooter()}
`;

module.exports = {
  EmailHeader,
  EmailFooter,
  verificationEmailHtml,
  forgotPasswordEmailHtml,
  taskOtpTemplate,
  bidAcceptedTemplate,
  taskCompletionProviderTemplate,
  taskCompletionSeekerTemplate
};