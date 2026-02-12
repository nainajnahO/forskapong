import React from 'react';

const FramerBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <iframe
        src="https://incomplete-listening-378233.framer.app"
        className="absolute"
        style={{
          border: 'none',
          width: '120%',
          height: '125%',
          top: '0%',
          left: '0%',
        }}
        title="Background Animation"
        loading="lazy"
        allowFullScreen
      />
    </div>
  );
};

export default FramerBackground;
