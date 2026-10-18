export function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getOtpHtml(otp) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Email Verification</title>
      </head>

      <body style="
        margin: 0;
        padding: 0;
        background-color: #f4f4f4;
        font-family: Arial, Helvetica, sans-serif;
      ">
        <div style="
          max-width: 500px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          padding: 35px;
          text-align: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        ">

          <h1 style="
            margin: 0 0 15px;
            color: #222222;
            font-size: 28px;
          ">
            Verify Your Email
          </h1>

          <p style="
            color: #555555;
            font-size: 16px;
            line-height: 1.6;
          ">
            Use the OTP below to verify your email address.
          </p>

          <div style="
            margin: 30px 0;
            padding: 20px;
            background-color: #f1f5ff;
            border-radius: 10px;
          ">
            <span style="
              font-size: 36px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #2563eb;
            ">
              ${otp}
            </span>
          </div>

          <p style="
            color: #666666;
            font-size: 14px;
          ">
            This OTP is valid for <strong>5 minutes</strong>.
          </p>

          <p style="
            color: #999999;
            font-size: 13px;
            margin-top: 30px;
          ">
            If you did not request this verification code, you can safely
            ignore this email.
          </p>

          <hr style="
            border: none;
            border-top: 1px solid #eeeeee;
            margin: 30px 0;
          " />

          <p style="
            color: #aaaaaa;
            font-size: 12px;
            margin: 0;
          ">
            This is an automated email. Please do not reply.
          </p>

        </div>
      </body>
    </html>
  `;
}
