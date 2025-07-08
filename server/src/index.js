import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import userRoutes from "./routes/user.routes.js";
import productRoutes from "./routes/products.route.js";
import orderRoutes from "./routes/order.routes.js";
import messageRoutes from "./routes/message.routes.js";
import {clerkMiddleware} from '@clerk/express';
import connectDb from './utils/connectDb.js';

dotenv.config();

const app = express();

const corsOptions = {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    optionsSuccessStatus: 200
};

(async () => {
    try {
        await connectDb(); 
        console.log('Database connected successfully.');

        app.use(cors(corsOptions));
        app.use(express.json());
        
        app.use((req, res, next) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('X-Frame-Options', 'DENY');
            res.setHeader('X-XSS-Protection', '1; mode=block');
            res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
            next();
        });
        
        app.use(clerkMiddleware());
        
        app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            console.log('Headers:', req.headers.authorization ? 'Authorization header present' : 'No authorization header');
            next();
        });
        
        app.use((err, req, res, next) => {
            console.error('Unhandled error:', err);
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: 'Internal server error',
                    details: err.message 
                });
            }
        });
        
        app.options('*', (req, res) => {
            res.status(200).json({
                message: 'Preflight OK'
            });
        });
        
        app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development'
            });
        });
        
        app.use((req, res, next) => {
            const originalSend = res.send;
            res.send = function(data) {
                if (typeof data === 'string' && !res.get('Content-Type')) {
                    res.set('Content-Type', 'application/json');
                }
                return originalSend.call(this, data);
            };
            next();
        });
        
        app.use((err, req, res, next) => {
            console.error('Final error handler:', err);
            if (!res.headersSent) {
                res.status(500).json({ 
                    error: 'Internal server error',
                    details: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
                });
            }
        });
        
        app.use('/api/users', userRoutes);
        app.use('/api/products', productRoutes);
        app.use('/api/orders', orderRoutes);
        app.use('/api/sendSms', messageRoutes);
        
        app.get('/', (req, res) => {
            res.status(200).json({ 
                message: 'Hello from Server !! 🎉',
                timestamp: new Date().toISOString(),
                status: 'OK',
                version: '1.0.0'
            });
        });

        // Updated 404 handler for Express 5+
        app.use('*', (req, res) => {
            res.status(404).json({ 
                error: 'Not Found',
                message: `The requested URL ${req.originalUrl} was not found on this server.`
            });
        });
        
        app.listen(process.env.PORT || 3000, () => {
            console.log(`Server is starting on port ${process.env.PORT || 3000} ✅`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1); 
    }
})();