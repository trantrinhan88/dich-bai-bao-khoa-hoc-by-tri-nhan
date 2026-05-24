'use strict';
'use client';

import React, { useState } from 'react';

interface IClue {
  id: number;
  question: string;
  answer: string; // uppercase
  hint: string;
}

const CLUES: IClue[] = [
  { id: 1, question: "Phương thức kết xuất trang tĩnh cực nhanh của Next.js (Viết tắt)", answer: "SSG", hint: "S_ _" },
  { id: 2, question: "Font chữ có chân mang phong cách báo in cổ điển", answer: "SERIF", hint: "S_ _ _ _" },
  { id: 3, question: "CSS Utility Framework được định nghĩa trong cấu trúc dự án", answer: "TAILWIND", hint: "T_ _ _ _ _ _ _" },
  { id: 4, question: "Màu nền giấy ngả vàng bảo vệ mắt của E-Magazine", answer: "CREAM", hint: "C_ _ _ _" }
];

export default function CrosswordGame() {
  const [inputs, setInputs] = useState<{ [key: number]: string }>({});
  const [results, setResults] = useState<{ [key: number]: 'correct' | 'wrong' | null }>({});
  const [showHints, setShowHints] = useState<{ [key: number]: boolean }>({});
  const [score, setScore] = useState<number>(0);
  const [gameWon, setGameWon] = useState<boolean>(false);

  const handleInputChange = (clueId: number, value: string) => {
    setInputs(prev => ({
      ...prev,
      [clueId]: value.toUpperCase().replace(/[^A-Z]/g, '') // Chỉ nhận chữ cái
    }));
    // Reset status when user typing
    setResults(prev => ({
      ...prev,
      [clueId]: null
    }));
  };

  const checkAnswers = () => {
    let currentScore = 0;
    const newResults: { [key: number]: 'correct' | 'wrong' } = {};
    
    CLUES.forEach(clue => {
      const userAnswer = (inputs[clue.id] || '').trim();
      if (userAnswer === clue.answer) {
        newResults[clue.id] = 'correct';
        currentScore += 25;
      } else {
        newResults[clue.id] = 'wrong';
      }
    });

    setResults(newResults);
    setScore(currentScore);
    if (currentScore === 100) {
      setGameWon(true);
    } else {
      setGameWon(false);
    }
  };

  const resetGame = () => {
    setInputs({});
    setResults({});
    setShowHints({});
    setScore(0);
    setGameWon(false);
  };

  return (
    <div className="bg-[#f5f2eb] border-2 border-black p-5 rounded-md shadow-sm space-y-4 font-sans text-[#111111] transition-all duration-300">
      <div className="border-b border-black pb-2 flex justify-between items-center">
        <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-1.5">
          🧠 MINI PUZZLE TƯƠNG TÁC
        </h4>
        <span className="text-xs bg-black text-[#fcfbf7] px-2 py-0.5 font-bold uppercase rounded">
          ĐIỂM: {score}/100
        </span>
      </div>

      <p className="text-xs text-neutral-600 leading-relaxed font-medium">
        Giải mã các thuật ngữ trong <strong>Quy tắc chung</strong> để kiểm chứng logic Client Component hoạt động trực tiếp.
      </p>

      <div className="space-y-4">
        {CLUES.map((clue) => {
          const isCorrect = results[clue.id] === 'correct';
          const isWrong = results[clue.id] === 'wrong';
          
          return (
            <div key={clue.id} className="space-y-2 border-b border-dashed border-neutral-300 pb-3 last:border-0 last:pb-0">
              <div className="flex justify-between items-start gap-2">
                <span className="text-xs font-extrabold text-neutral-800 bg-neutral-200 w-5 h-5 flex items-center justify-center rounded-full shrink-0">
                  {clue.id}
                </span>
                <p className="text-xs font-bold leading-normal text-neutral-700 flex-grow pt-0.5">
                  {clue.question}
                </p>
              </div>

              <div className="flex items-center gap-2 pl-7">
                <input
                  type="text"
                  maxLength={clue.answer.length}
                  value={inputs[clue.id] || ''}
                  onChange={(e) => handleInputChange(clue.id, e.target.value)}
                  disabled={gameWon}
                  placeholder={`Nhập ${clue.answer.length} chữ cái`}
                  className={`w-full max-w-[160px] text-xs font-mono font-bold uppercase tracking-widest px-2.5 py-1.5 border rounded-sm outline-none transition-all duration-200 ${
                    isCorrect
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-emerald-100'
                      : isWrong
                      ? 'bg-red-50 border-red-500 text-red-800 shadow-red-100'
                      : 'bg-white border-neutral-400 hover:border-black focus:border-black focus:ring-1 focus:ring-black'
                  }`}
                />
                
                <button
                  type="button"
                  onClick={() => setShowHints(prev => ({ ...prev, [clue.id]: !prev[clue.id] }))}
                  className="text-[10px] uppercase font-bold tracking-wider px-2 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-600 rounded-sm active:scale-95 transition-all"
                >
                  {showHints[clue.id] ? "Ẩn gợi ý" : "Gợi ý"}
                </button>
              </div>

              {showHints[clue.id] && (
                <div className="pl-7 animate-fadeIn">
                  <p className="text-[11px] font-bold text-neutral-500 font-mono tracking-widest">
                    Gợi ý: <span className="bg-white px-1.5 py-0.5 border border-neutral-300 rounded text-neutral-700">{clue.hint}</span>
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {gameWon ? (
        <div className="bg-emerald-50 border border-emerald-500 p-3 rounded text-center space-y-2 animate-bounce">
          <p className="text-xs font-black text-emerald-800 uppercase tracking-wider">
            🎉 XUẤT SẮC! BẠN ĐÃ GIẢI ĐÚNG 100%!
          </p>
          <p className="text-[11px] text-emerald-700 leading-relaxed">
            Logic Client Component hoạt động hoàn hảo. Trình duyệt đã phản hồi đúng thời gian thực không cần tải lại trang.
          </p>
          <button
            type="button"
            onClick={resetGame}
            className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm transition"
          >
            Chơi lại
          </button>
        </div>
      ) : (
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={checkAnswers}
            className="flex-1 text-xs uppercase font-extrabold tracking-wider py-2.5 bg-black hover:bg-neutral-800 text-[#fcfbf7] rounded-sm active:scale-95 transition-all text-center"
          >
            Nộp kết quả
          </button>
          {(Object.keys(inputs).length > 0 || score > 0) && (
            <button
              type="button"
              onClick={resetGame}
              className="text-xs uppercase font-extrabold tracking-wider px-3 py-2.5 bg-neutral-300 hover:bg-neutral-400 text-neutral-700 rounded-sm active:scale-95 transition-all"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
