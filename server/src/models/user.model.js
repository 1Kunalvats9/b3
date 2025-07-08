import mongoose, { mongo } from "mongoose";

const cartItem = new mongoose.Schema({
    barcode: { 
        type: Number, 
        required: true
    }
}, { timestamps: true })

const userSchema = new mongoose.Schema(
    {
        clerkId: {
            type: String,
            unique: true,
        },
        email: {
            type: String,
            unique: true,
        },
        profilePicture: {
            type: String,
            default: "",
        },
        cartItem: {
            type: [cartItem],
            default: []
        },
        coins: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
)

// Remove the problematic index that's causing the duplicate key error
// We'll handle uniqueness at the application level instead
userSchema.index({ clerkId: 1 });
userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);
export default User