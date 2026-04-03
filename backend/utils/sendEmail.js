import nodemailer from "nodemailer";

export const sendOTPEmail = async (to, code) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: `"Mega Mesari" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Kode OTP Login",
    html: `
      <h2>Kode OTP Anda</h2>
      <p>Kode OTP: <b>${code}</b></p>
      <p>Berlaku selama 5 menit</p>
    `
  });
};