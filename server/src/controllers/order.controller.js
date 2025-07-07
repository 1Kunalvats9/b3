import Order from '../models/order.model.js';
import User from '../models/user.model.js';
import asyncHandler from 'express-async-handler';
import { getAuth } from '@clerk/express';

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
    console.log('entered creatingorder')
    const { userId } = getAuth(req);
    const { items, total, deliveryOption, paymentOption, address, phoneNumber } = req.body;

    // Get user details
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    console.log("user found")

    // Create new order
    const order = new Order({
      userId: userId,
      userEmail: user.email,
      items,
      total,
      deliveryOption,
      paymentOption,
      address,
      phoneNumber,
      status: 'pending'
    });

    const savedOrder = await order.save();


    // Calculate coins earned (1 coin per 100 rupees)
    const coinsEarned = Math.floor(total / 100);
    
    // Update user's coins and clear cart
    await User.findOneAndUpdate(
      { clerkId: userId },
      { 
        $set: { cartItem: [] },
        $inc: { coins: coinsEarned }
      }
    );

    console.log(`User ${user.email} earned ${coinsEarned} coins for order ${savedOrder._id}`);
    console.log('order created')
    res.status(201).json({
      ...savedOrder.toObject(),
      coinsEarned
    });

  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: "Server error while creating order." });
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