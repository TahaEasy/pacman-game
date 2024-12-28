const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");

function target(name, byClass = false) {
  if (byClass) {
    return document.getElementsByClassName(name);
  } else {
    return document.getElementById(name);
  }
}

const scoreEl = target("scoreEl");
const endScoreEl = target("score");
const readyText = target("ready");
const gameVoulmeBtn = target("volume-game");
const gameUnvoulmeBtn = target("unvolume-game");
const playGameBtn = target("play-game");
const pauseGameBtn = target("pause-game");
const restartBtn = target("end-game-button");
const endGameBox = target("end-game-box");
const endGameText = target("end-game-text");
const startGameBox = target("start-game-box");
const startGameBtn = target("start-game-button");
const heartsContainerEl = target("hearts-contianer");
const heartsEl = target("heart", true);

gameVoulmeBtn.addEventListener("click", volumeGame);
gameUnvoulmeBtn.addEventListener("click", unvolumeGame);
playGameBtn.addEventListener("click", playGame);
pauseGameBtn.addEventListener("click", pauseGame);
startGameBtn.addEventListener("click", startGame);

restartBtn.addEventListener("click", () => {
  if (!gamePaused || !gameEnded) {
    sound("game_start");
    newGame();
  }
});

canvas.width = 570;
canvas.height = 660;

const speed = 3;

let pacmanIsMoving = true;
let lastKey = "";
let score = 0;

let eatSound = true;
let hearts = 3;
let gameReady = true;
let gamePaused = true;
let gameEnded = false;
let ghostScared = false;
let dontHit = false;

let powerUpBlink = false;
let readyTimer = null;
let scaredIntervals = [];
let ghostRenderInterval = null;
let ghostRenderTimer = 0;

let volume = true;

function playSound(audio) {
  if (volume)
    setTimeout(() => {
      audio.play();
    }, 1);
}
function sound(audioName, play = true) {
  const audio = new Audio("./audio/" + audioName + ".mp3");
  if (play) {
    playSound(audio);
  }

  return audio;
}
let scareSound = sound("power_up", false);
scareSound.loop = true;

class Boundary {
  static width = 30;
  static height = 30;
  constructor({ position, image }) {
    this.position = position;
    this.width = 30;
    this.height = 30;
    this.image = image;
  }

  draw() {
    // context.fillStyle = "blue";
    // context.fillRect(this.position.x, this.position.y, this.width, this.height);

    context.drawImage(this.image, this.position.x, this.position.y);
  }
}

class Pacman {
  constructor({ position, velocity }) {
    this.position = position;
    this.velocity = velocity;
    this.radius = 12;
    this.radians = 0.75;
    this.openRate = 0.12;
    this.rotation = 0;
  }

  draw() {
    context.save();
    context.translate(this.position.x, this.position.y);
    context.rotate(this.rotation);
    context.translate(-this.position.x, -this.position.y);

    context.beginPath();

    context.arc(
      this.position.x,
      this.position.y,
      this.radius,
      this.radians,
      Math.PI * 2 - this.radians
    );
    context.lineTo(this.position.x, this.position.y);
    context.fillStyle = "yellow";
    context.fill();
    context.fillStyle = "black";
    if (this.rotation == 0) {
      context.fillRect(this.position.x - 4, this.position.y - 5, 3, 3);
    } else {
      context.fillRect(this.position.x - 4, this.position.y + 3, 3, 3);
    }
    context.closePath();
    // const image = new Image();
    // image.src = "./img/pacman/pacman_left.svg";
    // context.drawImage(image, this.position.x, this.position.y);

    context.restore();
  }

  update() {
    this.draw();

    if (
      this.position.x <= Boundary.width * 0 + Boundary.width / 2 &&
      this.position.y == Boundary.height * 10 + Boundary.height / 2
    ) {
      this.position.x = Boundary.width * 18 + Boundary.width / 2;
      this.position.y = Boundary.height * 10 + Boundary.height / 2;
    } else if (
      this.position.x >= Boundary.width * 18 + Boundary.width / 2 &&
      this.position.y == Boundary.height * 10 + Boundary.height / 2
    ) {
      this.position.x = Boundary.width * 0 + Boundary.width / 2;
      this.position.y = Boundary.height * 10 + Boundary.height / 2;
    }
    if (!gamePaused && !gameEnded) {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;

      if (pacmanIsMoving) {
        if (this.radians < 0 || this.radians > 0.75) {
          this.openRate = -this.openRate;
        }
        this.radians += this.openRate;
      }
    }
  }
}

