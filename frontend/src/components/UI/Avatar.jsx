import React from 'react';

const COLORS = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-purple-600',
  'bg-rose-600',
  'bg-teal-600'
];

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-11 h-11 text-base'
};

const Avatar = ({ name = 'User', size = 'md' }) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  let charCodeSum = 0;
  for (let i = 0; i < name.length; i++) {
    charCodeSum += name.charCodeAt(i);
  }
  const colorIndex = charCodeSum % COLORS.length;
  const bgColor = COLORS[colorIndex];

  const sizeClasses = SIZES[size] || SIZES.md;

  return (
    <div className={`${sizeClasses} ${bgColor} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0`}>
      {initials}
    </div>
  );
};

export default Avatar;
