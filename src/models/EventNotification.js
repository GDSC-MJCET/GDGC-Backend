import mongoose from "mongoose";

const eventNotificationSchema = new mongoose.Schema({
    triggeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    event: {
        type: string,
        required: true
    },
    meta: {
        type: Object,
        default: {}
    }
}, { timestamps: true });

export default mongoose.model('EventNotification', eventNotificationSchema);