class Ghost {
  static speed = 2;
  constructor({ name = "Ghost", position, velocity, color = "red" }) {
    this.name = name;
    this.position = position;
    this.velocity = velocity;
    this.chase = false;
    this.radius = 13;
    this.color = color;
    this.prevCollisions = [];
    this.speed = 2;
    this.scared = false;
  }

  draw() {
    context.beginPath();

    context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    context.fillStyle = this.scared ? "blue" : this.color;
    context.fill();
    //
    context.fillStyle = this.scared ? "blue" : this.color;
    context.fillRect(
      this.position.x - this.radius,
      this.position.y - 2,
      this.radius * 2,
      this.radius
    );
    //
    context.arc(
      this.position.x + this.radius - 6.25,
      this.position.y + this.radius - 2,
      this.radius / 2,
      0,
      Math.PI * 2
    );
    context.fillStyle = this.scared ? "blue" : this.color;
    context.fill();
    //
    context.arc(
      this.position.x + this.radius - 19.75,
      this.position.y + this.radius - 2,
      this.radius / 2,
      0,
      Math.PI * 2
    );
    context.fillStyle = this.scared ? "blue" : this.color;
    context.fill();
    context.closePath();

    context.fillStyle = "black";
    context.fillRect(this.position.x + 4, this.position.y, 5, 5);
    //
    context.fillStyle = "black";
    context.fillRect(this.position.x - 9, this.position.y, 5, 5);
  }

  update() {
    this.draw();

    if (
      this.position.x <= Boundary.width * 0 + Boundary.width / 2 &&
      this.position.y == Boundary.height * 10 + Boundary.height / 2
    ) {
      this.position.x = Boundary.width * 18 + Boundary.width / 2;
      this.position.y = Boundary.height * 10 + Boundary.height / 2;
    } else if (
      this.position.x >= Boundary.width * 18 + Boundary.width / 2 &&
      this.position.y == Boundary.height * 10 + Boundary.height / 2
    ) {
      this.position.x = Boundary.width * 0 + Boundary.width / 2;
      this.position.y = Boundary.height * 10 + Boundary.height / 2;
    }
    if (!gamePaused && !gameEnded) {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
    }
  }
}

class Pellet {
  constructor({ position }) {
    this.position = position;
    this.radius = 3;
  }

  draw() {
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    context.fillStyle = "wheat";
    context.fill();
    context.closePath();
  }
}

class PowerUp {
  constructor({ position }) {
    this.position = position;
    this.radius = 8;
  }

  draw() {
    context.beginPath();
    context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    if (powerUpBlink >= 40 && powerUpBlink < 80) {
      powerUpBlink++;
      context.fillStyle = "wheat";
      if (powerUpBlink == 80) {
        powerUpBlink = 0;
      }
    } else {
      context.fillStyle = "black";
      powerUpBlink++;
    }
    context.fill();
    context.closePath();
  }
}

function startGame() {
  sound("game_start");
  newGame();
}

const powerUps = [];
const boundaries = [];
const pellets = [];
let ghosts = [];
let pacman;

const keys = {
  arrowUp: {
    pressed: false,
  },
  arrowLeft: {
    pressed: false,
  },
  arrowDown: {
    pressed: false,
  },
  arrowRight: {
    pressed: false,
  },
};

function createImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}
function renderMap() {
  hearts = 3;
  ghostScared = false;

  ghosts.forEach((ghost) => {
    ghost.scared = false;
  });

  scaredIntervals.forEach((scaredInterval) => clearInterval(scaredInterval));
  clearInterval(ghostRenderInterval);

  // prettier-ignore
  const map = [
    ["5", "=", "=", "=", "=", "=", "=", "=", "=", "c", "=", "=", "=", "=", "=", "=", "=", "=", "6"],
    ["|", "P", ".", ".", ".", ".", ".", ".", ".", "|", ".", ".", ".", ".", ".", ".", ".", ".", "|"],
    ["|", ".", "1", "2", ".", "1", "-", "2", ".", "|", ".", "1", "-", "2", ".", "1", "2", ".", "|"],
    ["|", ".", "4", "3", ".", "4", "_", "3", ".", "U", ".", "4", "_", "3", ".", "4", "3", ".", "|"],
    ["|", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "|"],
    ["|", ".", "[", "]", ".", "^", ".", "[", "=", "c", "=", "]", ".", "^", ".", "[", "]", ".", "|"],
    ["|", ".", ".", ".", ".", "|", ".", ".", ".", "|", ".", ".", ".", "|", ".", ".", ".", "P", "|"],
    ["{", "-", "-", "2", ".", "b", "=", "]", " ", "U", " ", "[", "=", "d", ".", "1", "-", "-", "}"],
    ["{", " ", " ", "}", ".", "|", " ", " ", " ", " ", " ", " ", " ", "|", ".", "{", " ", " ", "}"],
    ["4", "_", "_", "3", ".", "U", " ", "#", "#", "#", "#", "#", " ", "U", ".", "4", "_", "_", "3"],
    [".", ".", ".", ".", ".", " ", " ", "<", " ", " ", " ", ">", " ", " ", ".", ".", ".", ".", "."],
    ["1", "-", "-", "2", ".", "^", " ", "#", "#", "#", "#", "#", " ", "^", ".", "1", "-", "-", "2"],
    ["{", " ", " ", "}", ".", "|", " ", " ", " ", " ", " ", " ", " ", "|", ".", "{", " ", " ", "}"],
    ["{", "_", "_", "3", ".", "U", " ", "[", "=", "c", "=", "]", " ", "U", ".", "4", "_", "_", "}"],
    ["|", ".", ".", ".", ".", ".", ".", ".", "P", "|", ".", ".", ".", ".", ".", ".", ".", ".", "|"],
    ["|", ".", "[", "6", ".", "[", "=", "]", ".", "U", ".", "[", "=", "]", ".", "5", "]", ".", "|"],
    ["|", ".", ".", "|", ".", ".", ".", ".", ".", " ", ".", ".", ".", ".", ".", "|", ".", ".", "|"],
    ["b", "]", ".", "U", ".", "^", ".", "[", "=", "c", "=", "]", ".", "^", ".", "U", ".", "[", "d"],
    ["|", ".", ".", ".", ".", "|", ".", ".", ".", "|", ".", ".", ".", "|", ".", ".", ".", ".", "|"],
    ["|", ".", "[", "=", "=", "a", "=", "]", ".", "U", ".", "[", "=", "a", "=", "=", "]", ".", "|"],
    ["|", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", ".", "P", "|"],
    ["8", "=", "=", "=", "=", "=", "=", "=", "=", "=", "=", "=", "=", "=", "=", "=", "=", "=", "7"],
  ];
  map.forEach((row, i) => {
    row.forEach((symbol, j) => {
      switch (symbol) {
        case "-":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/justTop.png"),
            })
          );
          break;
        case "_":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/justBottom.png"),
            })
          );
          break;
        case "{":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/justLeft.png"),
            })
          );
          break;
        case "}":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/justRight.png"),
            })
          );
          break;
        case "/":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/ghostGateTop.png"),
            })
          );
          break;
        case ">":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/ghostGateRight.png"),
            })
          );
          break;
        case "<":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/ghostGateLeft.png"),
            })
          );
          break;
        case "=":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/pipeHorizontal.png"),
            })
          );
          break;
        case "|":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/pipeVertical.png"),
            })
          );
          break;
        case "1":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/corner1.png"),
            })
          );
          break;
        case "2":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/corner2.png"),
            })
          );
          break;
        case "3":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/corner3.png"),
            })
          );
          break;
        case "4":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/corner4.png"),
            })
          );
          break;
        case "5":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/pipeCorner1.png"),
            })
          );
          break;
        case "6":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/pipeCorner2.png"),
            })
          );
          break;
        case "7":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/pipeCorner3.png"),
            })
          );
          break;
        case "8":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/pipeCorner4.png"),
            })
          );
          break;
        case "o":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/block.png"),
            })
          );
          break;
        case "#":
          boundaries.push(
            new Boundary({
              position: {
                x: Boundary.width * j,
                y: Boundary.height * i,
              },
              image: createImage("./img/blockFill.png"),
            })
          );
          break;
        case "[":
          boundaries.push(
            new Boundary({
              position: {
                x: j * Boundary.width,
                y: i * Boundary.height,
              },
              image: createImage("./img/capLeft.png"),
            })
          );
          break;
        case "]":
          boundaries.push(
            new Boundary({
              position: {
                x: j * Boundary.width,
                y: i * Boundary.height,
              },
              image: createImage("./img/capRight.png"),
            })
          );
          break;
        case "U":
          boundaries.push(
            new Boundary({
              position: {
                x: j * Boundary.width,
                y: i * Boundary.height,
              },
              image: createImage("./img/capBottom.png"),
            })
          );
          break;
        case "^":
          boundaries.push(
            new Boundary({
              position: {
                x: j * Boundary.width,
                y: i * Boundary.height,
              },
              image: createImage("./img/capTop.png"),
            })
          );
          break;
        case "+":
          boundaries.push(
            new Boundary({
              position: {
                x: j * Boundary.width,
                y: i * Boundary.height,
              },
              image: createImage("./img/pipeCross.png"),
            })
          );
          break;
        case "a":
          boundaries.push(
            new Boundary({
              position: {
                x: j * Boundary.width,
                y: i * Boundary.height,
              },
              color: "blue",
              image: createImage("./img/pipeConnectorTop.png"),
            })
          );
          break;
        case "b":
          boundaries.push(
            new Boundary({
              position: {
                x: j * Boundary.width,
                y: i * Boundary.height,
              },
              color: "blue",
              image: createImage("./img/pipeConnectorRight.png"),
            })
          );
          break;
        case "c":
          boundaries.push(
            new Boundary({
              position: {
                x: j * Boundary.width,
                y: i * Boundary.height,
              },
              color: "blue",
              image: createImage("./img/pipeConnectorBottom.png"),
            })
          );
          break;
        case "d":
          boundaries.push(
            new Boundary({
              position: {
                x: j * Boundary.width,
                y: i * Boundary.height,
              },
              image: createImage("./img/pipeConnectorLeft.png"),
            })
          );
          break;
        case ".":
          pellets.push(
            new Pellet({
              position: {
                x: j * Boundary.width + Boundary.width / 2,
                y: i * Boundary.height + Boundary.height / 2,
              },
            })
          );
          break;
        case "P":
          powerUps.push(
            new PowerUp({
              position: {
                x: j * Boundary.width + Boundary.width / 2,
                y: i * Boundary.height + Boundary.height / 2,
              },
            })
          );
          break;
      }
    });
  });
}

