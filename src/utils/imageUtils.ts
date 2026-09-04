/**
 * Utility for handling image uploads from gallery / local files
 * Supports downscaling and compressing images client-side to ensure
 * fast uploads and reliable local persistence.
 */

export async function processImageFile(
  file: File,
  maxDimension = 800,
  quality = 0.85
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image file (JPG, PNG, WebP, etc.).");
  }

  // Read file as Data URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });

  // Load into Image element to calculate dimensions
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image for processing."));
    image.src = dataUrl;
  });

  // Calculate scaled dimensions
  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  // Draw to canvas and compress
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return dataUrl; // fallback if canvas unavailable
  }

  // Fill with white background for transparency fallback
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  // Return optimized JPEG or PNG
  const format = file.type === "image/png" ? "image/png" : "image/jpeg";
  return canvas.toDataURL(format, quality);
}
