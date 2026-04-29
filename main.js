const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const paddle = {
    width: 80,
    height: 10,
    x: (WIDTH - 80) / 2,
    y: HEIGHT - 30,
    speed: 6,
};

const ball = {
    x: WIDTH / 2,
    y: HEIGHT - 50,
    radius: 7,
    dx: 3,
    dy: -3,
};

const brick = {
    rows: 5,
    cols: 8,
    width: 50,
    height: 18,
    padding: 6,
    offsetTop: 40,
    offsetLeft: 25,
};

const colors = ['#ff4d4d', '#ff944d', '#ffd24d', '#4dff88', '#4dc3ff'];

let bricks = [];
let score = 0;
let lives = 3;
let gameState = 'playing';

const keys = { left: false, right: false };

function initBricks() {
    bricks = [];
    for (let r = 0; r < brick.rows; r++) {
        for (let c = 0; c < brick.cols; c++) {
            bricks.push({
                x: brick.offsetLeft + c * (brick.width + brick.padding),
                y: brick.offsetTop + r * (brick.height + brick.padding),
                color: colors[r % colors.length],
                alive: true,
            });
        }
    }
}

function resetBallAndPaddle() {
    paddle.x = (WIDTH - paddle.width) / 2;
    ball.x = WIDTH / 2;
    ball.y = HEIGHT - 50;
    ball.dx = 3 * (Math.random() < 0.5 ? -1 : 1);
    ball.dy = -3;
}

function reset() {
    score = 0;
    lives = 3;
    gameState = 'playing';
    initBricks();
    resetBallAndPaddle();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'r' || e.key === 'R') reset();
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    paddle.x = mx - paddle.width / 2;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > WIDTH) paddle.x = WIDTH - paddle.width;
});

function update() {
    if (gameState !== 'playing') return;

    if (keys.left) paddle.x -= paddle.speed;
    if (keys.right) paddle.x += paddle.speed;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > WIDTH) paddle.x = WIDTH - paddle.width;

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.dx = -ball.dx;
    }
    if (ball.x + ball.radius > WIDTH) {
        ball.x = WIDTH - ball.radius;
        ball.dx = -ball.dx;
    }
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.dy = -ball.dy;
    }

    if (
        ball.y + ball.radius >= paddle.y &&
        ball.y + ball.radius <= paddle.y + paddle.height &&
        ball.x >= paddle.x &&
        ball.x <= paddle.x + paddle.width &&
        ball.dy > 0
    ) {
        ball.y = paddle.y - ball.radius;
        ball.dy = -ball.dy;
        const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        ball.dx = hitPos * 5;
    }

    for (const b of bricks) {
        if (!b.alive) continue;
        if (
            ball.x + ball.radius > b.x &&
            ball.x - ball.radius < b.x + brick.width &&
            ball.y + ball.radius > b.y &&
            ball.y - ball.radius < b.y + brick.height
        ) {
            b.alive = false;
            score += 10;
            const prevX = ball.x - ball.dx;
            const prevY = ball.y - ball.dy;
            const wasOutsideX = prevX + ball.radius <= b.x || prevX - ball.radius >= b.x + brick.width;
            const wasOutsideY = prevY + ball.radius <= b.y || prevY - ball.radius >= b.y + brick.height;
            if (wasOutsideX) ball.dx = -ball.dx;
            if (wasOutsideY) ball.dy = -ball.dy;
            if (!wasOutsideX && !wasOutsideY) ball.dy = -ball.dy;
            break;
        }
    }

    if (ball.y - ball.radius > HEIGHT) {
        lives--;
        if (lives <= 0) {
            gameState = 'gameover';
        } else {
            resetBallAndPaddle();
        }
    }

    if (bricks.every((b) => !b.alive)) {
        gameState = 'cleared';
    }
}

function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    for (const b of bricks) {
        if (!b.alive) continue;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, brick.width, brick.height);
    }

    ctx.fillStyle = '#fff';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffeb3b';
    ctx.fill();
    ctx.closePath();

    ctx.fillStyle = '#fff';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 10, 20);
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${lives}`, WIDTH - 10, 20);

    if (gameState === 'gameover') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#ff4d4d';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', WIDTH / 2, HEIGHT / 2);
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.fillText('Press R to restart', WIDTH / 2, HEIGHT / 2 + 30);
    } else if (gameState === 'cleared') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = '#4dff88';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CLEAR!', WIDTH / 2, HEIGHT / 2);
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.fillText('Press R to restart', WIDTH / 2, HEIGHT / 2 + 30);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

initBricks();
loop();
