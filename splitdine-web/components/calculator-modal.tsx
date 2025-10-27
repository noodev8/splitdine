'use client';

import { useState, useEffect } from 'react';

interface CalculatorModalProps {
  isOpen: boolean;
  initialValue: number;
  onSave: (value: number) => void;
  onCancel: () => void;
}

export default function CalculatorModal({
  isOpen,
  initialValue,
  onSave,
  onCancel
}: CalculatorModalProps) {
  const [value, setValue] = useState(initialValue === 0 ? '' : initialValue.toString());
  const [isFirstInput, setIsFirstInput] = useState(true);

  // Reset calculator when opened with new initialValue
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue === 0 ? '' : initialValue.toString());
      setIsFirstInput(true);
    }
  }, [isOpen, initialValue]);

  const handleNumberPress = (num: string) => {
    if (isFirstInput && num !== '.') {
      setValue(num);
      setIsFirstInput(false);
    } else {
      // Prevent multiple decimal points
      if (num === '.' && value.includes('.')) return;
      setValue(prev => prev + num);
      setIsFirstInput(false);
    }
  };

  const handleBackspace = () => {
    setValue(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setValue('');
    setIsFirstInput(true);
  };

  const handleSave = () => {
    const numValue = parseFloat(value) || 0;
    onSave(numValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (/^[0-9.]$/.test(e.key)) {
      handleNumberPress(e.key);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Display */}
          <div className="mb-4">
            <div className="text-right px-4 py-3 bg-slate-100 dark:bg-slate-700 rounded-lg mb-4">
              <div className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
                £{value ? parseFloat(value).toFixed(2) : '0.00'}
              </div>
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-2">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫'].map((btn) => (
                <button
                  key={btn}
                  onClick={() => {
                    if (btn === '⌫') handleBackspace();
                    else handleNumberPress(btn);
                  }}
                  className="p-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-lg font-semibold text-slate-800 dark:text-slate-100 transition-colors"
                >
                  {btn}
                </button>
              ))}
            </div>

            {/* Clear Button */}
            <button
              onClick={handleClear}
              className="w-full mt-2 p-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 rounded-lg text-base font-semibold text-slate-800 dark:text-slate-100 transition-colors"
            >
              Clear
            </button>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={onCancel}
                className="p-4 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500 rounded-lg text-lg font-semibold text-slate-800 dark:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold text-white transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
