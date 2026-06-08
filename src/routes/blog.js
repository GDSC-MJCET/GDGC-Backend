import express from "express";
import {BlogController} from "../controllers/BlogController.js";
import { VerifyToken } from "../middleware/AuthMiddleware.js";
import SuperAdminMiddleware from "../middleware/SuperAdminMiddleware.js";
import { defaultLimiter } from "../middleware/RateLimitter.js";
export const blogRouter = express.Router()
blogRouter.use(defaultLimiter);


blogRouter.route('/get-blogs').get(BlogController.getBlogs)
blogRouter.route('/get-blog').post(BlogController.getBlog)
blogRouter.route('/publish-blog').post(VerifyToken,BlogController.publishBlog)
blogRouter.route('/like-blog').post(VerifyToken,BlogController.upVoteBlog)
blogRouter.route('/unlike-blog').post(VerifyToken,BlogController.downVoteBlog)
blogRouter.route('/delete-blog').delete(VerifyToken,BlogController.deleteBlog)
blogRouter.route('/add-comment').post(VerifyToken,BlogController.addComment)
blogRouter.route('/remove-comment').post(VerifyToken,BlogController.removeComment)
blogRouter.route('/get-comments').post(VerifyToken,BlogController.getComments)
blogRouter.route('/my-blogs').get(VerifyToken,BlogController.getAllBlogsOfAUser)
blogRouter.route('/get-unvalidated-blogs').get(VerifyToken,SuperAdminMiddleware,BlogController.getUnvalidatedBlogs)
blogRouter.route('/validate-blog').post(VerifyToken,SuperAdminMiddleware,BlogController.validateBlog)
