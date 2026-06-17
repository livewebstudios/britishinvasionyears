// Floating Music Notes Background — Live Web Studios
// Usage: <canvas id="notes-bg-foo"></canvas> then initNotesBg('notes-bg-foo');
// Canvas must sit inside a position:relative parent at z-index:0.
// Background is transparent — the parent section's bg shows through.

(function () {
  var COLORS = [
    'rgba(160,200,255,',
    'rgba(200,160,255,',
    'rgba(100,230,200,',
    'rgba(255,200,120,'
  ];
  var NOTE_TYPES = ['quarter', 'eighth', 'beam', 'clef'];
  var COUNT = 26;

  function drawQuarterNote(ctx, s, colorBase, alpha) {
    var strokeA = alpha * 0.66;
    var fillA = alpha * 0.3;
    ctx.save();
    ctx.save();
    ctx.rotate(-0.35);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.48, s * 0.35, 0, 0, Math.PI * 2);
    ctx.fillStyle = colorBase + fillA + ')';
    ctx.strokeStyle = colorBase + strokeA + ')';
    ctx.lineWidth = 1.2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(s * 0.44, -s * 0.08);
    ctx.lineTo(s * 0.44, -s * 1.8);
    ctx.strokeStyle = colorBase + strokeA + ')';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }

  function drawEighthNote(ctx, s, colorBase, alpha) {
    var strokeA = alpha * 0.66;
    var fillA = alpha * 0.3;
    ctx.save();
    ctx.save();
    ctx.rotate(-0.35);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.44, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fillStyle = colorBase + fillA + ')';
    ctx.strokeStyle = colorBase + strokeA + ')';
    ctx.lineWidth = 1.2;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(s * 0.4, -s * 0.08);
    ctx.lineTo(s * 0.4, -s * 1.7);
    ctx.strokeStyle = colorBase + strokeA + ')';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.4, -s * 1.7);
    ctx.bezierCurveTo(s * 0.9, -s * 1.5, s * 0.9, -s * 1.0, s * 0.5, -s * 0.9);
    ctx.strokeStyle = colorBase + strokeA + ')';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
  }

  function drawBeamedPair(ctx, s, colorBase, alpha) {
    var strokeA = alpha * 0.66;
    var fillA = alpha * 0.3;
    ctx.save();
    ctx.save();
    ctx.translate(0, 0);
    ctx.rotate(-0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.4, s * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = colorBase + fillA + ')';
    ctx.strokeStyle = colorBase + strokeA + ')';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(s * 1.0, s * 0.1);
    ctx.rotate(-0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.4, s * 0.28, 0, 0, Math.PI * 2);
    ctx.fillStyle = colorBase + fillA + ')';
    ctx.strokeStyle = colorBase + strokeA + ')';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(s * 0.37, -s * 0.08);
    ctx.lineTo(s * 0.37, -s * 1.5);
    ctx.strokeStyle = colorBase + strokeA + ')';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 1.37, 0);
    ctx.lineTo(s * 1.37, -s * 1.4);
    ctx.strokeStyle = colorBase + strokeA + ')';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.37, -s * 1.5);
    ctx.lineTo(s * 1.37, -s * 1.4);
    ctx.strokeStyle = colorBase + strokeA + ')';
    ctx.lineWidth = s * 0.18;
    ctx.stroke();
    ctx.restore();
  }

  function drawTrebleClef(ctx, s, colorBase, alpha) {
    var strokeA = alpha * 0.58;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, s * 1.0);
    ctx.bezierCurveTo(-s * 0.8, s * 0.8, -s * 0.9, -s * 0.1, 0, -s * 0.3);
    ctx.bezierCurveTo(s * 0.7, -s * 0.5, s * 0.6, -s * 1.4, 0, -s * 1.5);
    ctx.bezierCurveTo(-s * 0.6, -s * 1.6, -s * 0.8, -s * 0.8, -s * 0.2, -s * 0.5);
    ctx.strokeStyle = colorBase + strokeA + ')';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
  }

  function drawNote(ctx, type, s, colorBase, alpha) {
    switch (type) {
      case 'quarter': drawQuarterNote(ctx, s, colorBase, alpha); break;
      case 'eighth':  drawEighthNote(ctx, s, colorBase, alpha); break;
      case 'beam':    drawBeamedPair(ctx, s, colorBase, alpha); break;
      case 'clef':    drawTrebleClef(ctx, s, colorBase, alpha); break;
    }
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

    function randomParticle() {
      var scale = 17 + Math.random() * 24;
      var colorBase = COLORS[Math.floor(Math.random() * COLORS.length)];
      var type = NOTE_TYPES[Math.floor(Math.random() * NOTE_TYPES.length)];
      var speed = 0.15 + Math.random() * 0.2;
      var angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.35;
      var rot = (Math.random() - 0.5) * 0.5;
      var rotSpd = (Math.random() - 0.5) * 0.003;
      var x = -40 + Math.random() * (W * 0.92);
      var y = -60 + Math.random() * (H + 60);
      return {
        x: x, y: y, scale: scale, colorBase: colorBase, type: type,
        speed: speed, angle: angle, rot: rot, rotSpd: rotSpd,
        alpha: 0, life: 0, maxLife: 260 + Math.random() * 180
      };
    }

    var particles = [];
    function seed() {
      particles.length = 0;
      for (var i = 0; i < COUNT; i++) {
        var p = randomParticle();
        p.life = Math.random() * p.maxLife;
        particles.push(p);
      }
    }
    seed();

    /* Re-measure and re-seed when the canvas actually gets its real size —
       layout/fonts can settle after init and leave a 0-size canvas, which
       makes notes spawn off-screen and look like nothing. */
    window.addEventListener('resize', function () { resize(); seed(); });
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        var prevW = W, prevH = H;
        resize();
        if (Math.abs(W - prevW) > 4 || Math.abs(H - prevH) > 4) seed();
      });
      ro.observe(canvas);
    }

    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (var k = 0; k < particles.length; k++) {
        var p = particles[k];
        p.life++;
        var t = p.life / p.maxLife;
        if (t < 0.1) p.alpha = t / 0.1;
        else if (t > 0.85) p.alpha = (1 - t) / 0.15;
        else p.alpha = 1;
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;
        p.rot += p.rotSpd;
        var a = Math.min(1, Math.max(0, p.alpha));
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        drawNote(ctx, p.type, p.scale, p.colorBase, a);
        ctx.restore();
        if (p.life >= p.maxLife || p.x > W + 120 || p.y < -120) {
          Object.assign(p, randomParticle());
          p.life = 0;
          p.alpha = 0;
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  window.initNotesBg = function (canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    startInstance(canvas);
  };
})();
