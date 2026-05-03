import { io, userSocketMap } from "../index.js";
import { decrypt, encrypt } from "../helpers/encryption.js";
import Message from "../models/Message.js";
import mongoose from "mongoose";

export const MessageController = {
    SendMessage: async (req, res) => {
        // get message, sender, receiver, conversation form body, id param, conversation(middleware)
        const plainMessage = req.body.message;
        const conversation = req.conversation;
        const userId = req.id;
        const receicver = conversation.participants.find(
            id => id.toString() !== userId.toString()
        );

        // validate them
        if(!receicver) {
            return res.status(400).json({
                message: 'No reciever sent'
            });
        }
        if(!plainMessage || typeof plainMessage !== 'string' || !plainMessage.trim()) {
            return res.status(400).json({
                message: 'Invalid message'
            });
        }

        // make a message object fields - {sender, originalMessage}
        const emitData = {
            message: plainMessage, 
            sender: userId, 
            conversationId: conversation._id
        };

        // encrypt the message and store cypherMessage:iv:tag as string and a copy of original message to emit later
        const {cypherText, iv, tag} = encrypt(plainMessage);
        const cypherMessage = `${cypherText}:${iv}:${tag}`
        try {
            // create the message doc with conversationId, cypherMessage, sender
            const newMessage = await Message.create({
                conversationId: conversation._id,
                sender: userId,
                message: cypherMessage
            });
            emitData.sentAt = newMessage.createdAt;

            // emit the message object to the receiver
            const receiverSocketId = userSocketMap[receicver];
            if(receiverSocketId) io.to(receiverSocketId).emit('NewMessage', emitData);

            // update the last message of the conversation
            conversation.lastMessage = newMessage._id;
            await conversation.save();

            // return response
            return res.status(200).json({
                message: 'Message sent succcessfully'
            })
        } catch (error) {
            return res.status(500).json({
                message: error.message
            })
        }
    },

    GetMessages: async (req, res) => {
        // get query params for pagination
        // const { limit = 10, cursor } = req.query;
        const limit = Math.min(30, parseInt(req.query.limit) || 10);
        const cursor = req.query.cursor;
        if(cursor && !mongoose.Types.ObjectId.isValid(cursor)) {
            return res.status(400).json({
                message: 'Invalid cursor'
            })
        }

        // get conversation
        const conversation = req.conversation;
        const userId = req.id;
        const selectedUser = conversation.participants.find(id => id.toString() !== userId);

        try {
            const dbQuery = { conversationId: conversation._id };
            if(cursor) dbQuery._id = { $lt: cursor };

            const messages = await Message.find(dbQuery).select('-conversationId')
            .limit(Number(limit))
            .sort({ _id: 1 });

            if(messages.length === 0) return res.status(200).json({ message: 'No messages yet' });

            const unseenMessageIds = messages.filter(
                (message) => 
                    message.sender.toString() === selectedUser.toString() && 
                    !message.seen
            )
            .map(messages => messages._id);
            
            if(unseenMessageIds.length !== 0) {
                await Message.updateMany(
                    { _id: { $in: unseenMessageIds } }, 
                    { $set: { seen: true } }
                );
            }

            const sendable = messages.map(
                (chat) => {
                    if(chat.message) {
                        const [cypherText, iv, tag] = chat.message.split(':');
                        const decypherMessage = decrypt({ cypherText, iv, tag });
                        return {
                            ...chat.toObject(),
                            message: decypherMessage
                        };
                    } else {
                        return chat.toObject();
                    }
                }
            );

            if(unseenMessageIds.length !== 0) {
                const selectedUserSocketId = userSocketMap[selectedUser];
                if(selectedUserSocketId) {
                    io.to(selectedUserSocketId).emit('MessageSeen', {
                        conversationId: conversation._id,
                        unseenMessageIds
                    })
                }
            }

            return res.status(200).json(sendable)
        } catch (error) {
            return res.status(500).json({ message: error.message })
        }
    },

    RemoveMessage: async (req, res) => {
        // get coversationId, messageId
        const messageId = req.params.messageId;
        const conversation = req.conversation;
        const userId = req.id;
        if(!messageId || !mongoose.Types.ObjectId.isValid(messageId)) return res.status(400).json({ message: 'messageId is required' });

        // get the message object by id and unset
        try {
            const chat = await Message.findOneAndUpdate(
               { _id: messageId, sender: userId }, 
                {
                    $set: { message: null}
                }, 
                { new: true }            
            );
            if(!chat) return res.status(404).json({ message: 'No message with such id found' });

            const receiver = conversation.participants.find(
                id => id.toString() !== userId.toString()
            );

            const receiverSocketId = userSocketMap[receiver];
            if(receiverSocketId) io.to(receiverSocketId).emit('MessageRemoved', {messageId: chat._id})
    
            return res.status(200).json({ message: 'message removed successfully' });
        } catch (error) {
            return res.status(500).json({ message: error.message })
        }

    },

    EditMessage: async (req, res) => {
        // get message from body
        const editedPlainMessage = req.body.message;
         if(!editedPlainMessage || typeof editedPlainMessage !== 'string' || !editedPlainMessage.trim()) {
            return res.status(400).json({
                message: 'Invalid message'
            });
        }
        // get message id form param
        const messageId = req.params.messageId;
        if(!messageId || !mongoose.Types.ObjectId.isValid(messageId)) return res.status(400).json({
            message: 'message ID is required'
        })
        // get conversation form req
        const conversation = req.conversation;
        // get user and receiver
        const userId = req.id;
        const receiver = conversation.participants.find(
            id => id.toString() !== userId.toString()
        );

        // make the emit object with the actual message
        const emitObject = { message: editedPlainMessage, editor: userId, messageId };

        // encrypt the message
        const cypherObject = encrypt(editedPlainMessage);
        const cypherMessage = `${cypherObject.cypherText}:${cypherObject.iv}:${cypherObject.tag}`;

        try {
            // get message and edit where message id and sender is user
            const editedMessage = await Message.findOneAndUpdate({
                _id: messageId,
                sender: userId,
                message: { $ne: null }
            }, {
                $set: { message: cypherMessage }
            });
            if(!editedMessage) return res.status(404).json({
                message: 'Cannot find such message'
            })
    
            // add updaated at in emit object
            emitObject.editedAt = editedMessage.updatedAt;
            // emit the object to the receiver
            const receiverSocketId = userSocketMap[receiver];
            if(receiverSocketId) io.to(receiverSocketId).emit('EditedMessage', emitObject);
            // send response 
            return res.status(200).json({
                message: 'Edited successfully',          
            })
        } catch (error) {
            return res.status(500).json({
                message: error.message
            });
        }
    }
}