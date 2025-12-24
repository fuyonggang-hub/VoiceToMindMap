
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Layout } from './components/Layout';
import { AppStatus, TransformationResult } from './types';
import { RecordingIndicator } from './components/RecordingIndicator';
import { transformSpeech } from './services/geminiService';
import { blobToBase64, downloadTextFile } from './utils/audioUtils';
import { MindMap } from './components/MindMap';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<TransformationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [viewMode, setViewMode] = useState<'text' | 'mindmap'>('text');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        await processAudio(audioBlob, recorder.mimeType);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setStatus(AppStatus.RECORDING);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setError("无法访问麦克风。请检查权限。");
      setStatus(AppStatus.ERROR);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === AppStatus.RECORDING) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      setStatus(AppStatus.PROCESSING);
    }
  };

  const processAudio = async (blob: Blob, mimeType: string) => {
    try {
      const base64 = await blobToBase64(blob);
      const data = await transformSpeech(base64, mimeType);
      setResult(data);
      setStatus(AppStatus.RESULT);
    } catch (err: any) {
      setError(err.message || "处理过程中出现错误。");
      setStatus(AppStatus.ERROR);
    }
  };

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setResult(null);
    setError(null);
    setRecordingTime(0);
    setViewMode('text');
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.formalText);
      alert("文本已复制到剪贴板！");
    }
  };

  const handleShare = async () => {
    if (result && navigator.share) {
      try {
        await navigator.share({
          title: '正式语言转换结果',
          text: result.formalText,
        });
      } catch (err) {
        console.error("分享失败", err);
      }
    } else {
      copyToClipboard();
    }
  };

  const renderContent = () => {
    switch (status) {
      case AppStatus.IDLE:
        return (
          <div className="flex flex-col items-center py-10">
            <button
              onClick={startRecording}
              className="group relative flex items-center justify-center w-32 h-32 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all duration-300 shadow-lg hover:shadow-indigo-200 active:scale-95"
            >
              <i className="fa-solid fa-microphone text-4xl group-hover:scale-110 transition-transform"></i>
            </button>
            <p className="mt-8 text-slate-600 font-medium">点击开始说话</p>
            <p className="mt-2 text-slate-400 text-sm">语音将自动转写为正式语言并生成脑图</p>
          </div>
        );

      case AppStatus.RECORDING:
        return (
          <div className="flex flex-col items-center py-10" onClick={stopRecording}>
            <RecordingIndicator duration={recordingTime} />
            <button 
              className="mt-8 px-6 py-2 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
            >
              停止录音
            </button>
          </div>
        );

      case AppStatus.PROCESSING:
        return (
          <div className="flex flex-col items-center py-12 space-y-6">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-800">正在构建逻辑结构...</h3>
              <p className="text-slate-500 mt-2">AI 正在转录、改写并生成思维导图</p>
            </div>
          </div>
        );

      case AppStatus.RESULT:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('text')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  正式文本
                </button>
                <button
                  onClick={() => setViewMode('mindmap')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'mindmap' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  思维导图
                </button>
              </div>
              
              <button 
                onClick={reset}
                className="text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <i className="fa-solid fa-rotate-left"></i>
                重新开始
              </button>
            </div>
            
            <div className="mb-8">
              {viewMode === 'text' ? (
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 min-h-[350px] whitespace-pre-wrap text-slate-700 leading-relaxed italic md:text-lg">
                  {result?.formalText}
                </div>
              ) : (
                <div className="min-h-[350px]">
                  {result?.mindMap && <MindMap data={result.mindMap} />}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button 
                onClick={copyToClipboard}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 font-semibold"
              >
                <i className="fa-solid fa-copy"></i>
                复制文本
              </button>
              <button 
                onClick={() => downloadTextFile(result?.formalText || "", "formal-text.txt")}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700 font-semibold"
              >
                <i className="fa-solid fa-download"></i>
                下载文件
              </button>
              <button 
                onClick={handleShare}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold shadow-md shadow-indigo-100"
              >
                <i className="fa-solid fa-share-nodes"></i>
                分享结果
              </button>
            </div>

            <div className="mt-10 pt-10 border-t border-slate-100">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">原始转录内容</h4>
              <p className="text-slate-400 text-sm italic">{result?.originalTranscription}</p>
            </div>
          </div>
        );

      case AppStatus.ERROR:
        return (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
              <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800">出错了</h3>
            <p className="text-slate-500 mt-2 mb-8">{error}</p>
            <button 
              onClick={reset}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-semibold"
            >
              重试一次
            </button>
          </div>
        );
    }
  };

  return (
    <Layout>
      {renderContent()}
    </Layout>
  );
};

export default App;
