//write a controller that create tweet using a req.id which ccomes form middleware
import { eventNotifier } from "../helpers/eventNotifier.js";
import { Tweet } from "../models/Tweet.js";
const { Types } = Tweet.schema;

export const TweetController = {
    createTweet: async (req, res) => {
        const { content, media} = req.body;
        const parentTweetId = req.body?.parentTweetId || null;
        try {
            const newTweet = new Tweet({
                author: req.user.id, // if you are trying to fetch userId from the middleware use req.id not req.user.id, for better understanding refer "src/middleware/AuthMiddleware.js"
                text: content,
                media,
                parentTweet: parentTweetId || null,
            });
            await newTweet.save();
            const meta = { tweetId: newTweet._id, tweetContent: newTweet.text };
            await eventNotifier("NewTweet", req.id, meta);
            res.status(201).json(newTweet);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    //now i want to retrieve all tweets to show on feed 
    getTweets: async (req, res) => {
        try {
            const tweets = await Tweet.find().limit(26)
                .populate("author", "name username profilePicture")
                .populate("parentTweet")
                .populate("rootTweet")
                .populate("replyToUser", "name username profilePicture")
                .sort({ createdAt: -1 });
            res.json(tweets);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    //now i wanna retireive a particular tweets iwth number of likes, reposts, mentions and commetns and content of comments as well, i want to create a tree and send it to frontend so that rendering is eaiser
    getTweetById: async (req, res) => {
        const { id } = req.params;
        try {
            const tweet = await Tweet.findById(id)
                .populate("author", "name username profilePicture")
                .populate("parentTweet")
                .populate("rootTweet")
                .populate("replyToUser", "name username profilePicture");
            if (!tweet) {
                return res.status(404).json({ error: "Tweet not found" });
            }
            res.json(tweet);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    deleteTweet: async (req, res) => {
        const { id } = req.body;
        try {
            const tweet = await Tweet.findById(id);
            if (!tweet) {
                return res.status(404).json({ error: "Tweet not found" });
            }
            if (tweet.author.toString() !== req.user.id) { // if you are trying to fetch userId from the middleware use req.id not req.user.id, for better understanding refer "src/middleware/AuthMiddleware.js"
                return res.status(403).json({ error: "Unauthorized" });
            }
            await tweet.remove();
            await eventNotifier('TweetDeleted', user.id, {})
            res.json({ message: "Tweet deleted successfully" });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    //now i wanna reply to a tweet 
    replyToTweet: async (req, res) => {
        const { content, media, parentTweetId } = req.body; 
        try {
            const parentTweet = await Tweet.findById(parentTweetId);
            if (!parentTweet) {
                return res.status(404).json({ error: "Parent tweet not found" });
            }
            const newTweet = new Tweet({
                author: req.user.id,
                text: content,
                media,
                parentTweet: parentTweetId,
            });
            await newTweet.save();
            const meta = { 
                newTweetId: newTweet._id, 
                tweetContent: content,
                parentTweetId
            };
            await eventNotifier('ReplyedToTweet', user.id, meta);
            res.status(201).json(newTweet);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },
    //now i want to get all users with theri username-profile pic and mongodb object id pair so that it is easier to mention them in a tweet
    getAllUsers: async (req, res) => {
        try {
            const users = await User.find().select("name username profilePicture");
            res.json(users);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

};