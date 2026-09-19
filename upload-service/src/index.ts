import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { generate } from "./utils.js";
import { createClient } from "redis";


dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());



// we need to create redis-client 
const publisher = createClient();

publisher.on("error", (error) => {
    console.error("redisErorr:", error);
})
// now connect the client to the redis server 
await publisher.connect();



// so we need to get the repoUrl and then generate unique id and js pass it to the redis 
app.post("/deploy", async (req, res) => {
    try {
        const repoUrl = req.body.repoUrl;

        if (!repoUrl) {
            res.status(400).json({ error: "repoUrl is required" });
            return;
        }

        const id = generate();

        const job = {
            id,
            repoUrl
        }

        await publisher.lPush(
            "buildQueue",
            JSON.stringify(job)

        );

        await publisher.hSet(
            "status",
            id,
            "queued"
        )

        console.log(`deployment queued for id : ${id}`);

        res.json({
            id,
        })


    }
    catch (e) {
        console.error("Failed to queue deployment:", e);

        res.status(500).json({
            error: "Failed to create deployment",
        });
    }
}

)

app.get("/status", async (req, res) => {
    try {
        const id = req.query.id as string;

        if (!id) {
            res.status(400).json({
                error: "Deployment Id is required"
            });
            return;
        }

        const response = await publisher.hGet("status", id);

        res.json({
            response
        });
    }
    catch (e) {
        console.error("Failed to get deployment status:", e);

        res.status(500).json({
            error: "Failed to get deployment status",
        });
    }

})

app.listen(3000, () => {
    console.log(`server started at Port:${process.env.PORT}`)
})