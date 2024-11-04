// passwordStrength.js

/**
 * Estimates the time to brute-force crack a password.
 * @param {string} password - The password to evaluate.
 * @returns {object} - Estimated time in various units and a strength level.
 */
export function calculatePasswordStrength(password) {
    const length = password.length;
    const charsetSize = estimateCharsetSize(password);
    const guessesPerSecond = 50e10; // 50 GPUs, each with 1 billion guesses per second
  
    const totalCombinations = Math.pow(charsetSize, length);
    const secondsToCrack = totalCombinations / guessesPerSecond;
  
    return {
      ...convertSecondsToTime(secondsToCrack),
      level: determineStrengthLevel(secondsToCrack)
    };
  }
  
  /**
   * Estimates the character set size based on used characters.
   */
  function estimateCharsetSize(password) {
    let size = 0;
    if (/[a-z]/.test(password)) size += 26;
    if (/[A-Z]/.test(password)) size += 26;
    if (/[0-9]/.test(password)) size += 10;
    if (/[^a-zA-Z0-9]/.test(password)) size += 32; // Special characters
    return size;
  }
  
  /**
   * Converts seconds into human-readable time.
   */
  function convertSecondsToTime(seconds) {
    const years = Math.floor(seconds / 31536000);
    seconds %= 31536000;
    const months = Math.floor(seconds / 2592000);
    seconds %= 2592000;
    const days = Math.floor(seconds / 86400);
    seconds %= 86400;
    const hours = Math.floor(seconds / 3600);
    seconds %= 3600;
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    return { years, months, days, hours, minutes, seconds };
  }
  
  /**
   * Determines strength level based on time to crack.
   */
  /**
 * Determines strength level based on time to crack.
 */
function determineStrengthLevel(seconds) {

    //console.log("seconds: ", seconds);

    if (seconds > 604800) return "strong"; // >1 week
    if (seconds > 86400) return "medium-strong"; // 1 day to 1 week
    if (seconds > 3600) return "medium"; // 1 hour to 1 day
    if (seconds > 60) return "weak-medium"; // 1 minute to 1 hour
    return "weak"; // <1 minute
  }