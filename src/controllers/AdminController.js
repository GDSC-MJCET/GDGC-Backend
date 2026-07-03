import { Verify, verify } from "crypto";
import Blog from "../models/Blog.js";
import User from "../models/User.js";
import { success } from "zod";
import Contact from "../models/Contact.js";
// an admin cannot create a new admin 

const AdminController={
    VerifyAdmin:async(req,res)=>{
       
        res.status(200).json({
            success:true
        })
    },
    VerifySuperAdmin:async(req,res)=>{
        res.status(200).json({
            success:true
        })
    },
    submitBlog: async(req,res)=>{
        const {title,des,banner,tags,content}= req.body;
        const Admin = req.admin;
        const blog = new Blog({
            title,des,banner,tags,content,Admin
        })
       try {
         const bllog = await blog.save()
         return res.json({success:true,blogSaved:bllog})
       } catch (error) {
        return res.json({success:false,error:error.message})
       }
        
    },
    checkIfUserExists: async(req,res)=>{
        try {
            const {id}= req.body;
            const user = await User.findById(id)
            if(!user){
                return res.json({success:false,message:"User not found",user:null})
            }
            return res.json({success:true,user:user})
        } catch (error) {
            return res.json({success:false,error:error.message,user:null})
        }
    },
    createAdmin: async(req,res)=>{
        try {
            const {id}= req.body;
            const user = await User.findById(id)
            if(!user){
                return res.json({success:false,message:"User not found",adminCreated:false})
            }
            const admin = await User.findByIdAndUpdate(id,{admin:true},{new:true})
            return res.json({success:true,adminCreated:true,user:admin})
        } catch (error) {
            return res.json({success:false,error:error.message,adminCreated:false})
        }   
    },
    createSuperAdmin: async(req,res)=>{
        try {
            const {id}= req.body;
            const user = await User.findById(id)
            if(!user){
                return res.json({success:false,message:"User not found",superAdminCreated:false})
            }
            if(!user.admin){
                return res.json({success:false,message:"User must be an admin before becoming a superadmin",superAdminCreated:false})
            }
            const admin = await User.findByIdAndUpdate(id,{superadmin:true},{new:true})
            return res.json({success:true,superAdminCreated:true,user:admin})
        } catch (error) {
            return res.json({success:false,error:error.message,superAdminCreated:false})
        }
    },
    
    removeAdmin: async(req,res)=>{
        try {
            const {id}= req.body;
            if(id === req.id){
                return res.json({success:false,message:"You cannot remove yourself from the superadmin list",superAdminRemoved:false})
            }
            const user = await User.findById(id)
            if(!user){
                return res.json({success:false,message:"User not found",adminRemoved:false})
            }
            const admin = await User.findByIdAndUpdate(id,{admin:false},{new:true})
            return res.json({success:true,adminRemoved:true,user:admin})
        } catch (error) {
            return res.json({success:false,error:error.message,adminRemoved:false})
        }
    },
    removeSuperAdmin: async(req,res)=>{
        try {
            // should i be able remove myself from the superadmin list ?
            // should the superadmin be able to remove other superadmins ?? 
            const {id} = req.body;
            if(id === req.id){
                return res.json({success:false,message:"You cannot remove yourself from the superadmin list",superAdminRemoved:false})
            }
            const user = await User.findById(id)
            if(!user){
                return res.json({success:false,message:"User not found",superAdminRemoved:false})
            }
            const superAdmin = await User.findByIdAndUpdate(id,{admin:false,superadmin:false},{new:true})
            return res.json({success:true,superAdminRemoved:true,user:superAdmin})
        } catch (error) {
            return res.json({success:false,error:error.message,superAdminRemoved:false})
        }
    },

    getAllUsers: async(req,res)=>{
        try {
            const users = await User.find().select("-password")
            return res.json({success:true,users:users})
        } catch (error) {
            return res.json({success:false,error:error.message,users:null})
        }
    },
    getAllAdmins: async(req,res)=>{
        try {
            const admins = await User.find({admin:true}).select("-password")
            return res.json({success:true,admins:admins})
        } catch (error) {
            return res.json({success:false,error:error.message,admins:null})
        }
    },
    getAllSuperAdmins: async(req,res)=>{
        try {
            const superAdmins = await User.find({superadmin:true}).select("-password")
            return res.json({success:true,superAdmins:superAdmins})
        } catch (error) {
            return res.json({success:false,error:error.message,superAdmins:null})
        }
    },
    getContacts: async (req, res) => {
      try {
          const contacts = await Contact.find().sort({ createdAt: -1 });
          return res.json({ success: true, contacts });
      } catch (error) {
          return res.json({ success: false, error: error.message, contacts: null });
      }
    },
    getStats: async (req, res) => {
      try {
        const totalUsers = await User.countDocuments();
        const totalAdmins = await User.countDocuments({ admin: true, superadmin: false });
        const totalSuperAdmins = await User.countDocuments({ superadmin: true });

    res.json({
      success: true,
      stats: { totalUsers, totalAdmins, totalSuperAdmins },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch stats." });
  }
}
}


export default AdminController;