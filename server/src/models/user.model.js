import mongoose, { mongo } from "mongoose";

const cartItem = new mongoose.Schema({
    barcode: { 
        type: Number, 
        required: true,
        sparse: true  // This allows multiple documents with null/undefined values
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
        cartItem: [cartItem],
        coins: {
            type: Number,
            default: 0
        }
    },
    { timestamps: true }
)

// Remove the unique constraint from cartItem.barcode to prevent duplicate key errors
// when clearing cart (setting to empty array)
userSchema.index({ 'cartItem.barcode': 1 }, { sparse: true });

const User = mongoose.model('User', userSchema);
export default User