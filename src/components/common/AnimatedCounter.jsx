import { useSpring, animated } from '@react-spring/web';
import { useEffect, useState } from 'react';

export default function AnimatedCounter({ value, decimals = 0, prefix = '', suffix = '', className = '' }) {
  const [visible, setVisible] = useState(false);
  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : (value ?? 0);

  useEffect(() => {
    setVisible(true);
  }, []);

  const spring = useSpring({
    from: { val: 0 },
    to: { val: visible ? numericValue : 0 },
    config: { tension: 50, friction: 20 },
  });

  if (isNaN(numericValue)) {
    return <span className={className}>{prefix}{value}{suffix}</span>;
  }

  return (
    <animated.span className={`tabular-nums ${className}`}>
      {spring.val.to(v => `${prefix}${v.toFixed(decimals)}${suffix}`)}
    </animated.span>
  );
}
