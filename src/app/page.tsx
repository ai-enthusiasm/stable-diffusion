'use client';

import React, { useState, ChangeEvent } from 'react';
import { Rocket, Wand2, Sparkles, Scissors, Expand, Download } from 'lucide-react';
import { motion } from 'framer-motion';

type ImageMode = 'text-to-image' | 'image-to-image' | 'inpainting' | 'outpainting' | 'controlnet';

export default function AIImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<ImageMode>('text-to-image');
  const [inputImage, setInputImage] = useState<File | null>(null);
  const [maskImage, setMaskImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, type: 'input' | 'mask') => {
    const file = e.target.files?.[0];
    if (file) {
      const MAX_FILE_SIZE = 10 * 1024 * 1024; 
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

      if (file.size > MAX_FILE_SIZE) {
        setError('Kích thước file quá lớn. Vui lòng chọn file dưới 10MB.');
        return;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError('Định dạng file không được hỗ trợ. Vui lòng chọn JPEG, PNG hoặc WebP.');
        return;
      }

      type === 'input' ? setInputImage(file) : setMaskImage(file);
      setError(null);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = 'generated_image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('input', prompt);

      let endpoint = '';
      switch (mode) {
        case 'text-to-image':
          endpoint = '/text-to-image/';
          break;
        case 'image-to-image':
          if (!inputImage) {
            setError('Vui lòng tải ảnh đầu vào');
            setIsGenerating(false);
            return;
          }
          formData.append('file', inputImage);
          endpoint = '/image-to-image/';
          break;
        case 'inpainting':
          if (!inputImage || !maskImage) {
            setError('Vui lòng tải ảnh đầu vào và ảnh mặt nạ');
            setIsGenerating(false);
            return;
          }
          formData.append('file', inputImage);
          formData.append('mask', maskImage);
          endpoint = '/inpainting/';
          break;
        default:
          setError('Chế độ không được hỗ trợ');
          setIsGenerating(false);
          return;
      }

      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Không thể tạo hình ảnh');
      }

      const data = await response.json();
      setGeneratedImage(`/${data.image_path}`);
    } catch (error) {
      console.error('Lỗi sinh ảnh', error);
      setError(error instanceof Error ? error.message : 'Đã có lỗi xảy ra');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderModeSelector = () => {
    const modes: { value: ImageMode; icon: React.ElementType; label: string }[] = [
      { value: 'text-to-image', icon: Wand2, label: 'Văn bản → Ảnh' },
      { value: 'image-to-image', icon: Sparkles, label: 'Chuyển đổi Ảnh' },
      { value: 'inpainting', icon: Scissors, label: 'Sửa Ảnh' }
    ];

    return (
      <div className="flex justify-center space-x-2 mb-4">
        {modes.map((m) => (
          <motion.button
            key={m.value}
            onClick={() => setMode(m.value)}
            className={`
              px-3 py-2 rounded-lg flex items-center space-x-2 transition-all
              ${mode === m.value 
                ? 'bg-[#ff7b00] text-[#fff9f5]' 
                : 'bg-[#5C4033]/70 text-[#ff7b00]/70 hover:bg-[#5C4033]/90'}
            `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {React.createElement(m.icon, { className: "w-4 h-4" })}
            <span className="text-sm">{m.label}</span>
          </motion.button>
        ))}
      </div>
    );
  };

  const renderImageUpload = () => {
    if (mode === 'text-to-image') return null;

    return (
      <div className="flex space-x-4 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-[#ff7b00]">
            {mode === 'inpainting' ? 'Ảnh Gốc' : 'Ảnh Đầu Vào'}
          </label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => handleImageUpload(e, 'input')}
            className="mt-1 block w-full text-sm text-[#ff7b00] 
              file:mr-4 file:rounded-full file:border-0
              file:bg-[#5C4033] file:text-[#ff7b00]
              file:px-4 file:py-2 
              hover:file:bg-[#5C4033]/80"
          />
        </div>
        {mode === 'inpainting' && (
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#ff7b00]">
              Ảnh Mặt Nạ
            </label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleImageUpload(e, 'mask')}
              className="mt-1 block w-full text-sm text-[#ff7b00] 
                file:mr-4 file:rounded-full file:border-0
                file:bg-[#5C4033] file:text-[#ff7b00]
                file:px-4 file:py-2 
                hover:file:bg-[#5C4033]/80"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#2c2c42] to-[#5C4033] text-[#fff9f5] flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-3xl space-y-8 relative">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 rounded-lg text-center">
            {error}
          </div>
        )}

        {renderModeSelector()}

        <motion.div 
          className="bg-[#5C4033]/70 backdrop-blur-sm border border-[#ff7b00]/20 rounded-xl p-1 flex items-center"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <input 
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Mô tả hình ảnh cho chế độ ${mode}...`}
            className="w-full bg-transparent px-4 py-3 outline-none text-[#fff9f5] placeholder-[#ff7b00]/50"
          />
          <motion.button 
            onClick={handleGenerate}
            disabled={!prompt || isGenerating}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`
              ml-2 p-3 rounded-lg transition-all duration-300
              ${isGenerating 
                ? 'bg-[#1a1a2e] text-[#5C4033]' 
                : 'bg-gradient-to-r from-[#ff7b00] to-[#ff3e3e] text-[#fff9f5]'}
              flex items-center space-x-2
            `}
          >
            {isGenerating ? (
              <span className="animate-pulse">Đang tạo...</span>
            ) : (
              <>
                <Rocket className="w-5 h-5 text-[#00c2ff]" />
                <span>Tạo Ngay</span>
              </>
            )}
          </motion.button>
        </motion.div>

        {renderImageUpload()}

        <motion.div 
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          {generatedImage ? (
            <div>
              <motion.div 
                className="bg-[#5C4033]/70 backdrop-blur-sm border border-[#ff7b00]/20 rounded-xl overflow-hidden relative"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <img 
                  src={generatedImage} 
                  alt="Hình ảnh được tạo" 
                  className="w-full h-[500px] object-cover opacity-90 hover:opacity-100 transition-opacity"
                />
                <motion.button
                  onClick={handleDownload}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute bottom-4 right-4 bg-[#ff7b00] text-white p-3 rounded-full shadow-lg flex items-center space-x-2"
                >
                  <Download className="w-5 h-5" />
                  <span>Tải xuống</span>
                </motion.button>
              </motion.div>
            </div>
          ) : (
            <div className="bg-[#5C4033]/70 backdrop-blur-sm border border-[#ff7b00]/20 rounded-xl h-[500px] flex items-center justify-center">
              <div className="text-center text-[#ff7b00]/70">
                <Wand2 className="w-16 h-16 mx-auto mb-4 text-[#ff3e3e]/50 animate-pulse" />
                <p>Hãy chọn chế độ và nhập mô tả để tạo hình ảnh</p>
                <p className="text-sm text-[#00c2ff]/60 mt-2">
                  Mỗi ý tưởng đều có thể trở thành hiện thực
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}