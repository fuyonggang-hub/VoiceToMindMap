
import React from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-2 flex items-center justify-center gap-3">
          <i className="fa-solid fa-microphone-lines text-indigo-600"></i>
          Speech2Formal
        </h1>
        <p className="text-slate-500 text-lg">Speak naturally. We'll handle the professionalism.</p>
      </header>
      <main className="w-full bg-white rounded-3xl shadow-xl shadow-slate-200 p-8 border border-slate-100">
        {children}
      </main>
      <footer className="mt-12 text-center text-slate-400 text-sm">
        Powered by Gemini AI • Professional Text Transformation
      </footer>
    </div>
  );
};
