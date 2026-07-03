import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Qr from '../models/Qrmodel.js';
import {z} from 'zod';
import {nanoid } from 'nanoid';
import nodemailer from 'nodemailer';

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};
export const AuthController = {
    Register: async (req , res) => {
        try {
            const {name , email , password} = req.body;
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'User already exists with this email'
                });
            }
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Create new admin
            const newAdmin = new User({
                name,
                email,
                password: hashedPassword
            });

            await newAdmin.save();

            // Generate token
            const token = generateToken(newAdmin._id);

            // Remove password from response
            const adminResponse = {
                id: newAdmin._id,
                name: newAdmin.name,
                email: newAdmin.email
            };

            res.status(201).json({
                success: true,
                message: 'Admin registered successfully',
                token,
                admin: adminResponse
            });
        }
        catch(e){
            res.status(500).json({
                success: false,
                message: 'Server error during login',
                error: e.message
            });
        }
    } ,
    LoginAdmin : async (req , res, next) => {
         try {
            const { email, password } = req.body;

            // Check if email and password are provided
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide email and password'
                });
            }

            // Find admin by email
            const admin = await User.findOne({ email });
            if (!admin) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Check password
            const isPasswordValid = await bcrypt.compare(password, admin.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Generate token
            const token = generateToken(admin._id);

            // Admin response without password
            const adminResponse = {
                id: admin._id,
                name: admin.name,
                email: admin.email
            };

            res.status(200).json({
                success: true,
                message: 'Admin login successful',
                token,
                admin: adminResponse
            });
            next();

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Server error during login',
                error1: error.message
            });
        }
    },
    CreateUserFromEmail : async (req , res) => {
        // console.log("request log", req.body)
        
        try {
            const requiredBody = z.object({
                name:z.string(),
                email:z.email(),
                id:z.string()
            })
            const parsedBody = requiredBody.safeParse(req.body);
            
            if(!parsedBody.success){
                return res.status(404).json({
                    message:parsedBody.error
                })
            }
            // is the id valid ?? does an acc already exits with this id ?? 
            // ==> qr model mein check if there exists an id => id is valid 
            let {name, email , id} = req.body;
            
            if (id%process.env.SECRET!=0){
                return res.status(401).json({
                    message:"Unauthorized"
                })
            }
            
            id = id/process.env.SECRET
            let existingId;
            try {
                // console.log("passed")
                // console.log(name, email, id)
                existingId = await Qr.findOne({id:id});
                // console.log(existingId)
            } catch (error) {
                return res.status(500).json({
                    error2:error.message
                })
            }
            // console.log(existingId)
            if(existingId){
                const existingUserEmail = await User.findOne({email});
                const existingUserQrId = await User.findOne({qr_id:id})
                if(!existingUserEmail && !existingUserQrId){
                    const password = nanoid();
                    const salt = await bcrypt.genSalt(10);
                    const hash = await bcrypt.hash(password, salt);
                    const transporter = nodemailer.createTransport({
                    host:"smtp-relay.brevo.com",
                    port: 587,
                    secure: false, // use false for STARTTLS; true for SSL on port 465
                    auth: {
                        user: process.env.BREVO_USER,
                        pass: process.env.BREVO_PASS,
                    }
                    });

                    
                        // try{kjakjakja
                            await transporter.sendMail({
                            from: "GDGC MJCET <gdgc.noreply@gmail.com>",
                            to: email,
                            subject: "Password for GDGC account",
                            html: `<h1>Hello from the Web Dev Team</h1>Thank you for Signing up, Here is your password : <b>${password}</b> <br>To keep your account safe, we encourage you on not sharing your password with anyone.  <br><br>Best Wishes, <br>Web Dev Team, GDGC MJCET`
                        });

                     
                    // }
                    //     catch(e){
                    //         return res.status(404).json({error3: e})
                    //     }
                    //     ;
                                      
                    try {
                        const user = await User.create({
                            name, 
                            email,
                            password : hash,
                            qr_id: id
                        })
                        
                    } catch (error) {
                        return res.status(500).json({
                            error4:error.message
                        })
                    }
                    
                    // const ali = await aser.save();
                    // console.log("user saved",ali)
                    // const testingUrl = "http://localhost:5173/login"
                    existingId.destination = "https://gdgcmjcet.in/login"

                    await existingId.save();
                    // console.log(existingId)
                    return res.json({
                        success:true
                    })
                }
                else {
                return res.status(401).json({
                    success: false,
                    message: 'Email Already Exists'
                });
            }
            }
            else{
                return res.status(401).json({
                    success:false,
                    message: 'ID Doesnt Exists'
                })
            }
            // ==> now check any user model if an user already exist with this id => already taken => error : go ahead 
            // generate a new password 
            // hash the new password and put in db 
            // create a account for them by adding the hashed password , email , id in it 
            // send the password and you are invited mail to the email use postmarker 
            // u dont need to send a token 
        } catch (error) {
            return res.status(500).json({
                success : false ,
                message : "Something went wrong" + error
            })
        }
    },
    GuestLogin: async (req, res) => {
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({
            success: false,
            message: 'Please provide name and email for guest login'
        });
    }

    try {
        const existingUser = await User.findOne({ email }); // ← awaited
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists. Please log in instead.'
            });
        }

        const password = nanoid();
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const guestUser = new User({
            name,
            email,
            password: hash,
            guest: true,
            qr_id: 'abcd'
        });
        console.log(guestUser)

        await guestUser.save(); // ← also fix the [guestUser.save](http://...) hyperlink bug

        const transporter = nodemailer.createTransport({
            host: "smtp-relay.brevo.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.BREVO_USER,
                pass: process.env.BREVO_PASS,
            }
        });

        await transporter.sendMail({
            from: "GDGC MJCET <gdgc.noreply@gmail.com>",
            to: email,
            subject: "Password for GDGC account",
            html: `<h1>Hello from the Web Dev Team</h1>Thank you for Signing up, Here is your password : <b>${password}</b>...`
        });

        return res.json({
            success: true,
            message: 'Guest user created successfully'
        });

    } catch (error) {
        console.error('Error creating guest user:', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating guest user ' + error.message
        });
    }
},
    LoginUser : async(req,res)=>{
        
        try {
            const requiredBody = z.object({
            email:z.email(),
            password:z.string()
            })

            const verifiedInputBody = requiredBody.safeParse(req.body);
            if(!verifiedInputBody.success){
                console.log("zod error ")
                return  res.status(405).json({
                        message: verifiedInputBody.error
                })
            }
            // console.log(verifiedInputBody)
            const {email, password} = verifiedInputBody.data;
            // console.log(email , password , "this is email and password")
            const user = await User.findOne({email:email});
            // console.log(user)
            if(!user){
                return res.status(401).json({
                    message:"User not found"
                })
            }
            if(await bcrypt.compare(password, user.password)){
                const token = jwt.sign({id:user._id}, process.env.JWT_SECRET);

                return res.json({
                    token:token,
                    guest:user.guest,
                    name:user.name,
                })
            }
            else{
                return res.status(401).json({
                    message:"Password Incorrect"
                })
            }
        } catch (error) {
            console.log(error.message)
            return res.status(500).json({
                message:error.message
            })
        }
    },
    ForgotPassword: async(req,res)=>{
        const requiredBody = z.object({
            email:z.email()
        })
        const body = requiredBody.safeParse(req.body);
        if(!body.success){
            return res.status(401).json({
                message:"give an email"
            })
        }
        const email = req.body.email;
        try {
            const user = await User.findOne({
                email
            })
            if(user){
                    const password = nanoid();
                    const salt = await bcrypt.genSalt(10);
                    const hash = await bcrypt.hash(password, salt);
                    const transporter = nodemailer.createTransport({
                    host:"smtp-relay.brevo.com",
                    port: 587,
                    secure: false, // use false for STARTTLS; true for SSL on port 465
                    auth: {
                        user: process.env.BREVO_USER,
                        pass: process.env.BREVO_PASS,
                    }
                    });

                    
                        // try{
                            await transporter.sendMail({
                            from: "GDGC MJCET <gdgc.noreply@gmail.com>",
                            to: email,
                            subject: "Password for GDGC account",
                            html: `<h1>Hello from the Web Dev Team</h1>Here is your new password : <b>${password}</b> <br>To keep your account safe, we encourage you on not sharing your password with anyone. <br><br>Best Wishes, <br>Web Dev Team, GDGC MJCET`
                        });
                    user.password = hash;
                    // console.log(user.password)
                    await user.save()
                    return res.status(200).json({
                        success:true
                    })

            }
            else{
                return res.status(401).json({
                    message:"email not found"
                })
            }
        } catch (error) {
            return res.status(500).json({
                message:error.message
            })
        }
    },
    // This is redundant
    // aboutUser : async (req , res) => {
    //     try {     
    //         const id = req.id  
    //         console.log("about the user this is " , id)
    //         const data = await User.findOne({_id:id})
    //         console.log(data , "thisis the user")
    //         res.status(200).json({
    //             success : true,
    //             name : data.name , 
    //             email : data.email
    //         })
    //     } catch (error) {
    //         res.status(500).json({
    //             success : false ,
    //             error : error
    //         })
    //     }

    // },
    ChangePassword: async(req,res)=>{
        const requiredBody = z.object({
            password:z.string().min(6)
        })
        try {
            const body = requiredBody.safeParse(req.body);
            if(!body.success){
                return res.status(401).json({
                    success:false,
                    message:body.error
                })
            }
            const password = req.body.password
            const user = await User.findOne({_id:req.id}).select("password")
            if(await bcrypt.compare(password, user.password)){
                res.status(401).json({
                    message:"It's the same password",
                    success:false
                })
                return
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password,salt)
            await User.updateOne({_id:req.id},{password:hashedPassword})
            res.status(200).json({
                success:true
            })
        } catch (error) {
            res.status(500).json({
                error:error.message
            })
        }
    },
        SimpleVerify : async(req,res)=>{
        return res.json({
            success:true
        })
    },
    Me: async (req, res) => {
        try {
            const user = await User.findById(req.id).select('-password');
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });
            res.json({ success: true, user });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
    }
    },
    deleteAllguestUsers: async(req,res)=>{
        try {
                res.status(200).json({
                    "message":" Testers Not Allowed Here, Get the Hell Out ",
                    success:true
                })
        } catch (error) {
            res.status(500).json({
                success:false,
                message:error.message
            })
        }
    }
}
