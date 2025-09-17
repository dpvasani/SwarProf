import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { artistAPI } from '../services/api';
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle,
  Download,
  Eye
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const ExtractArtist = () => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0,
      result: null,
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (id) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError('');
    const newResults = [];

    for (const fileItem of files) {
      try {
        // Update file status
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'uploading', progress: 50 }
            : f
        ));

        const formData = new FormData();
        formData.append('file', fileItem.file);

        const response = await artistAPI.extractArtist(formData);
        
        // Update file status to completed
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'completed', progress: 100, result: response.data }
            : f
        ));

        // Extract artist info from the response
        const artistInfo = response.data.artist_info || {};
        const extractedText = response.data.extracted_text_preview || response.data.extracted_text || '';
        
        // Convert single artist info to array format for consistency
        const artists = artistInfo.artist_name ? [artistInfo] : [];
        
        newResults.push({
          filename: fileItem.file.name,
          artists: artists,
          extractedText: extractedText,
        });

      } catch (error) {
        console.error('Upload failed:', error);
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'error', progress: 0 }
            : f
        ));
        // Try to extract useful error information from Axios error
        const backendDetail = error?.response?.data || error?.response || error?.message || String(error);
        const detailString = typeof backendDetail === 'object' ? JSON.stringify(backendDetail) : String(backendDetail);
        setError(`Failed to process ${fileItem.file.name}: ${detailString}`);
      }
    }

    setResults(prev => [...prev, ...newResults]);
    setUploading(false);
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return Image;
    if (file.type.includes('pdf')) return FileText;
    return File;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Extract Artist Information
          </h1>
          <p className="text-white text-opacity-60 text-lg">
            Upload documents, PDFs, or images to automatically extract artist information using AI
          </p>
        </motion.div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div
            {...getRootProps()}
            className={`glass-card border-2 border-dashed transition-all duration-300 cursor-pointer ${
              isDragActive 
                ? 'border-blue-400 border-opacity-60 bg-blue-500 bg-opacity-10' 
                : 'border-white border-opacity-30 hover:border-opacity-50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-center py-12">
              <Upload className={`w-16 h-16 mx-auto mb-4 ${
                isDragActive ? 'text-blue-400' : 'text-white text-opacity-60'
              }`} />
              <h3 className="text-xl font-semibold text-white mb-2">
                {isDragActive ? 'Drop files here' : 'Upload Documents'}
              </h3>
              <p className="text-white text-opacity-60 mb-4">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-white text-opacity-40 text-sm">
                Supports PDF, DOC, DOCX, and image files (max 10MB each)
              </p>
            </div>
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-red-500 bg-opacity-20 border border-red-500 border-opacity-30 flex items-center space-x-2"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </motion.div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-card mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Files to Process</h3>
              <button
                onClick={uploadFiles}
                disabled={uploading || files.every(f => f.status === 'completed')}
                className="glass-button bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {uploading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Extract Artists</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-3">
              {files.map((fileItem) => {
                const FileIcon = getFileIcon(fileItem.file);
                return (
                  <div key={fileItem.id} className="flex items-center space-x-4 p-4 rounded-lg glass">
                    <div className="flex-shrink-0">
                      <FileIcon className="w-8 h-8 text-white text-opacity-60" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{fileItem.file.name}</p>
                      <p className="text-white text-opacity-60 text-sm">
                        {formatFileSize(fileItem.file.size)}
                      </p>
                      
                      {fileItem.status === 'uploading' && (
                        <div className="mt-2">
                          <div className="w-full h-2 bg-white bg-opacity-20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                              style={{ width: `${fileItem.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {fileItem.status === 'completed' && (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      )}
                      {fileItem.status === 'error' && (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      {fileItem.status === 'pending' && (
                        <button
                          onClick={() => removeFile(fileItem.id)}
                          className="p-1 hover:bg-white/10 rounded transition-colors duration-300"
                        >
                          <X className="w-5 h-5 text-white text-opacity-60" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-semibold text-white">Extraction Results</h3>
            
            {results.map((result, index) => (
              <div key={index} className="glass-card">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">{result.filename}</h4>
                  <div className="flex items-center space-x-2">
                    <button className="glass-button text-sm flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    <button className="glass-button text-sm flex items-center space-x-1">
                      <Download className="w-4 h-4" />
                      <span>Export</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Artists Found */}
                  <div>
                    <h5 className="text-white font-medium mb-3">
                      Artists Found ({result.artists.length})
                    </h5>
                    
                    {result.artists.length > 0 ? (
                      <div className="space-y-2">
                        {result.artists.map((artist, artistIndex) => (
                          <div key={artistIndex} className="p-3 rounded-lg glass">
                            <p className="text-white font-medium">{artist.artist_name || 'Unknown Artist'}</p>
                            {artist.summary && (
                              <p className="text-white text-opacity-60 text-sm mt-1">
                                {artist.summary.substring(0, 100)}...
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white text-opacity-60 text-sm">No artists found in this document</p>
                    )}
                  </div>

                  {/* Extracted Text Preview */}
                  <div>
                    <h5 className="text-white font-medium mb-3">Text Preview</h5>
                    <div className="p-3 rounded-lg glass max-h-40 overflow-y-auto">
                      <p className="text-white text-opacity-60 text-sm whitespace-pre-wrap">
                        {result.extractedText.substring(0, 300)}
                        {result.extractedText.length > 300 && '...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Empty State */}
        {files.length === 0 && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center py-12"
          >
            <Upload className="w-24 h-24 text-white text-opacity-40 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-white mb-2">No files uploaded yet</h3>
            <p className="text-white text-opacity-60">
              Upload your first document to start extracting artist information
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ExtractArtist;