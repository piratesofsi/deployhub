import dotenv from "dotenv"
import { createClient } from "redis"
import { exec } from "node:child_process"
import { uploadDist } from "./r2.js";


function runCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }

            if (stderr) {
                console.error(stderr);
            }

            resolve(stdout);
        });
    });
}

dotenv.config();

const subsciber = createClient();

subsciber.on("erorr", (e) => {
    console.error("erorr", e);
});

await subsciber.connect();

console.log("build service connected to redis ");

// means it's always online and checks for the new job to poll 
while (true) {

    const result = await subsciber.brPop("buildQueue", 0);

    if (!result) {
        continue;
    }

    const job = JSON.parse(result.element);

    console.log("id", job.id);
    console.log("repoUrl", job.repoUrl);

    const command = `docker run -d --name ${job.id} deployhub-builder bash -c "git clone ${job.repoUrl} . && npm install && npm run build"`;

    const containerId = (await runCommand(command)).trim();
    console.log("container started:", containerId);


    const exitCode = await runCommand(`docker wait ${containerId}`);

    const logs = await runCommand(`docker logs ${job.id}`);
    console.log(logs);

    console.log("container finished with exit code:", exitCode);



    const tempPath = `/tmp/deployments/${job.id}`;

    await runCommand(`mkdir -p ${tempPath}`);

    await runCommand(
        `docker cp ${containerId}:/app/dist ${tempPath}/dist`
    );

    console.log("dist copied to:", `${tempPath}/dist`);


    // upload the dist to r2 
    await uploadDist(
        `${tempPath}/dist`,
        job.id
    )

    console.log("dist uploaded to R2");

    await runCommand(`docker rm ${containerId}`);

    console.log("container removed");

    await runCommand(`rm -rf ${tempPath}`);

    console.log("temporary files removed");

}

