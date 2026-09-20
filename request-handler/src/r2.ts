import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import "dotenv/config"



const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    }
});

const getObject = async (key: string) => {
    const response = await s3.send(
        new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key
        })
    );
    return response;
}

export {getObject}