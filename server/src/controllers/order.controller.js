import Order from '../models/order.model.js';
import User from '../models/user.model.js';
import asyncHandler from 'express-async-handler';
import { getAuth } from '@clerk/express';
import pkg from 'twilio';
const { Twilio } = pkg;

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const smsTemplates = {
  orderPlaced: (orderNumber, total) => 
    `🎉 Thank you for shopping with Balaji Bachat Bazar!\n\n` +
    `📋 Order #${orderNumber}\n` +
    `💰 Total: ₹${total}\n` +
    `📱 Track your order in the app\n\n` +
    `We're preparing your order with care!`,
    
  orderConfirmed: (orderNumber) =>
    `✅ Great news! Your order #${orderNumber} has been confirmed.\n\n` +
    `👨‍🍳 Our team is now preparing your items.\n` +
    `⏰ Estimated time: 15-20 minutes\n\n` +
    `Thank you for choosing B3 Store!`,
    
  orderPreparing: (orderNumber) =>
    `👨‍🍳 Your order #${orderNumber} is being prepared with love!\n\n` +
    `🕐 Almost ready - just a few more minutes\n` +
    `📱 You'll be notified when it's ready`,
    
  orderReady: (orderNumber, deliveryType) =>
    deliveryType === 'delivery' 
      ? `🚚 Your order #${orderNumber} is ready and out for delivery!\n\n` +
        `📍 Our delivery partner is on the way\n` +
        `⏰ Expected delivery: 10-15 minutes\n\n` +
        `Please keep your phone handy!`
      : `✅ Your order #${orderNumber} is ready for pickup!\n\n` +
        `📍 Please visit our store to collect your order\n` +
        `🕐 Store hours: 9 AM - 9 PM\n\n` +
        `Thank you for choosing B3 Store!`,
        
  orderDelivered: (orderNumber) =>
    `🎉 Your order #${orderNumber} has been delivered!\n\n` +
    `😊 Hope you enjoy your purchase\n` +
    `⭐ Rate your experience in the app\n\n` +
    `Thank you for shopping with B3 Store!`,
    
  orderCancelled: (orderNumber) =>
    `❌ We're sorry! Your order #${orderNumber} has been cancelled.\n\n` +
    `💰 Refund will be processed within 3-5 business days\n` +
    `📞 Contact us for any queries\n\n` +
    `We apologize for the inconvenience.`
};

const sendSMSNotification = async (phoneNumber, message) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('SMS not sent - Twilio credentials not configured');
      return;
    }
    
    if (!process.env.TWILIO_PHONE_NUMBER) {
      console.log('SMS not sent - Twilio phone number not configured');
      return;
    }
    
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`,
    });
    console.log('SMS sent successfully to:', phoneNumber);
  } catch (error) {
    console.error('SMS sending failed:', error.message);
    // Log more details for debugging
    if (error.code) {
      console.error('Twilio error code:', error.code);
    }
  }
};

export const getAllOrders = asyncHandler(async (req, res) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Server error while fetching orders." });
  }
});

export const createOrder = asyncHandler(async (req, res) => {
  try {
    const { userId } = getAuth(req);
    
    console.log('Creating order for user:', userId);
    console.log('Request body:', req.body);
    
    const { items, total, deliveryOption, paymentOption, address, phoneNumber } = req.body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items are required and must be a non-empty array" });
    }
    
    if (!total || typeof total !== 'number') {
      return res.status(400).json({ error: "Total is required and must be a number" });
    }
    
    if (!deliveryOption || !['delivery', 'takeaway'].includes(deliveryOption)) {
      return res.status(400).json({ error: "Valid delivery option is required" });
    }
    
    if (!paymentOption || !['online', 'cod'].includes(paymentOption)) {
      return res.status(400).json({ error: "Valid payment option is required" });
    }
    
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return res.status(400).json({ error: "Phone number is required" });
    }
    
    if (deliveryOption === 'delivery' && (!address || typeof address !== 'string' || address.trim() === '')) {
      return res.status(400).json({ error: "Address is required for delivery orders" });
    }
    
    // Get user details
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      console.error('User not found for clerkId:', userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log('Found user:', user.email);
    
    // Create new order
    const order = new Order({
      userId: userId,
      userEmail: user.email,
      items,
      total,
      deliveryOption,
      paymentOption,
      address: deliveryOption === 'delivery' ? address : 'Store Pickup',
      phoneNumber,
      status: 'pending'
    });

    console.log('Creating order with data:', order);
    
    const savedOrder = await order.save();
    console.log('Order saved successfully:', savedOrder._id);

    // Calculate coins earned (1 coin per 100 rupees)
    const coinsEarned = Math.floor(total / 100);
    
    // Update user's coins and clear cart in a single operation
    const updatedUser = await User.findOneAndUpdate(
      { clerkId: userId },
      { 
        $set: { cartItem: [] }, // Clear cart completely
        $inc: { coins: coinsEarned }
      },
      { new: true, upsert: false }
    );

    if (!updatedUser) {
      throw new Error('Failed to update user after order creation');
    }

    console.log('User updated, new coin balance:', updatedUser.coins);
    const orderNumber = savedOrder._id.slice(-6).toUpperCase();
    
    // Send SMS notification
    try {
      const smsMessage = smsTemplates.orderPlaced(orderNumber, total);
      await sendSMSNotification(phoneNumber, smsMessage);
      console.log('SMS sent successfully');
    } catch (smsError) {
      console.error('SMS sending failed:', smsError);
      // Don't fail the order if SMS fails
    }

    console.log(`User ${user.email} earned ${coinsEarned} coins for order ${savedOrder._id}`);

    res.status(201).json({
      ...savedOrder.toObject(),
      coinsEarned
    });
  } catch (error) {
    console.error("Error creating order:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      error: "Server error while creating order.",
      details: error.message 
    });
  }
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderNumber = updatedOrder._id.slice(-6).toUpperCase();
    
    // Send SMS notification based on status
    let smsMessage = '';
    switch (status) {
      case 'confirmed':
        smsMessage = smsTemplates.orderConfirmed(orderNumber);
        break;
      case 'preparing':
        smsMessage = smsTemplates.orderPreparing(orderNumber);
        break;
      case 'ready':
        smsMessage = smsTemplates.orderReady(orderNumber, updatedOrder.deliveryOption);
        break;
      case 'delivered':
        smsMessage = smsTemplates.orderDelivered(orderNumber);
        break;
      case 'cancelled':
        smsMessage = smsTemplates.orderCancelled(orderNumber);
        break;
    }
    
    if (smsMessage) {
      await sendSMSNotification(updatedOrder.phoneNumber, smsMessage);
    }

    res.status(200).json(updatedOrder);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Server error while updating order status." });
  }
});

export const getUserOrders = asyncHandler(async (req, res) => {
  try {
    const { userId } = getAuth(req);
    
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ error: "Server error while fetching user orders." });
  }
});