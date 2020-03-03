window.requestAnimFrame = function () {
  return window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  function (callback) {
    window.setTimeout(callback, 1000 / 60);
  };
}();

// now we will setup our basic variables for the demo
var canvas = document.getElementById('canvas'),
ctx = canvas.getContext('2d'),
// full screen dimensions
cw = window.innerWidth,
ch = window.innerHeight,
// firework collection
fireworks = [],
// particle collection
particles = [],
// starting hue
hue = 120,
// when launching fireworks with a click, too many get launched at once without a limiter, one launch per 5 loop ticks
limiterTotal = 5,
limiterTick = 0,
// this will time the auto launches of fireworks, one launch per 80 loop ticks
timerTotal = 80,
timerTick = 0,
mousedown = false,
// mouse x coordinate,
mx,
// mouse y coordinate
my;

// set canvas dimensions
canvas.width = cw;
canvas.height = ch;

// now we are going to setup our function placeholders for the entire demo

// get a random number within a range
function random(min, max) {
  return Math.random() * (max - min) + min;
}

// calculate the distance between two points
function calculateDistance(p1x, p1y, p2x, p2y) {
  var xDistance = p1x - p2x,
  yDistance = p1y - p2y;
  return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
}

// create firework
function Firework(sx, sy, tx, ty) {
  // actual coordinates
  this.x = sx;
  this.y = sy;
  // starting coordinates
  this.sx = sx;
  this.sy = sy;
  // target coordinates
  this.tx = tx;
  this.ty = ty;
  // distance from starting point to target
  this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
  this.distanceTraveled = 0;
  // track the past coordinates of each firework to create a trail effect, increase the coordinate count to create more prominent trails
  this.coordinates = [];
  this.coordinateCount = 3;
  // populate initial coordinate collection with the current coordinates
  while (this.coordinateCount--) {
    this.coordinates.push([this.x, this.y]);
  }
  this.angle = Math.atan2(ty - sy, tx - sx);
  this.speed = 2;
  this.acceleration = 1.05;
  this.brightness = random(50, 70);
  // circle target indicator radius
  this.targetRadius = 1;
}

// update firework
Firework.prototype.update = function (index) {
  // remove last item in coordinates array
  this.coordinates.pop();
  // add current coordinates to the start of the array
  this.coordinates.unshift([this.x, this.y]);

  // cycle the circle target indicator radius
  if (this.targetRadius < 8) {
    this.targetRadius += 0.3;
  } else {
    this.targetRadius = 1;
  }

  // speed up the firework
  this.speed *= this.acceleration;

  // get the current velocities based on angle and speed
  var vx = Math.cos(this.angle) * this.speed,
  vy = Math.sin(this.angle) * this.speed;
  // how far will the firework have traveled with velocities applied?
  this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);

  // if the distance traveled, including velocities, is greater than the initial distance to the target, then the target has been reached
  if (this.distanceTraveled >= this.distanceToTarget) {
    createParticles(this.tx, this.ty);
    // remove the firework, use the index passed into the update function to determine which to remove
    fireworks.splice(index, 1);
  } else {
    // target not reached, keep traveling
    this.x += vx;
    this.y += vy;
  }
};

// draw firework
Firework.prototype.draw = function () {
  ctx.beginPath();
  // move to the last tracked coordinate in the set, then draw a line to the current x and y
  ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
  ctx.lineTo(this.x, this.y);
  ctx.strokeStyle = 'hsl(' + hue + ', 100%, ' + this.brightness + '%)';
  ctx.stroke();

  ctx.beginPath();
  // draw the target for this firework with a pulsing circle
  ctx.arc(this.tx, this.ty, this.targetRadius, 0, Math.PI * 2);
  ctx.stroke();
};

// create particle
function Particle(x, y) {
  this.x = x;
  this.y = y;
  // track the past coordinates of each particle to create a trail effect, increase the coordinate count to create more prominent trails
  this.coordinates = [];
  this.coordinateCount = 5;
  while (this.coordinateCount--) {
    this.coordinates.push([this.x, this.y]);
  }
  // set a random angle in all possible directions, in radians
  this.angle = random(0, Math.PI * 2);
  this.speed = random(1, 10);
  // friction will slow the particle down
  this.friction = 0.95;
  // gravity will be applied and pull the particle down
  this.gravity = 1;
  // set the hue to a random number +-20 of the overall hue variable
  this.hue = random(hue - 20, hue + 20);
  this.brightness = random(50, 80);
  this.alpha = 1;
  // set how fast the particle fades out
  this.decay = random(0.015, 0.03);
}

