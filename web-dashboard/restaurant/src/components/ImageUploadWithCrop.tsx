/*
 * Cloudinary one-time setup:
 * 1. Create a free Cloudinary account at https://cloudinary.com
 * 2. In Settings > Upload, create an unsigned upload preset
 * 3. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME to your cloud name (found in the dashboard)
 * 4. Set NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to the preset name you created
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import imageCompression from 'browser-image-compression';

interface Props {
  onUploadComplete: (url: string) => void;
  aspectRatio?: number;
  initialUrl?: string;
}

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = url;
  });
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      'image/jpeg',
      0.95,
    );
  });
}

export default function ImageUploadWithCrop({
  onUploadComplete,
  aspectRatio = 1,
  initialUrl,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>(initialUrl ?? '');

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleCropAndUpload() {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);
    setUploadError('');
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      const rawFile = new File([blob], 'menu-item.jpg', { type: 'image/jpeg' });
      const compressed = await imageCompression(rawFile, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      });

      const cloudName = process.env['NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME'];
      const uploadPreset = process.env['NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET'];
      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary env vars not set');
      }

      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      const data = (await res.json()) as { secure_url: string };

      setPreviewUrl(data.secure_url);
      onUploadComplete(data.secure_url);
      setImageSrc(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage() {
    setPreviewUrl('');
    onUploadComplete('');
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {previewUrl ? (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Menu item preview"
            className="h-24 w-24 rounded border border-gray-200 object-cover"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white hover:bg-red-600"
            aria-label="Remove image"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openFilePicker}
          className="rounded border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600"
        >
          Upload Image
        </button>
      )}

      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

      {/* Crop modal */}
      {imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="flex w-full max-w-lg flex-col gap-4 rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-800">Crop Image</h3>

            <div className="relative h-72 w-full overflow-hidden rounded bg-gray-100">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setImageSrc(null)}
                disabled={uploading}
                className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCropAndUpload()}
                disabled={uploading}
                className="flex items-center gap-2 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Uploading…
                  </>
                ) : (
                  'Crop & Upload'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
