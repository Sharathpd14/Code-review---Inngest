import "dotenv/config"
import express from "express"
import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import { functions } from "./inngest/functions/index.js";

const app = express()
const PORT = 3000
app.use(express.json())

app.use(
    // Expose the middleware on our recommended path at `/api/inngest`.
    "/api/inngest",
    serve({ client: inngest, functions : functions })
);


app.listen(PORT, ()=>{
    console.log(`Server is running on http://localhost:${PORT}`)
})