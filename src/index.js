import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import dyeRoutes from "./routes/dyeRoutes.js";
// Load .env from root directory
dotenv.config({ path: path.join(__dirname, '../.env') });
import express from "express"
import cors from "cors"
import connectDB from "./mongodb/index.js";
const app = express();

// Enable JSON body parsing
app.use(express.json());
app.use(cors());

connectDB();

import {formRouter} from "./routes/form.js"
import { techDebateRouter } from './routes/techDebate.js'
import { qrRouter } from './routes/qr.js'
import { userRouter } from "./routes/user.js";
import { authRouter } from "./routes/auth.js";
import { dashboardRouter } from './routes/dashboard.js';
import { adminRouter } from "./routes/admin.js";
// app.get('/',(req , res)=>{
//     res.json({
//         message : "Hello world"
//     })
// })


app.use('/api/v1/dye-application', dyeRoutes)
app.use("/api/v1/admin",adminRouter)
app.use("/api/v1/user",userRouter)
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/dashboard",dashboardRouter)
app.use('/api/v1/techdebate',techDebateRouter)
app.use('/api/v1/form',formRouter)


// QR router should be LAST since it catches all remaining routes
app.use("/",qrRouter)


// Start server
const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});

