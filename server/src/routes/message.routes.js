import express from 'express';
import { sendSMS } from '../controllers/message.controller.js';

const router = express.Router()

router.get("/", sendSMS);

export default router