import express from "express";
import { DyeFormController } from "../controllers/DyeFormController.js";

const router = express.Router();

router.post("/", DyeFormController.Create);
router.get("/", DyeFormController.GetAll);
    
export default router;
