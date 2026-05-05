import { Tweet } from "../models/Tweet.js";
import User from "../ models/User.js";

// Helper function to build nested replies tree
const buildReplyTree = async (tweetId, currentUserId, depth = 0, maxDepth = 3) => {
  if (depth > maxDepth) return [];
  
  const replies = await Tweet.find({ 
    parentTweet: tweetId, 
    isReply: true,
    isDeleted: false 
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!replies.length) return [];

  const userIds = replies.map(r => r.author);
  const users = await User.find({ _id: { $in: userIds } }).select("name").lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u.name]));

  const repliesWithAuthors = replies.map(reply => ({
    ...reply,
    authorName: userMap.get(reply.author.toString()) || "Unknown",
    isLiked: reply.likedBy?.some(id => id.toString() === currentUserId) || false,
    replies: [] // will populate recursively
  }));

  // Recursively get nested replies
  for (let reply of repliesWithAuthors) {
    reply.replies = await buildReplyTree(reply._id, currentUserId, depth + 1, maxDepth);
  }

  return repliesWithAuthors;
};

export const TweetController = {
  // Create a new tweet (normal tweet or reply)
  createTweet: async (req, res) => {
    try {
      let { text, media, parentTweetId, replyToUserId } = req.body;
      
      if (!text && (!media || media.length === 0)) {
        return res.status(400).json({ message: "Tweet must have text or media" });
      }

      // Transform media: if media is a string, make it an array; if array of strings, convert to schema objects
      let mediaArray = [];
      if (media) {
        if (typeof media === 'string') {
          mediaArray = [{ url: media, public_id: null, type: null }];
        } else if (Array.isArray(media)) {
          mediaArray = media.map(item => {
            if (typeof item === 'string') {
              return { url: item, public_id: null, type: null };
            }
            return item; // assume already in correct format
          });
        }
      }

      let parentTweet = null;
      let rootTweet = null;
      let isReply = false;
      let replyToUser = null;

      if (parentTweetId) {
        parentTweet = await Tweet.findById(parentTweetId);
        if (!parentTweet) {
          return res.status(404).json({ message: "Parent tweet not found" });
        }
        isReply = true;
        rootTweet = parentTweet.rootTweet || parentTweet._id;
        replyToUser = replyToUserId || parentTweet.author;
      }

      const newTweet = new Tweet({
        author: req.id,
        text: text || "",
        media: mediaArray,
        isReply,
        parentTweet: parentTweetId || null,
        rootTweet: rootTweet,
        replyToUser: replyToUser,
        likedBy: [],
        repostedBy: [],
        bookmarkedBy: [],
        mentions: [],
        hashtags: [],
        visibility: "public"
      });

      await newTweet.save();

      // If reply, increment reply count of parent
      if (isReply && parentTweet) {
        await Tweet.findByIdAndUpdate(parentTweetId, { $inc: { replyCount: 1 } });
      }

      // Populate author name for response
      const author = await User.findById(req.id).select("name");
      const tweetWithAuthor = {
        ...newTweet.toObject(),
        authorName: author.name,
        isLiked: false,
        isReposted: false,
        replies: []
      };

      return res.status(201).json({ 
        message: "Tweet created successfully", 
        tweet: tweetWithAuthor,
        success: true 
      });
    } catch (error) {
      return res.status(500).json({ message: "Error creating tweet: " + error.message });
    }
  },

  // Get a single tweet with its replies nested
  getTweet: async (req, res) => {
    try {
      const { _id } = req.body;
      const currentUserId = req.id;

      const tweet = await Tweet.findOne({ _id, isDeleted: false }).lean();
      if (!tweet) {
        return res.status(404).json({ message: "Tweet not found" });
      }

      // Get author name
      const author = await User.findById(tweet.author).select("name").lean();
      
      // Get replies (nested tree)
      const replies = await buildReplyTree(_id, currentUserId, 0, 5);

      // Check if current user liked/reposted this tweet
      const isLiked = tweet.likedBy?.some(id => id.toString() === currentUserId) || false;
      const isReposted = tweet.repostedBy?.some(id => id.toString() === currentUserId) || false;

      const tweetWithDetails = {
        ...tweet,
        authorName: author.name,
        isLiked,
        isReposted,
        replies
      };

      // Increment view count
      await Tweet.findByIdAndUpdate(_id, { $inc: { viewCount: 1 } });

      return res.json({ tweet: tweetWithDetails });
    } catch (error) {
      return res.status(500).json({ message: "Error fetching tweet: " + error.message });
    }
  },

  // Get timeline tweets (non-replies, public, sorted by latest)
  getTweets: async (req, res) => {
    try {
      const currentUserId = req.id;
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const tweets = await Tweet.find({ 
        isReply: false, 
        isDeleted: false,
        visibility: "public"
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Get all author IDs and fetch names
      const authorIds = tweets.map(t => t.author);
      const users = await User.find({ _id: { $in: authorIds } }).select("name").lean();
      const userMap = new Map(users.map(u => [u._id.toString(), u.name]));

      const tweetsWithDetails = tweets.map(tweet => ({
        ...tweet,
        authorName: userMap.get(tweet.author.toString()) || "Unknown",
        isLiked: tweet.likedBy?.some(id => id.toString() === currentUserId) || false,
        isReposted: tweet.repostedBy?.some(id => id.toString() === currentUserId) || false,
        replies: [] // Don't load replies in timeline for performance
      }));

      return res.json({ 
        tweets: tweetsWithDetails,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: tweets.length === parseInt(limit)
      });
    } catch (error) {
      return res.status(500).json({ message: "Error fetching tweets: " + error.message });
    }
  },

  // Get all tweets of a specific user (including replies and reposts? usually original tweets)
  getAllTweetsOfAUser: async (req, res) => {
    try {
      const currentUserId = req.id;
      const { userId } = req.body; // or from params? Using body like blog controller
      const targetUserId = userId || currentUserId;

      const tweets = await Tweet.find({ 
        author: targetUserId, 
        isDeleted: false,
        isReply: false  // only original tweets, not replies
      })
        .sort({ createdAt: -1 })
        .lean();

      const author = await User.findById(targetUserId).select("name").lean();
      
      const tweetsWithDetails = tweets.map(tweet => ({
        ...tweet,
        authorName: author.name,
        isLiked: tweet.likedBy?.some(id => id.toString() === currentUserId) || false,
        isReposted: tweet.repostedBy?.some(id => id.toString() === currentUserId) || false,
        replies: []
      }));

      // Also get liked tweets array for current user (similar to blog controller)
      const likedTweets = await Tweet.find({ 
        likedBy: currentUserId, 
        isDeleted: false 
      }).select("_id").lean();
      const likedArray = likedTweets.map(t => t._id.toString());

      return res.json({ 
        tweets: tweetsWithDetails,
        LikedArray: likedArray,
        userName: author.name
      });
    } catch (error) {
      return res.status(500).json({ message: "Error fetching user tweets: " + error.message });
    }
  },

  // Like a tweet
  likeTweet: async (req, res) => {
    try {
      const { _id } = req.body;
      const userId = req.id;

      const alreadyLiked = await Tweet.findOne({ _id, likedBy: userId });
      if (alreadyLiked) {
        return res.status(400).json({ message: "You have already liked this tweet" });
      }

      await Tweet.findByIdAndUpdate(_id, {
        $inc: { likeCount: 1 },
        $addToSet: { likedBy: userId }
      });

      return res.json({ message: "Tweet liked successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Error liking tweet: " + error.message });
    }
  },

  // Unlike a tweet
  unlikeTweet: async (req, res) => {
    try {
      const { _id } = req.body;
      const userId = req.id;

      const alreadyLiked = await Tweet.findOne({ _id, likedBy: userId });
      if (!alreadyLiked) {
        return res.status(400).json({ message: "You have not liked this tweet" });
      }

      await Tweet.findByIdAndUpdate(_id, {
        $inc: { likeCount: -1 },
        $pull: { likedBy: userId }
      });

      return res.json({ message: "Tweet unliked successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Error unliking tweet: " + error.message });
    }
  },

  // Repost (retweet)
  repostTweet: async (req, res) => {
    try {
      const { _id } = req.body;
      const userId = req.id;

      const alreadyReposted = await Tweet.findOne({ _id, repostedBy: userId });
      if (alreadyReposted) {
        return res.status(400).json({ message: "You have already reposted this tweet" });
      }

      await Tweet.findByIdAndUpdate(_id, {
        $inc: { repostCount: 1 },
        $addToSet: { repostedBy: userId }
      });

      return res.json({ message: "Tweet reposted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Error reposting tweet: " + error.message });
    }
  },

  // Remove repost
  undoRepost: async (req, res) => {
    try {
      const { _id } = req.body;
      const userId = req.id;

      const alreadyReposted = await Tweet.findOne({ _id, repostedBy: userId });
      if (!alreadyReposted) {
        return res.status(400).json({ message: "You have not reposted this tweet" });
      }

      await Tweet.findByIdAndUpdate(_id, {
        $inc: { repostCount: -1 },
        $pull: { repostedBy: userId }
      });

      return res.json({ message: "Repost removed successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Error removing repost: " + error.message });
    }
  },

  // Delete a tweet (hard delete, but with authorization)
  deleteTweet: async (req, res) => {
    try {
      const { _id } = req.body;
      const tweet = await Tweet.findById(_id);
      if (!tweet) {
        return res.status(404).json({ message: "Tweet not found" });
      }

      const user = await User.findById(req.id);
      const isAuthor = tweet.author.toString() === req.id.toString();
      const isSuperAdmin = user?.superadmin === true;

      if (!isAuthor && !isSuperAdmin) {
        return res.status(403).json({ message: "Unauthorized to delete this tweet" });
      }

      // If this tweet is a reply, decrement parent's replyCount
      if (tweet.isReply && tweet.parentTweet) {
        await Tweet.findByIdAndUpdate(tweet.parentTweet, { $inc: { replyCount: -1 } });
      }

      // Delete all replies to this tweet recursively (optional)
      const deleteReplies = async (tweetId) => {
        const replies = await Tweet.find({ parentTweet: tweetId });
        for (const reply of replies) {
          await deleteReplies(reply._id);
          await Tweet.findByIdAndDelete(reply._id);
        }
      };
      await deleteReplies(_id);

      await Tweet.findByIdAndDelete(_id);

      return res.json({ message: "Tweet deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Error deleting tweet: " + error.message });
    }
  },

  // Get replies for a specific tweet (flat list, paginated) - alternative to nested
  getReplies: async (req, res) => {
    try {
      const { _id } = req.body;
      const currentUserId = req.id;
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const replies = await Tweet.find({ 
        parentTweet: _id, 
        isReply: true,
        isDeleted: false 
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const authorIds = replies.map(r => r.author);
      const users = await User.find({ _id: { $in: authorIds } }).select("name").lean();
      const userMap = new Map(users.map(u => [u._id.toString(), u.name]));

      const repliesWithDetails = replies.map(reply => ({
        ...reply,
        authorName: userMap.get(reply.author.toString()) || "Unknown",
        isLiked: reply.likedBy?.some(id => id.toString() === currentUserId) || false,
        replyCount: await Tweet.countDocuments({ parentTweet: reply._id, isReply: true }) // for nested replies count
      }));

      return res.json({ 
        replies: repliesWithDetails,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: replies.length === parseInt(limit)
      });
    } catch (error) {
      return res.status(500).json({ message: "Error fetching replies: " + error.message });
    }
  },

  // Get liked tweets by current user (for liked page)
  getLikedTweets: async (req, res) => {
    try {
      const currentUserId = req.id;
      const { page = 1, limit = 20 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const tweets = await Tweet.find({ 
        likedBy: currentUserId,
        isDeleted: false
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      const authorIds = tweets.map(t => t.author);
      const users = await User.find({ _id: { $in: authorIds } }).select("name").lean();
      const userMap = new Map(users.map(u => [u._id.toString(), u.name]));

      const tweetsWithDetails = tweets.map(tweet => ({
        ...tweet,
        authorName: userMap.get(tweet.author.toString()) || "Unknown",
        isLiked: true, // because this is liked tweets list
        isReposted: tweet.repostedBy?.some(id => id.toString() === currentUserId) || false
      }));

      return res.json({ 
        tweets: tweetsWithDetails,
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: tweets.length === parseInt(limit)
      });
    } catch (error) {
      return res.status(500).json({ message: "Error fetching liked tweets: " + error.message });
    }
  }
};