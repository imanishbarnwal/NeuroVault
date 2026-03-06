/**
 * Radix-2 Cooley-Tukey FFT implementation.
 * Operates on real-valued input, returns magnitude spectrum.
 * Input length must be a power of 2.
 */

/**
 * Compute the FFT of a real-valued signal.
 * Returns the power spectrum (magnitude squared) for positive frequencies only.
 *
 * @param signal - Input signal (length must be a power of 2)
 * @returns Float64Array of length N/2+1 with power values
 */
export function fftPowerSpectrum(signal: Float32Array | Float64Array): Float64Array {
  const N = signal.length;
  if (N === 0 || (N & (N - 1)) !== 0) {
    throw new Error(`FFT input length must be a power of 2, got ${N}`);
  }

  // Copy into real/imag arrays
  const real = new Float64Array(N);
  const imag = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    real[i] = signal[i];
  }

  // Bit-reversal permutation
  const bits = Math.log2(N);
  for (let i = 0; i < N; i++) {
    const j = bitReverse(i, bits);
    if (j > i) {
      let tmp = real[i];
      real[i] = real[j];
      real[j] = tmp;
      tmp = imag[i];
      imag[i] = imag[j];
      imag[j] = tmp;
    }
  }

  // Cooley-Tukey iterative FFT
  for (let size = 2; size <= N; size *= 2) {
    const halfSize = size / 2;
    const angleStep = (-2 * Math.PI) / size;

    for (let i = 0; i < N; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const angle = angleStep * j;
        const twiddleReal = Math.cos(angle);
        const twiddleImag = Math.sin(angle);

        const evenIdx = i + j;
        const oddIdx = i + j + halfSize;

        const tReal =
          twiddleReal * real[oddIdx] - twiddleImag * imag[oddIdx];
        const tImag =
          twiddleReal * imag[oddIdx] + twiddleImag * real[oddIdx];

        real[oddIdx] = real[evenIdx] - tReal;
        imag[oddIdx] = imag[evenIdx] - tImag;
        real[evenIdx] = real[evenIdx] + tReal;
        imag[evenIdx] = imag[evenIdx] + tImag;
      }
    }
  }

  // Power spectrum for positive frequencies (DC to Nyquist)
  const numBins = N / 2 + 1;
  const power = new Float64Array(numBins);
  for (let i = 0; i < numBins; i++) {
    power[i] = real[i] * real[i] + imag[i] * imag[i];
  }

  return power;
}

/**
 * Reverse the bottom `bits` bits of integer `x`.
 */
function bitReverse(x: number, bits: number): number {
  let result = 0;
  for (let i = 0; i < bits; i++) {
    result = (result << 1) | (x & 1);
    x >>= 1;
  }
  return result;
}
