import express from "express";
import { EventNotificationController } from "../controllers/EventNotificationController.js";
import { VerifyToken } from "../middleware/AuthMiddleware.js";
import SuperAdminMiddleware from "../middleware/SuperAdminMiddleware.js";

export const eventNotificationRouter = express.Router();

eventNotificationRouter
.route('/get')
.get(
    VerifyToken, 
    SuperAdminMiddleware, 
    EventNotificationController.getAllNotificatoins
)