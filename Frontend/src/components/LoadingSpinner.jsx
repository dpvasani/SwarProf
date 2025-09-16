import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = 'md', message = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <motion.div
        className={`${sizeClasses[size]} relative`}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-4 border-white border-opacity-20"></div>
        
        {/* Spinning gradient ring */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 border-r-purple-400"></div>
        
        {/* Inner glow */}
        <motion.div
          className="absolute inset-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-20 blur-sm"
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </motion.div>
      
      {message && (
        <motion.p
          className="text-white text-opacity-80 text-sm font-medium"
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
};

export default LoadingSpinner;