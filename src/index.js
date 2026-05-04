import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import dyeRoutes from "./routes/dyeRoutes.js";

// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../.env') });
import express from "express"
import cors from "cors"
import connectDB from "./mongodb/index.js";
const app = express();

// Creating raw http server
import http from 'http'
const httpServer = http.createServer(app);

// Creating a socket server
import { Server } from 'socket.io';
import SocketAuthMiddleware from './middleware/SocketAuthMiddleware.js';

export const io = new Server(httpServer);

export const userSocketMap = {}

io.use(SocketAuthMiddleware)

// Broadcasts all the online users on connection
io.on('connect', (socket) => {
    const userId = socket.data.userId;
    userSocketMap[userId] = socket.id;
    if(socket.data.superadmin) {
        socket.join('superadmin');
    }

    io.emit('GetUsers', Object.keys(userSocketMap));

    socket.on('Typing', ({conversationId, receiverId}) => {
        const receiverSocketId = userSocketMap[receiverId];
        if(receiverSocketId) socket.to(receiverSocketId).emit('Typing', {conversationId, sender: userId});
    });

    socket.on('StopTyping', ({conversationId, receiverId}) => {
        const receiverSocketId = userSocketMap[receiverId];
        if(receiverSocketId) socket.to(receiverId).emit('StopTyping', {conversationId})
    })

    socket.on('disconnect', () => {
        delete userSocketMap[userId];
        io.emit('GetUsers', Object.keys(userSocketMap));
    })
})

// Enable JSON body parsing
app.use(express.json());
app.use(cors());

connectDB();

import { techDebateRouter } from './routes/techDebate.js'
import { qrRouter } from './routes/qr.js'
import { userRouter } from "./routes/user.js";
import { authRouter } from "./routes/auth.js";
import { dashboardRouter } from './routes/dashboard.js';
import { adminRouter } from "./routes/admin.js";
import { contactRouter } from './routes/contact.js'
import { friendRequestRouter } from './routes/friendRequest.js';
import { messageRouter } from './routes/message.js'
import  socialsRouter  from "./routes/socials.js";
import {imageRouter} from "./routes/image.js";

import { buildweekRouter } from './routes/buildweek.js'
import { blogRouter } from "./routes/blog.js";
import { problemRouter } from "./routes/problems.js";
import { submissionRouter } from "./routes/submissions.js";
import { exerciseRouter } from "./routes/exercises.js";
import { leaderboardRouter, userStatsRouter } from "./routes/leaderboard.js";


app.use('/api/v1/dye-application', dyeRoutes)
app.use("/api/v1/admin",adminRouter)
app.use("/api/v1/user",userRouter)
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/dashboard",dashboardRouter)
app.use('/api/v1/techdebate',techDebateRouter)
app.use('/api/v1/contact',contactRouter)
app.use('/api/v1/friend-request', friendRequestRouter)
app.use('/api/v1/message', messageRouter)
app.use("/api/v1/blog", blogRouter)
app.use("/api/v1/images", imageRouter);
app.use("/api/v1/buildweek",buildweekRouter);

app.use("/api/auth", authRouter)
app.use("/api/problems", problemRouter)
app.use("/api/submissions", submissionRouter)
app.use("/api/exercises", exerciseRouter)
app.use("/api/leaderboard", leaderboardRouter)
app.use("/api/users", userStatsRouter)
app.use("/api/v1/socials", socialsRouter);

// QR router should be LAST since it catches all remaining routes
app.use("/",qrRouter)


// Start server
const PORT = process.env.PORT || 3009;
httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

