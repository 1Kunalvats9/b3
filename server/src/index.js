import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import userRoutes from "./routes/user.routes.js";
import productRoutes from "./routes/products.route.js";
import orderRoutes from "./routes/order.routes.js";
import messageRoutes from "./routes/message.routes.js";
import {clerkMiddleware} from '@clerk/express';
import connectDb from './utils/connectDb.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

dotenv.config();

// Make io available to controllers
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join-admin', () => {
        socket.join('admin');
        console.log('Admin joined:', socket.id);
    });
    
    socket.on('join-user', (userId) => {
        socket.join(`user-${userId}`);
        console.log('User joined room:', `user-${userId}`);
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

(async () => {
    try {
        await connectDb(); 
        console.log('Database connected successfully.');

        app.use(cors());
        app.use(express.json());
        app.use(clerkMiddleware());

        // Routes
        app.use('/api/users', userRoutes);
        app.use('/api/products', productRoutes);
        app.use('/api/orders', orderRoutes);
        app.use('/api/sendSms', messageRoutes);
        
        app.get('/', (req, res) => {
            res.send('Hello from Server !! 🎉');
        });

        server.listen(process.env.PORT || 3000, () => {
            console.log(`Server is starting on port ${process.env.PORT || 3000} ✅`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1); 
    }
})();