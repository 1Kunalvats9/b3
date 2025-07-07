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

dotenv.config();

const app = express();
const server = createServer(app);

// Enhanced Socket.io configuration
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:8081", "https://b3-iota.vercel.app", "*"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6
});

// Make io available to controllers
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Send welcome message to confirm connection
    socket.emit('connected', { 
        message: 'Connected to server successfully',
        socketId: socket.id 
    });
    
    socket.on('join-admin', () => {
        socket.join('admin');
        console.log('Admin joined:', socket.id);
        socket.emit('admin-joined', { message: 'Successfully joined admin room' });
    });
    
    socket.on('join-user', (userId) => {
        socket.join(`user-${userId}`);
        console.log('User joined room:', `user-${userId}`);
        socket.emit('user-joined', { message: `Successfully joined user room: ${userId}` });
    });
    
    // Handle connection errors
    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });
    
    // Handle ping/pong for connection health
    socket.on('ping', () => {
        socket.emit('pong');
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
    
    // Handle any socket errors
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// Enhanced CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:8081',
            'https://b3-iota.vercel.app',
            /^http:\/\/192\.168\.\d+\.\d+:8081$/, // Local network IPs
            /^http:\/\/10\.\d+\.\d+\.\d+:8081$/,  // Local network IPs
            /^http:\/\/172\.\d+\.\d+\.\d+:8081$/ // Local network IPs
        ];
        
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (typeof allowedOrigin === 'string') {
                return origin === allowedOrigin;
            } else if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return false;
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(null, true); // Allow all for now, can be restricted later
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

(async () => {
    try {
        await connectDb(); 
        console.log('Database connected successfully.');

        app.use(cors(corsOptions));
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
        
        // Health check endpoint
        app.get('/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                socketConnections: io.engine.clientsCount 
            });
        });

        server.listen(process.env.PORT || 3000, () => {
            console.log(`Server is starting on port ${process.env.PORT || 3000} ✅`);
            console.log(`Socket.io server ready for connections 🔌`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1); 
    }
})();