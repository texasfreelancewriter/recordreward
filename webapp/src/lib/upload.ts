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
