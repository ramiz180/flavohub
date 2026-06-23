'use client';

import { useCallback, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { useAuth } from '@/lib/auth-context';

interface Props {
  onUploadComplete: (url: string) => void;
  currentImageUrl?: string;
  aspectRatio?: number;
  label?: string;
}

async function getCroppedBlob(imageSrc: string, cropArea: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = cropArea.width;
  canvas.height = cropArea.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(
    img,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      'image/jpeg',
      0.9,
    );
  });
}

export default function ImageUploadWithCrop({
  onUploadComplete,
  currentImageUrl,
  aspectRatio = 1,
  label = 'Upload Image',
}: Props) {
  const { accessToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | undefined>(currentImageUrl);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setUploadError(null);
    };
    reader.readAsDataURL(file);
    // reset so the same file can be re-selected
    e.target.value = '';
  }

  async function handleCropAndUpload() {
    if (!imageSrc || !croppedAreaPixels) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    if (!accessToken) {
      setUploadError('Not authenticated');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
      const formData = new FormData();
      formData.append('file', blob, 'logo.jpg');

      const res = await fetch(`${apiUrl}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
      const json = (await res.json()) as { success: boolean; data?: { secure_url: string }; secure_url?: string };
      const secureUrl = json.data?.secure_url || json.secure_url || '';
      setPreview(secureUrl);
      setImageSrc(null);
      onUploadComplete(secureUrl);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setPreview(undefined);
    onUploadComplete('');
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>

      {preview && !imageSrc && (
        <div className="mb-2 flex items-center gap-3">
          <img
            src={preview}
            alt="Logo preview"
            className="h-16 w-16 rounded-full object-cover border border-gray-200"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-red-500 hover:text-red-700"
          >
            ✕ Remove
          </button>
        </div>
      )}

      {!imageSrc && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            {preview ? 'Change Image' : 'Upload Image'}
          </button>
        </>
      )}

      {imageSrc && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded bg-white p-4 shadow-xl">
            <h3 className="mb-3 text-base font-semibold text-gray-800">Crop Image</h3>
            <div className="relative h-72 w-full bg-gray-100">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs text-gray-600">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
            {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setImageSrc(null);
                  setUploadError(null);
                }}
                className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCropAndUpload()}
                disabled={uploading}
                className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
              >
                {uploading ? 'Uploading…' : 'Crop & Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
