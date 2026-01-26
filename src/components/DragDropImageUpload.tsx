import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface DragDropImageUploadProps {
  value: File | string | null; // File object or preview URL string
  onChange: (file: File | null) => void;
  onRemove?: () => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  previewClassName?: string;
  disabled?: boolean;
  label?: string;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function DragDropImageUpload({
  value,
  onChange,
  onRemove,
  accept = 'image/jpeg,image/jpg,image/png,image/webp',
  maxSizeMB = 10,
  className,
  previewClassName,
  disabled = false,
  label,
}: DragDropImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(
    typeof value === 'string' ? value : value ? URL.createObjectURL(value) : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    // Check file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, or WEBP image.",
        variant: "destructive",
      });
      return false;
    }

    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Please upload an image smaller than ${maxSizeMB}MB.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFile = useCallback((file: File) => {
    if (!validateFile(file)) {
      return;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    onChange(file);
  }, [onChange, maxSizeMB, toast]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleFile(file);
    }
  }, [disabled, handleFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      handleFile(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleRemove = useCallback(() => {
    // Clean up preview URL if it was created from a file
    if (preview && typeof value === 'object' && value instanceof File) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    onChange(null);
    if (onRemove) {
      onRemove();
    }
  }, [preview, value, onChange, onRemove]);

  // Update preview when value changes externally
  useEffect(() => {
    if (typeof value === 'string') {
      setPreview(value);
    } else if (value instanceof File) {
      const previewUrl = URL.createObjectURL(value);
      setPreview(previewUrl);
      return () => URL.revokeObjectURL(previewUrl);
    } else {
      setPreview(null);
    }
  }, [value]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}
      
      {preview ? (
        <div className={cn("relative group", previewClassName)}>
          <div className="relative w-full h-32 rounded-lg border overflow-hidden bg-muted">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleRemove}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleClick}
              disabled={disabled}
            >
              Replace Image
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            {isDragging ? (
              <>
                <Upload className="w-8 h-8 text-primary animate-bounce" />
                <p className="text-sm font-medium text-primary">Drop image here</p>
              </>
            ) : (
              <>
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Drag and drop an image here
                  </p>
                  <p className="text-xs text-muted-foreground">or click to select</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  JPG, PNG, WEBP (max {maxSizeMB}MB)
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
