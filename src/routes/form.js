import express from "express";
import { FromController } from "../controllers/FormController.js";
import FormsTemplate from "../models/FormsTemplate.js";
export const formRouter = express.Router()

formRouter.post("/create-form",FromController.createForm)
formRouter.patch("/create-form",FromController.updateForm)
formRouter.get("/get-form/:id",FromController.getForm)
formRouter.post("/toggle-status",FromController.openCloseForm)
formRouter.post("/submit-form",FromController.userFormSubmit)