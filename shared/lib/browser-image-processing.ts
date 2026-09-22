export const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PROCESSED_IMAGE_BYTES = 512 * 1024;
export const MAX_WELCOME_BACKGROUND_BYTES = 2 * 1024 * 1024;

export type ImageProcessingKind = 'profile-avatar' | 'invoice-logo' | 'welcome-background';

export type ImageGeometry = {
  sourceX: number;
  sourceY: number;
  sourceWidth: number;
  sourceHeight: number;
  outputWidth: number;
  outputHeight: number;
};

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release(): void;
};

export function calculateImageGeometry(width: number, height: number, kind: ImageProcessingKind): ImageGeometry {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('The selected image has invalid dimensions.');
  }

  if (kind === 'profile-avatar') {
    return {
      sourceX: 0,
      sourceY: 0,
      sourceWidth: width,
      sourceHeight: height,
      outputWidth: width,
      outputHeight: height,
    };
  }

  if (kind === 'welcome-background') {
    // Crop to the dashboard's 728:90 ratio, then retain a 4x banner canvas.
    // A standard 600x200 Canva export becomes a sharp 2912x360 working image.
    const targetRatio = 728 / 90;
    const sourceRatio = width / height;
    const sourceWidth = sourceRatio > targetRatio ? height * targetRatio : width;
    const sourceHeight = sourceRatio > targetRatio ? height : width / targetRatio;
    const scale = Math.min(6, 2912 / sourceWidth, 360 / sourceHeight);
    return {
      sourceX: (width - sourceWidth) / 2,
      sourceY: (height - sourceHeight) / 2,
      sourceWidth,
      sourceHeight,
      outputWidth: Math.max(1, Math.round(sourceWidth * scale)),
      outputHeight: Math.max(1, Math.round(sourceHeight * scale)),
    };
  }

  const scale = Math.min(1, 1200 / width, 600 / height);
  return {
    sourceX: 0,
    sourceY: 0,
    sourceWidth: width,
    sourceHeight: height,
    outputWidth: Math.max(1, Math.round(width * scale)),
    outputHeight: Math.max(1, Math.round(height * scale)),
  };
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Unable to read the processed image.'));
    reader.onerror = () => reject(new Error('Unable to read the processed image.'));
    reader.readAsDataURL(blob);
  });
}

async function decodeBrowserImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;
  try {
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Unable to compress the selected image.')),
      mimeType,
      quality,
    );
  });
}

async function encodeImage(
  decoded: DecodedImage,
  geometry: ImageGeometry,
  mimeType: string,
  scale: number,
  quality: number,
) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(geometry.outputWidth * scale));
  canvas.height = Math.max(1, Math.round(geometry.outputHeight * scale));
  const context = canvas.getContext('2d', { alpha: mimeType !== 'image/jpeg' });
  if (!context) throw new Error('Image processing is not supported by this browser.');

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  if (mimeType === 'image/jpeg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  let currentSource = decoded.source;
  let currentX = geometry.sourceX;
  let currentY = geometry.sourceY;
  let currentWidth = geometry.sourceWidth;
  let currentHeight = geometry.sourceHeight;

  // Progress through 2x steps before the final draw. Smaller scaling jumps
  // preserve edges and text better than a single large browser interpolation.
  while (canvas.width > currentWidth * 2 && canvas.height > currentHeight * 2) {
    const intermediate = document.createElement('canvas');
    intermediate.width = Math.min(canvas.width, Math.max(1, Math.round(currentWidth * 2)));
    intermediate.height = Math.min(canvas.height, Math.max(1, Math.round(currentHeight * 2)));
    const intermediateContext = intermediate.getContext('2d', { alpha: mimeType !== 'image/jpeg' });
    if (!intermediateContext) throw new Error('Image processing is not supported by this browser.');
    intermediateContext.imageSmoothingEnabled = true;
    intermediateContext.imageSmoothingQuality = 'high';
    intermediateContext.drawImage(
      currentSource,
      currentX,
      currentY,
      currentWidth,
      currentHeight,
      0,
      0,
      intermediate.width,
      intermediate.height,
    );
    currentSource = intermediate;
    currentX = 0;
    currentY = 0;
    currentWidth = intermediate.width;
    currentHeight = intermediate.height;
  }

  context.drawImage(currentSource, currentX, currentY, currentWidth, currentHeight, 0, 0, canvas.width, canvas.height);

  return canvasBlob(canvas, mimeType, quality);
}

export async function processBrowserImage(file: File, kind: ImageProcessingKind) {
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error('The selected image exceeds the 10 MB limit.');
  }

  const decoded = await decodeBrowserImage(file).catch(() => {
    throw new Error('The selected image could not be decoded.');
  });

  try {
    const geometry = calculateImageGeometry(decoded.width, decoded.height, kind);
    const mimeType = kind === 'profile-avatar' || kind === 'welcome-background'
      ? 'image/webp'
      : file.type === 'image/png'
        ? 'image/png'
        : 'image/jpeg';
    let scale = 1;
    const maxProcessedBytes = kind === 'welcome-background'
      ? MAX_WELCOME_BACKGROUND_BYTES
      : MAX_PROCESSED_IMAGE_BYTES;
    let quality = kind === 'welcome-background' ? 0.94 : 0.86;
    let processed = await encodeImage(decoded, geometry, mimeType, scale, quality);

    for (let attempt = 0; processed.size > maxProcessedBytes && attempt < 12; attempt += 1) {
      const minimumQuality = kind === 'welcome-background' ? 0.72 : 0.5;
      if (mimeType !== 'image/png' && quality > minimumQuality) quality = Math.max(minimumQuality, quality - 0.055);
      else {
        scale *= kind === 'welcome-background' ? 0.9 : 0.82;
        quality = kind === 'welcome-background' ? 0.86 : 0.82;
      }
      processed = await encodeImage(decoded, geometry, mimeType, scale, quality);
    }

    if (processed.size > maxProcessedBytes) {
      throw new Error('The image could not be compressed enough. Try a simpler or smaller image.');
    }

    const outputMatchesSource = geometry.outputWidth === decoded.width && geometry.outputHeight === decoded.height;
    const canKeepOriginal = file.size <= maxProcessedBytes && outputMatchesSource
      && (kind === 'profile-avatar'
        ? ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
        : ['image/png', 'image/jpeg', 'image/webp'].includes(file.type));
    const selectedBlob = canKeepOriginal && file.size <= processed.size ? file : processed;

    return {
      dataUrl: await blobToDataUrl(selectedBlob),
      originalBytes: file.size,
      processedBytes: selectedBlob.size,
    };
  } finally {
    decoded.release();
  }
}
