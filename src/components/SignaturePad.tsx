import { useRef, useEffect, useState, useCallback } from 'react'
import { cn } from '../lib/utils'

interface SignaturePadProps {
  value?: string
  onChange?: (data: string) => void
  onSave?: (data: string) => void
  width?: number
  height?: number
}

export default function SignaturePad({
  value,
  onChange,
  onSave,
  width = 400,
  height = 200,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)

  const drawReferenceLine = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.beginPath()
    ctx.setLineDash([5, 5])
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    ctx.moveTo(20, height - 30)
    ctx.lineTo(width - 20, height - 30)
    ctx.stroke()
    ctx.setLineDash([])
  }, [width, height])

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    drawReferenceLine(ctx)

    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [width, height, drawReferenceLine])

  const loadImage = useCallback((base64: string) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      initCanvas()
      ctx.drawImage(img, 0, 0, width, height)
    }
    img.src = base64
  }, [width, height, initCanvas])

  useEffect(() => {
    initCanvas()
    if (value) {
      loadImage(value)
    }
  }, [])

  useEffect(() => {
    if (value) {
      loadImage(value)
    }
  }, [value, loadImage])

  const getPosition = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    setIsDrawing(true)
    lastPosRef.current = getPosition(e)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (!isDrawing || !lastPosRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const pos = getPosition(e)
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos

    if (onChange) {
      onChange(canvas.toDataURL('image/png'))
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    lastPosRef.current = null
  }

  const handleClear = () => {
    initCanvas()
    if (onChange) {
      onChange('')
    }
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const data = canvas.toDataURL('image/png')
    if (onSave) {
      onSave(data)
    }
  }

  return (
    <div className="inline-block">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={cn(
            'border border-gray-300 rounded-lg cursor-crosshair bg-white',
            'touch-none'
          )}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md',
            'bg-gray-100 text-gray-700 hover:bg-gray-200',
            'transition-colors duration-200'
          )}
        >
          清空
        </button>
        <button
          type="button"
          onClick={handleSave}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md',
            'bg-blue-600 text-white hover:bg-blue-700',
            'transition-colors duration-200'
          )}
        >
          保存
        </button>
      </div>
    </div>
  )
}
