import pkg from 'twilio';
import asyncHandler from 'express-async-handler';
const { Twilio } = pkg;

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSMS = asyncHandler(async (req, res) => {
    try {
      const { phoneNumber, mssg } = await req.json();
      const message = await client.messages.create({
        body: `${mssg}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+91${phoneNumber}`,
      });
      return res.status(200).json({ success: true, sid: message.sid });
    } catch (err) {
      console.error('❌ SMS Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });