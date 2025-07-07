import pkg from 'twilio';
const { Twilio } = pkg; 

import asyncHandler from 'express-async-handler';
import { NextResponse } from 'next/server'; 

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

      return NextResponse.json({ success: true, sid: message.sid }, { status: 200 });
    } catch (err) {
      console.error('❌ SMS Error:', err);
      return NextResponse.json({ success: false, error: err.message || 'An unknown error occurred' }, { status: 500 });
    }
  });