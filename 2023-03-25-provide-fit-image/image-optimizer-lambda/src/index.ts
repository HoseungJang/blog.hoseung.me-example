import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import * as sharp from "sharp";
import axios from "axios";

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const { http } = event.requestContext;

  const isImageOptimizeRequest = http.method === "GET" && http.path === "/optimize-image";

  if (!isImageOptimizeRequest) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: "Not found",
      }),
    };
  }

  if (event.queryStringParameters == null) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Required Query Parameters Missing",
      }),
    };
  }

  // image url, image width, image height
  const { url, w, h } = event.queryStringParameters;

  if (url == null || w == null || h == null) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Required Query Parameters Missing",
      }),
    };
  }

  const { data } = await axios.get(decodeURIComponent(url), {
    responseType: "arraybuffer",
  });

  const image = sharp(data);
  const metadata = await image.metadata();

  const width = parseInt(w);
  const height = parseInt(h);

  // resize image
  if (metadata.width != null && metadata.width > width) {
    image.resize({ fit: "fill", width });
  }

  if (metadata.height != null && metadata.height > height) {
    image.resize({ fit: "fill", height });
  }

  const format = metadata.format;
  if (format == null) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Unsupported Image Format",
      }),
    };
  }

  // image quality
  const { q } = event.queryStringParameters;

  if (q != null) {
    image.toFormat(format, { quality: parseInt(q) });
  }

  const resizedImageBuffer = await image.toBuffer();
  const encodedResizedImage = resizedImageBuffer.toString("base64");

  return {
    statusCode: 200,
    headers: { "Content-Type": `image/${format}` },
    body: encodedResizedImage,
    isBase64Encoded: true,
  };
}
