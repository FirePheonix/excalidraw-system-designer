const crypto = require("crypto");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { getBucketConfig, getS3Client } = require("../_s3");

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const sanitizeExt = (name = "") => {
  const match = String(name).toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { fileName, contentType, contentLength } = req.body || {};

    if (!contentType || !String(contentType).startsWith("image/")) {
      return res.status(400).json({ error: "Only image uploads are supported" });
    }

    if (
      typeof contentLength !== "number" ||
      contentLength <= 0 ||
      contentLength > MAX_UPLOAD_BYTES
    ) {
      return res.status(400).json({
        error: `Invalid content length. Max allowed is ${MAX_UPLOAD_BYTES} bytes`,
      });
    }

    const { bucket, region, folder } = getBucketConfig();
    const ext = sanitizeExt(fileName);
    const keyBase = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    const key = folder ? `${folder}/${keyBase}` : keyBase;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: String(contentType),
      ACL: "public-read",
    });

    const uploadUrl = await getSignedUrl(getS3Client(), command, {
      expiresIn: 300,
    });

    const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return res.status(200).json({
      uploadUrl,
      publicUrl,
      key,
      maxUploadBytes: MAX_UPLOAD_BYTES,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to generate upload URL" });
  }
};