let pauseBeat;
function pauseGame() {
  if (!gameReady) {
    sound("pause");
    if (ghostScared) {
      scareSound.pause();
    }
    gamePaused = true;
    pauseBeat = sound("pause_beat", false);
    pauseBeat.loop = true;
    playSound(pauseBeat);
    pauseGameBtn.style.display = "none";
    playGameBtn.style.display = "inline-block";
  }
}
function playGame() {
  if (!gameReady) {
    sound("pause");
    if (ghostScared) {
      scareSound.play();
    }
    gamePaused = false;
    pauseBeat.pause();
    playGameBtn.style.display = "none";
    pauseGameBtn.style.display = "inline-block";
  }
}

function volumeGame() {
  volume = false;
  gameUnvoulmeBtn.style.display = "inline-block";
  gameVoulmeBtn.style.display = "none";
}
function unvolumeGame() {
  volume = true;
  gameUnvoulmeBtn.style.display = "none";
  gameVoulmeBtn.style.display = "inline-block";
}

function rerenderGhosts() {
  ghostRenderTimer = 0;
  clearInterval(ghostRenderInterval);
  ghosts = [
    new Ghost({
      name: "Blinky",
      position: {
        x: Boundary.width * 9 + Boundary.width / 2,
        y: Boundary.height * 8 + Boundary.height / 2,
      },
      velocity: {
        x: Math.floor(Math.random() * 10) > 5 ? Ghost.speed : -Ghost.speed,
        y: 0,
      },
      color: "red",
    }),
    new Ghost({
      name: "Pinky",
      position: {
        x: Boundary.width * 9 + Boundary.width / 2,
        y: Boundary.height * 10 + Boundary.height / 2,
      },
      velocity: {
        x: 0,
        y: 0,
      },
      color: "pink",
    }),
    new Ghost({
      name: "Inky",
      position: {
        x: Boundary.width * 10 + Boundary.width / 2,
        y: Boundary.height * 10 + Boundary.height / 2,
      },
      velocity: {
        x: 0,
        y: 0,
      },
      color: "aqua",
    }),
    new Ghost({
      name: "Clyde",
      position: {
        x: Boundary.width * 8 + Boundary.width / 2,
        y: Boundary.height * 10 + Boundary.height / 2,
      },
      velocity: {
        x: 0,
        y: 0,
      },
      color: "burlywood",
    }),
  ];

  ghostRenderInterval = setInterval(() => {
    if (!gamePaused && !gameReady && !gameEnded) {
      ghostRenderTimer++;
      switch (ghostRenderTimer) {
        case 9:
          ghosts[1].velocity.x =
            Math.floor(Math.random() * 10) > 5 ? Ghost.speed : -Ghost.speed;
          break;
        case 12:
          ghosts[0].chase = true;
          break;
        case 17:
          ghosts[2].velocity.x =
            Math.floor(Math.random() * 10) > 5 ? Ghost.speed : -Ghost.speed;
          break;
        case 20:
          ghosts[1].chase = true;
          break;
        case 25:
          ghosts[3].velocity.x =
            Math.floor(Math.random() * 10) > 5 ? Ghost.speed : -Ghost.speed;
          clearInterval(ghostRenderInterval);
          break;
        case 30:
          ghosts[2].chase = true;
          ghosts[3].chase = true;
          break;
      }
    }
  }, 1000);
}

