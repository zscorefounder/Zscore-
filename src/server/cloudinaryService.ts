import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(file: string | Buffer): Promise<string | null> {
  const clean = (val?: string) => {
    if (!val) return '';
    // Heavily sanitize input to prevent common copy-paste issues
    return val.trim()
      .replace(/^[\s"']+|[\s"']+$/g, '') // Remove quotes and spaces from ends
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove hidden control characters
      .trim();
  };

  let cloudName = clean(process.env.CLOUDINARY_CLOUD_NAME);
  let apiKey = clean(process.env.CLOUDINARY_API_KEY);
  let apiSecret = clean(process.env.CLOUDINARY_API_SECRET);

  // If a full CLOUDINARY_URL was provided in ANY of the fields, parse it correctly
  const possibleUrl = process.env.CLOUDINARY_URL || 
                      (cloudName.startsWith('cloudinary://') ? cloudName : null) ||
                      (apiKey.startsWith('cloudinary://') ? apiKey : null) ||
                      (apiSecret.startsWith('cloudinary://') ? apiSecret : null);

  if (possibleUrl && possibleUrl.startsWith('cloudinary://')) {
    try {
      console.log("Using CLOUDINARY_URL for configuration...");
      const url = new URL(possibleUrl);
      cloudName = url.hostname;
      apiKey = url.username;
      apiSecret = url.password;
    } catch (e) {
      console.warn("Failed to parse CLOUDINARY_URL format.");
    }
  }

  // Final check for missing config
  if (!cloudName || !apiKey || !apiSecret) {
    console.error("Cloudinary Configuration Error: Missing credentials.", {
      hasCloudName: !!cloudName,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret
    });
    return null;
  }

  // Force reset global config and use local config for the uploader
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });

  try {
    const fileSize = typeof file === 'string' ? file.length : (file as Buffer).length;
    
    // Masked logging for verification
    const mask = (s: string) => s.length > 6 ? `${s.substring(0, 3)}...${s.substring(s.length - 3)}` : '***';
    console.log(`Cloudinary Upload starting. Cloud="${cloudName}", Key="${mask(apiKey)}", Secret="${mask(apiSecret)}" (Len: ${apiSecret.length})`);

    if (typeof file === 'string' && !file.startsWith('data:image')) {
      console.error("Invalid image format. Expected base64 data:image.");
      return null;
    }

    try {
      // Explicitly pass credentials to the uploader call to ensure they are used
      const result = await cloudinary.uploader.upload(file as string, {
        folder: 'z_score_portfolio',
        resource_type: 'auto',
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
      });
      
      console.log("Cloudinary upload successful:", result.secure_url);
      return result.secure_url;
    } catch (innerError: any) {
      if (innerError.message?.includes("Invalid Signature")) {
        console.error("AUTHENTICATION FAILED: Invalid Signature. This almost certainly means the API_SECRET is incorrect.");
        console.error("The string being signed was:", innerError.message.split("String to sign - '")[1]?.split("'")[0] || "unknown");
        
        // Attempt a very basic upload without ANY extra params to see if it works
        console.log("Retrying ultra-simple upload...");
        const fallback = await cloudinary.uploader.upload(file as string, {
          resource_type: 'auto',
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret
        });
        console.log("Ultra-simple fallback successful:", fallback.secure_url);
        return fallback.secure_url;
      }
      throw innerError;
    }
  } catch (error: any) {
    const errorMessage = error.message || (error.error && error.error.message) || "Unknown Cloudinary Error";
    console.error("Final Cloudinary upload error:", {
      message: errorMessage,
      http_code: error.http_code,
      raw: JSON.stringify(error)
    });
    return null;
  }
}

export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return false;
  }
}
