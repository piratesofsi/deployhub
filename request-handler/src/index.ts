import express from "express"
import "dotenv/config"
import { getObject } from "./r2.js";
import path from "node:path";


const app = express();
app.use(express.json());


// /ug67s → /ug67s/index.html
app.get("/:deploymentId", (req, res) => {
    const id = req.params.deploymentId;

    res.redirect(`/${id}/index.html`);
});


app.get("/:deploymentId/*path", async (req, res) => {
    const id = req.params.deploymentId;

    let filePath = req.params.path.join("/");

    if (!filePath) {
        filePath = "index.html";
    }

    console.log("deployment:", id);
    console.log("file:", filePath);

    const key = `output/${id}/${filePath}`;

    const object = await getObject(key);

    const body = object.Body;

    if (!body) {
        res.status(404).send("File not found");
        return;
    }

    const data = await body.transformToByteArray();

    let content = Buffer.from(data);

    /*
     * The built website uses absolute asset paths:
     *
     * /assets/index.css
     *
     * Rewrite them so they include the deployment ID:
     *
     * /ug67s/assets/index.css
     */
    if (filePath === "index.html") {
        const html = content.toString("utf-8");

        const modifiedHtml = html.replace(
            /(["'(])\/assets\//g,
            `$1/${id}/assets/`
        );

        content = Buffer.from(modifiedHtml);
    }

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

    res.end(content);
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
    console.log(`server started at port : ${port}`)
});