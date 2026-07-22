import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 压缩本地图片并转为 data URL。
 * - 限制最大边长，避免 base64 体积超出 localStorage / SQLite 配额
 * - 默认输出 jpeg 0.85 质量；带透明通道的 png 保留为 png
 * - 失败时回退为原始 FileReader 结果，保证可用性
 */
export async function compressImage(
  file: File,
  maxSize = 1600,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.onloadend = () => {
      const src = reader.result as string;
      // 非图片类型直接返回
      if (!file.type.startsWith('image/')) {
        resolve(src);
        return;
      }
      const img = new Image();
      img.onerror = () => {
        // 解码失败时回退原始 data URL
        resolve(src);
      };
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxSize || height > maxSize) {
            if (width >= height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(src);
            return;
          }
          // 白底，避免 jpeg 透明区变黑
          if (file.type !== 'image/png') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
          }
          ctx.drawImage(img, 0, 0, width, height);
          const isPng = file.type === 'image/png';
          const mimeType = isPng ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mimeType, quality);
          // 如果压缩后反而更大（极小图片可能），用原始
          resolve(dataUrl.length < src.length ? dataUrl : src);
        } catch (err) {
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

