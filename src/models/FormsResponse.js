// this will be a generic form thing 
import mongoose, { mongo } from "mongoose";
import { boolean } from "zod";


const ResponseSchema = new mongoose.Schema({
  form_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "FormGeneric",
    required: true,
    index: true
  },
  answers: [{
    field_id: mongoose.Schema.Types.ObjectId,
    value: mongoose.Schema.Types.Mixed
  }], // from the frontend this should come attached the id of the field and the answer 
  submitted_at: {
    type: Date,
    default: Date.now
  }
})


export default mongoose.model('FormResponse', ResponseSchema);