function renderHearts() {
  heartsContainerEl.innerHTML = "";
  for (let i = hearts; i > 0; i--) {
    heartsContainerEl.innerHTML += '<div class="heart"></div>';
  }
}

function breakHeart() {
  sound("death");
  if (hearts >= 1 && (!gamePaused || !gameEnded)) {
    heartsEl[3 - hearts].classList.add("heart-broke");
    hearts--;
  }
}

renderHearts();

pacman = new Pacman({
  position: {
    x: Boundary.width * 9 + Boundary.width / 2,
    y: Boundary.height * 16 + Boundary.height / 2,
  },
  velocity: {
    x: -speed,
    y: 0,
  },
});

function newGame() {
  animate();
  renderMap();
  renderHearts();

  gamePaused = true;
  gameEnded = false;

  score = 0;

  startGameBox.style.display = "none";
  endGameBox.style.display = "none";
  readyText.style.display = "block";
  gameReady = true;

  clearTimeout(readyTimer);
  readyTimer = setTimeout(() => {
    gamePaused = false;
    readyText.style.display = "none";
    gameReady = false;
  }, 4300);

  rerenderGhosts();

  pacman = new Pacman({
    position: {
      x: Boundary.width * 9 + Boundary.width / 2,
      y: Boundary.height * 16 + Boundary.height / 2,
    },
    velocity: {
      x: -speed,
      y: 0,
    },
  });
}

function circleCollidesWithRectangle({ circle, rectangle }) {
  const padding = Boundary.width / 2 - circle.radius - 1;
  return (
    circle.position.y - circle.radius + circle.velocity.y <=
      rectangle.position.y + rectangle.height + padding &&
    circle.position.x + circle.radius + circle.velocity.x >=
      rectangle.position.x - padding &&
    circle.position.y + circle.radius + circle.velocity.y >=
      rectangle.position.y - padding &&
    circle.position.x - circle.radius + circle.velocity.x <=
      rectangle.position.x + rectangle.width + padding
  );
}

