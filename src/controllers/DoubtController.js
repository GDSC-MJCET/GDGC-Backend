import { eventNotifier } from "../helpers/eventNotifier.js";
import Doubt from "../models/Doubt.js";
export const doubtController = {
    postDoubt : async (req,res)=>{
        const {message} = req.body
        const tag = req.body?.tag || 'General'
        try {
            if (!message) {
                return res.status(400).json({error:"dont leave fields empty"})
            }
            const doubt = new Doubt({
                message,tag
            })
            const createdDoubt = await doubt.save()
            await eventNotifier('NewDoubtPosted', req.id, createdDoubt);
            return res.status(200).json(doubt)
        } catch (error) {
             return res.status(400).json({"error":error.message})
        }
    },
    getDoubts : async (req,res)=>{
        const maxLimit = 10
       try {
        const doubts=  await Doubt.find().sort({createdAt:-1}).limit(maxLimit).select("message createdAt tag")
        if (doubts) {
         
            if (doubts.length==0) {
             return res.status(200).json({"status":"no messages"})
            }
            return res.status(200).json({doubts})
        }
       } catch (error) {
        return resres.status(400).json({"error":error.message})
       }
       return res.status(500).json({"status":"server Error"})
    }
}