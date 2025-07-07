import express from 'express';
import { sendSMS } from '../controllers/message.controller.js';

const router = express.Router();

router.put("/", sendSMS);

export default router;