import React from 'react';
import { motion } from 'framer-motion';

const FloatingOrbs = () => {
  const orbs = [
    {
      id: 1,
      size: 'w-72 h-72',
      color: 'bg-gradient-to-r from-blue-400 to-cyan-400',
      position: 'top-10 -left-20',
      delay: 0,
    },
    {
      id: 2,
      size: 'w-96 h-96',
      color: 'bg-gradient-to-r from-purple-400 to-pink-400',
      position: 'top-1/3 -right-32',
      delay: 2,
    },
    {
      id: 3,
      size: 'w-80 h-80',
      color: 'bg-gradient-to-r from-indigo-400 to-purple-400',
      position: 'bottom-10 -left-28',
      delay: 4,
    },
    {
      id: 4,
      size: 'w-64 h-64',
      color: 'bg-gradient-to-r from-cyan-400 to-blue-400',
      position: 'bottom-1/4 -right-20',
      delay: 1,
    },
    {
      id: 5,
      size: 'w-52 h-52',
      color: 'bg-gradient-to-r from-pink-400 to-purple-400',
      position: 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
      delay: 3,
    },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none">
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className={`absolute ${orb.size} ${orb.color} ${orb.position} rounded-full opacity-20 blur-3xl`}
          animate={{
            scale: [1, 1.2, 0.8, 1],
            rotate: [0, 90, 180, 270, 360],
            x: [0, 50, -30, 20, 0],
            y: [0, -30, 50, -20, 0],
          }}
          transition={{
            duration: 20 + orb.delay * 2,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: orb.delay,
          }}
        />
      ))}
      
      {/* Additional smaller floating particles */}
      {Array.from({ length: 8 }).map((_, index) => (
        <motion.div
          key={`particle-${index}`}
          className="absolute w-4 h-4 bg-white rounded-full opacity-30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
            delay: Math.random() * 4,
          }}
        />
      ))}
    </div>
  );
};

export default FloatingOrbs;