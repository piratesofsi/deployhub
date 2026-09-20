import {
    S3Client,
    PutObjectCommand
} from "@aws-sdk/client-s3";

import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv"

dotenv.config();

const s3 = new S3Client({
     region:"auto",
    endpoint:`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials:{
         accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    }
});

async function getAllFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, {
        withFileTypes: true
    });

    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            files.push(...await getAllFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

export async function uploadDist(
    distPath: string,
    deploymentId: string
) {
    const files = await getAllFiles(distPath);

    for (const file of files) {
        const relativePath = path.relative(distPath, file);

        const key = `output/${deploymentId}/${relativePath}`;

        const body = await fs.readFile(file);

        await s3.send(
            new PutObjectCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Key: key,
                Body: body
            })
        );

        console.log(`uploaded: ${key}`);
    }
}