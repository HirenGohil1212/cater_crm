"use client"
import React, { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';

interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  disabled?: boolean;
}

export function OtpInput({ length = 6, onComplete, disabled = false }: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Move to next input
    if (element.nextSibling && element.value) {
      (element.nextSibling as HTMLInputElement).focus();
    }
    
    // Check if OTP is complete
    const otpString = newOtp.join('');
    if (otpString.length === length) {
      onComplete(otpString);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    // Move to previous input on backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      if (inputRefs.current[index - 1]) {
        (inputRefs.current[index - 1] as HTMLInputElement).focus();
      }
    }
  };

  return (
    <div className="flex justify-center gap-2">
      {otp.map((data, index) => {
        return (
          <input
            key={index}
            type="text"
            name="otp"
            maxLength={1}
            value={data}
            ref={el => inputRefs.current[index] = el}
            onChange={e => handleChange(e.target, index)}
            onKeyDown={e => handleKeyDown(e, index)}
            onFocus={e => e.target.select()}
            disabled={disabled}
            className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-md bg-background text-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
        );
      })}
    </div>
  );
}
