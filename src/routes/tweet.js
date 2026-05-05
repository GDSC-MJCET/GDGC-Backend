import express from "express";
import { TweetController } from "../controllers/tweet.controller.js";
import { VerifyToken } from "../middleware/auth.js";

const router = express.Router();

// All tweet routes require authentication
router.use(VerifyToken);

// Tweet CRUD operations
router.post("/create", TweetController.createTweet);
router.post("/get", TweetController.getTweet);
router.get("/list", TweetController.getTweets); // with pagination query params: ?page=1&limit=20
router.post("/user", TweetController.getAllTweetsOfAUser); // expects { userId? } in body
router.post("/delete", TweetController.deleteTweet);

// Engagement actions
router.post("/like", TweetController.likeTweet);
router.post("/unlike", TweetController.unlikeTweet);
router.post("/repost", TweetController.repostTweet);
router.post("/unrepost", TweetController.undoRepost);

// Replies and liked tweets listing
router.post("/replies", TweetController.getReplies); // expects { _id, page?, limit? }
router.get("/liked", TweetController.getLikedTweets); // pagination query params

export default router;