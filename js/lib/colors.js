/**
 * Converts an audio frequency (Hz) to a color hex code by doubling
 * the frequency until it is within the frequency range of visible light.
 *
 * @param frequency The audio frequency (Hz)
 * @returns {string} The hex color code (e.g., "#RRGGBB")
 */
export function convertBaseFrequencyToColor(frequency) {
  let foundFreq = frequency;

  // double until higher than infrared
  while (foundFreq < 385000000000000) {
    foundFreq = foundFreq * 2;
  }

  return frequencyToColorHex(foundFreq);
}


// BELOW CODE SCRAPED FROM Google Gemini...

/**
 * Converts a frequency (Hz) to a color hex code.
 * Only frequencies within the visible light spectrum will produce a color;
 * others will return black (#000000).
 *
 * @param {number} frequency The frequency in Hertz (e.g., 5 x 10^14 Hz or 5e14)
 * @returns {string} The hex color code (e.g., "#RRGGBB")
 */
function frequencyToColorHex(frequency) {
  const SPEED_OF_LIGHT = 299792458; // meters per second

  // 1. Convert frequency (Hz) to wavelength (meters)
  let wavelengthMeters = SPEED_OF_LIGHT / frequency;

  // 2. Convert wavelength (meters) to nanometers (nm)
  let wavelengthNm = wavelengthMeters * 1e9; // 1 meter = 10^9 nm

  // 3. Map wavelength (nm) to RGB values (0-255 range)
  const { r, g, b } = wavelengthToRgb(wavelengthNm);

  // 4. Convert RGB to Hex
  return rgbToHex(r, g, b);
}

/**
 * Converts a wavelength (nm) to an RGB color object.
 * Based on the functions and approximations for the visible spectrum (380nm to 780nm).
 * Code adapted from online algorithms (e.g., http://www.physics.sfasu.edu/astro/color/spectra.html).
 * @param {number} wavelengthNm The wavelength in nanometers (380-780 range)
 * @returns {object} An object {r, g, b} with values from 0 to 255
 */
function wavelengthToRgb(wavelengthNm) {
  let r = 0, g = 0, b = 0;
  let factor = 0;

  if (wavelengthNm >= 380 && wavelengthNm <= 440) {
    r = -(wavelengthNm - 440) / (440 - 380);
    b = 1.0;
  } else if (wavelengthNm >= 440 && wavelengthNm <= 490) {
    g = (wavelengthNm - 440) / (490 - 440);
    b = 1.0;
  } else if (wavelengthNm >= 490 && wavelengthNm <= 510) {
    g = 1.0;
    b = -(wavelengthNm - 510) / (510 - 490);
  } else if (wavelengthNm >= 510 && wavelengthNm <= 580) {
    r = (wavelengthNm - 510) / (580 - 510);
    g = 1.0;
  } else if (wavelengthNm >= 580 && wavelengthNm <= 645) {
    r = 1.0;
    g = -(wavelengthNm - 645) / (645 - 580);
  } else if (wavelengthNm >= 645 && wavelengthNm <= 780) {
    r = 1.0;
  }
  // Frequencies outside the visible spectrum are black (r=0, g=0, b=0)

  // Adjust intensity curve (gamma correction for human eye sensitivity)
  const gamma = 0.8;
  r = Math.round(255 * Math.pow(r * factorIntensity(wavelengthNm), gamma));
  g = Math.round(255 * Math.pow(g * factorIntensity(wavelengthNm), gamma));
  b = Math.round(255 * Math.pow(b * factorIntensity(wavelengthNm), gamma));

  return { r, g, b };
}

// Helper function to simulate human eye's intensity drop-off at spectrum limits
function factorIntensity(wavelengthNm) {
  if (wavelengthNm >= 380 && wavelengthNm <= 420) return 0.3 + 0.7 * (wavelengthNm - 380) / (420 - 380);
  if (wavelengthNm >= 420 && wavelengthNm <= 700) return 1.0;
  if (wavelengthNm >= 700 && wavelengthNm <= 780) return 0.3 + 0.7 * (780 - wavelengthNm) / (780 - 700);
  return 0.0;
}

/**
 * Converts RGB values (0-255) to a hexadecimal string.
 * @param {number} r Red value (0-255)
 * @param {number} g Green value (0-255)
 * @param {number} b Blue value (0-255)
 * @returns {string} The hex color code
 */
function rgbToHex(r, g, b) {
  // Uses bit shifting for efficient conversion to a 6-digit hex string with padding
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}
