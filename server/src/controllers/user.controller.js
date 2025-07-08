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
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - no user ID found" });
    }
  
    console.log('Syncing user with ID:', userId);

    // check if user already exists in mongodb
    const existingUser = await User.findOne({ clerkId: userId });
    if (existingUser) {
      console.log('User already exists:', existingUser.email);
      return res.status(200).json({ user: existingUser, message: "User already exists" });
    }

    // create new user from Clerk data
    const clerkUser = await clerkClient.users.getUser(userId);
    
    if (!clerkUser || !clerkUser.emailAddresses || clerkUser.emailAddresses.length === 0) {
      return res.status(400).json({ error: "Invalid user data from Clerk" });
    }
    
    console.log('Clerk user data:', clerkUser.emailAddresses[0].emailAddress);

    const userData = {
      clerkId: userId,
      email: clerkUser.emailAddresses[0].emailAddress,
      profilePicture: clerkUser.imageUrl || "",
    };

    const user = await User.create(userData);
    console.log('New user created:', user.email);

    res.status(201).json({ user, message: "User created successfully" });
  } catch (error) {
    console.error('Error in syncUser:', error);
    res.status(500).json({ 
      error: "Failed to sync user", 
      details: error.message 
    });
  }
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized - no user ID found" });
    }
    
    console.log('Getting current user for ID:', userId);
    
    const user = await User.findOne({ clerkId: userId });

    if (!user) {
      console.log('User not found for ID:', userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log('User found:', user.email);
    res.status(200).json({ user });
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    res.status(500).json({ 
      error: "Failed to get user data", 
      details: error.message 
    });
  }
});


export const updateCart = asyncHandler(async (req, res) => {
    const { cartItems, email } = req.body;
    
    // Allow empty array to clear cart
    if (!Array.isArray(cartItems)) {
        return res.status(400).json({ error: "cartItems must be an array" });
    }
    
    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }
    
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        // If cartItems is empty, clear the cart
        if (cartItems.length === 0) {
            // Clear cart by removing all items and reinitializing
            await User.findOneAndUpdate(
                { email: email },
                { $unset: { cartItem: 1 } }
            );
            
            const updatedUser = await User.findOneAndUpdate(
                { email: email },
                { $set: { cartItem: [] } },
                { new: true }
            );
            
            return res.status(200).json({ message: "Cart cleared successfully", user: updatedUser });
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

        if (itemsToAdd.length === 0) {
            return res.status(200).json({ message: "All provided items are already in the cart or no new items to add." });
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