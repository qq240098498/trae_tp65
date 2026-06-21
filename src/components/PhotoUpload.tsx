import { useState, useRef, useCallback } from 'react'
import { X, Plus, ZoomIn, Upload } from 'lucide-react'
import { cn } from '../lib/utils'

interface PhotoUploadProps {
  photos: string[]
  onChange: (photos: string[]) => void
  maxPhotos?: number
}

export default function PhotoUpload({
  photos,
  onChange,
  maxPhotos = 5,
}: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target?.result as string
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let { width, height } = img
          const maxWidth = 800

          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)

          resolve(canvas.toDataURL('image/jpeg', 0.8))
        }
        img.onerror = () => reject(new Error('图片加载失败'))
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
    })
  }

  const handleFiles = useCallback(
    async (files: FileList) => {
      const newPhotos: string[] = []
      const remainingSlots = maxPhotos - photos.length

      for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
        const file = files[i]
        if (file.type.startsWith('image/')) {
          try {
            const compressed = await compressImage(file)
            newPhotos.push(compressed)
          } catch (error) {
            console.error('图片处理失败:', error)
          }
        }
      }

      if (newPhotos.length > 0) {
        onChange([...photos, ...newPhotos])
      }
    },
    [photos, maxPhotos, onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files && photos.length < maxPhotos) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles, photos.length, maxPhotos]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && photos.length < maxPhotos) {
        handleFiles(e.target.files)
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFiles, photos.length, maxPhotos]
  )

  const handleDelete = useCallback(
    (index: number) => {
      const newPhotos = photos.filter((_, i) => i !== index)
      onChange(newPhotos)
    },
    [photos, onChange]
  )

  const handleClick = () => {
    if (photos.length < maxPhotos) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          照片上传
        </span>
        <span className="text-sm text-gray-500">
          {photos.length} / {maxPhotos}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {photos.map((photo, index) => (
          <div
            key={index}
            className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200"
          >
            <img
              src={photo}
              alt={`照片 ${index + 1}`}
              className="h-full w-full cursor-pointer object-cover transition-transform duration-200 group-hover:scale-105"
              onClick={() => setLightboxIndex(index)}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(index)
              }}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity duration-200 hover:bg-black/70 group-hover:opacity-100"
            >
              <X size={14} />
            </button>
            <button
              type="button"
              onClick={() => setLightboxIndex(index)}
              className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity duration-200 hover:bg-black/70 group-hover:opacity-100"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <div
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              'flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all duration-200',
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            )}
          >
            {isDragging ? (
              <Upload
                size={32}
                className="mb-2 text-blue-500"
              />
            ) : (
              <Plus
                size={32}
                className="mb-2 text-gray-400 group-hover:text-blue-500"
              />
            )}
            <span
              className={cn(
                'text-xs',
                isDragging
                  ? 'text-blue-500'
                  : 'text-gray-500'
              )}
            >
              {isDragging ? '松开上传' : '点击或拖拽上传'}
            </span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X size={24} />
          </button>
          <img
            src={photos[lightboxIndex]}
            alt={`放大照片 ${lightboxIndex + 1}`}
            className="max-h-screen max-w-screen object-contain p-4"
            onClick={(e) => e.stopPropagation()}
          />
          {photos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
              {photos.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setLightboxIndex(index)
                  }}
                  className={cn(
                    'h-2 rounded-full transition-all duration-200',
                    index === lightboxIndex
                      ? 'w-8 bg-white'
                      : 'w-2 bg-white/40 hover:bg-white/60'
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
