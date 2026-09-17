import fs from "fs/promises";
import path from "path";

export async function getAllFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const files: string[] = [];

    for (const entry of entries) {
        // Don't upload Git's internal metadata
        if (entry.name === ".git") {
            continue;
        }

        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            const nestedFiles = await getAllFiles(fullPath);
            files.push(...nestedFiles);
        } else {
            files.push(fullPath);
        }
    }

    return files;
}