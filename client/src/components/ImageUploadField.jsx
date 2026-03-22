import { useRef, useState } from 'react';
import toast from 'react-hot-toast';

/**
 * ImageUploadField Component
 * Features:
 * - Drag & drop support
 * - Image preview
 * - File validation (type, size)
 * - Client-side compression
 * - Progress indication
 * - Accessible form integration
 */
export default function ImageUploadField({
  label = 'Upload Image',
  onImageSelect,
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  required = false,
  initialPreview = null,
}) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(initialPreview);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const compressImage = async (file) => {
    return new Promise((resolve, reject) => {
      try {
        setIsCompressing(true);
        const reader = new FileReader();

        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            // Resize if too large
            const maxDimension = 2400;
            if (width > maxDimension || height > maxDimension) {
              const ratio = Math.min(maxDimension / width, maxDimension / height);
              width *= ratio;
              height *= ratio;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Compress and convert to blob
            canvas.toBlob(
              (blob) => {
                setIsCompressing(false);
                resolve(blob);
              },
              'image/webp',
              0.85 // 85% quality
            );
          };
          img.onerror = () => {
            setIsCompressing(false);
            reject(new Error('Failed to load image'));
          };
          img.src = e.target.result;
        };

        reader.onerror = () => {
          setIsCompressing(false);
          reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
      } catch (error) {
        setIsCompressing(false);
        reject(error);
      }
    });
  };

  const handleFileSelect = async (file) => {
    try {
      // Validate file type
      if (!acceptedTypes.includes(file.type)) {
        toast.error(
          `Invalid file type. Accepted: ${acceptedTypes.map(t => t.split('/')[1]).join(', ').toUpperCase()}`
        );
        return;
      }

      // Validate file size
      if (file.size > maxSize) {
        toast.error(
          `File size must be less than ${(maxSize / 1024 / 1024).toFixed(1)}MB`
        );
        return;
      }

      // Compress image
      const compressedBlob = await compressImage(file);
      const compressedFile = new File(
        [compressedBlob],
        file.name.replace(/\.[^/.]+$/, '.webp'),
        { type: 'image/webp' }
      );

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(compressedFile);

      // Notify parent component
      onImageSelect(compressedFile);
      toast.success(
        `Image compressed from ${(file.size / 1024 / 1024).toFixed(2)}MB`
      );
    } catch (error) {
      toast.error(error.message || 'Failed to process image');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-[rgb(var(--text-primary))]">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-surface-border bg-surface-raised hover:border-surface-border/50'
        }`}
        role="button"
        tabIndex={0}
        aria-label="Click or drag image to upload"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          className="hidden"
          aria-hidden="true"
          disabled={isCompressing}
        />

        {isCompressing ? (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full border-4 border-surface-border border-t-blue-500 animate-spin"></div>
            <p className="text-sm font-medium text-[rgb(var(--text-secondary))]">
              Compressing image...
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 flex items-center justify-center bg-surface rounded-lg text-lg">
              🖼️
            </div>
            <p className="font-medium text-[rgb(var(--text-primary))]">
              {preview ? 'Choose another image or drag and drop' : 'Drag image or click to upload'}
            </p>
            <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">
              {acceptedTypes.map(t => t.split('/')[1]).join(', ').toUpperCase()} • Max {(maxSize / 1024 / 1024).toFixed(1)}MB
            </p>
          </div>
        )}
      </div>

      {/* Image Preview */}
      {preview && (
        <div className="relative rounded-lg overflow-hidden bg-surface border border-surface-border">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover"
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreview(null);
              if (inputRef.current) inputRef.current.value = '';
              onImageSelect(null);
            }}
            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
            aria-label="Remove image"
          >
            ✕
          </button>
          <p className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
            Preview
          </p>
        </div>
      )}
    </div>
  );
}
