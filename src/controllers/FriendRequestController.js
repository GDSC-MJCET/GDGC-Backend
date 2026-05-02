import FriendRequest from '../models/FriendRequest.js';
import { io, userSocketMap } from '../index.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { messageRouter } from '../routes/message.js';

 const COOL_DOWN_PERIOD = 2 * 24 * 60 *  60 * 1000;
export const FriendRequestController = {

    SendFriendRequest: async (req, res) => { 
        const receiver = req.params.receiver;
        const sender = req.id;
        if(!receiver) {
            return res.status(400).json({
                message: 'Receiver id needed'
            })
        }
        if(sender.toString() === receiver.toString()) {
            return res.status(400).json({ message: 'Cannot request to be your own friend' })
        }
        try {
            // Checking if the request already exists
            const existingRequest = await FriendRequest.findOne({
                $or: [
                    { sender, receiver},
                    { sender: receiver, receiver: sender}
                ]
            });
            if(!existingRequest) { // No request exists so, one is created
                const newFriendRequest = await FriendRequest.create({
                    sender,
                    receiver
                });
 
                // receiver notified
                const receiverSocketId = userSocketMap[receiver];
                if(receiverSocketId) {
                    io.to(receiverSocketId).emit('NewFriendRequest', newFriendRequest);
                }

                return res.status(201).json({
                    message: 'new friend request created and sent to the reciever',
                    newFriendRequest
                })
            }
            if(existingRequest.status !== 'rejected') { // if accepted or pending or blocked
                return res.status(409).json({
                    message: `Friend request already exists and is ${existingRequest.status}`
                })
            }
            // computing time elapsed after being rejected
            const timeAfterRejection = Date.now() - existingRequest.rejectedAt.getTime();
            if(
                timeAfterRejection < COOL_DOWN_PERIOD && // elapsed time should be more than cool down period or else try later
                sender.toString() === existingRequest.sender.toString() // previous sender should be the current sender (resending the request after being rejected)
            ) {
                return res.status(409).json({
                    message: 'Try again later'
                })
            } 
            
            existingRequest.status = 'pending'; 
            if(sender.toString() === existingRequest.receiver.toString()) { // current user(sender) should have received a request from the current receiver meaning the current user must be same as the previous receiver
                existingRequest.receiver = receiver; // changing the previous request's receiver(current user/sender) to the current receiver  
                existingRequest.sender = sender; // changing the previous sender(current receiver) to the current sender who is the current user
            }
            existingRequest.rejectedAt = null;
            await existingRequest.save();

            const receiverSocketId = userSocketMap[receiver];
            if(receiverSocketId) {
                io.to(receiverSocketId).emit('NewFriendRequest', existingRequest);
            }

            return res.status(200).json({
                message: 'Rejected request refreshed'
            });

        } catch (error) {
            return res.status(500).json({
                message: error.message
            })
        }
    },

    AcceptFriendRequest: async (req, res) => {
        // Get sender id from params, validate
        const receiver = req.id;
        const sender = req.params.sender;
        if(!sender) {
            return res.status(400).json({
                message: 'Senders Id is required'
            })
        }
        if(sender.toString() === receiver.toString()) {
            return res.status(400).json({ message: 'Cannot accept to be your own friend' })
        }

        try {
            // check for existing request if rejected throw error else if already friend throw conflict error else if pending patch!
            const existingRequest = await FriendRequest.findOneAndUpdate({
                sender,
                receiver
            }, {status: 'accepted'});
            if(!existingRequest) {
                return res.status(400).json({
                    message: 'No such friend request found'
                })
            }
    
            // create a conversation between them
            const conversation = await Conversation.create({
                participants: [sender, receiver],
            });
            await conversation.populate('participants', 'name admin superadmin');
            

            // notify the sender of the status
            const senderSocketId = userSocketMap[sender];
            if(senderSocketId) {
                io.to(senderSocketId).emit('FriendRequestAccepted', conversation)
            }

            return res.status(200).json({
                message: 'Friend request accepted',
                conversation
            });

        } catch (error) {
            return res.status(500).json({
                message: error.message
            })
        }
    },

    RejectFriendRequest: async (req, res) => {
        // Get sender id from params, validate
        const receiver = req.id;
        const sender = req.params.sender;
        if(!sender) {
            return res.status(400).json({
                message: 'Senders Id is required'
            })
        }
        if(sender.toString() === receiver.toString()) {
            return res.status(400).json({ message: 'Cannot deny request to be your own friend' })
        }

        try {
            // check for existing request if rejected throw error else if already friend throw conflict error else if pending patch!
            const existingRequest = await FriendRequest.findOne({
                sender,
                receiver
            });
            if(!existingRequest) {
                return res.status(400).json({
                    message: 'No friend request found'
                })
            }
            if(existingRequest.status !== 'pending') {
                return res.status(409).json({
                    message: `Request has already been ${existingRequest.status}`
                })
            }

            existingRequest.status = 'rejected';
            existingRequest.rejectedAt = new Date()
            await existingRequest.save()
    
    
            // notify the sender of the status
            const senderSocketId = userSocketMap[sender];
            if(senderSocketId) {
                io.to(senderSocketId).emit('FriendRequestRejected')
            }

            return res.status(200).json({
                message: 'Friend request rejected'
            });

        } catch(error) {
            return res.status(500).json({
                message: error.message
            })
        }
    },

    GetAllFriendRequests: async (req, res) => {
        const userId = req.id;

        try {
            const friendRequests = await FriendRequest.find({
                $or: [
                    { receiver: userId },
                    { sender: userId }
                ],
                status: 'pending'
            })
            .populate('sender', 'name admin superadmin')
            .populate('receiver', 'name admin supreadmin');
            if(friendRequests.length === 0) {
                return res.status(200).json({ message: 'No friend requests yet' })
            }

            return res.status(200).json({
                friendRequests
            })
        } catch (error) {
            return res.status(500).json({ message: error.message })
        }
    },

    GetAllRejectedFriendRequests: async (req, res) => {
        const userId = req.id;

        try {
            const rejectedFriendRequests = await FriendRequest.find({
                $or: [
                    { receiver: userId },
                    { sender: userId }
                ],
                status: 'rejected'
            })
            .populate('sender', 'name admin superadmin')
            .populate('receiver', 'name admin supreadmin');
            if(rejectedFriendRequests.length === 0) {
                return res.status(200).json({ message: 'No rejections yet' })
            }

            return res.status(200).json({
                rejectedFriendRequests
            })
        } catch (error) {
            return res.status(500).json({ message: error.message })
        }
    },
    // conflict with GetAllConversations
    GetAllFriends: async (req, res) => {
        const userId = req.id;

        try {
            const friends = await FriendRequest.find({
                $or: [
                    { receiver: userId },
                    { sender: userId }
                ],
                status: 'accepted'
            })
            .populate('sender', 'name admin superadmin')
            .populate('receiver', 'name admin superadmin')
            if(friends.length === 0) {
                return res.status(200).json({ message: 'No friends yet' })
            }

            return res.status(200).json({
                friends
            })
        } catch (error) {
            return res.status(500).json({ message: error.message })
        }
    },

    GetAllConversations: async (req, res) => {
        // get user id
        const userId = req.id;
        // query all the conversations where user is a participant
        try {
            const conversations = await Conversation.find({
                participants: userId 
            }).populate('participants', 'name admin superadmin');
            if(conversations.length === 0) {
                return res.status(200).json({message: "You don't have any friends"})
            }

            return res.status(200).json({
                message: 'conversation fetched successfully',
                conversations
            })
        } catch (error) {
            return res.status(500).json({
                message: error.message
            })
        }
    },

    BlockFriend: async (req, res) => {
        const userId = req.id;
        const blockFriendId = req.params.unfrinedId;
        if(!blockFriendId) {
            return res.status(400).json({
                message: 'unfriendId is required'
            });
        }
        if(userId.toString() === blockFriendId.toString()) {
            return res.status(400).json({ message: 'Cannot block your own self' })
        }

        try {
            // Check for existing && accepted friend requests with user and unfriend, if none thorw error
            const existingRequest = await FriendRequest.findOneAndUpdate({
                $or: [
                    { receiver: userId, sender: blockFriendId },
                    { receiver: blockFriendId, sender: userId },
                ],
                status: 'accepted'
            }, {status: 'blocked'});
            if(!existingRequest) {
                return res.status(404).json({
                    message: 'No such friend to unfrined'
                })
            }

            const conversation = await Conversation.findOneAndUpdate(
                {
                    participants: {
                        $all: [
                            userId,
                            blockFriendId
                        ]
                    }
                },
                {
                    $set: { blocked: true }
                }
            );

            // Send the other party a notification
            // Question to captain, should the user being blocked be notified about him being blocked by the current user?
            const blockFriendSocketId = userSocketMap[blockFriendId];
            if(blockFriendSocketId) {
                io.to(blockFriendSocketId).emit('Blocked', {
                    blocker: userId,
                    conversationId: conversation._id
                })
            }
    
            // return result
            return res.status(200).json({
                message: 'user blocked successfully',
            })
        } catch (error) {
            return res.status(500).json({
                message: error.message
            })
        }
    },

    UnblockFriend: async (req, res) => {
        //get the userId and Id of the friend to be unblocked
        const userId = req.id;
        const unBlockFriendId = req.params.unBlockFriendId;

       try {
         // get the existing friend request and check if it is blocked, if it is update
         const existingRequest = await FriendRequest.findOneAndUpdate({
             $or: [
                 {sender: userId, receiver: unBlockFriendId},
                 {receiver: userId, sender: unBlockFriendId}
             ],
             status: 'blocked'
         }, { status: 'accepted' });
         if(!existingRequest) { // if not blocked throw
             return res.status(404).json({
                 message: 'No such request found'
             })
         }
 
         // if blocked, turn to accepted
         const conversation = await Conversation.findOneAndUpdate(
            {
                participants: {
                    $all: [userId, unBlockFriendId]
                }
            },
            { $set: { blocked: false } }
         );
 
         // notify the other party
         const unBlockFriendSocketId = userSocketMap[unBlockFriendId];
         if(unBlockFriendSocketId) {
             io.to(unBlockFriendSocketId).emit('Unblocked', {
                unBlocker: userId,
                conversationId: conversation._id
             });
         }
 
         // return response
         return res.status(200).json({
             message: 'Unblocked successfully'
         })
       } catch (error) {
            return res.status(500).json({
                message: error.message
            });
       }
    },

    GetAllUsers: async (req, res) => {
        // get user id 
        const userId = req.id;
        // get search query name and pagination details page, limit, 
        const { name, page=1, limit=10 } = req.query;
        

        // construct a query object
        const dbQuery = { _id: {$ne:userId} }
        if(name) dbQuery.name = {$regex: name, $options: 'i'};

        try {
            // get users where current user is not included with name and include only name admin superadmin

            const [users, total] = await Promise.all([
                User
                .find(dbQuery)
                .skip((Number(page)-1)*Number(limit))
                .limit(Number(limit))
                .select('name admin superadmin'),

                User.countDocuments(dbQuery)
            ]);
            if(users.length === 0) return res.status(404).json({
                message: 'Users not found'
            })
            // send response
            
            return res.status(200).json({
               users,
               metaData: {
                page,
                limit,
                total
               }
            })
        } catch (error) {
            return res.status(500).json({message: error.message})
        }
    },
 
}