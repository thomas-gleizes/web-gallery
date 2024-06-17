import fs from "node:fs";
import { createHash } from "node:crypto";
import imageSize from "image-size";
import "dotenv/config";

import { extensions } from "@/utils/helpers";
import { AssetType, DirectoryType, FilesTypes } from "../../types";

export function hash(string: string) {
  return createHash("sha256").update(string).digest("hex");
}

export const cachePath = `./static/${hash(
  process.env.TARGET_PATH as string,
)}.json`;

export default async function scan(
  path: string,
  files: FilesTypes = [],
): Promise<FilesTypes> {
  const info = await fs.promises
    .readdir(path)
    .then((files) =>
      files.filter((file) => !file.endsWith(".*") && !file.startsWith(".")),
    );

  for (const file of info) {
    const pathFile = `${path}/${file}`;
    const stat = await fs.promises.stat(pathFile);

    console.log(pathFile);
    if (stat.isDirectory()) {
      let current: DirectoryType = {
        name: file,
        size: stat.size,
        type: "directory",
        hash: hash(pathFile),
        timestamp: stat.birthtime.getTime(),
        pathname: pathFile.split(".images").pop() as string,
        files: [],
      };

      files.push(current);

      await scan(`${path}/${file}`, current.files);

      for (const file of current.files) {
        current.size += file.size;
      }
    } else {
      let current: AssetType = {
        name: file,
        size: stat.size,
        type: "file",
        hash: hash(pathFile),
        timestamp: stat.birthtime.getTime(),
        url: new URL(
          `http://localhost:3000/static${pathFile.split(".images").pop()}`,
        ).pathname,
        file: "other",
        dimensions: { width: NaN, height: NaN, orientation: "unknown" },
      };

      if (extensions.image.includes(file.split(".").pop() as string)) {
        try {
          const dimensions = imageSize(pathFile);
          current.dimensions = {
            width: dimensions.width || 0,
            height: dimensions.height || 0,
            orientation: "unknown",
          };

          if (current.dimensions.width > current.dimensions.height)
            current.dimensions.orientation = "landscape";
          else if (current.dimensions.width < current.dimensions.height)
            current.dimensions.orientation = "portrait";
          else if (current.dimensions.width === current.dimensions.height)
            current.dimensions.orientation = "square";

          current.file = "image";
        } catch (error) {}
      } else if (extensions.video.includes(file.split(".").pop() as string)) {
        current.file = "video";
      }

      files.push(current as AssetType);
    }
  }

  return files;
}

export function saveCache(data: FilesTypes): Promise<void> {
  return fs.promises.writeFile(cachePath, JSON.stringify(data));
}

export function readCache(): Promise<FilesTypes> {
  return fs.promises
    .readFile(cachePath, "utf-8")
    .then((data) => JSON.parse(data) as FilesTypes)
    .catch(() => []);
}
