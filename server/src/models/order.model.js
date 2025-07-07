import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  category: { type: String, required: true },
  image: { type: String, default: '' }
});

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  deliveryOption: { 
    type: String, 
    required: true, 
    enum: ['delivery', 'takeaway'] 
  },
  paymentOption: { 
    type: String, 
    required: true, 
    enum: ['online', 'cod'] 
  },
  address: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });

// Add indexes for better performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

export default mongoose.model('Order', orderSchema);