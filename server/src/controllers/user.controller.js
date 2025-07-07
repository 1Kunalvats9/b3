import { clerkClient, getAuth } from '@clerk/express';
import User from '../models/user.model.js'
import Notification from '../models/notification.model.js'
import asyncHandler from 'express-async-handler'


export const getUserProfile = asyncHandler(async (req,res) =>{
    const {email} = req.body();
    const user = await User.findOne({email});

    if(!user) return res.status(404).json({error: "User not found"})
    res.status(200).json({user})
})

export const updateProfile = asyncHandler(async (req,res)=>{
    const {userId} = getAuth(req);
    const user = User.findOneAndUpdate({clerkId:userId},req.body,{new:true})
    if(!user) return res.status(404).json({error:'User not found'});

    res.status(200).json({user})
})


export const syncUser = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  
  console.log('Syncing user with ID:', userId);

  // check if user already exists in mongodb
  const existingUser = await User.findOne({ clerkId: userId });
  if (existingUser) {
    console.log('User already exists:', existingUser.email);
    return res.status(200).json({ user: existingUser, message: "User already exists" });
  }

  // create new user from Clerk data
  const clerkUser = await clerkClient.users.getUser(userId);
  console.log('Clerk user data:', clerkUser.emailAddresses[0].emailAddress);

  const userData = {
    clerkId: userId,
    email: clerkUser.emailAddresses[0].emailAddress,
    profilePicture: clerkUser.imageUrl || "",
  };

  const user = await User.create(userData);
  console.log('New user created:', user.email);

  res.status(201).json({ user, message: "User created successfully" });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const { userId } = getAuth(req);
  const user = await User.findOne({ clerkId: userId });

  if (!user) return res.status(404).json({ error: "User not found" });

  res.status(200).json({ user });
});


export const updateCart = asyncHandler(async (req, res) => {
    const { cartItems, email } = req.body;
    if (!cartItems || !Array.isArray(cartItems)) {
        return res.status(400).json({ error: "cartItems must be a non-empty array" });
    }
    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const itemsToAdd = [];
        for (const item of cartItems) {
            if (item && typeof item.barcode === 'number') {
                const exists = user.cartItem.some(existingItem => existingItem.barcode === item.barcode);
                if (!exists) {
                    itemsToAdd.push({ barcode: item.barcode });
                }
            } else {
                return res.status(400).json({ error: "Each cart item must have a valid 'barcode' (number)." });
            }
        }

        if (itemsToAdd.length === 0 && cartItems.length > 0) {
            return res.status(200).json({ message: "All provided items are already in the cart." });
        } else if (itemsToAdd.length === 0) {
            return res.status(200).json({ message: "No new items to add to the cart." });
        }

        const updatedUser = await User.findOneAndUpdate(
            { email: email },
            { 
                $push: { 
                    cartItem: { 
                        $each: itemsToAdd
                    } 
                } 
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(500).json({ error: "Failed to update user cart." });
        }

        res.status(200).json({ message: "Cart updated successfully", user: updatedUser });

    } catch (error) {
        console.error("Error updating cart:", error);
        if (error.code === 11000) {
            return res.status(409).json({ error: "One or more items (barcodes) already exist in the cart." });
        }
        res.status(500).json({ error: "Server error during cart update." });
    }
});