import mongoose from "mongoose"
import FormsTemplate from "../models/FormsTemplate.js"
import {z , success} from "zod"
import { parse } from "dotenv"
import { print } from "../helpers/printFunction.js"
import FormsResponse from "../models/FormsResponse.js"

// this lies all the core logic for the form 
export const FromController={
    // first we need to create a form 
    // here is when i decide how i want my fields data to look like 
    // there should be an array of fields all of those dields will be given in the form of an array 
    // name : "Form Name"
    // status : true / false 
    // formInput input arrays = [[{"name" : "name" ,"type" : "number" , "required" : true , option : []}]] this is how the input for the fields will look like 
    // this an admin only operation
    createForm: async (req,res)=> {
        try {
            const fieldSchema = z.object({
                name: z.string().min(1),
                type: z.enum(['text', 'number', 'dropdown', 'multiple']),
                isCompulsary: z.boolean(),
                options: z.array(z.string()).optional()
            }) 
            
            const formSchema = z.object({
                name: z.string().min(1),
                fields: z.array(fieldSchema)
            })
            const parsed = formSchema.safeParse(req.body)
            if (!parsed.success) {
                // console.log(parsed)
                return res.status(400).json({
                    error : parsed.error
                })
            }
            const {name ,  fields} = parsed.data
            let form = new FormsTemplate({
                name : name,
                status : false , // initially the status of the form will be false closed 
                fields : fields
            })
            await form.save()
            return res.status(201).json({
                "success" : true ,
                "message" : "form created successfully"
            })
        } catch (error) {
            return res.status(500).json({
                "success" : false ,
                "error" : "Server error " + error 
            })
        }
    },
    updateForm: async (req , res) => {
        // we need to update the specific field here 
        // the basic feature will not have anything like versioning or something 
        // so better to like update the whole state entirely 
        try {
            const fieldSchema = z.object({
                name: z.string().min(1),
                type: z.enum(['text', 'number', 'dropdown', 'multiple']),
                isCompulsary: z.boolean(),
                options: z.array(z.string()).optional()
            }) 
            const formSchema = z.object({
                id : z.string(), 
                name: z.string().min(1),
                fields: z.array(fieldSchema)
            })
            const parsed = formSchema.safeParse(req.body)
            if (!parsed.success) {
                res.status(400).json({
                    error : parsed.error.errors
                })
            }
            const {id , name , fields} = parsed.data
            let data = await FormsTemplate.findById(id)
            // console.log(data , "this is the data")
            // const checkIfStatusIsLive = await FormsTemplate.findById(id)
            await FormsTemplate.findByIdAndUpdate(id ,{
                name ,
                fields 
                } , {new : true , runValidators : true }
            )

            return res.status(201).json({
                "success" : true ,
                "message" : "form updated successfully"
            })
        } catch (error) {
            return res.status(500).json({
                "success" : false ,
                "error" : "Server error " + error 
            })
        }
    },
    getForm: async (req , res) => {
        // in this firstly we check 
        try {
            const {id} = req.params
            print(id)
            let form_gotten = await FormsTemplate.findById(id)
            print(form_gotten)
            res.status(200).json({
                "form_name" : form_gotten.name ,
                "status" : form_gotten.status ,
                "fields" : form_gotten.fields,
                "success" : true
            })
        } catch (error) {
            return res.status(500).json({
                "success" : false ,
                "error" : "Server error " + error 
            })
        }
        
    },
    openCloseForm : async (req , res) => {
        // this will be used to change the status of the form from open to everyone and closed something like that 
        try {
            const {id} = req.body
            const toBeToggled = await FormsTemplate.findById(id)
            await FormsTemplate.findByIdAndUpdate(id , {
                status : !toBeToggled.status
            }) 
            res.status(200).json({
                "success" : true ,
                "message" : "the status of the form have been toggled successfully"
            })
        } catch (error) {
            return res.status(500).json({
                "success" : false ,
                "error" : "Server error " + error 
            })
        }
    },
    userFormSubmit : async (req , res) => {
        // now we will be submitting the form 
        try {
            const {id, answers} = req.body
            // we need to loop through all the  items and check if they 
            let map = {}
            let unique_elements = []
            print(answers)
            for ( let i = 0 ; i < answers.length ; i++) {
                // console.log("this is i" + answers)
                print(answers[i].value)
                if (map[answers[i].field_id]) {
                    return res.status(403).json({
                        "success" : false ,
                        "message" : "each field should have an unique id"
                    })
                }
                map[answers[i].field_id] = answers[i].value
            }
            const formTemplate = await FormsTemplate.findById(id)
            const fields = formTemplate.fields
            print(fields)
            for (let k = 0 ; k < fields.length ;k++){
                if (fields[k].unique == true) {
                    unique_elements.push(fields[k]._id) 
                }
                if (fields[k].isCompulsary == true) {
                        if(!map[fields[k]._id]){
                            return res.status(403).json({
                            "success" : false ,
                            "message" : "required field is not given"
                        })
                    }
                }
                // these checks are only for string and numbers for now lets see what we can do ahead alot of regex stuff can be done
                if (map[fields[k]._id]) {
                    print("====================")
                    print(map[fields[k]._id])
                    print(typeof(map[fields[k]._id]))
                    print(fields[k].type)
                    print("====================")
                    if (typeof(map[fields[k]._id]) !== fields[k].type){
                        print("found it not equal")
                        return res.status(403).json({
                            "success" : false ,
                            "message" : "required field is of wrong type"
                        })
                    }
                }
                // now i need to check if is is unique or not 

            }
            
            for (let l = 0 ; l < unique_elements.length ; l++){
                
            }

            // we need to do the unique checking thing like check if that exist in the db for that partocualr form id and all 


            // the type checking and the 
            
            print(map)
            const response = new FormsResponse({
                form_id : id,
                answers : answers
            })
            response.save()
            return res.status(200).json({
                "success" : true ,
                "response" : "response"
            })
        } catch (error) {
           return res.status(500).json({
                "success" : false ,
                "error" : "Server error " + error 
            }) 
        }
    }
}