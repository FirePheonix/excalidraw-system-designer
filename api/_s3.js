const { S3Client } = require("@aws-sdk/client-s3");

const requiredVars = [
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_REGION",
  "S3_BUCKET_NAME",
];

const getMissingVars = () => {
  return requiredVars.filter((name) => !process.env[name]);
};

const ensureS3Env = () => {
  const missing = getMissingVars();
  if (missing.length) {
    throw new Error(`Missing required S3 env vars: ${missing.join(", ")}`);
  }
};

const globalForS3 = globalThis;

const getS3Client = () => {
  ensureS3Env();

  if (!globalForS3.__excalidrawS3Client) {
    globalForS3.__excalidrawS3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  return globalForS3.__excalidrawS3Client;
};

const getBucketConfig = () => {
  ensureS3Env();

  const folder = process.env.S3_FOLDER_NAME
    ? process.env.S3_FOLDER_NAME.replace(/^\/+|\/+$/g, "")
    : "";

  return {
    bucket: process.env.S3_BUCKET_NAME,
    region: process.env.AWS_REGION,
    folder,
  };
};

module.exports = {
  getS3Client,
  getBucketConfig,
};
