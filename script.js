const gridtopCan = document.getElementById("gridtop");
const gridbgCan = document.getElementById("gridbg");
const gridtopCtx = gridtopCan.getContext("2d");
const gridbgCtx = gridbgCan.getContext("2d");

const CENTER_SQ_DIM = 10;
const LINE_GAP = 75;

function drawGrid(ctx) {
  ctx.save();
  let lineGap = LINE_GAP;
  ctx.fillStyle = "black";
  for (let i = -30; ; i++) {
    let coord = lineGap * i;
    coord = Math.floor(coord / lineGap) * lineGap;
    if (coord > (ctx.canvas.width * 2) && coord > (ctx.canvas.height * 2)) break;
    const bigger = i % 2 === 0;
    const thickness = bigger ? 4.4 : 2;
    ctx.fillRect(coord + ctx.canvas.height, -ctx.canvas.height, thickness, ctx.canvas.height * 8); // vertical line
    ctx.fillRect(-ctx.canvas.width, coord,  ctx.canvas.width * 8, thickness); // horizontal line
  }

  // draw square in center
  ctx.fillStyle = "blue";
  // ctx.fillRect(
  //   (ctx.canvas.width / 2) - (CENTER_SQ_DIM / 2),
  //   (ctx.canvas.height / 2) - (CENTER_SQ_DIM / 2),
  //   CENTER_SQ_DIM,
  //   CENTER_SQ_DIM
  // );
  ctx.restore();
}

function docNum(id) {
  const ele = document.getElementById(id);
  let num = parseFloat(ele.value, 10);
  if (Number.isNaN(num)) num = 0;
  return num;
}

if (location.hash[0] === "#") {
  const parts = location.hash.slice(1)
    .split(",")
    .map(part => parseFloat(part, 10))
    .filter(part => !Number.isNaN(part));
  if (parts.length === 4) {
    document.getElementById("m11").value = parts[0];
    document.getElementById("m12").value = parts[1];
    document.getElementById("m21").value = parts[2];
    document.getElementById("m22").value = parts[3];
  }
}

function interp(from, to, pct) {
  let gap = to - from;
  let interpAmount = gap * pct;
  return from + interpAmount;
}

function transitionEase(x) {
  const ALPHA = 2;
  return Math.pow(x, ALPHA) / (Math.pow(x, ALPHA) + Math.pow(1 - x, ALPHA))
}

let pendingTransition = null;
function getMatrix(actual) {
  if (!actual && pendingTransition) {
    let now = Date.now();
    let end = pendingTransition.start + pendingTransition.duration;
    if (now < end) {
      let progress = 1 - ((end - now) / pendingTransition.duration);
      progress = transitionEase(progress);
      const actual = getMatrix(true);
      return actual.map((item, i) => interp(item, pendingTransition.to[i], progress));
    } else {
      console.log("t end");
      document.getElementById("m11").value = pendingTransition.to[0];
      document.getElementById("m12").value = pendingTransition.to[1];
      document.getElementById("m21").value = pendingTransition.to[2];
      document.getElementById("m22").value = pendingTransition.to[3];
      pendingTransition = null;
      return getMatrix(actual);
    }
  }
  return [
    docNum("m11"), docNum("m12"), docNum("m21"), docNum("m22")
  ];
}

// matrix multiply AB
function mm(a, b) {
  return [
    a[0]*b[0] + a[1]*b[2],
    a[0]*b[1] + a[2]*b[3],
    a[2]*b[1] + a[3]*b[2],
    a[2]*b[1] + a[3]*b[3],
  ];
}

setInterval(() => {
  const matrix = getMatrix();
  const newHash = matrix.map(num => num.toFixed(3)).join(",");
  if (location.hash !== newHash) location.hash = newHash;
}, 1500);

let controls = document.getElementById("controls");
function handleMouseEvent(e) {
  if (controls.contains(e.target)) return;
  if (e.buttons === 1) {
    let newX = (e.pageX - window.innerWidth / 2) / LINE_GAP;
    let newY = (e.pageY - window.innerHeight / 2) / LINE_GAP;
    document.getElementById("m11").value = newX;
    document.getElementById("m12").value = newY;
  } else if (e.buttons === 2) {
    let newX = (e.pageX - window.innerWidth / 2) / LINE_GAP;
    let newY = (e.pageY - window.innerHeight / 2) / LINE_GAP;
    document.getElementById("m21").value = -newX;
    document.getElementById("m22").value = -newY;
  }
}

window.addEventListener("mousedown", e => {
  e.preventDefault();
  handleMouseEvent(e);
});

window.addEventListener("mousemove", e => {
  handleMouseEvent(e);
});

window.addEventListener("contextmenu", e => {
  if (controls.contains(e.target)) return;
  e.preventDefault();
});

let resizePending = true;
function eachFrame() {
  requestAnimationFrame(eachFrame);
  gridtopCtx.clearRect(0, 0, gridtopCan.width, gridtopCan.height);
  gridtopCtx.save();
  const matrix = getMatrix();
  gridtopCtx.transform.apply(gridtopCtx, [ matrix[0], matrix[1], matrix[2], matrix[3], gridtopCan.width / 2, gridtopCan.height / 2 ]);
  drawGrid(gridtopCtx);
  gridtopCtx.fillStyle = "blue";
  gridtopCtx.fillRect(5, 0, LINE_GAP, 10);
  gridtopCtx.fillStyle = "red";
  gridtopCtx.fillRect(-2.5, -LINE_GAP + 2.5, 10, LINE_GAP);
  gridtopCtx.restore();
  if (resizePending) {
    [...document.getElementsByClassName("scrCan")].forEach(can => {
      can.width = window.innerWidth;
      can.height = window.innerHeight;
    });
    gridbgCtx.fillStyle = "#e0e0e0";
    gridbgCtx.fillRect(0, 0, gridbgCan.width, gridbgCan.height);
    gridbgCtx.translate(gridtopCan.width / 2, gridtopCan.height / 2);
    drawGrid(gridbgCtx);
    gridbgCtx.translate(-gridtopCan.width / 2, -gridtopCan.height / 2);
  }
  resizePending = false;
}
requestAnimationFrame(eachFrame);

window.addEventListener("resize", () => {
  resizePending = true;
});

function transitionTo(matrix, time = 1000) {
  pendingTransition = {
    start: Date.now(),
    duration: time,
    to: matrix,
  };
}

document.querySelectorAll("[data-tomatrix]").forEach(btn => btn.addEventListener("click", function clickHandler(e) {
  e.stopPropagation();
  if (this.dataset.tomatrix === "transpose") {
    const oldMatrix = getMatrix();
    transitionTo([oldMatrix[0], oldMatrix[2], oldMatrix[1], oldMatrix[3]]);
  } else {
    transitionTo(this.dataset.tomatrix.split(",").map(val => parseInt(val, 10)));
  }
}));
