import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getClient() {
  const accountId = process.env["R2_ACCOUNT_ID"];
  const accessKeyId = process.env["R2_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["R2_SECRET_ACCESS_KEY"];

  if (!accountId || !accessKeyId || !secretAccessKey) return null;

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export async function getPresignedUploadUrl(key: string, mimeType: string, expiresIn = 300) {
  const client = getClient();
  const bucket = process.env["R2_BUCKET_NAME"] ?? "meatrecords";

  if (!client) {
    // Dev fallback — нет R2, возвращаем null
    return null;
  }

  const url = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mimeType }),
    { expiresIn },
  );

  return url;
}

export function buildAssetKey(prefix: string, filename: string) {
  const ext = filename.split(".").pop() ?? "";
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${prefix}/${String(Date.now())}_${safe}${ext ? "" : ".bin"}`;
}
