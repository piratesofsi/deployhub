import express from "express"
import "dotenv/config"
import { getObject } from "./r2.js";
import path from "node:path";


const app = express();
app.use(express.json());

app.get("/:deployementId/*path", async (req, res) => {
    const id = req.params.deployementId;
    const filePath = req.params.path.join("/");

    console.log(id);
    console.log(filePath);

    // res.send(`requesting deployment: ${id}`);
    // res.json({ message: `requesting deployment : ${id}` })

    // will construct key to get the folder of the deployement 
    const key = `output/${id}/${filePath}`;

    const object = await getObject(key);

    console.log("object received from R2");

    // res.send("file found in R2");
    const body = object.Body;

    if (!body) {
        res.status(404).send("File not found");
        return;
    }

    const data = await body.transformToByteArray();

    const extension = path.extname(filePath);

    const contentTypes: Record<string, string> = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "application/javascript",
        ".json": "application/json",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml",
        ".ico": "image/x-icon",
        ".webp": "image/webp"
    };

    const contentType =
        contentTypes[extension] || "application/octet-stream";

    res.setHeader("Content-Type", contentType);

    res.end(Buffer.from(data));

})

const port = process.env.PORT || 4000;

app.listen(port, () => {
    console.log(`server started at port : ${port}`)
});