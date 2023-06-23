export const reduceRatio = (numerator: number, denominator: number): string => {
  let temp: number | undefined;
  let left: number;
  let right: number;

  const gcd = function (a: number, b: number): number {
    if (b === 0) {
      return a;
    }
    return gcd(b, a % b);
  };

  if (numerator === denominator) {
    return '1:1';
  }

  if (+numerator < +denominator) {
    temp = numerator;
    numerator = denominator;
    denominator = temp;
  }

  const divisor = gcd(+numerator, +denominator);

  if (typeof temp === 'undefined') {
    left = numerator / divisor;
    right = denominator / divisor;
  } else {
    left = denominator / divisor;
    right = numerator / divisor;
  }

  if (left === 8 && right === 5) {
    left = 16;
    right = 10;
  }

  return `${left}:${right}`;
};
