export const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PROCESSED_IMAGE_BYTES = 512 * 1024;

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
    const targetRatio = 2.5;
    const sourceRatio = width / height;
    const sourceWidth = sourceRatio > targetRatio ? height * targetRatio : width;
    const sourceHeight = sourceRatio > targetRatio ? height : width / targetRatio;
    const scale = Math.min(1, 1600 / sourceWidth, 640 / sourceHeight);
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
  context.drawImage(
    decoded.source,
    geometry.sourceX,
    geometry.sourceY,
    geometry.sourceWidth,
    geometry.sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

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
    let quality = 0.86;
    let processed = await encodeImage(decoded, geometry, mimeType, scale, quality);

    for (let attempt = 0; processed.size > MAX_PROCESSED_IMAGE_BYTES && attempt < 12; attempt += 1) {
      if (mimeType !== 'image/png' && quality > 0.5) quality = Math.max(0.5, quality - 0.09);
      else {
        scale *= 0.82;
        quality = 0.82;
      }
      processed = await encodeImage(decoded, geometry, mimeType, scale, quality);
    }

    if (processed.size > MAX_PROCESSED_IMAGE_BYTES) {
      throw new Error('The image could not be compressed enough. Try a simpler or smaller image.');
    }

    const canKeepOriginal = kind !== 'welcome-background' && file.size <= MAX_PROCESSED_IMAGE_BYTES
      && (kind === 'profile-avatar'
        ? ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
        : ['image/png', 'image/jpeg'].includes(file.type));
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