let animationId;

function animate() {
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(animate);
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (keys.arrowUp.pressed || lastKey === "ArrowUp") {
    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      if (
        circleCollidesWithRectangle({
          circle: {
            ...pacman,
            velocity: {
              x: 0,
              y: -speed,
            },
          },
          rectangle: boundary,
        })
      ) {
        pacman.velocity.y = 0;
        if (!pacman.velocity.x) {
          pacmanIsMoving = false;
        }
        break;
      } else {
        pacman.velocity.y = -speed;
        pacmanIsMoving = true;
      }
    }
  } else if (keys.arrowLeft.pressed || lastKey === "ArrowLeft") {
    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      if (
        circleCollidesWithRectangle({
          circle: {
            ...pacman,
            velocity: {
              x: -speed,
              y: 0,
            },
          },
          rectangle: boundary,
        })
      ) {
        pacman.velocity.x = 0;
        if (!pacman.velocity.y) {
          pacmanIsMoving = false;
        }
        break;
      } else {
        pacman.velocity.x = -speed;
        pacmanIsMoving = true;
      }
    }
  } else if (keys.arrowDown.pressed || lastKey === "ArrowDown") {
    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      if (
        circleCollidesWithRectangle({
          circle: {
            ...pacman,
            velocity: {
              x: 0,
              y: speed,
            },
          },
          rectangle: boundary,
        })
      ) {
        pacman.velocity.y = 0;
        if (!pacman.velocity.x) {
          pacmanIsMoving = false;
        }
        break;
      } else {
        pacman.velocity.y = speed;
        pacmanIsMoving = true;
      }
    }
  } else if (keys.arrowRight.pressed || lastKey === "ArrowRight") {
    for (let i = 0; i < boundaries.length; i++) {
      const boundary = boundaries[i];
      if (
        circleCollidesWithRectangle({
          circle: {
            ...pacman,
            velocity: {
              x: speed,
              y: 0,
            },
          },
          rectangle: boundary,
        })
      ) {
        pacman.velocity.x = 0;
        if (!pacman.velocity.y) {
          pacmanIsMoving = false;
        }
        break;
      } else {
        pacman.velocity.x = speed;
        pacmanIsMoving = true;
      }
    }
  }

  boundaries.forEach((boundary) => {
    boundary.draw();
    if (
      circleCollidesWithRectangle({
        circle: pacman,
        rectangle: boundary,
      })
    ) {
      pacman.velocity.x = 0;
      pacman.velocity.y = 0;
    }
  });

  for (let i = ghosts.length - 1; 0 <= i; i--) {
    const ghost = ghosts[i];
    if (
      Math.hypot(
        ghost.position.x - pacman.position.x,
        ghost.position.y - pacman.position.y
      ) <
        ghost.radius + pacman.radius &&
      !dontHit
    ) {
      if (ghost.scared) {
        sound("eat_ghost");
        score += 100;
        endScoreEl.innerHTML = score;
        scoreEl.innerHTML = score;
        ghost.position.x = Boundary.width * 9 + Boundary.width / 2;
        ghost.position.y = Boundary.height * 10 + Boundary.height / 2;
        ghost.velocity.x =
          Math.floor(Math.random() * 10) > 5 ? ghost.speed : -ghost.speed;
        ghost.velocity.y = 0;
        ghost.scared = false;
      } else {
        // LOOSE
        if (hearts == 1 && (!gamePaused || !gameEnded)) {
          breakHeart();
          gameEnded = true;
          endGameBox.style.display = "block";
          endGameText.innerHTML = "You Lost! 😔";
          hearts = 3;
          ghostScared = false;
          ghosts.forEach((ghost) => (ghost.scared = false));
        } else {
          breakHeart();
          scareSound.pause();
          gamePaused = true;
          dontHit = true;
          setTimeout(() => {
            pacman.position.x = Boundary.width * 9 + Boundary.width / 2;
            pacman.position.y = Boundary.height * 16 + Boundary.height / 2;
            pacman.velocity.x = -speed;
            pacman.velocity.y = 0;
            rerenderGhosts();
            readyText.style.display = "block";
            gameReady = true;
            setTimeout(() => {
              readyText.style.display = "none";
              gameReady = false;
              gamePaused = false;

              dontHit = false;
            }, 2000);
          }, 2000);
        }
      }
    }
  }

  // WIN
  if (pellets.length == 0) {
    gameEnded = true;
    ghostScared = false;
    ghosts.forEach((ghost) => (ghost.scared = false));
    scareSound.pause();
    endGameBox.style.display = "block";
    endGameText.innerHTML = "You Won! 🎉";
    hearts = 3;
  }

  for (let i = powerUps.length - 1; 0 <= i; i--) {
    const powerUp = powerUps[i];
    powerUp.draw();

    if (
      Math.hypot(
        powerUp.position.x - pacman.position.x,
        powerUp.position.y - pacman.position.y
      ) <
      powerUp.radius + pacman.radius
    ) {
      powerUps.splice(i, 1);
      playSound(scareSound);

      scaredIntervals.forEach((scaredInterval) =>
        clearInterval(scaredInterval)
      );

      ghosts.forEach((ghost) => {
        ghost.scared = true;

        let scaredTimer = 0;

        scaredIntervals.push(
          setInterval(() => {
            if (!gameEnded && !gamePaused && !gameReady) {
              scaredTimer++;
              if (scaredTimer == 8) {
                ghost.scared = false;
                scareSound.pause();
              }
            }
          }, 1000)
        );
      });
    }
  }

  for (let i = pellets.length - 1; 0 <= i; i--) {
    const pellet = pellets[i];
    pellet.draw();

    if (
      Math.hypot(
        pellet.position.x - pacman.position.x,
        pellet.position.y - pacman.position.y
      ) <
      pellet.radius + pacman.radius
    ) {
      pellets.splice(i, 1);
      score += 10;
      endScoreEl.innerHTML = score;
      scoreEl.innerHTML = score;
      if (eatSound) {
        sound("dot_1");
        eatSound = !eatSound;
      } else {
        sound("dot_2");
        eatSound = !eatSound;
      }
    }
  }

  pacman.update();

  ghosts.forEach((ghost) => {
    ghost.update();

    const collisions = [];

    boundaries.forEach((boundary) => {
      if (
        !collisions.includes("right") &&
        circleCollidesWithRectangle({
          circle: {
            ...ghost,
            velocity: {
              x: ghost.speed,
              y: 0,
            },
          },
          rectangle: boundary,
        })
      ) {
        collisions.push("right");
      }
      if (
        !collisions.includes("left") &&
        circleCollidesWithRectangle({
          circle: {
            ...ghost,
            velocity: {
              x: -ghost.speed,
              y: 0,
            },
          },
          rectangle: boundary,
        })
      ) {
        collisions.push("left");
      }
      if (
        !collisions.includes("down") &&
        circleCollidesWithRectangle({
          circle: {
            ...ghost,
            velocity: {
              x: 0,
              y: ghost.speed,
            },
          },
          rectangle: boundary,
        })
      ) {
        collisions.push("down");
      }
      if (
        !collisions.includes("up") &&
        circleCollidesWithRectangle({
          circle: {
            ...ghost,
            velocity: {
              x: 0,
              y: -ghost.speed,
            },
          },
          rectangle: boundary,
        })
      ) {
        collisions.push("up");
      }
    });

    if (collisions.length > ghost.prevCollisions.length)
      ghost.prevCollisions = collisions;

    if (JSON.stringify(collisions) !== JSON.stringify(ghost.prevCollisions)) {
      if (ghost.velocity.x > 0) {
        ghost.prevCollisions.push("right");
      } else if (ghost.velocity.x < 0) {
        ghost.prevCollisions.push("left");
      } else if (ghost.velocity.y < 0) {
        ghost.prevCollisions.push("up");
      } else if (ghost.velocity.y > 0) {
        ghost.prevCollisions.push("down");
      }

      const pathways = ghost.prevCollisions.filter((collision) => {
        return !collisions.includes(collision);
      });

      let direction;

      if (ghost.chase && !ghost.scared) {
        if (pacman.position.y < ghost.position.y && pathways.includes("up")) {
          direction = "up";
        } else if (
          pacman.position.y > ghost.position.y &&
          pathways.includes("down")
        ) {
          direction = "down";
        } else if (
          pacman.position.x < ghost.position.x &&
          pathways.includes("left")
        ) {
          direction = "left";
        } else if (
          pacman.position.x > ghost.position.x &&
          pathways.includes("right")
        ) {
          direction = "right";
        } else {
          direction = pathways[Math.floor(Math.random() * pathways.length)];
        }
      } else {
        if (ghost.scared) {
          if (pacman.position.y > ghost.position.y && pathways.includes("up")) {
            direction = "up";
          } else if (
            pacman.position.y < ghost.position.y &&
            pathways.includes("down")
          ) {
            direction = "down";
          } else if (
            pacman.position.x > ghost.position.x &&
            pathways.includes("left")
          ) {
            direction = "left";
          } else if (
            pacman.position.x < ghost.position.x &&
            pathways.includes("right")
          ) {
            direction = "right";
          } else {
            direction = pathways[Math.floor(Math.random() * pathways.length)];
          }
        } else {
          direction = pathways[Math.floor(Math.random() * pathways.length)];
        }
      }

      switch (direction) {
        case "down":
          ghost.velocity.y = ghost.speed;
          ghost.velocity.x = 0;
          break;
        case "up":
          ghost.velocity.y = -ghost.speed;
          ghost.velocity.x = 0;
          break;
        case "right":
          ghost.velocity.y = 0;
          ghost.velocity.x = ghost.speed;
          break;
        case "left":
          ghost.velocity.y = 0;
          ghost.velocity.x = -ghost.speed;
          break;
      }

      ghost.prevCollisions = [];
    }
  });

  if (pacman.velocity.x > 0) pacman.rotation = 0;
  else if (pacman.velocity.x < 0) pacman.rotation = Math.PI;
  else if (pacman.velocity.y > 0) pacman.rotation = Math.PI / 2;
  else if (pacman.velocity.y < 0) pacman.rotation = Math.PI * 1.5;
}

