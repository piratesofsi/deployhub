import express, { response } from "express"
import { generate } from "./utils.js";
import fs from "fs/promises";
import { simpleGit } from "simple-git";
import { getAllFiles } from "./file.js"
import { r2 } from "../src/r2.js"
import { Bucket$, PutObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import { createClient } from "redis";
import cors from "cors"



const app = express();
app.use(cors());
app.use(express.json());

// app.get("/welcome",(req,res)=>{
//     res.send({message:"hello"})
// })

const redisClient  = createClient();
await redisClient.connect();

// now design an endpoint which user hits to send the url
app.post("/deploy", async (req, res) => {
    const repoUrl = req.body.repoUrl;

    // generate a unique id for each deployment : can be done using uuid 
    const id = generate();

    // use simple-git to clone the repo and save it in output in this upload-service dirz
    await fs.mkdir("/tmp/deployments", { recursive: true });

    const outputPath = `/tmp/deployments/${id}`;

    await simpleGit().clone(repoUrl, outputPath);



    const files: string[] = await getAllFiles(outputPath);


    // now upload file to the s3 bucket 
    for (const file of files) {
        const relativePath = path.relative(outputPath, file);

        const fileContent = await fs.readFile(file);


        await r2.send(
            new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME!,
                Key: `${id}/${relativePath}`,
                Body: fileContent,
            })
        );

        console.log(`Uploaded: ${relativePath}`);
    }

    //  put deployment in the redis queue 
    await redisClient.lPush("buildQueue",id);
    // stores deployment status js like hashmap id  -> status
    await redisClient.hSet("status",id,"uploaded");

    res.json({
        id
    });




})

app.get("/status",async (req,res)=>{
    const id = req.body.id;
    
    const status = await redisClient.hGet("status",id);

    res.json({
        status
    })

})



app.listen(3000, () => {
    console.log("server started")
});