// update particle
Particle.prototype.update = function (index) {
  // remove last item in coordinates array
  this.coordinates.pop();
  // add current coordinates to the start of the array
  this.coordinates.unshift([this.x, this.y]);
  // slow down the particle
  this.speed *= this.friction;
  // apply velocity
  this.x += Math.cos(this.angle) * this.speed;
  this.y += Math.sin(this.angle) * this.speed + this.gravity;
  // fade out the particle
  this.alpha -= this.decay;

  // remove the particle once the alpha is low enough, based on the passed in index
  if (this.alpha <= this.decay) {
    particles.splice(index, 1);
  }
};

// draw particle
Particle.prototype.draw = function () {
  ctx.beginPath();
  // move to the last tracked coordinates in the set, then draw a line to the current x and y
  ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
  ctx.lineTo(this.x, this.y);
  ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
  ctx.stroke();
};

// create particle group/explosion
function createParticles(x, y) {
  // increase the particle count for a bigger explosion, beware of the canvas performance hit with the increased particles though
  var particleCount = 30;
  while (particleCount--) {
    particles.push(new Particle(x, y));
  }
}

// main demo loop
function loop() {
  // this function will run endlessly with requestAnimationFrame
  requestAnimFrame(loop);

  // increase the hue to get different colored fireworks over time
  hue += 0.5;

  // normally, clearRect() would be used to clear the canvas
  // we want to create a trailing effect though
  // setting the composite operation to destination-out will allow us to clear the canvas at a specific opacity, rather than wiping it entirely
  ctx.globalCompositeOperation = 'destination-out';
  // decrease the alpha property to create more prominent trails
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, cw, ch);
  // change the composite operation back to our main mode
  // lighter creates bright highlight points as the fireworks and particles overlap each other
  ctx.globalCompositeOperation = 'lighter';

  // loop over each firework, draw it, update it
  var i = fireworks.length;
  while (i--) {
    fireworks[i].draw();
    fireworks[i].update(i);
  }

  // loop over each particle, draw it, update it
  var i = particles.length;
  while (i--) {
    particles[i].draw();
    particles[i].update(i);
  }

  // launch fireworks automatically to random coordinates, when the mouse isn't down
  if (timerTick >= timerTotal) {
    if (!mousedown) {
      // start the firework at the bottom middle of the screen, then set the random target coordinates, the random y coordinates will be set within the range of the top half of the screen
      fireworks.push(new Firework(cw / 2, ch, random(0, cw), random(0, ch / 2)));
      timerTick = 0;
    }
  } else {
    timerTick++;
  }

  // limit the rate at which fireworks get launched when mouse is down
  if (limiterTick >= limiterTotal) {
    if (mousedown) {
      // start the firework at the bottom middle of the screen, then set the current mouse coordinates as the target
      fireworks.push(new Firework(cw / 2, ch, mx, my));
      limiterTick = 0;
    }
  } else {
    limiterTick++;
  }
}

window.onload = function () {
  var merrywrap = document.getElementById("merrywrap");
  var box = merrywrap.getElementsByClassName("giftbox")[0];
  var step = 1;
  var stepMinutes = [2000, 2000, 1000, 1000];
  function init() {
    box.addEventListener("click", openBox, false);
  }
  function stepClass(step) {
    merrywrap.className = 'merrywrap';
    merrywrap.className = 'merrywrap step-' + step;
  }
  function openBox() {
    if (step === 1) {
      box.removeEventListener("click", openBox, false);
    }
    stepClass(step);
    if (step === 3) {
    }
    if (step === 4) {
      reveal();
      return;
    }
    setTimeout(openBox, stepMinutes[step - 1]);
    step++;
  }

  init();

};

