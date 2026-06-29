const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "https://record-reward-backend.texasfreelancewriter.workers.dev";

export interface UploadResult {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export interface VideoUploadResult extends UploadResult {
  thumbnailUrl?: string;
  duration?: number;
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Upload failed");
  return data.data;
}

export async function uploadVideo(file: File): Promise<VideoUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/upload/video`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Upload failed");
  return data.data;
}

export function getDownloadUrl(url: string, filename: string): string {
  return `${API_BASE_URL}/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
}

export interface StreamUploadResult {
  uploadUrl: string;
  uid: string;
  downloadUrl: string;
}

export async function getStreamUploadUrl(): Promise<StreamUploadResult> {
  const response = await fetch(`${API_BASE_URL}/api/upload/stream-url`, {
    method: "POST",
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Failed to get upload URL");
  return data.data;
}

export async function uploadVideoToStream(uploadUrl: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(uploadUrl, { method: "POST", body: formData });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stream upload failed: ${text.slice(0, 200)}`);
  }
}
