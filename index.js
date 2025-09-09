import express from "express"
import cors from "cors"

const app = express();

// Enable JSON body parsing
app.use(express.json());
app.use(cors());

// Prisma Client (generated to ./generated/prisma in schema)
import { PrismaClient } from "./generated/prisma/index.js";
const prisma = new PrismaClient();

app.get('/',(req , res)=>{
    res.json({
        message : "Hello world"
    })
})

app.get('/applications', async (req, res) => {
    try {
        const applications = await prisma.application.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: applications });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
})


app.post('/application' , async (req , res) => {
    try {
        const {
            applicationId,
            name,
            rollNo,
            phoneNo,
            branch,
            year,
            resume,
            linkedin,
            email ,
            github,
            previousWork,
            selectedPortfolios,
            portfolio1,
            portfolio2,
            status
        } = req.body;

        const created = await prisma.application.create({
            data: {
                applicationId,
                name,
                rollNo,
                phoneNo,
                branch,
                year,
                resume,
                linkedin,
                email ,
                github,
                previousWork,
                selectedPortfolios,
                portfolio1,
                portfolio2,
                ...(status ? { status } : {})
            }
        });

        res.status(201).json({ success: true, data: created });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
})

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});