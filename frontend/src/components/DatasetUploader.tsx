import React, { useState, useRef } from 'react';
import { UploadCloud, FileText } from 'lucide-react';

import toast from 'react-hot-toast';

interface DatasetUploaderProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
}

export const DatasetUploader: React.FC<DatasetUploaderProps> = ({
  onFileSelect,
  isUploading = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSelectFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSelectFile(file);
    }
  };

  const validateAndSelectFile = (file: File) => {
    const validTypes = ['text/csv', 'application/json'];
    const validExtensions = ['.csv', '.json'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (validTypes.includes(file.type) || validExtensions.includes(fileExtension)) {
      setSelectedFile(file);
      onFileSelect(file);
    } else {
      toast.error('Please upload a valid .csv or .json dataset file.');
    }
  };

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-xl transition-all duration-300 ease-in-out backdrop-blur-md overflow-hidden min-h-[200px] ${
        isDragging
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-600 bg-gray-900/40 hover:bg-gray-800/60 hover:border-gray-500'
      } ${isUploading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept=".csv,.json,text/csv,application/json"
        className="hidden"
        disabled={isUploading}
      />

      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        {selectedFile ? (
          <>
            <div className="p-4 bg-blue-500/20 rounded-full">
              <FileText className="w-10 h-10 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200 truncate max-w-xs">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </>
        ) : (
          <>
            <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-blue-500/20' : 'bg-gray-800/80'}`}>
              <UploadCloud className={`w-10 h-10 ${isDragging ? 'text-blue-400' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200">
                <span className="text-blue-400 hover:underline">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-400 mt-1">
                CSV or JSON datasets
              </p>
            </div>
          </>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/70 backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <p className="mt-2 text-sm font-medium text-blue-400">Uploading dataset...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatasetUploader;