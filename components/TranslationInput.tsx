import React, { useRef, useLayoutEffect } from 'react';

interface TranslationInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const TranslationInput: React.FC<TranslationInputProps> = (props) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            // Reset height to shrink if text is deleted
            textarea.style.height = 'auto';
            // Set height to scrollHeight
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [props.value]);

    return (
        <textarea
            ref={textareaRef}
            rows={1}
            className="w-full h-full p-3 text-xl font-serif italic bg-stone-50 dark:bg-stone-800/80 border border-stone-300 dark:border-stone-600 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none overflow-hidden rounded-md"
            placeholder="..."
            {...props}
        />
    );
};
