// only load/play videos while they're on screen
{
  const vids = document.querySelectorAll('.work video');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = new IntersectionObserver(
    es => {
      for (const e of es) {
        const v = e.target;
        if (e.isIntersecting) {
          if (!v.src) v.src = v.dataset.src;
          if (still) v.controls = true;
          else
            v.play().catch(() => {
              v.controls = true;
            });
        } else if (!v.paused) v.pause();
      }
    },
    { rootMargin: '200px 0px' },
  );
  vids.forEach(v => io.observe(v));
}

// build the address on click so scrapers don't get it
{
  const show = document.getElementById('show-email');
  const out = document.getElementById('email-out');
  const link = document.getElementById('email-link');
  const copy = document.getElementById('copy-email');
  const addr = () =>
    String.fromCharCode(
      ...[
        109, 111, 99, 46, 108, 105, 97, 109, 103, 64, 99, 114, 46, 121, 116, 114, 97, 99, 110, 97,
        121, 114,
      ].reverse(),
    );
  show.addEventListener('click', () => {
    const a = addr();
    link.textContent = a;
    link.href = 'mailto:' + a;
    show.hidden = true;
    out.hidden = false;
  });
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(addr());
      copy.textContent = 'Copied';
    } catch {
      copy.textContent = 'Select and copy the address';
    }
  });
}
