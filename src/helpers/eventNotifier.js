import mongoose from 'mongoose';
import { io } from '../index.js';
import EventNotification from '../models/EventNotification.js';

export const eventNotifier = async (event, triggeredBy, meta) => {
    if(!event || typeof event !== 'string') {
        throw new Error('Event needs to be a string')
    }
    if( !triggeredBy || !mongoose.Types.ObjectId.isValid(triggeredBy) ) {
        throw new Error('Invalid userId')
    }
    
    
    const notification = await EventNotification.create({
        event,
        triggeredBy, 
        meta
    });

    io.to('superadmin').emit('NewEventNotification', notification)
    
}