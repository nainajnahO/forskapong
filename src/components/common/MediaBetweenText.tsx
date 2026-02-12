import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';
import type { UseInViewOptions, Variants } from 'motion/react';

import { cn } from '@/lib/utils';

/** Configuration for video playback behavior. */
interface VideoConfig {
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  posterUrl?: string;
}

/** Configuration for the reveal animation. */
interface AnimationConfig {
  variants?: {
    initial: Variants['initial'];
    animate: Variants['animate'];
  };
  inViewOptions?: UseInViewOptions;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

interface MediaBetweenTextProps {
  /** The text to display before the media. */
  firstText: string;
  /** The text to display after the media. */
  secondText: string;
  /** URL of the media (image or video) to display. */
  mediaUrl: string;
  /** Type of media to display. */
  mediaType: 'image' | 'video';
  /** Alt text for image media. */
  alt?: string;
  /** Animation trigger type. @default "hover" */
  variant?: 'hover' | 'scroll' | 'controlled';
  /** Video playback configuration. Only used when mediaType is "video". */
  videoConfig?: VideoConfig;
  /** Animation configuration for advanced customization. */
  animationConfig?: AnimationConfig;
  /** Optional class name for the root element. */
  className?: string;
  /** Optional class name for the left text element. */
  leftTextClassName?: string;
  /** Optional class name for the right text element. */
  rightTextClassName?: string;
  /** Optional class name for the media container. */
  mediaContainerClassName?: string;
}

export type MediaBetweenTextRef = {
  animate: () => void;
  reset: () => void;
};

const DEFAULT_ANIMATION_VARIANTS = {
  initial: { width: 0, opacity: 1 },
  animate: {
    width: 'auto',
    opacity: 1,
    transition: { duration: 0.4, type: 'spring' as const, bounce: 0 },
  },
};

const DEFAULT_IN_VIEW_OPTIONS: UseInViewOptions = {
  once: true,
  amount: 0.5,
};

export const MediaBetweenText = forwardRef<MediaBetweenTextRef, MediaBetweenTextProps>(
  (
    {
      firstText,
      secondText,
      mediaUrl,
      mediaType,
      alt,
      variant = 'hover',
      videoConfig,
      animationConfig,
      className,
      leftTextClassName,
      rightTextClassName,
      mediaContainerClassName,
    },
    ref,
  ) => {
    const componentRef = useRef<HTMLDivElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const inViewRef = animationConfig?.containerRef || componentRef;
    const inViewOptions = animationConfig?.inViewOptions ?? DEFAULT_IN_VIEW_OPTIONS;
    const inViewResult = useInView(inViewRef, inViewOptions);
    const isInView = variant === 'scroll' ? inViewResult : false;

    useImperativeHandle(ref, () => ({
      animate: () => setIsAnimating(true),
      reset: () => setIsAnimating(false),
    }));

    const shouldAnimate =
      variant === 'hover'
        ? isHovered
        : variant === 'scroll'
          ? isInView
          : variant === 'controlled'
            ? isAnimating
            : false;

    const variants = animationConfig?.variants ?? DEFAULT_ANIMATION_VARIANTS;

    const {
      autoPlay = true,
      loop = true,
      muted = true,
      playsInline = true,
      posterUrl,
    } = videoConfig ?? {};

    return (
      <div
        className={cn('flex', className)}
        ref={componentRef}
        onMouseEnter={() => variant === 'hover' && setIsHovered(true)}
        onMouseLeave={() => variant === 'hover' && setIsHovered(false)}
      >
        <motion.p layout className={leftTextClassName}>
          {firstText}
        </motion.p>
        <motion.div
          className={mediaContainerClassName}
          variants={variants}
          initial="initial"
          animate={shouldAnimate ? 'animate' : 'initial'}
        >
          {mediaType === 'video' ? (
            <video
              className="w-full h-full object-cover"
              autoPlay={autoPlay}
              loop={loop}
              muted={muted}
              playsInline={playsInline}
              poster={posterUrl}
            >
              <source src={mediaUrl} type="video/mp4" />
            </video>
          ) : (
            <img
              src={mediaUrl}
              alt={alt || `${firstText} ${secondText}`}
              className="w-full h-full object-cover"
            />
          )}
        </motion.div>
        <motion.p layout className={rightTextClassName}>
          {secondText}
        </motion.p>
      </div>
    );
  },
);

MediaBetweenText.displayName = 'MediaBetweenText';

export default MediaBetweenText;
