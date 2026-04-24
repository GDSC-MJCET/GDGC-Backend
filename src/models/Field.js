// this will be a generic form thing 
import mongoose, { mongo } from "mongoose";
import { boolean } from "zod";
import { required } from "zod/mini";


const FieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['string', 'number', 'dropdown', 'multiple'],
    required: true
  },
  isCompulsary : {
    type : Boolean ,
    required : true
  },
  unique : {
    type : Boolean ,
    required : true
  },
  Form_id : {
    type : mongoose.Schema.Types.ObjectId,
    required : true 
  },
  options: [String]
})

export default mongoose.model('FieldSchema', FieldSchema);
