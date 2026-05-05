import jwt from 'jsonwebtoken'
import User from '../models/User.js';

const SocketAuthMiddleware = async (socket, next) => {
    // Get token from headers
    const token = socket.handshake.headers.authorization?.split(" ")[1];
    if(!token) {
        return next(new Error('Token not found'))
    }

    try {
        // Verifying the token and attaching to socket's data
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded?.id).select('superadmin')
        if(!user) {
            return next(new Error('User not found'));
        }

        socket.data.userId = user._id;
        socket.data.superadmin = user.superadmin;
        next()
    } catch (error) {
        next(error)
    }
}

export default SocketAuthMiddleware