function reveal() {
  document.querySelector('.merrywrap').style.backgroundColor = 'transparent';
  document.querySelector('#canvas').style.display = 'none';


  loop();

  var w, h;
  if (window.innerWidth >= 1000) {
    w = 295;h = 185;
  } else
  {
    w = 255;h = 155;
  }

  var ifrm = document.createElement("iframe");
  // ifrm.setAttribute.src="../mp4/birthday.mp4";
  ifrm.setAttribute("src", "https://www.youtube.com/embed/tDbTXFYfuuI?autoplay=0&fs=0&iv_load_policy=3&showinfo=0&rel=0&cc_load_policy=0&start=0&end=0&origin=https://youtubeembedcode.com");
  //ifrm.style.width = `${w}px`;
  //ifrm.style.height = `${h}px`;
  ifrm.style.border = 'none';
  document.querySelector('#video').appendChild(ifrm);



}






//STARTING PARTICLE EFFECT
window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame       ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame    ||
		window.oRequestAnimationFrame      ||
		window.msRequestAnimationFrame     ||
		function( callback ){
			window.setTimeout(callback, 1000 / 60);
		};
})();

var canvas = document.getElementById("canvas"),
		ctx = canvas.getContext("2d"),
    keyword = "HAPPY BIRTHDAY PUMPKIN",
		imageData,
		density =2,
		mouse = {},
		hovered = false,
		colors = ["236, 252, 17", "15, 245, 46", "15, 237,  245", "245, 15, 15", "245, 15, 214"],
		minDist = 30,
		bounceFactor = 5;

var W = window.innerWidth,
		H = window.innerHeight;

canvas.width = W;
canvas.height = H;

document.addEventListener("mousemove", function(e) {
	mouse.x = e.pageX;
	mouse.y = e.pageY;
}, false);

// Particle Object
var Particle = function() {
	this.w = Math.random() * 10.5;
	this.h = Math.random() * 10.5;
	this.x = -W;
	this.y = -H;
	this.free = false;

	this.vy = -5 + parseInt(Math.random() * 10) / 2;
	this.vx = -4 + parseInt(Math.random() * 8);

	// Color
	this.a = Math.random();
	this.color = colors[parseInt(Math.random()*colors.length)];

	this.setPosition = function(x, y) {
		this.x = x;
		this.y = y;
	};

	this.draw = function() {
		ctx.fillStyle = "rgba("+this.color+","+this.a+")";
		ctx.fillRect(this.x, this.y,  this.w,  this.h);
	}
};

var particules = [];

// Draw the text
function drawText() {
	ctx.clearRect(0, 0, W, H);
	ctx.fillStyle = "#8800ff";
	ctx.font = "100px 'Arial', sans-serif";
	ctx.textAlign = "center";
	ctx.fillText(keyword, W/2, H/2);
}

// Clear the canvas
function clear() {
	ctx.clearRect(0, 0, W, H);
}

// Get pixel positions
function positionParticles() {
	// Get the data
	imageData = ctx.getImageData(0, 0, W, W);
	data = imageData.data;

	// Iterate each row and column
	for (var i = 0; i < imageData.height; i += density) {
		for (var j = 0; j < imageData.width; j += density) {

			// Get the color of the pixel
			var color = data[((j * ( imageData.width * 4)) + (i * 4)) - 1];

			// If the color is black, draw pixels
			if (color == 255) {
				particules.push(new Particle());
				particules[particules.length - 1].setPosition(i, j);
			}
		}
	}
}

drawText();
positionParticles();


// Update
function updates() {
	clear();

	for(i = 0; i < particules.length; i++) {
		var p = particules[i];

		if(mouse.x > p.x && mouse.x < p.x + p.w && mouse.y > p.y && mouse.y < p.y + p.h)
			hovered = true;

		if(hovered == true) {

			var dist = Math.sqrt((p.x - mouse.x)*(p.x - mouse.x) + (p.y - mouse.y)*(p.y - mouse.y));

			if(dist <= minDist)
				p.free = true;

			if(p.free == true) {
				p.y += p.vy;
				p.vy += 0.15;
				p.x += p.vx;

				// Collision Detection
				if(p.y + p.h > H) {
					p.y = H - p.h;
					p.vy *= -bounceFactor;

					// Friction applied when on the floor
					if(p.vx > 0)
						p.vx -= 0.1;
					else
						p.vx += 0.1;
				}

				if(p.x + p.w > W) {
					p.x = W - p.w;
					p.vx *= -bounceFactor;
				}

				if(p.x < 0) {
					p.x = 0;
					p.vx *= -0.5;
				}
			}
		}

		ctx.globalCompositeOperation = "lighter";
		p.draw();
	}
}


(function animloop(){
	requestAnimFrame(animloop);
	updates();
})();