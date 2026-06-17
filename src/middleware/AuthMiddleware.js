import jwt from 'jsonwebtoken';
import User from '../models/User.js'

// Sets req.id if a valid token is present, but never blocks the request
export const OptionalVerifyToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header) return next();
    const token = header.split(' ')[1];
    if (!token) return next();
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id });
    if (user) req.id = user._id;
  } catch (_) { /* invalid token — just skip */ }
  next();
};

export const VerifyToken = async (req, res, next) => {
        try {
            let token;
            token = req.headers.authorization.split(" ")[1];
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'No token provided, access denied'
                });
            }
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get admin from token
            const user = await User.findOne({_id:decoded.id})
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Token is not valid'
                });
            }
            req.id = user._id;
            next();

        } catch (error) {
            console.log(error.message + " Error in auth middleware")
            res.status(500).json({
                
                success: false,
                error: error.message + "Please check through token "
            });
        }
    }
