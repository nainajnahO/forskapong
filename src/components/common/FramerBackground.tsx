import React from 'react';

const FramerBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <iframe
        src="https://incomplete-listening-378233.framer.app"
        className="absolute"
        style={{
          border: 'none',
          width: '130%',
          height: '130%',
          top: '-10%',
          left: '-10%',
        }}
        title="Background Animation"
        loading="eager"
        allowFullScreen
      />
    </div>
  );
};

export default FramerBackground;
