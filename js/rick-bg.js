// Rickenbacker Floating Background — Live Web Studios
// Usage: <canvas id="rick-bg-foo"></canvas> then initRickBg('rick-bg-foo');
// Canvas must sit inside a position:relative parent at z-index:0.
// Background is transparent — the parent section's bg shows through.

(function () {
  var SPRITE_SRC = 'data:image/png;base64,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';

  var IMG_W = 300;
  var IMG_H = 214;
  var TINTS = [
    [180, 140, 255],
    [100, 190, 255],
    [255, 160, 80],
    [120, 230, 190],
    [255, 200, 160]
  ];
  var COUNT = 12;

  var sharedImg = null;
  var sharedSprites = null;
  var pendingInits = [];

  function buildSprites() {
    sharedSprites = TINTS.map(function (t) {
      var oc = document.createElement('canvas');
      oc.width = IMG_W;
      oc.height = IMG_H;
      var c = oc.getContext('2d');
      c.globalAlpha = 1;
      c.drawImage(sharedImg, 0, 0, IMG_W, IMG_H);
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = 'rgba(' + t[0] + ',' + t[1] + ',' + t[2] + ',0.85)';
      c.fillRect(0, 0, IMG_W, IMG_H);
      return oc;
    });
  }

  function ensureSprites(cb) {
    if (sharedSprites) { cb(); return; }
    if (sharedImg) { pendingInits.push(cb); return; }
    sharedImg = new Image();
    pendingInits.push(cb);
    sharedImg.onload = function () {
      buildSprites();
      var queue = pendingInits.slice();
      pendingInits.length = 0;
      queue.forEach(function (fn) { fn(); });
    };
    sharedImg.src = SPRITE_SRC;
  }

  function startInstance(canvas) {
    var ctx = canvas.getContext('2d');
    var W, H;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = canvas.width = Math.max(1, Math.floor(rect.width));
      H = canvas.height = Math.max(1, Math.floor(rect.height));
    }
    resize();
    window.addEventListener('resize', resize);

    function makeParticle() {
      var scale = 0.18 + Math.random() * 0.22;
      var tint = TINTS[Math.floor(Math.random() * TINTS.length)];
      var speed = 0.12 + Math.random() * 0.18;
      var angle = (Math.PI * 1.25) + (Math.random() - 0.5) * 0.32;
      var rot = (Math.random() - 0.5) * 0.5;
      var rotSpd = (Math.random() - 0.5) * 0.0025;
      var x = W * 0.2 + Math.random() * W * 1.1;
      var y = H * 0.1 + Math.random() * H * 1.1;
      return {
        x: x, y: y, scale: scale, tint: tint, speed: speed,
        angle: angle, rot: rot, rotSpd: rotSpd,
        alpha: 0, life: 0,
        maxLife: 600 + Math.random() * 300
      };
    }

    var particles = [];
    for (var i = 0; i < COUNT; i++) {
      var p = makeParticle();
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }

    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (var k = 0; k < particles.length; k++) {
        var p = particles[k];
        p.life++;
        var t = p.life / p.maxLife;
        if (t < 0.06) p.alpha = t / 0.06;
        else if (t > 0.90) p.alpha = (1 - t) / 0.10;
        else p.alpha = 1;
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.rot += p.rotSpd;
        var alpha = Math.max(0, Math.min(1, p.alpha));
        var tIdx = TINTS.indexOf(p.tint);
        var sprite = sharedSprites[tIdx] || sharedSprites[0];
        var sw = IMG_W * p.scale;
        var sh = IMG_H * p.scale;
        ctx.save();
        ctx.globalAlpha = alpha * 0.55;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(sprite, -sw / 2, -sh / 2, sw, sh);
        ctx.restore();
        if (p.life >= p.maxLife) {
          Object.assign(p, makeParticle());
          p.life = 0;
          p.alpha = 0;
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  window.initRickBg = function (canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ensureSprites(function () { startInstance(canvas); });
  };
})();
