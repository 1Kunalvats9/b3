import pkg from 'twilio';
const { Twilio } = pkg; 
import asyncHandler from 'express-async-handler';

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendSMS = asyncHandler(async (req, res) => {
    try {
      const { phoneNumber, mssg } = req.body;

      if (!phoneNumber || !mssg) {
        return res.status(400).json({ 
          success: false, 
          error: 'Phone number and message are required' 
        });
      }

      // Validate Twilio configuration
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        console.error('Twilio configuration missing');
        return res.status(500).json({
          success: false,
          error: 'SMS service not configured'
        });
      }

      const message = await client.messages.create({
        body: mssg,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`, 
      });

      return res.status(200).json({ success: true, sid: message.sid });
    } catch (err) {
      console.error('❌ SMS Error:', err);
      return res.status(500).json({ 
        success: false, 
        error: err.message || 'Failed to send SMS' 
      });
    }
});