addEventListener("keydown", ({ key }) => {
  if ((!gamePaused && !gameEnded) || gameReady) {
    switch (key) {
      case "ArrowUp":
        keys.arrowUp.pressed = true;
        lastKey = "ArrowUp";
        break;
      case "ArrowLeft":
        keys.arrowLeft.pressed = true;
        lastKey = "ArrowLeft";
        break;
      case "ArrowDown":
        keys.arrowDown.pressed = true;
        lastKey = "ArrowDown";
        break;
      case "ArrowRight":
        keys.arrowRight.pressed = true;
        lastKey = "ArrowRight";
        break;
      case "w":
        keys.arrowUp.pressed = true;
        lastKey = "ArrowUp";
        break;
      case "a":
        keys.arrowLeft.pressed = true;
        lastKey = "ArrowLeft";
        break;
      case "s":
        keys.arrowDown.pressed = true;
        lastKey = "ArrowDown";
        break;
      case "d":
        keys.arrowRight.pressed = true;
        lastKey = "ArrowRight";
        break;
    }
  }
  if (key == " ") {
    if (gamePaused) {
      playGame();
    } else {
      pauseGame();
    }
  }
});

addEventListener("keyup", ({ key }) => {
  if ((!gamePaused && !gameEnded) || gameReady) {
    switch (key) {
      case "ArrowUp":
        keys.arrowUp.pressed = false;
        break;
      case "ArrowLeft":
        keys.arrowLeft.pressed = false;
        break;
      case "ArrowDown":
        keys.arrowDown.pressed = false;
        break;
      case "ArrowRight":
        keys.arrowRight.pressed = false;
        break;
      case "w":
        keys.arrowUp.pressed = false;
        break;
      case "a":
        keys.arrowLeft.pressed = false;
        break;
      case "s":
        keys.arrowDown.pressed = false;
        break;
      case "d":
        keys.arrowRight.pressed = false;
        break;
    }
  }
});
