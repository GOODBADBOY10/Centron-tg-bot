import { createCanvas } from 'canvas';

export interface TradingImageParams {
  tokenName: string;
  percentage: number;
  amount: string;
  invested: string;
  sold: string;
  referralCode: string;
}

export function generateTradingImage(params: TradingImageParams): Buffer {
  const { tokenName, percentage, amount, invested, sold, referralCode } = params;
  const isProfit = percentage >= 0;
  
  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');
  
  // Clear canvas with transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Add placeholders for images (to be replaced with actual images)
  addImagePlaceholders(ctx, isProfit);
  
  // Add text overlays
  if (isProfit) {
    addProfitOverlays(ctx, tokenName, percentage, amount, invested, sold, referralCode);
  } else {
    addLossOverlays(ctx, tokenName, Math.abs(percentage), amount, invested, sold, referralCode);
  }
  
  return canvas.toBuffer('image/png');
}

// Placeholder for multiple images
import { CanvasRenderingContext2D } from 'canvas';

function addImagePlaceholders(ctx: CanvasRenderingContext2D, isProfit: boolean) {
  // Main image placeholder
  ctx.fillStyle = isProfit ? 'rgba(45, 125, 125, 0.3)' : 'rgba(135, 206, 235, 0.3)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.strokeStyle = isProfit ? '#2D7D7D' : '#87CEEB';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, ctx.canvas.width - 20, ctx.canvas.height - 20);
  
  // Placeholder for decorative elements (top left)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(20, 20, 100, 100);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(20, 20, 100, 100);
  
  // Placeholder for decorative elements (bottom right)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(ctx.canvas.width - 120, ctx.canvas.height - 120, 100, 100);
  ctx.strokeStyle = '#ffffff';
  ctx.strokeRect(ctx.canvas.width - 120, ctx.canvas.height - 120, 100, 100);
  
  // Placeholder text for images
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Main Image Placeholder', ctx.canvas.width / 2, ctx.canvas.height / 2);
  ctx.fillText('Decorative Image 1', 70, 70);
  ctx.fillText('Decorative Image 2', ctx.canvas.width - 70, ctx.canvas.height - 70);
}

// Overlay rendering functions (unchanged from original)
function addProfitOverlays(
  ctx: CanvasRenderingContext2D,
  tokenName: string,
  percentage: number,
  amount: string,
  invested: string,
  sold: string,
  referralCode: string
) {
  // Token name
  drawTextWithStroke(ctx, tokenName, 40, 400, 60);

  // Green percentage box
  ctx.fillStyle = '#00FF7F';
  ctx.fillRect(300, 90, 200, 60);
  ctx.fillStyle = 'black';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`+${percentage.toLocaleString()}%`, 400, 130);

  // Amount box
  drawTextBox(ctx, amount, 28, 250, 170, 300, 50);

  // Stats
  drawStatText(ctx, 'INVESTED', invested, 100, 480, 510);
  drawStatText(ctx, 'SOLD', sold, 500, 480, 510);

  // Referral code
  drawReferralCode(ctx, referralCode);
}

function addLossOverlays(
  ctx: CanvasRenderingContext2D,
  tokenName: string,
  percentage: number,
  amount: string,
  invested: string,
  sold: string,
  referralCode: string
) {
  // Token name
  drawTextWithStroke(ctx, tokenName, 40, 400, 60);

  // Red percentage box
  ctx.fillStyle = '#FF4444';
  ctx.fillRect(300, 90, 200, 60);
  ctx.fillStyle = 'white';
  ctx.font = 'bold 32px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`-${percentage.toLocaleString()}%`, 400, 130);

  // Amount box
  drawTextBox(ctx, amount, 28, 250, 170, 300, 50);

  // Stats
  drawStatText(ctx, 'INVESTED', invested, 100, 480, 510);
  drawStatText(ctx, 'SOLD', sold, 500, 480, 510);

  // Referral code
  drawReferralCode(ctx, referralCode);
}

// Helper functions (unchanged from original)
function drawTextWithStroke(ctx: CanvasRenderingContext2D, text: string, fontSize: number, x: number, y: number) {
  ctx.fillStyle = 'white';
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = fontSize / 20;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
}

function drawTextBox(ctx: CanvasRenderingContext2D, text: string, fontSize: number, x: number, y: number, width: number, height: number) {
  ctx.fillStyle = 'white';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = 'black';
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x + width / 2, y + height / 2 + fontSize / 3);
}

function drawStatText(ctx: CanvasRenderingContext2D, label: string, value: string, x: number, yLabel: number, yValue: number) {
  ctx.fillStyle = 'white';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'left';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 1;
  ctx.strokeText(label, x, yLabel);
  ctx.fillText(label, x, yLabel);

  ctx.font = 'bold 24px Arial';
  ctx.strokeText(`${value} SOL`, x, yValue);
  ctx.fillText(`${value} SOL`, x, yValue);
}

function drawReferralCode(ctx: CanvasRenderingContext2D, referralCode: string) {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(50, 540, 200, 40);
  ctx.fillStyle = 'black';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Referral Code: ${referralCode}`, 150, 565);
}