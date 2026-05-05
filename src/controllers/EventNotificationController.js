import EventNotification from "../models/EventNotification.js";

export const EventNotificationController = {
    getAllNotificatoins: async (req, res) => {;
        const limit = Math.min(40, parseInt(req.query.limit) || 10);
        const page = Math.max(1, parseInt(req.query.page) || 1);

        try { 
            const [notifications, total] = await Promise.all([
                EventNotification.find({})
                .limit(limit)
                .skip((page - 1) * limit)
                .sort({createdAt: 1}),
                EventNotification.countDocuments()
            ])
            if(notifications.length === 0) {
                return res.status(200).json({
                    message: 'No notifications yet'
                });
            }

            return res.status(200).json({ 
                notifications,
                paginationMeta: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total/limit)
                }
            })
        } catch (error) {
            return res.status(500).json({
                message: error.message
            })
        }

    }
}