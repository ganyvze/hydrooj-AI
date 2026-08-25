import { addPage, NamedPage } from '@hydrooj/ui-default';

declare const UiContext: Record<string, any>;

const BALL_SIZE = 52;
const EDGE_MARGIN = 8;

const css = `
.ai-float-ball {
  position: fixed;
  z-index: 9999;
  width: ${BALL_SIZE}px;
  height: ${BALL_SIZE}px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 1px;
  cursor: grab;
  user-select: none;
  touch-action: none;
  background: #1e1e1e;
  color: #fff;
}
.ai-float-ball:active {
  cursor: grabbing;
}
.theme--dark .ai-float-ball {
  background: #fff;
  color: #121212;
}
`;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function createBall() {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const ball = document.createElement('div');
  ball.className = 'ai-float-ball';
  ball.textContent = 'AI';
  ball.style.left = `${window.innerWidth - BALL_SIZE - 24}px`;
  ball.style.top = `${window.innerHeight - BALL_SIZE - 96}px`;
  document.body.appendChild(ball);

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let originLeft = 0;
  let originTop = 0;

  ball.addEventListener('pointerdown', (ev) => {
    dragging = true;
    startX = ev.clientX;
    startY = ev.clientY;
    originLeft = ball.offsetLeft;
    originTop = ball.offsetTop;
    ball.setPointerCapture(ev.pointerId);
  });
  ball.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const left = clamp(
      originLeft + ev.clientX - startX,
      EDGE_MARGIN,
      window.innerWidth - BALL_SIZE - EDGE_MARGIN,
    );
    const top = clamp(
      originTop + ev.clientY - startY,
      EDGE_MARGIN,
      window.innerHeight - BALL_SIZE - EDGE_MARGIN,
    );
    ball.style.left = `${left}px`;
    ball.style.top = `${top}px`;
  });
  ball.addEventListener('pointerup', (ev) => {
    dragging = false;
    ball.releasePointerCapture(ev.pointerId);
  });
  ball.addEventListener('pointercancel', () => {
    dragging = false;
  });

  window.addEventListener('resize', () => {
    const left = clamp(ball.offsetLeft, EDGE_MARGIN, window.innerWidth - BALL_SIZE - EDGE_MARGIN);
    const top = clamp(ball.offsetTop, EDGE_MARGIN, window.innerHeight - BALL_SIZE - EDGE_MARGIN);
    ball.style.left = `${left}px`;
    ball.style.top = `${top}px`;
  });

  return ball;
}

addPage(new NamedPage(['problem_detail', 'record_detail'], () => {
  if (!UiContext.showAiFloatButton) return;
  createBall();
}));
