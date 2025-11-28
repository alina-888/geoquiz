/**
 * Generate a consistent color gradient for a username
 * @param {string} username - The username to generate color for
 * @returns {string} - CSS gradient string
 */
export const getAvatarGradient = (username) => {
  if (!username) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  // Generate hash from username
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Array of beautiful gradient combinations
  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Pink-Red
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Blue
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Green-Teal
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Pink-Yellow
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', // Teal-Purple
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', // Pastel
    'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)', // Orange-Pink
    'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)', // Lavender
    'linear-gradient(135deg, #fdcbf1 0%, #e6dee9 100%)', // Light Pink
    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', // Sky Blue
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', // Peach
  ];

  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
};
